import { verifySessionToken } from '../utils/token.js';

/**
 * Authenticates a request from its `Authorization: Bearer <session token>` header.
 * The user's identity comes ONLY from the verified token (`sub`) — never from the body,
 * query string or URL — and is exposed as `req.userId`.
 */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Please log in to continue.', code: 'UNAUTHORIZED' });
  }

  try {
    const payload = verifySessionToken(token);
    // Signup-verification tokens carry a `purpose` claim and must never act as a session.
    if (payload.purpose || !payload.sub) {
      throw new Error('Not a session token.');
    }
    req.userId = payload.sub;
    return next();
  } catch (err) {
    const expired = err?.name === 'TokenExpiredError';
    return res.status(401).json({
      message: expired ? 'Your session has expired. Please log in again.' : 'Invalid session. Please log in again.',
      code: expired ? 'SESSION_EXPIRED' : 'UNAUTHORIZED',
    });
  }
}