const secretKey = process.env.TURNSTILE_SECRET_KEY;

/**
 * Cloudflare Turnstile Verification Middleware
 */
async function verifyTurnstile(req, res, next) {
  // Bypasses check during development if secret key is not set
  if (!secretKey) {
    console.warn('[Turnstile] TURNSTILE_SECRET_KEY is not configured. Bypassing validation.');
    return next();
  }

  const { turnstileToken } = req.body;
  if (!turnstileToken) {
    return res.status(400).json({
      error: {
        code: 'TURNSTILE_REQUIRED',
        message: 'Cloudflare Turnstile token is required'
      }
    });
  }

  try {
    const params = new URLSearchParams();
    params.append('secret', secretKey);
    params.append('response', turnstileToken);
    params.append('remoteip', req.ip || '');

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: params
    });

    const result = await response.json();
    if (result.success !== true) {
      return res.status(400).json({
        error: {
          code: 'TURNSTILE_FAILED',
          message: 'Turnstile validation failed'
        }
      });
    }

    next();
  } catch (error) {
    console.error('Cloudflare Turnstile request error:', error.message);
    return res.status(400).json({
      error: {
        code: 'TURNSTILE_FAILED',
        message: 'Cloudflare Turnstile validation request encountered an error'
      }
    });
  }
}

module.exports = verifyTurnstile;
