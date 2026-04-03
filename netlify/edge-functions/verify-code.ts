const VERIFY_SECRET = Netlify.env.get("VERIFY_SECRET") || "univibe-hk-verify-2026-secret";

async function createHmac(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export default async (req: Request) => {
  const h = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Content-Type": "application/json" };
  if (req.method === "OPTIONS") return new Response("", { status: 200, headers: h });

  try {
    const { email, code, token } = await req.json();
    if (!email || !code || !token) return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400, headers: h });

    const [receivedHmac, expiryStr] = token.split(":");
    const expiry = parseInt(expiryStr, 10);

    if (Date.now() > expiry) return new Response(JSON.stringify({ error: "Code expired" }), { status: 400, headers: h });

    const expected = await createHmac(VERIFY_SECRET, `${email.toLowerCase()}:${code}:${expiry}`);
    if (receivedHmac !== expected) return new Response(JSON.stringify({ error: "Invalid code" }), { status: 400, headers: h });

    return new Response(JSON.stringify({ success: true, verified: true }), { status: 200, headers: h });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500, headers: h });
  }
};

export const config = { path: "/api/verify-code" };
