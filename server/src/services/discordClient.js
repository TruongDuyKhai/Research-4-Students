const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const token = process.env.DISCORD_BOT_TOKEN;
const channelId = process.env.DISCORD_STORAGE_CHANNEL_ID;

if (token) {
  client.login(token).catch(err => {
    console.error('Failed to log in to Discord Bot:', err.message);
  });
} else {
  console.warn('DISCORD_BOT_TOKEN is not configured. Discord functionality will be unavailable.');
}

client.once('ready', () => {
  console.log(`Logged in as Discord Bot: ${client.user.tag}`);
});

/**
 * Fetch the Discord channel configured for storage CDN
 * @returns {Promise<import('discord.js').GuildTextBasedChannel>}
 */
async function getStorageChannel() {
  if (!channelId) {
    throw new Error('DISCORD_STORAGE_CHANNEL_ID is not configured.');
  }
  const channel = await client.channels.fetch(channelId);
  if (!channel) {
    throw new Error(`Could not fetch Discord channel with ID: ${channelId}`);
  }
  return channel;
}

module.exports = {
  client,
  getStorageChannel
};
