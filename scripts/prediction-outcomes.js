const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

loadDatabaseUrl();
const prisma = new PrismaClient();

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const where = { issuedBeforeDraw: true };
  if (args.method) where.method = args.method;
  const evaluations = await prisma.predictionEvaluation.findMany({
    where,
    orderBy: [{ date: 'asc' }, { issuedAt: 'asc' }]
  });
  const canonical = canonicalRows(evaluations);
  const grouped = new Map();

  canonical.forEach((row) => {
    const key = [row.method, row.kind, row.modelProfile ?? 'unknown', row.edgeStatus ?? 'unknown'].join('|');
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(row);
  });

  const groups = Array.from(grouped.values()).map(summarizeGroup).sort((left, right) =>
    left.kind.localeCompare(right.kind) ||
    right.testedDays - left.testedDays ||
    left.method.localeCompare(right.method)
  );

  console.log(JSON.stringify({
    eligibleEvaluationRows: canonical.length,
    eligibleDays: new Set(canonical.map((row) => dateKey(row.date))).size,
    minimumRecommendedLiveDays: 30,
    groups,
    warning: 'Không tự động cập nhật công thức từ báo cáo này; chỉ promote bằng rule đã đăng ký trước và holdout/live độc lập.'
  }, null, 2));
}

function canonicalRows(rows) {
  const seen = new Set();
  return rows.filter((row) => {
    const key = `${dateKey(row.date)}|${row.kind}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function summarizeGroup(rows) {
  const metric = mean(rows.map((row) => row.metricValue));
  const baseline = mean(rows.map((row) => row.baseline));
  const probabilities = rows.filter((row) => row.predictedProbability !== null);
  const predicted = probabilities.length > 0
    ? mean(probabilities.map((row) => row.predictedProbability))
    : null;
  return {
    method: rows[0].method,
    kind: rows[0].kind,
    scope: rows[0].scope,
    modelProfile: rows[0].modelProfile,
    edgeStatusAtIssue: rows[0].edgeStatus,
    testedDays: rows.length,
    fromDate: dateKey(rows[0].date),
    toDate: dateKey(rows[rows.length - 1].date),
    hitDays: rows.filter((row) => row.isHit).length,
    hitRate: round(rows.filter((row) => row.isHit).length / rows.length * 100),
    metricName: rows[0].metricName,
    meanMetric: round(metric),
    meanBaseline: round(baseline),
    pooledLift: round(baseline > 0 ? metric / baseline : 0),
    meanPredictedProbability: predicted === null ? null : round(predicted),
    calibrationGap: predicted === null ? null : round(predicted - metric)
  };
}

function parseArgs(argv) {
  const methodArg = argv.find((arg) => arg.startsWith('--method='));
  return { method: methodArg ? methodArg.slice('--method='.length) : null };
}

function loadDatabaseUrl() {
  const env = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '';
  const match = env.match(/^DATABASE_URL\s*=\s*"?([^"\n]+)"?/m);
  if (match && !process.env.DATABASE_URL) process.env.DATABASE_URL = match[1];
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function dateKey(value) {
  return value.toISOString().slice(0, 10);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
