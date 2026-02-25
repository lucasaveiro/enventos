import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/api/auth/login"];

// Hash pré-computado de SHA-256(ADMIN_PASSWORD + "gestor-espacos-salt-v1")
// Gerado localmente: node -e "require('crypto').createHash('sha256').update(pass+salt).digest('base64')"
// Atualizar aqui sempre que a senha for trocada via: npx vercel env add ADMIN_PASSWORD
const EXPECTED_COOKIE_HASH = "hlFtSiPh8y987CqvhMX27+6hav+1R+yKGsgRRWk9DzU=";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Libera rotas públicas
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get("auth_session")?.value;

  if (!sessionCookie || sessionCookie !== EXPECTED_COOKIE_HASH) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    if (sessionCookie) response.cookies.delete("auth_session");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
