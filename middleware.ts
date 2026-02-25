import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/api/auth/login"];
const SALT = "gestor-espacos-salt-v1";

async function computeHash(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + SALT);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Libera rotas públicas
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get("auth_session")?.value;

  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Calcula hash da senha atual para comparar com o cookie
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    // Sem ADMIN_PASSWORD configurado → nega acesso
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("auth_session");
    return response;
  }

  const expectedHash = await computeHash(adminPassword);

  if (sessionCookie !== expectedHash) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("auth_session");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
