/**
 * Tiny fixed-window limiter keyed by the authenticated user (run it AFTER requireAuth).
 * Sign-up is open, so this keeps one account from hammering the SMS pipeline.
 * In-memory: fine for a single backend instance (same assumption as the OTP store).
 */
export function rateLimitPerUser({ limit = 120, windowMs = 60_000 } = {}) {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    if (hits.size > 2000) {
      for (const [key, entry] of hits) if (entry.resetAt <= now) hits.delete(key);
    }
    const key = req.userId || req.ip;
    const entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    entry.count += 1;
    if (entry.count > limit) {
      res.set('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      return res.status(429).json({ message: 'Too many requests. Please slow down.' });
    }
    return next();
  };
}
