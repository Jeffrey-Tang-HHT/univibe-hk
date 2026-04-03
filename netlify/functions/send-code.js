const crypto = require("crypto");

const RESEND_API_KEY = "re_VNGPU5vv_MFHQJ7eXHLoR8qv8RkkaP7r7";
const VERIFY_SECRET = "univibe-hk-verify-secret-x9k2m-2026";

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function createToken(email, code, expiry) {
  return crypto.createHmac("sha256", VERIFY_SECRET).update(`${email}:${code}:${expiry}`).digest("hex");
}

exports.handler = async (event) => {
  const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Content-Type": "application/json" };
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };

  try {
    const { email } = JSON.parse(event.body || "{}");
    if (!email || !email.includes("@")) return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid email" }) };

    const domain = email.split("@")[1]?.toLowerCase();
    if (!domain || !domain.endsWith(".edu.hk")) return { statusCode: 400, headers, body: JSON.stringify({ error: "Only .edu.hk emails accepted" }) };

    const code = generateCode();
    const expiry = Date.now() + 10 * 60 * 1000;
    const token = createToken(email.toLowerCase(), code, expiry);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": "Bearer " + RESEND_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "UniVibe HK <onboarding@resend.dev>",
        to: [email],
        subject: "UniVibe HK 驗證碼：" + code,
        html: '<div style="font-family:-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:40px 20px;text-align:center"><h1 style="color:#1a1a1a">UniVibe <span style="color:#ff6b6b">HK</span></h1><p style="color:#666;font-size:15px">你的驗證碼 / Your verification code:</p><div style="background:#f8f8f7;border-radius:16px;padding:24px;margin:24px 0"><span style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#1a1a1a;font-family:monospace">' + code + '</span></div><p style="color:#999;font-size:13px">此驗證碼將在 10 分鐘後過期 / Expires in 10 minutes<br>如果你沒有請求此驗證碼，請忽略此郵件</p></div>'
      })
    });

    const result = await res.json();
    if (!res.ok) return { statusCode: 500, headers, body: JSON.stringify({ error: "Failed to send email", details: result }) };

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, token, expiry, message: "Code sent" }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Server error: " + err.message }) };
  }
};
