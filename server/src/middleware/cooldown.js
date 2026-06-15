const { moderationDb } = require('../db/connections');

/**
 * Cooldown middleware to prevent rapid content creation spamming
 * @param {string} actionType - The type of action (e.g. 'post_create')
 * @param {number} seconds - Cooldown duration in seconds
 */
function cooldown(actionType, seconds) {
  return async (req, res, next) => {
    // Cooldown checks apply to authenticated users. If req.user is absent, default to 0.
    const userId = req.user ? req.user.id : 0;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    try {
      const lastAction = moderationDb.prepare(`
        SELECT created_at 
        FROM action_logs 
        WHERE user_id = ? AND action_type = ? 
        ORDER BY created_at DESC 
        LIMIT 1
      `).get(userId, actionType);

      if (lastAction) {
        // SQLite datetime('now') returns UTC string like "YYYY-MM-DD HH:MM:SS"
        const lastTimeUtc = new Date(lastAction.created_at.replace(' ', 'T') + 'Z').getTime();
        const diffMs = Date.now() - lastTimeUtc;
        const cooldownMs = seconds * 1000;

        if (diffMs < cooldownMs) {
          const retryAfterSeconds = Math.ceil((cooldownMs - diffMs) / 1000);
          return res.status(429).json({
            error: {
              code: 'COOLDOWN',
              message: `Please wait before performing this action again.`,
              retryAfterSeconds
            }
          });
        }
      }

      // Log the action before proceeding
      moderationDb.prepare(`
        INSERT INTO action_logs (user_id, action_type, ip_address)
        VALUES (?, ?, ?)
      `).run(userId, actionType, ipAddress);

      next();
    } catch (error) {
      console.error('Cooldown middleware error:', error.message);
      // Fail open during DB glitches to avoid locking out normal users, or handle appropriately
      next();
    }
  };
}

module.exports = cooldown;
