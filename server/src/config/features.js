function isSet(name) {
  const value = process.env[name];
  return typeof value === 'string' && value.trim().length > 0;
}

const features = {
  googleAuth: isSet('GOOGLE_CLIENT_ID'),
  captcha: isSet('TURNSTILE_SECRET_KEY'),
  discordStorage: isSet('DISCORD_BOT_TOKEN') && isSet('DISCORD_STORAGE_CHANNEL_ID'),
};

module.exports = features;
