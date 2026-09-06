require('sucrase/register');
const assert = require('node:assert/strict');
const { PrismaClient } = require('@prisma/client');
const { normalizeLotteryDraws, createProductPrediction } = require('../lib/product-prediction-engine.ts');
const { loadOfficialLiveEvidence, hasQualifiedLiveEvidence } = require('../lib/official-live-evidence.ts');
const { buildSignalPublication } = require('../lib/signal-publication.ts');
const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.lotteryResult.findMany({ orderBy: { date: 'desc' }, take: 730 });
  const draws = normalizeLotteryDraws(rows);
  assert.equal(draws.length, rows.length, 'Invalid draw data');
  assert(draws.length >= 360);
  const targetDate = new Date(Date.parse(`${draws.at(-1).date}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);
  const evidence = await loadOfficialLiveEvidence(prisma, draws, targetDate);
  const analysis = createProductPrediction(draws, targetDate, new Date(), evidence);
  const publication = buildSignalPublication(analysis, targetDate);
  const portfolio = analysis.prediction.combinations.officialPortfolio;
  for (const product of Object.values(portfolio.products)) {
    assert(product.liveEvidence, 'Missing forward record');
    assert.equal(product.liveEvidence.latestResultDate, draws.at(-1).date);
    if (!hasQualifiedLiveEvidence(product.liveEvidence, targetDate)) assert.equal(product.selectedPicks.length, 0);
    if (product.kind === 'xien2') {
      assert.equal(product.challengerPicks.length, 3);
      assert.equal(product.backtest.diversification.testedDays, 180);
    }
  }
  const broken = structuredClone(analysis);
  broken.dataQuality.canPublish = false;
  assert.equal(buildSignalPublication(broken, targetDate).products.length, 0);
  console.log(JSON.stringify({ ok: true, readOnly: true, method: analysis.meta.method,
    draws: draws.length, through: draws.at(-1).date, targetDate, publication,
    evidence: Object.fromEntries(Object.entries(evidence).map(([kind, row]) => [kind,
      { eligibleDays: row.eligibleDays, roi: row.roi, blockers: row.blockers, challenger: row.challenger }])) }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
