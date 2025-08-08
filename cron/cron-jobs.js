// cron/cron-jobs.js
const cron = require('node-cron');
const { rebuildTeamProfits } = require('../rebuildTeamProfits');

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
