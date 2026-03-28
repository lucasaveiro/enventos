import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  checkLoginRateLimit,
  recordLoginAttempt,
  clearLoginAttempts,
} from "@/lib/rateLimit";

const SESSION_MAX_AGE_DAYS = 30;

export async function POST(request: NextRequest) {
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return NextResponse.redirect(new URL("/login?error=config", request.url));
  }

  // Extract IP for rate limiting
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  // Check rate limit
  const { allowed, retryAfter } = await checkLoginRateLimit(ip);
  if (!allowed) {
    return NextResponse.redirect(
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
    return NextResponse.redirect(new URL("/login?error=wrong", request.url));
  }

  // Successful login — clear rate limit and create session
  await clearLoginAttempts(ip);

  const token = crypto.randomUUID();
  const expiresAt = new Date(
    Date.now() + SESSION_MAX_AGE_DAYS * 24 * 60 * 60 * 1000
  );

  // Delete all previous sessions (single-admin app)
  await prisma.adminSession.deleteMany({});

  // Create new session
  await prisma.adminSession.create({
    data: { token, expiresAt },
  });

  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.set("auth_session", token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * SESSION_MAX_AGE_DAYS,
    path: "/",
  });

  return response;
}

export async function DELETE(request: NextRequest) {
  const token = request.cookies.get("auth_session")?.value;

  if (token) {
    await prisma.adminSession.deleteMany({ where: { token } });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete("auth_session");
  return response;
}
