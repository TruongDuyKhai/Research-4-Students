/**
 * Normalizes Gmail email addresses by removing dots, stripping plus tags,
 * and converting domains to gmail.com. Non-Gmail addresses are just trimmed and lowercased.
 * 
 * @param {string} email
 * @returns {string}
 */
function normalizeGmailEmail(email) {
  if (typeof email !== 'string') return '';
  const trimmed = email.trim().toLowerCase();
  const atIndex = trimmed.lastIndexOf('@');
  if (atIndex === -1) return trimmed;

  let local = trimmed.substring(0, atIndex);
  let domain = trimmed.substring(atIndex + 1);

  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    // Cut off everything after the plus symbol (+)
    const plusIndex = local.indexOf('+');
    if (plusIndex !== -1) {
      local = local.substring(0, plusIndex);
    }
    // Remove all periods (.)
    local = local.replace(/\./g, '');
    domain = 'gmail.com';
  }

  return `${local}@${domain}`;
}

/**
 * Checks if an email address belongs to Gmail/Googlemail domain.
 * 
 * @param {string} email
 * @returns {boolean}
 */
function isGmailAddress(email) {
  if (typeof email !== 'string') return false;
  const trimmed = email.trim().toLowerCase();
  const atIndex = trimmed.lastIndexOf('@');
  if (atIndex === -1) return false;
  const domain = trimmed.substring(atIndex + 1);
  return domain === 'gmail.com' || domain === 'googlemail.com';
}

module.exports = {
  normalizeGmailEmail,
  isGmailAddress
};
