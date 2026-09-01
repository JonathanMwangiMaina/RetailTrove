import { getCache } from "../cache.js";

const MPESA_PHONE_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MPESA_PHONE_RATE_LIMIT_MAX = 10; // max 10 requests per 15 minutes per phone

/**
 * Check if a phone number has exceeded the M-Pesa rate limit.
 * Returns { allowed: boolean, retryAfter?: number, remaining: number }.
 */
export async function checkMpesaPhoneRateLimit(
  phone: string,
): Promise<{ allowed: boolean; retryAfter?: number; remaining: number }> {
  const c = getCache();
  if (!c) {
    // If Redis is not available, allow the request (best-effort)
    return { allowed: true, remaining: MPESA_PHONE_RATE_LIMIT_MAX };
  }

  const normalizedPhone = phone.replace(/[^0-9]/g, "");
  const key = `mpesa:ratelimit:${normalizedPhone}`;
  const now = Date.now();
  const windowStart = now - MPESA_PHONE_RATE_LIMIT_WINDOW_MS;

  try {
    // Use a sorted set to track timestamps
    // Add current timestamp
    await c.zadd(key, { score: now, member: `${now}:${Math.random()}` });
    // Remove old entries outside the window
    await c.zremrangebyscore(key, 0, windowStart);
    // Count remaining entries
    const count = await c.zcard(key);
    // Set expiry on the key
    await c.expire(key, Math.ceil(MPESA_PHONE_RATE_LIMIT_WINDOW_MS / 1000));

    if (count > MPESA_PHONE_RATE_LIMIT_MAX) {
      // Get the oldest entry to calculate retry-after
      const oldest = await c.zrange(key, 0, 0);
      const oldestTimestamp = oldest.length > 0 ? parseInt(String(oldest[0]).split(":")[0]) : now;
      const retryAfter = Math.ceil(
        (oldestTimestamp + MPESA_PHONE_RATE_LIMIT_WINDOW_MS - now) / 1000,
      );
      return { allowed: false, retryAfter, remaining: 0 };
    }

    return { allowed: true, remaining: MPESA_PHONE_RATE_LIMIT_MAX - count };
  } catch {
    // On error, allow the request (best-effort)
    return { allowed: true, remaining: MPESA_PHONE_RATE_LIMIT_MAX };
  }
}

/**
 * Express middleware for M-Pesa phone rate limiting.
 * Expects phone number in req.body.phone (for POST /api/checkout/mpesa)
 * or req.query.phone (for other endpoints).
 */
export async function mpesaPhoneRateLimiter(req: any, res: any, next: any) {
  const phone = req.body?.phone || req.query?.phone;
  if (!phone) {
    return next(); // No phone to rate limit, skip
  }

  const { allowed, retryAfter, remaining } = await checkMpesaPhoneRateLimit(String(phone));

  // Set rate limit headers
  res.setHeader("X-RateLimit-Remaining", String(remaining));
  res.setHeader("X-RateLimit-Limit", String(MPESA_PHONE_RATE_LIMIT_MAX));

  if (!allowed) {
    res.setHeader("Retry-After", String(retryAfter ?? 60));
    return res.status(429).json({
      message: "Too many M-Pesa requests from this phone number. Please try again later.",
      retryAfter: retryAfter ?? 60,
    });
  }

  next();
}
