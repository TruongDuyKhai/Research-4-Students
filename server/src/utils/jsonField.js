/**
 * Convert value to JSON string for SQLite storage
 * @param {*} value
 * @returns {string|null}
 */
function toJSON(value) {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return value;
}

/**
 * Parse JSON string from SQLite storage
 * @param {string|null} text
 * @param {*} fallback
 * @returns {*}
 */
function fromJSON(text, fallback = []) {
  if (!text) {
    return fallback;
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    return fallback;
  }
}

module.exports = {
  toJSON,
  fromJSON
};
