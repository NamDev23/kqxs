require('sucrase/register');
const assert = require('node:assert/strict');
const { buildOfficialLiveEvidence, hasQualifiedLiveEvidence, PUBLICATION_POLICY } = require('../lib/official-live-evidence.ts');
const { buildSignalPublication } = require('../lib/signal-publication.ts');
const { settleOfficialLoto2, settleOfficialLoto3, settleOfficialPairs } = require('../lib/legal-lottery-products.ts');
const { uniformGrossForDraw, selectDiversifiedPairs, portfolioConcentration } = require('../lib/legal-product-prediction.ts');

// Synthetic fixtures test mechanics, never claimed as model performance.
const picks = [['45', '11'], ['45', '22'], ['11', '22']].map(numbers => ({ numbers, selection: numbers.join('+'), expectedGross: 1.2, expectedNet: 0.2, score: 120, reasons: [] }));
const draw = date => ({ date, special: '12345', first: ['54345'], second: ['10011', '20011'],
  third: ['30022', '40022', '50033', '60033', '70044', '80044'], fourth: ['1000', '2000', '3000', '4000'],
  fifth: ['1000', '2000', '3000', '4000', '5000', '6000'], sixth: ['345', '222', '333'], seventh: ['01', '02', '03', '04'] });
const dates = Array.from({ length: 30 }, (_, i) => `2026-08-${String(i + 1).padStart(2, '0')}`);
const snapshots = dates.map(date => ({ id: date, predictionFor: date, createdAt: `${date}T01:00:00Z`, dataQuality: { canPublish: true },
  combinations: { officialPortfolio: { version: 'official_reward_aware_v1', targetDate: date,
    products: { xien2: { modelProfile: 'official_reward_aware_v1', researchPicks: picks } } } } }));
const target = '2026-09-01';
const draws = dates.map(draw);
const evidence = buildOfficialLiveEvidence(snapshots, draws, target).xien2;
assert.equal(evidence.eligibleDays, 30);
assert.equal(hasQualifiedLiveEvidence(evidence, target), true);
assert.deepEqual(buildOfficialLiveEvidence(snapshots, draws, target).xien2, evidence, 'Bootstrap must be deterministic');
assert.equal(buildOfficialLiveEvidence(snapshots.slice(0, 29), draws, target).xien2.qualified, false);
assert.equal(buildOfficialLiveEvidence(snapshots, [...draws, draw('2026-08-31')], target).xien2.qualified, false, 'Missing latest settlement must block publication');
assert.equal(buildOfficialLiveEvidence([], draws, target).xien2.roi, null);
assert.equal(buildOfficialLiveEvidence([...snapshots, ...snapshots], draws, target).xien2.eligibleDays, 30, 'One result date is one observation');
assert.equal(buildOfficialLiveEvidence(snapshots, draws, '2026-08-30').xien2.eligibleDays, 29, 'Do not include target or future results');
const badVariants = [
  row => ({ ...row, createdAt: `${row.predictionFor}T11:15:00Z` }),
  row => ({ ...row, createdAt: 'invalid' }),
  row => ({ ...row, predictionFor: 'invalid' }),
  row => ({ ...row, dataQuality: null }),
  row => { row.combinations.officialPortfolio.version = 'different'; return row; },
  row => { row.combinations.officialPortfolio.targetDate = target; return row; },
  row => { row.combinations.officialPortfolio.products.xien2.researchPicks = [picks[0]]; return row; },
  row => { row.combinations.officialPortfolio.products.xien2.researchPicks = [picks[0], picks[0], picks[2]]; return row; }
];
for (const mutate of badVariants) {
  assert.equal(buildOfficialLiveEvidence(snapshots.map(row => mutate(structuredClone(row))), draws, target).xien2.eligibleDays, 0);
}
const later = snapshots.map(row => { const copy = structuredClone(row); copy.id += '-revision2'; copy.createdAt = `${row.predictionFor}T02:00:00Z`; return copy; });
assert.deepEqual(buildOfficialLiveEvidence([...later, ...snapshots], draws, target).xien2.snapshotIds, dates, 'Earliest pre-draw snapshot must win, not latest revision');
const backtest = { testedDays: 180, winningTickets: 10, roi: 12, recentRoi: 10, positiveFolds: 3, netInterval: { low: 0.01, high: 2 }, diagnostics: { edgeLowerBound: 0.01, netWithoutBestDay: 1 } };
const analysis = { meta: { generatedAt: '2026-08-31T12:00:00Z' }, dataQuality: { canPublish: true }, prediction: { combinations: {
  officialPortfolio: { targetDate: target, policy: { version: PUBLICATION_POLICY }, hasSignal: true,
    products: { xien2: { kind: 'xien2', label: 'Xiên 2', status: 'qualified', researchPicks: picks, selectedPicks: picks, liveEvidence: evidence, backtest } } }
} } };
assert.equal(buildSignalPublication(analysis, target).products.length, 1);
for (const mutate of [
  a => { a.dataQuality.canPublish = false; },
  a => { a.meta.generatedAt = `${target}T11:15:00Z`; },
  a => { a.prediction.combinations.officialPortfolio.policy = {}; },
  a => { a.prediction.combinations.officialPortfolio.hasSignal = false; },
  a => { a.prediction.combinations.officialPortfolio.products.xien2.liveEvidence = undefined; },
  a => { a.prediction.combinations.officialPortfolio.products.xien2.liveEvidence.eligibleDays = 29; },
  a => { a.prediction.combinations.officialPortfolio.products.xien2.liveEvidence.asOf = '2026-08-31'; },
  a => { a.prediction.combinations.officialPortfolio.products.xien2.liveEvidence.roi = Infinity; },
  a => { a.prediction.combinations.officialPortfolio.products.xien2.liveEvidence.blockers = undefined; },
  a => { a.prediction.combinations.officialPortfolio.products.xien2.selectedPicks = [picks[0]]; },
  a => { a.prediction.combinations.officialPortfolio.products.xien2.backtest.roi = -1; }
]) { const copy = structuredClone(analysis); mutate(copy); assert.equal(buildSignalPublication(copy, target).products.length, 0); }
assert.equal(settleOfficialLoto2([], draw(target)).roi, null);
assert.equal(settleOfficialLoto3([], draw(target)).roi, null);
assert.equal(settleOfficialPairs('xien2', [], draw(target)).roi, null);
const actualSep2 = { date: '2026-09-02', special: '44542', first: ['70943'], second: ['20944', '30062'],
  third: ['60516', '22853', '65620', '02493', '52067', '04270'], fourth: ['3422', '1237', '4540', '1955'],
  fifth: ['9150', '5572', '7077', '4767', '4522', '2340'], sixth: ['261', '232', '249'], seventh: ['15', '64', '32', '10'] };
assert.equal(settleOfficialLoto2(['38', '83', '54'], actualSep2).roi, -100);
assert.equal(settleOfficialLoto3(['000', '754', '147'], actualSep2).roi, -100);
assert.equal(settleOfficialPairs('xien2', [{ numbers: ['83', '52'] }, { numbers: ['83', '54'] }, { numbers: ['83', '61'] }], actualSep2).roi, -100);
console.log('PASS: forward gate, date/revision integrity, fail-closed publication, deterministic bootstrap, no-stake semantics and Sep 2 regression');
const domain2 = Array.from({ length: 100 }, (_, i) => String(i).padStart(2, '0'));
const domain3 = Array.from({ length: 1000 }, (_, i) => String(i).padStart(3, '0'));
assert.equal(uniformGrossForDraw('loto2', actualSep2), settleOfficialLoto2(domain2, actualSep2).payoutUnits / 100);
assert.equal(uniformGrossForDraw('loto3', actualSep2), settleOfficialLoto3(domain3, actualSep2).payoutUnits / 1000);
const allPairs = domain2.flatMap((n, i) => domain2.slice(i + 1).map(m => ({ numbers: [n, m] })));
assert(Math.abs(uniformGrossForDraw('xien2', actualSep2) - settleOfficialPairs('xien2', allPairs, actualSep2).payoutUnits / allPairs.length) < 1e-12);
const ranked = [['83', '52'], ['83', '54'], ['83', '61'], ['52', '61']].map(numbers => ({ numbers, selection: numbers.join('+') }));
const diversified = selectDiversifiedPairs(ranked, 3);
assert.equal(diversified.length, 3);
assert.equal(portfolioConcentration(diversified).maxNumberExposure, 2);
assert.deepEqual(diversified.map(p => p.selection), ['83+52', '83+54', '52+61']);
assert.equal(buildOfficialLiveEvidence(snapshots, draws, target, 'pairs_max_exposure_2_v1').xien2.eligibleDays, 0, 'New challenger cannot inherit old forward record');
console.log('PASS: exact uniform baseline, fixed-count diversification and isolated challenger evidence');
