const { moderationDb } = require('../db/connections');

/**
 * Retrieve all registered banned keywords from the database
 * @returns {object[]}
 */
function getBannedKeywords() {
  return moderationDb.prepare('SELECT * FROM banned_keywords').all();
}

/**
 * Scans a text string for any violations against registered banned keywords
 * @param {string} text
 * @returns {string|null} The keyword that was matched, or null
 */
function containsBannedKeyword(text) {
  if (!text || typeof text !== 'string') {
    return null;
  }

  const keywords = getBannedKeywords();
  const lowerText = text.toLowerCase();

  for (const row of keywords) {
    const kw = row.keyword;
    const matchType = row.match_type;

    if (matchType === 'contains') {
      if (lowerText.includes(kw.toLowerCase())) {
        return kw;
      }
    } else if (matchType === 'exact') {
      if (lowerText === kw.toLowerCase()) {
        return kw;
      }
    } else if (matchType === 'regex') {
      try {
        const regex = new RegExp(kw, 'i');
        if (regex.test(text)) {
          return kw;
        }
      } catch (err) {
        console.error(`[Banlist] Invalid regex banned keyword definition "${kw}":`, err.message);
      }
    }
  }

  return null;
}

/**
 * Express middleware to validate request body fields for forbidden keywords
 * @param {string|string[]} fields
 */
function checkBannedKeywords(fields) {
  const fieldsArray = Array.isArray(fields) ? fields : [fields];
  return (req, res, next) => {
    const values = [];

    fieldsArray.forEach(field => {
      const val = req.body[field];
      if (val && typeof val === 'string') {
        values.push(val);
      }
    });

    const joinedText = values.join(' ');
    const matchedForbiddenWord = containsBannedKeyword(joinedText);

    if (matchedForbiddenWord) {
      return res.status(422).json({
        error: {
          code: 'BANNED_KEYWORD',
          message: 'Content contains a forbidden term.'
        }
      });
    }

    next();
  };
}

module.exports = {
  getBannedKeywords,
  containsBannedKeyword,
  checkBannedKeywords
};
