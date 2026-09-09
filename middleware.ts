import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE_NAME, verifySessionCookie } from "@/lib/session";

// O webhook da Clicksign é público de propósito: a autenticação dele é por
// HMAC dentro do próprio route handler.
const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/webhooks/clicksign"];

function reject(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const wantsHtml = request.headers.get("accept")?.includes("text/html") ?? false;

  // Navegação de browser → manda para o login. Chamada de fetch/XHR em /api →
  // 401 JSON, senão o fetch seguiria o redirect e receberia HTML do login.
  const response =
    pathname.startsWith("/api/") && !wantsHtml
      ? NextResponse.json({ error: "Não autenticado" }, { status: 401 })
      : NextResponse.redirect(new URL("/login", request.url));

  // Descarta o cookie inválido/expirado para não reenviar lixo a cada request.
  response.cookies.delete(AUTH_COOKIE_NAME);
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Verificação criptográfica do cookie (assinatura HMAC + expiração embutida).
  // Roda no Edge, sem banco: um cookie inventado à mão não passa daqui.
  // A checagem contra AdminSession no banco — que também cobre revogação —
  // acontece em requireAuth(), nas server actions e nos route handlers.
  const session = await verifySessionCookie(
    request.cookies.get(AUTH_COOKIE_NAME)?.value
  );

  if (!session) {
    return reject(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
