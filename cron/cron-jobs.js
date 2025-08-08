const cron = require('node-cron');
const { rebuildTeamProfits } = require('./rebuildTeamProfits'); // fixed path

// Prevent scheduling twice in the same process
if (!global.__CRON_STARTED__) {
  global.__CRON_STARTED__ = true;

  // 每天凌晨2点执行
  cron.schedule('0 2 * * *', async () => {
    console.log('⏰ Running daily team profit recalculation...');
    try {
      await rebuildTeamProfits();
      console.log('✅ Team profits updated successfully.');
    } catch (error) {
      console.error('❌ Error in cron job:', error);
    }
  });

  console.log('🗓️ Cron scheduled: daily 02:00');
}
