# 🔒 UniGo HK — Security Hardening Audit

## Critical Vulnerabilities Fixed

### 🔴 1. BROKEN AUTHENTICATION on chat.mjs (CRITICAL)
**Before:** Every chat endpoint (discover, send-message, get-matches, block, like, etc.) accepted a raw `user_id` from the request body/query — **no token verification at all**. Any attacker could impersonate any user by guessing or enumerating UUIDs.

**After:** ALL chat endpoints now extract the user identity from the `Authorization: Bearer <token>` header via `requireAuth()`. The `user_id` field in request bodies is ignored — the server always uses the authenticated user's ID.

### 🔴 2. TIMING ATTACK on token verification (HIGH)
**Before:** Token signature compared with `===`, which leaks timing information and can allow an attacker to forge tokens character by character.

**After:** Uses `crypto.timingSafeEqual()` for constant-time comparison.

### 🔴 3. NO RATE LIMITING anywhere (HIGH)
**Before:** Login, registration, verification code, messaging — all unlimited. An attacker could brute-force passwords, spam verification codes, or flood the chat.

**After:** In-memory rate limiter added to every sensitive endpoint:
- Login: 10 attempts/IP/15min + 5 attempts/username/15min
- Register: 5/IP/hour
- Send code: 3/email/10min + 10/IP/hour
- Verify code: 5/email/10min + 15/IP/10min
- Send message: 30/user/min
- Create post: 10/user/hour
- Comments: 20/user/hour
- Likes: 50/user/hour
- Reports: 10/user/hour
- Upload: 10/user/hour

### 🟠 4. CORS allows all origins (MEDIUM)
**Before:** Every endpoint had `Access-Control-Allow-Origin: *`, meaning any website could make authenticated requests to your API.

**After:** `setCors()` checks the `Origin` header against your `ALLOWED_ORIGINS` env var. Only your frontend domain(s) are allowed.

### 🟠 5. No input validation / XSS via user content (MEDIUM)
**Before:** Post content, comments, display names, bio — all stored raw. If rendered as HTML anywhere, XSS is trivial.

**After:** `sanitizeContent()` strips `<script>` tags. `sanitizeText()` escapes HTML entities. All text fields have max-length caps. Profile fields are individually validated (age 16-100, interests max 20 items, MBTI max 4 chars, etc.).

### 🟠 6. No UUID validation on IDs (MEDIUM)
**Before:** User-supplied IDs like `user_id`, `match_id`, `post_id` were interpolated directly into Supabase REST filter strings with no validation — potential for filter injection.

**After:** `isValidUUID()` validates all IDs before use. Invalid IDs get a 400 error.

### 🟡 7. Hardcoded test email bypass in production (LOW)
**Before:** `hokhimtang@gmail.com` was hardcoded as a test email that bypasses `.edu.hk` validation — in all environments including production.

**After:** `TEST_EMAIL` only reads from env var and only works when `NODE_ENV !== 'production'`.

### 🟡 8. Weak password policy (LOW)
**Before:** Only required 6 characters minimum.

**After:** Requires 8+ characters with at least one letter and one number.

### 🟡 9. Verification code in email subject line (LOW)
**Before:** Subject was `UniGo HK 驗證碼: 123456` — visible in email previews and notification banners.

**After:** Subject is just `UniGo HK 驗證碼` — code only visible inside the email body.

### 🟡 10. Missing security headers (LOW)
**After:** All responses now include: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`.

### 🟡 11. Image upload fallback stored data URLs in DB (LOW)
**Before:** If Supabase storage upload failed, images were stored as base64 data URLs (up to 800KB) directly in the database.

**After:** Upload failure returns an error. No data URLs stored in DB.

---

## How to Deploy

1. **Replace files:** Copy the entire `api/` folder from this zip into your project, replacing the existing files.

2. **Set environment variables** in Vercel/Netlify:
   ```
   ALLOWED_ORIGINS=https://your-domain.com
   NODE_ENV=production
   ```
   Make sure `VERIFY_SECRET` is at least 32 random characters.

3. **Update frontend API calls** in `Dating.tsx` for chat endpoints — they now need the auth token:

   Any calls that previously sent `user_id` in the body (like heartbeat, create-match, block, like-user, etc.) should instead send the `Authorization: Bearer <token>` header and remove `user_id` from the body.

   Example change:
   ```js
   // BEFORE
   fetch('/api/chat?action=heartbeat', {
     method: 'POST',
     body: JSON.stringify({ user_id: currentUser.id })
   })

   // AFTER
   fetch('/api/chat?action=heartbeat', {
     method: 'POST',
     headers: {
       'Authorization': `Bearer ${token}`,
       'Content-Type': 'application/json'
     }
   })
   ```

   For `create-match`, send `{ user2_id }` instead of `{ user1_id, user2_id }`.
   For `block`, send `{ blocked_id }` instead of `{ blocker_id, blocked_id }`.
   For `report`, send `{ reported_id, reason }` instead of `{ reporter_id, ... }`.
   For `like-user`, send `{ liked_id, is_super }` instead of `{ liker_id, liked_id, ... }`.

4. **Test** all flows: login, register, chat, feed posting, profile update, image upload.

---

## What's NOT covered (do these next)

- **Supabase RLS policies** — Your current RLS is `USING (true)` which means the service key bypasses everything. This is fine since all access goes through your API, but if you ever expose the anon key to the client, tighten RLS immediately.
- **HTTPS enforcement** — Vercel/Netlify handle this, but verify your custom domain forces HTTPS.
- **Content moderation** — No automated checks for abusive content in posts/messages. Consider integrating a moderation API.
- **Account lockout** — Rate limiting slows brute-force but doesn't lock accounts. Consider adding temporary account locks after repeated failures.
- **Logging & monitoring** — Add structured logging for failed auth attempts, rate limit hits, and blocked requests so you can detect attacks.
- **CSRF tokens** — Not critical since you use Bearer tokens (not cookies), but worth adding if you ever switch to cookie-based auth.
