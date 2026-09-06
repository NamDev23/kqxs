require('sucrase/register');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { createProductPrediction, normalizeLotteryDraws } = require('../lib/product-prediction-engine.ts');
const { buildSignalPublication } = require('../lib/signal-publication.ts');
const { buildOfficialLiveEvidence } = require('../lib/official-live-evidence.ts');

// Read-only replay of an /api/history export. Never saves a historical prediction.
if (!process.argv[2]) throw new Error('Usage: npm run test:replay -- /absolute/path/to/history.json');
const payload = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
assert.equal(payload.success, true);
const draws = normalizeLotteryDraws(payload.data);
assert.equal(draws.length, payload.data.length, 'Export contains malformed results');
assert(draws.length >= 360, 'Need 180 training + 180 evaluation draws');
const targetDate = new Date(Date.parse(`${draws.at(-1).date}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);
const issuedAt = new Date(`${targetDate}T01:00:00Z`);
const evidence = buildOfficialLiveEvidence([], draws, targetDate);
const analysis = createProductPrediction(draws, targetDate, issuedAt, evidence);
assert.equal(analysis.dataQuality.canPublish, true, analysis.dataQuality.blockingReasons.join('; '));
assert.equal(analysis.prediction.combinations.officialPortfolio.selectedTicketCount, 0);
assert.equal(buildSignalPublication(analysis, targetDate).status, 'no_signal');
for (const product of Object.values(analysis.prediction.combinations.officialPortfolio.products)) {
  assert.equal(product.backtest.testedDays, 180);
  assert.equal(product.backtest.folds.length, 3);
  assert.equal(product.selectedPicks.length, 0);
  assert(product.reason.includes('0/30'), 'Must explain absent live evidence');
}
const poisonedFuture = { ...draws.at(-1), date: targetDate, special: '00000' };
const rerun = createProductPrediction([...draws, poisonedFuture], targetDate, issuedAt, evidence);
assert.deepEqual(rerun.prediction, analysis.prediction, 'Target result leaked into ranking or backtest');
console.log(JSON.stringify({ ok: true, readOnly: true, draws: draws.length, latest: draws.at(-1).date,
  targetDate, publication: buildSignalPublication(analysis, targetDate),
  researchBacktests: Object.fromEntries(Object.entries(analysis.prediction.combinations.officialPortfolio.products)
    .map(([kind, product]) => [kind, { roi: product.backtest.roi, interval: product.backtest.netInterval,
      diagnostics: product.backtest.diagnostics, diversification: product.backtest.diversification }])) }, null, 2));
