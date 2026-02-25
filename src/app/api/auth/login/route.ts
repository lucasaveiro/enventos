import { NextRequest, NextResponse } from "next/server";

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "gestor-espacos-salt-v1");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
}

export async function POST(request: NextRequest) {
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return NextResponse.redirect(new URL("/login?error=config", request.url));
  }

  // Aceita tanto JSON quanto form-urlencoded
  let password = "";
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const body = await request.json();
    password = body.password ?? "";
  } else {
    const body = await request.formData();
    password = (body.get("password") as string) ?? "";
  }

  if (!password || password !== adminPassword) {
    await new Promise((r) => setTimeout(r, 800));
    return NextResponse.redirect(new URL("/login?error=wrong", request.url));
  }

  const token = await hashPassword(adminPassword);

  // Retorna redirect 302 → cookie é enviado junto com o redirect,
  // garantindo que o browser o tenha antes de acessar "/"
  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.set("auth_session", token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete("auth_session");
  return response;
}
