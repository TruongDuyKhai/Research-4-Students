const cron = require('node-cron');
const { filesDb } = require('../db/connections');
const { refreshFileUrl } = require('./discordStorage');

const cronExpression = process.env.CDN_REFRESH_CRON || '0 */12 * * *';

let isRunning = false;

/**
 * Start the cron schedule to periodically refresh all files
 */
function startRefresher() {
  cron.schedule(cronExpression, async () => {
    if (isRunning) {
      console.log('[CDN Refresher] Job is already running. Skipping.');
      return;
    }

    isRunning = true;
    console.log('[CDN Refresher] Starting periodical CDN URL refresh job...');

    try {
      const files = filesDb.prepare('SELECT * FROM files').all();
      let successCount = 0;
      let failCount = 0;

      for (const file of files) {
        try {
          await refreshFileUrl(file);
          successCount++;
        } catch (error) {
          console.error(`[CDN Refresher] Failed to refresh CDN URL for file ID ${file.id}:`, error.message);
          failCount++;
        }
      }

      console.log(`[CDN Refresher] Completed. Successfully refreshed: ${successCount}, Failed: ${failCount}`);
    } catch (criticalError) {
      console.error('[CDN Refresher] Critical error during batch refresh:', criticalError.message);
    } finally {
      isRunning = false;
    }
  });

  console.log(`[CDN Refresher] Scheduled periodically using cron expression: "${cronExpression}"`);
}

module.exports = {
  startRefresher
};
