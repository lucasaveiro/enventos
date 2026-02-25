import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/api/auth/login"];

async function generateAuthToken(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode("gestor-espacos-auth-v1")
  );
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Libera rotas públicas
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    // Se não há senha configurada, bloqueia tudo por segurança
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const sessionCookie = request.cookies.get("auth_session")?.value;

  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Verifica se o token é válido
  const expectedToken = await generateAuthToken(adminPassword);
  if (sessionCookie !== expectedToken) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("auth_session");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Aplica o middleware em todas as rotas exceto:
     * - _next/static (arquivos estáticos)
     * - _next/image (otimização de imagens)
     * - favicon.ico
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
