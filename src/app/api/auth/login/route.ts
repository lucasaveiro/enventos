import { NextRequest, NextResponse } from "next/server";

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

export async function POST(request: NextRequest) {
  const { password } = await request.json();
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return NextResponse.json(
      { error: "Servidor não configurado corretamente." },
      { status: 500 }
    );
  }

  if (!password || password !== adminPassword) {
    // Delay artificial para dificultar brute-force
    await new Promise((r) => setTimeout(r, 800));
    return NextResponse.json({ error: "Senha incorreta." }, { status: 401 });
  }

  const token = await generateAuthToken(adminPassword);

  const response = NextResponse.json({ success: true });
  response.cookies.set("auth_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    // Cookie expira em 30 dias
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
