require('sucrase/register');

const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const {
  PRODUCT_METHOD,
  compareRegisteredProfiles,
  normalizeLotteryDraws
} = require('../lib/product-prediction-engine.ts');
const { buildModelOutcomeMonitor } = require('../lib/model-outcome-monitor.ts');

loadDatabaseUrl();
const prisma = new PrismaClient();
const FOLD_SIZE = 60;
const FOLD_COUNT = 3;
const KINDS = ['de', 'lo2', 'lo3', 'bacang'];

async function main() {
  const [resultRows, liveRows] = await Promise.all([
    prisma.lotteryResult.findMany({ orderBy: { date: 'asc' } }),
    prisma.predictionEvaluation.findMany({
      where: { method: PRODUCT_METHOD, issuedBeforeDraw: true },
      orderBy: [{ date: 'asc' }, { issuedAt: 'asc' }]
    })
  ]);
  const draws = normalizeLotteryDraws(resultRows);
  if (draws.length < 180 + FOLD_SIZE * FOLD_COUNT) {
    throw new Error(`Need at least ${180 + FOLD_SIZE * FOLD_COUNT} draws, got ${draws.length}`);
  }

  const folds = Array.from({ length: FOLD_COUNT }, (_, index) => {
    const end = draws.length - FOLD_SIZE * (FOLD_COUNT - index - 1);
    const prefix = draws.slice(0, end);
    return {
      fromDate: prefix[prefix.length - FOLD_SIZE].date,
      toDate: prefix[prefix.length - 1].date,
      comparisons: compareRegisteredProfiles(prefix, FOLD_SIZE)
    };
  });
  const live = buildModelOutcomeMonitor(liveRows);
  const stability = Object.fromEntries(KINDS.map((kind) => {
    const profileIds = folds[0].comparisons.map((entry) => entry.profile);
    const profiles = profileIds.map((profile) => summarizeProfile(folds, profile, kind));
    const production = profiles.find((profile) => profile.profile === 'balanced');
    const challenger = profiles
      .filter((profile) => profile.profile !== 'balanced')
      .sort(compareProfiles)[0];
    const gain = challenger.pooledLift - production.pooledLift;
    const passesStability = (
      challenger.positiveFolds === FOLD_COUNT &&
      challenger.minimumFoldLift >= 1 &&
      gain >= 0.03
    );
    return [kind, {
      production,
      bestChallenger: challenger,
      liftGain: round(gain),
      passesStability,
      decision: passesStability && live.eligibleDays >= live.minimumDays
        ? 'candidate_for_fresh_holdout'
        : 'hold_production'
    }];
  }));
  const reviewDate = vietnamDateKey();
  const needsReview = Object.values(live.byKind).some((item) => item.recommendation === 'review_model');
  const hasCandidate = Object.values(stability).some((item) => item.decision === 'candidate_for_fresh_holdout');
  const status = live.status === 'collecting'
    ? 'collecting_live_evidence'
    : needsReview || hasCandidate
      ? 'review_required'
      : 'stable';
  const decision = hasCandidate
    ? 'freeze_current_and_open_fresh_holdout'
    : 'keep_current_production';

  const review = await prisma.modelReview.upsert({
    where: {
      reviewDate_method: {
        reviewDate: new Date(`${reviewDate}T00:00:00.000Z`),
        method: PRODUCT_METHOD
      }
    },
    update: {
      dataThrough: new Date(`${draws[draws.length - 1].date}T00:00:00.000Z`),
      liveDays: live.eligibleDays,
      status,
      decision,
      liveMetrics: live,
      stabilityMetrics: stability
    },
    create: {
      reviewDate: new Date(`${reviewDate}T00:00:00.000Z`),
      method: PRODUCT_METHOD,
      dataThrough: new Date(`${draws[draws.length - 1].date}T00:00:00.000Z`),
      liveDays: live.eligibleDays,
      status,
      decision,
      liveMetrics: live,
      stabilityMetrics: stability
    }
  });

  console.log(JSON.stringify({
    ok: true,
    reviewId: review.id,
    reviewDate,
    method: PRODUCT_METHOD,
    dataThrough: draws[draws.length - 1].date,
    liveDays: live.eligibleDays,
    status,
    decision,
    stability
  }, null, 2));
}

function summarizeProfile(folds, profile, kind) {
  const results = folds.map((fold) => {
    const comparison = fold.comparisons.find((entry) => entry.profile === profile);
    const summary = comparison.summaries.find((entry) => entry.kind === kind);
    return {
      fromDate: fold.fromDate,
      toDate: fold.toDate,
      metric: summary.primaryMetric,
      baseline: summary.baseline,
      lift: summary.lift
    };
  });
  const metric = mean(results.map((entry) => entry.metric));
  const baseline = mean(results.map((entry) => entry.baseline));
  return {
    profile,
    pooledLift: round(baseline > 0 ? metric / baseline : 0),
    minimumFoldLift: Math.min(...results.map((entry) => entry.lift)),
    positiveFolds: results.filter((entry) => entry.metric > entry.baseline).length,
    folds: results
  };
}

function compareProfiles(left, right) {
  return right.positiveFolds - left.positiveFolds ||
    right.pooledLift - left.pooledLift ||
    right.minimumFoldLift - left.minimumFoldLift ||
    left.profile.localeCompare(right.profile);
}

function loadDatabaseUrl() {
  const env = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '';
  const match = env.match(/^DATABASE_URL\s*=\s*"?([^"\n]+)"?/m);
  if (match && !process.env.DATABASE_URL) process.env.DATABASE_URL = match[1];
}

function vietnamDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const value = (type) => parts.find((part) => part.type === type).value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

function round(value) {
  return Math.round(value * 100) / 100;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
