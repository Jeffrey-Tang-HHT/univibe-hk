const crypto = require("crypto");

const VERIFY_SECRET = "univibe-hk-verify-secret-x9k2m-2026";

function createToken(email, code, expiry) {
  return crypto.createHmac("sha256", VERIFY_SECRET).update(`${email}:${code}:${expiry}`).digest("hex");
}

exports.handler = async (event) => {
  const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Content-Type": "application/json" };
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };

  try {
    const { email, code, token, expiry } = JSON.parse(event.body || "{}");
    if (!email || !code || !token || !expiry) return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing fields" }) };
    if (Date.now() > expiry) return { statusCode: 400, headers, body: JSON.stringify({ error: "Code expired", expired: true }) };

    const expected = createToken(email.toLowerCase(), code, expiry);
    const isValid = crypto.timingSafeEqual(Buffer.from(token, "hex"), Buffer.from(expected, "hex"));

    if (!isValid) return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid code", invalid: true }) };

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, verified: true, email: email.toLowerCase() }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Server error: " + err.message }) };
  }
};
