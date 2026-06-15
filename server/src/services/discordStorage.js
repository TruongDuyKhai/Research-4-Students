const { filesDb } = require('../db/connections');
const { getStorageChannel } = require('./discordClient');

/**
 * Extract expiration date from Discord CDN URL
 * @param {string} url
 * @returns {string|null} ISO timestamp
 */
function parseExpiryFromUrl(url) {
  try {
    const parsedUrl = new URL(url);
    const ex = parsedUrl.searchParams.get('ex');
    if (!ex) return null;
    return new Date(parseInt(ex, 16) * 1000).toISOString();
  } catch (error) {
    return null;
  }
}

/**
 * Retrieve metadata of a file by its database id
 * @param {number} id
 * @returns {object|undefined}
 */
function getFileById(id) {
  return filesDb.prepare('SELECT * FROM files WHERE id = ?').get(id);
}

/**
 * Upload buffer to Discord and log the file record
 * @param {object} param0 - { buffer, filename, mimetype, purpose, uploaderId }
 * @returns {Promise<object>} Created file record
 */
async function uploadFile({ buffer, filename, mimetype, purpose, uploaderId }) {
  const channel = await getStorageChannel();

  // Send buffer as attachment to channel
  const message = await channel.send({
    files: [{ attachment: buffer, name: filename }]
  });

  const attachment = message.attachments.first();
  if (!attachment) {
    throw new Error('Failed to upload file to Discord: attachment could not be created');
  }

  const cdnUrl = attachment.url;
  const cdnUrlExpiresAt = parseExpiryFromUrl(cdnUrl);

  const info = filesDb.prepare(`
    INSERT INTO files (
      uploader_id, original_name, mime_type, size_bytes, purpose,
      discord_message_id, discord_channel_id, cdn_url, cdn_url_expires_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    uploaderId,
    filename,
    mimetype,
    buffer.length,
    purpose,
    message.id,
    channel.id,
    cdnUrl,
    cdnUrlExpiresAt
  );

  return getFileById(info.lastInsertRowid);
}

/**
 * Refresh the CDN URL of a stored file
 * @param {object} fileRow
 * @returns {Promise<void>}
 */
async function refreshFileUrl(fileRow) {
  const channel = await getStorageChannel();
  const message = await channel.messages.fetch(fileRow.discord_message_id);

  const attachment = message.attachments.first();
  if (!attachment) {
    throw new Error(`Attachment not found in Discord message: ${fileRow.discord_message_id}`);
  }

  const newCdnUrl = attachment.url;
  const newCdnUrlExpiresAt = parseExpiryFromUrl(newCdnUrl);

  filesDb.prepare(`
    UPDATE files
    SET cdn_url = ?, cdn_url_expires_at = ?, last_refreshed_at = datetime('now')
    WHERE id = ?
  `).run(newCdnUrl, newCdnUrlExpiresAt, fileRow.id);
}

module.exports = {
  parseExpiryFromUrl,
  getFileById,
  uploadFile,
  refreshFileUrl
};
