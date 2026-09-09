import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  checkLoginRateLimit,
  recordLoginAttempt,
  clearLoginAttempts,
} from "@/lib/rateLimit";
import {
  AUTH_COOKIE_NAME,
  readSessionToken,
  signSessionCookie,
} from "@/lib/session";

const SESSION_MAX_AGE_DAYS = 30;

// 303 See Other força o navegador a fazer GET no destino do redirect.
// O default 307 do NextResponse.redirect preservaria o método POST,
// fazendo o navegador refazer POST em /login (página) → 405 Method Not Allowed.
function redirectAfterPost(url: URL): NextResponse {
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(request: NextRequest) {
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return redirectAfterPost(new URL("/login?error=config", request.url));
  }

  // Extract IP for rate limiting
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  // Check rate limit
  const { allowed, retryAfter } = await checkLoginRateLimit(ip);
  if (!allowed) {
    return redirectAfterPost(
      new URL(`/login?error=ratelimit&retry=${retryAfter}`, request.url)
    );
  }

  // Parse password from request
  let password = "";
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const body = await request.json();
    password = body.password ?? "";
  } else {
    const body = await request.formData();
    password = (body.get("password") as string) ?? "";
  }

  // Validate password
  if (!password || password !== adminPassword) {
    await recordLoginAttempt(ip);
    await new Promise((r) => setTimeout(r, 800));
    return redirectAfterPost(new URL("/login?error=wrong", request.url));
  }

  // Successful login — clear rate limit and create session
  await clearLoginAttempts(ip);

  const token = crypto.randomUUID();
  const expiresAt = new Date(
    Date.now() + SESSION_MAX_AGE_DAYS * 24 * 60 * 60 * 1000
  );

  // O cookie carrega o token assinado (HMAC) para que o middleware consiga
  // rejeitar cookie forjado no Edge, sem banco. Assina antes de mexer no banco:
  // se o segredo não estiver configurado, nada é gravado.
  let cookieValue: string;
  try {
    cookieValue = await signSessionCookie(token, expiresAt);
  } catch (error) {
    console.error("Login: falha ao assinar a sessão", error);
    return redirectAfterPost(new URL("/login?error=config", request.url));
  }

  // Delete all previous sessions (single-admin app)
  await prisma.adminSession.deleteMany({});

  // Create new session
  await prisma.adminSession.create({
    data: { token, expiresAt },
  });

  const response = redirectAfterPost(new URL("/", request.url));
  response.cookies.set(AUTH_COOKIE_NAME, cookieValue, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * SESSION_MAX_AGE_DAYS,
    path: "/",
  });

  return response;
}

export async function DELETE(request: NextRequest) {
  // O cookie é assinado, então o valor bruto não é o token: extrai o token
  // (ignorando a expiração — logout de sessão vencida também deve limpar).
  const token = await readSessionToken(
    request.cookies.get(AUTH_COOKIE_NAME)?.value
  );

  if (token) {
    await prisma.adminSession.deleteMany({ where: { token } });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete(AUTH_COOKIE_NAME);
  return response;
}
