/**
 * Cron Scheduler - Tự động chạy các tasks hàng ngày
 */

const cron = require('node-cron');
const path = require('path');
const { execFile } = require('child_process');
const util = require('util');

const execFilePromise = util.promisify(execFile);
const projectRoot = path.resolve(__dirname, '..');
const timezone = 'Asia/Ho_Chi_Minh';

class CronScheduler {
  constructor() {
    this.jobs = [];
    this.running = false;
  }

  start() {
    console.log('🕐 Starting cron scheduler...');

    const eveningPrimary = cron.schedule('45 18 * * *', () => this.runPipeline(), { timezone });
    const eveningRetry = cron.schedule('5 19 * * *', () => this.runPipeline(), { timezone });
    const morningRepair = cron.schedule('30 5 * * *', () => {
      this.runPipeline(['--force', `--date=${previousVietnamDateKey()}`], 'Morning repair');
    }, { timezone });
    const weeklyReview = cron.schedule('0 6 * * 0', () => this.runWeeklyReview(), { timezone });

    this.jobs = [eveningPrimary, eveningRetry, morningRepair, weeklyReview];

    console.log('✅ Cron jobs scheduled:');
    console.log('   18:45: sync 2 nguồn + verify snapshot + tạo snapshot ngày kế');
    console.log('   19:05: retry idempotent nếu nguồn công bố chậm');
    console.log('   05:30: tự sửa khoảng trống sau sự cố qua đêm');
    console.log('   06:00 Chủ nhật: review live outcome + 3 fold stability');
  }

  async runWeeklyReview() {
    if (this.running) {
      console.log('Pipeline is already running; skipped weekly model review');
      return;
    }

    this.running = true;
    try {
      const { stdout, stderr } = await execFilePromise(
        process.execPath,
        ['scripts/weekly-model-review.js'],
        { cwd: projectRoot }
      );
      if (stdout) process.stdout.write(stdout);
      if (stderr) process.stderr.write(stderr);
      console.log('Weekly model review completed');
    } catch (error) {
      console.error('Weekly model review failed:', error.stderr || error.message);
    } finally {
      this.running = false;
    }
  }

  async runPipeline(dailyArgs = [], label = 'Daily research') {
    if (this.running) {
      console.log('Pipeline is already running; skipped overlapping trigger');
      return;
    }

    this.running = true;
    try {
      await execFilePromise(process.execPath, ['scripts/sync-missing-results.js'], { cwd: projectRoot });
      const { stdout, stderr } = await execFilePromise(
        process.execPath,
        ['scripts/daily-auto-update.js', ...dailyArgs],
        { cwd: projectRoot }
      );
      if (stdout) process.stdout.write(stdout);
      if (stderr) process.stderr.write(stderr);
      console.log(`${label} pipeline completed`);
    } catch (error) {
      console.error('Daily research pipeline failed:', error.stderr || error.message);
    } finally {
      this.running = false;
    }
  }

  stop() {
    console.log('🛑 Stopping cron scheduler...');
    this.jobs.forEach(job => job.stop());
  }
}

// Run scheduler
if (require.main === module) {
  const scheduler = new CronScheduler();
  scheduler.start();

  // Keep process running
  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down gracefully...');
    scheduler.stop();
    process.exit(0);
  });
}

module.exports = CronScheduler;

function previousVietnamDateKey(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(now);
  const value = (type) => parts.find((part) => part.type === type).value;
  const date = new Date(`${value('year')}-${value('month')}-${value('day')}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}
