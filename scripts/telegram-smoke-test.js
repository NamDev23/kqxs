require('sucrase/register');

const {
  buildDailyTelegramMessage,
  sendDailyTelegramReport
} = require('../lib/telegram-notifier.ts');

async function main() {
  const analysis = buildAnalysisFixture();
  const input = {
    resultDate: '2026-08-15',
    targetDate: '2026-08-16',
    special: '12339',
    sources: ['source-a', 'source-b'],
    verifications: [{
      snapshotDate: '2026-08-14',
      revision: 1,
      issuedBeforeDraw: true,
      hits: { lo2: ['39'], de: [] }
    }],
    analysis
  };

  const strictMessage = buildDailyTelegramMessage(input, 'qualified');
  assert(strictMessage.includes('XSMB DAILY'), 'Missing report title');
  assert(strictMessage.includes('Chỉ là nghiên cứu thống kê'), 'Missing uncertainty disclaimer');
  assert(strictMessage.includes('Dữ liệu:</b> 395 kỳ'), 'Missing data count');
  assert(strictMessage.includes('Lô 2 số'), 'Qualified branch must be published');
  assert(!strictMessage.includes('Đề đuôi ĐB</b> ['), 'Legacy research-only branch must stay hidden');

  const postDrawMessage = buildDailyTelegramMessage({
    ...input,
    verifications: [{ ...input.verifications[0], issuedBeforeDraw: false }]
  }, 'qualified');
  assert(
    postDrawMessage.includes('không dùng để chấm live accuracy'),
    'Post-draw snapshots must be excluded from the canonical report'
  );

  const blockedMessage = buildDailyTelegramMessage({
    ...input,
    analysis: {
      ...analysis,
      dataQuality: {
        ...analysis.dataQuality,
        canPublish: false,
        status: 'blocked',
        blockingReasons: ['Dữ liệu huấn luyện chậm 7 ngày so với target']
      }
    }
  }, 'watch');
  assert(blockedMessage.includes('Tạm dừng phát số'), 'Stale data must block number publication');

  const noSignalAnalysis = buildAnalysisFixture();
  noSignalAnalysis.prediction.combinations.officialPortfolio.hasSignal = false;
  noSignalAnalysis.prediction.combinations.officialPortfolio.selectedTicketCount = 0;
  noSignalAnalysis.prediction.combinations.officialPortfolio.products.loto2.status = 'no_signal';
  noSignalAnalysis.prediction.combinations.officialPortfolio.products.loto2.selectedPicks = [];
  const liveGatedMessage = buildDailyTelegramMessage({ ...input, analysis: noSignalAnalysis }, 'qualified');
  assert(liveGatedMessage.includes('NO SIGNAL'), 'Reward-aware no-signal decision must be explicit');
  assert(!liveGatedMessage.includes('ROI WF 12.00%'), 'Shadow-only tickets must not be published');

  let postedBody = null;
  const fakeFetch = async (_url, init) => {
    postedBody = JSON.parse(init.body);
    return {
      ok: true,
      status: 200,
      json: async () => ({ ok: true, result: { message_id: 123 } })
    };
  };
  const delivery = await sendDailyTelegramReport(input, {
    env: {
      TELEGRAM_BOT_TOKEN: 'test-token',
      TELEGRAM_CHAT_ID: '-100123',
      TELEGRAM_MIN_EDGE_STATUS: 'watch'
    },
    fetcher: fakeFetch
  });

  assert(delivery.sent && delivery.messageId === 123, 'Mock delivery failed');
  assert(postedBody?.chat_id === '-100123', 'Telegram chat id was not forwarded');
  assert(postedBody?.parse_mode === 'HTML', 'Telegram parse mode must be HTML');

  const unconfigured = await sendDailyTelegramReport(input, { env: {} });
  assert(!unconfigured.configured && !unconfigured.sent, 'Missing credentials must skip safely');

  console.log(JSON.stringify({
    ok: true,
    strictLength: strictMessage.length,
    blocked: true,
    mockedMessageId: delivery.messageId
  }, null, 2));
}

function buildAnalysisFixture() {
  const set = (kind, label, edgeStatus, numbers, lift) => ({
    kind,
    label,
    numbers,
    ranked: [],
    pickCount: numbers.length,
    probability: 0,
    baselineProbability: 0,
    baselineLabel: '',
    edgeStatus,
    edgeLabel: edgeStatus === 'qualified' ? 'Đủ bằng chứng' : 'Chưa đủ bằng chứng',
    edgeReason: '',
    backtestLift: lift,
    backtestMetric: 0,
    backtestBaseline: 0,
    testedDraws: 180,
    modelProfile: 'balanced',
    modelProfileLabel: 'Balanced',
    profileLift: 0,
    metricLabel: ''
  });
  const single = (kind, label, sourceKind, number) => ({
    kind,
    label,
    description: '',
    sourceKind,
    number,
    ranked: null,
    probability: 0,
    baseline: 0,
    lift: 0,
    testedDraws: 180,
    hitDays: 0,
    edgeStatus: 'research_only',
    edgeLabel: 'Chưa đủ bằng chứng',
    edgeReason: '',
    published: false,
    modelProfile: 'balanced',
    modelProfileLabel: 'Balanced',
    profileLift: 0
  });

  return {
    prediction: {
      date: '2026-08-16',
      de: ['01'],
      lo2: ['39', '12'],
      lo3: ['039'],
      bacang: ['039'],
      bachThuLo: '39',
      bachThuDe: '01',
      songthulode: [],
      combinations: {
        xien2: { picks: [] },
        xien3: { picks: [] },
        xien4: { picks: [] },
        officialPortfolio: {
          version: 'official_reward_aware_v1',
          targetDate: '2026-08-16',
          policy: { publishThreshold: 'qualified_only', allowsNoSignal: true, minimumBacktestDays: 180, minimumLiveDays: 30 },
          hasSignal: true,
          selectedTicketCount: 1,
          products: {
            loto2: {
              kind: 'loto2',
              label: 'Lô 2 số',
              status: 'qualified',
              statusLabel: 'Đủ bằng chứng để phát',
              reason: 'fixture',
              researchPicks: [{ selection: '39', numbers: ['39'], expectedGross: 1.2, expectedNet: 0.2, score: 120, reasons: [] }],
              selectedPicks: [{ selection: '39', numbers: ['39'], expectedGross: 1.2, expectedNet: 0.2, score: 120, reasons: [] }],
              backtest: { testedDays: 180, stakeUnits: 180, payoutUnits: 201.6, netUnits: 21.6, roi: 12, winningTickets: 10, positiveFolds: 3, folds: [], meanDailyNet: 0.12, netInterval: { low: 0.01, high: 0.23 }, recentRoi: 10 },
              modelProfile: 'official_reward_aware_v1'
            }
          }
        }
      },
      dauduoi: { dau: [], duoi: [] }
    },
    sets: {
      lo2: set('lo2', 'Lô 2 số', 'qualified', ['39', '12'], 1.12),
      de: set('de', 'Đề đuôi ĐB', 'research_only', ['01'], 0.8),
      lo3: set('lo3', 'Lô 3 số', 'research_only', ['039'], 0.9),
      bacang: set('bacang', '3 càng ĐB', 'research_only', ['039'], 0.9)
    },
    singles: {
      bachThuLo: single('bachThuLo', 'Bạch thủ lô', 'lo2', '39'),
      bachThuDe: single('bachThuDe', 'Bạch thủ đề', 'de', '01')
    },
    backtest: {
      summaries: [],
      aggregate: {
        testedDraws: 180,
        modelScore: 9.4,
        randomBaseline: 9.1,
        lift: 1.03,
        qualifiedMarkets: 1,
        watchMarkets: 0,
        researchMarkets: 3,
        conclusion: ''
      }
    },
    analysis: {
      frequency: [],
      hotCold: { hot: [], cold: [] },
      pairs: [],
      specialDigits: { heads: [], tails: [], sums: [], sampleSize: 0 }
    },
    dataQuality: {
      dataPoints: 395,
      firstDate: '2025-07-17',
      lastDate: '2026-08-15',
      validDraws: 395,
      invalidDraws: 0,
      warnings: [],
      blockingReasons: [],
      canPublish: true,
      status: 'ready',
      lagDays: 1,
      completeness: 100,
      missingDates: []
    },
    meta: {
      method: 'fixture',
      generatedAt: '2026-08-15T12:00:00.000Z',
      targetDate: '2026-08-16',
      trainingWindow: 365
    }
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
