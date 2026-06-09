const { Client, GatewayIntentBits, AttachmentBuilder } = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

let isReady = false;

client.once('ready', () => {
  console.log(`[DiscordBot] Logged in as ${client.user.tag}`);
  isReady = true;
});

/**
 * Wait until the bot is connected and ready.
 * @param {number} timeoutMs - max wait time in milliseconds
 */
function waitUntilReady(timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    if (isReady) return resolve();
    const interval = setInterval(() => {
      if (isReady) { clearInterval(interval); resolve(); }
    }, 200);
    setTimeout(() => {
      clearInterval(interval);
      reject(new Error('Discord bot not ready in time.'));
    }, timeoutMs);
  });
}

/**
 * Upload any file buffer to the Discord storage channel.
 * @param {Buffer} fileBuffer
 * @param {string} filename
 * @returns {Promise<{ messageId: string, fileUrl: string }>}
 */
async function uploadFile(fileBuffer, filename) {
  await waitUntilReady();
  const channel = await client.channels.fetch(process.env.DISCORD_CHANNEL_ID);
  if (!channel?.isTextBased()) throw new Error('Storage channel not found or not text-based.');

  const attachment = new AttachmentBuilder(fileBuffer, { name: filename });
  const message = await channel.send({ files: [attachment] });

  const fileUrl = message.attachments.first()?.url;
  if (!fileUrl) throw new Error('Discord did not return an attachment URL.');

  return { messageId: message.id, fileUrl };
}

/**
 * Refresh the attachment URL from a stored Discord message ID.
 * Call this when the cached URL returns 403/404 (Discord CDN URLs can expire).
 * @param {string} messageId
 * @returns {Promise<string>} fresh CDN URL
 */
async function refreshFileUrl(messageId) {
  await waitUntilReady();
  const channel = await client.channels.fetch(process.env.DISCORD_CHANNEL_ID);
  const message = await channel.messages.fetch(messageId);
  const fileUrl = message.attachments.first()?.url;
  if (!fileUrl) throw new Error('Could not retrieve attachment URL from Discord message.');
  return fileUrl;
}

function startBot() {
  client.login(process.env.DISCORD_BOT_TOKEN);
}

module.exports = { startBot, uploadFile, refreshFileUrl };
