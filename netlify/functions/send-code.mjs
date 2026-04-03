const RESEND_API_KEY = "re_FzHDkjNY_GjAdczYVCvYr9qvAPvzCREk2";
const VERIFY_SECRET = "univibe-hk-verify-2026-secret";

async function createHmac(secret, message) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export default async (req) => {
  const h = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Content-Type": "application/json" };
  if (req.method === "OPTIONS") return new Response("", { status: 200, headers: h });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: h });

  try {
    const { email } = await req.json();
    if (!email) return new Response(JSON.stringify({ error: "Email is required" }), { status: 400, headers: h });

    const domain = email.split("@")[1]?.toLowerCase();
    if (!domain || !domain.endsWith(".edu.hk")) {
      return new Response(JSON.stringify({ error: "Only .edu.hk emails accepted" }), { status: 400, headers: h });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiry = Date.now() + 10 * 60 * 1000;
    const hmac = await createHmac(VERIFY_SECRET, `${email.toLowerCase()}:${code}:${expiry}`);
    const token = `${hmac}:${expiry}`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "UniVibe HK <onboarding@resend.dev>",
        to: [email],
        subject: `Your UniVibe HK code: ${code}`,
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:40px 20px;text-align:center"><div style="display:inline-block;background:#FF6B6B;border-radius:12px;padding:12px;margin-bottom:16px"><span style="color:white;font-size:24px;font-weight:bold">UV</span></div><h1 style="font-size:24px;color:#1a1a1a">UniVibe HK</h1><p style="color:#666;font-size:14px">Campus Verification</p><div style="background:#f9f9f9;border-radius:16px;padding:32px;margin:24px 0"><p style="color:#666;font-size:14px;margin:0 0 16px">Your verification code:</p><div style="font-size:36px;font-weight:800;letter-spacing:8px;color:#FF6B6B;font-family:monospace">${code}</div><p style="color:#999;font-size:12px;margin-top:16px">Expires in 10 minutes</p></div><p style="color:#999;font-size:12px">If you didn't request this, ignore this email.</p></div>`,
      }),
    });

    const result = await res.json();
    if (!res.ok) return new Response(JSON.stringify({ error: "Failed to send email", details: result }), { status: 500, headers: h });

    return new Response(JSON.stringify({ success: true, token }), { status: 200, headers: h });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: h });
  }
};

export const config = { path: "/api/send-code" };
