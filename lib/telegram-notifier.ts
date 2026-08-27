import type {
  EdgeStatus,
  PredictionKind,
  ProductPredictionResult,
  SinglePickKind
} from './product-prediction-engine';
import type { ModelOutcomeMonitor } from './model-outcome-monitor';

type TelegramFetch = typeof fetch;

interface TelegramConfig {
  botToken: string;
  chatId: string;
  minEdgeStatus: Exclude<EdgeStatus, 'research_only'>;
  disableNotification: boolean;
}

export interface DailyTelegramReportInput {
  resultDate: string;
  targetDate: string;
  special: string;
  sources: string[];
  verifications: Array<{
    snapshotDate: string;
    revision: number;
    issuedBeforeDraw?: boolean;
    hits: Partial<Record<PredictionKind | SinglePickKind, string[]>>;
  }>;
  analysis: ProductPredictionResult;
  modelMonitor?: ModelOutcomeMonitor;
}

export interface TelegramSendResult {
  configured: boolean;
  sent: boolean;
  messageId: number | null;
  minEdgeStatus: 'qualified' | 'watch';
  reason?: string;
}

const STATUS_RANK: Record<EdgeStatus, number> = {
  research_only: 0,
  watch: 1,
  qualified: 2
};

const SET_ORDER: PredictionKind[] = ['lo2', 'de', 'lo3', 'bacang'];
const SINGLE_ORDER: SinglePickKind[] = ['bachThuLo', 'bachThuDe'];

export function getTelegramConfig(
  env: NodeJS.ProcessEnv = process.env
): TelegramConfig | null {
  const botToken = env.TELEGRAM_BOT_TOKEN?.trim() ?? '';
  const chatId = env.TELEGRAM_CHAT_ID?.trim() ?? '';
  if (!botToken || !chatId) return null;

  return {
    botToken,
    chatId,
    minEdgeStatus: env.TELEGRAM_MIN_EDGE_STATUS?.trim().toLowerCase() === 'watch'
      ? 'watch'
      : 'qualified',
    disableNotification: parseBoolean(env.TELEGRAM_SILENT)
  };
}

export function buildDailyTelegramMessage(
  input: DailyTelegramReportInput,
  minEdgeStatus: 'qualified' | 'watch' = 'qualified'
): string {
  const canonical = input.verifications.find((item) => item.issuedBeforeDraw !== false) ?? null;
  const lines = [
    `<b>XSMB DAILY · ${escapeHtml(input.resultDate)}</b>`,
    '',
    '<b>Kết quả đã xác minh</b>',
    `ĐB: <code>${escapeHtml(input.special)}</code>`,
    `Nguồn: ${escapeHtml(input.sources.join(' + ') || 'không rõ')}`
  ];

  if (canonical) {
    lines.push(
      `Snapshot gốc: ${escapeHtml(canonical.snapshotDate)} · rev ${canonical.revision}`,
      formatHitLine('Đề', canonical.hits.de),
      formatHitLine('Lô 2', canonical.hits.lo2),
      formatHitLine('Lô 3', canonical.hits.lo3),
      formatHitLine('3 càng', canonical.hits.bacang),
      formatHitLine('BT lô', canonical.hits.bachThuLo),
      formatHitLine('BT đề', canonical.hits.bachThuDe)
    );
  } else {
    lines.push(input.verifications.length > 0
      ? 'Có snapshot sau giờ quay nhưng không dùng để chấm live accuracy.'
      : 'Không có snapshot trước kỳ quay để đối chiếu.');
  }

  lines.push('', `<b>Tín hiệu cho ${escapeHtml(input.targetDate)}</b>`);

  if (!input.analysis.dataQuality.canPublish) {
    lines.push(
      '⛔ Tạm dừng phát số vì dữ liệu chưa đạt điều kiện.',
      ...input.analysis.dataQuality.blockingReasons.slice(0, 3).map((reason) => `• ${escapeHtml(reason)}`)
    );
  } else {
    const eligibleSets = SET_ORDER
      .map((kind) => input.analysis.sets[kind])
      .filter((set) => meetsMinimumStatus(set.edgeStatus, minEdgeStatus));
    const eligibleSingles = SINGLE_ORDER
      .map((kind) => input.analysis.singles[kind])
      .filter((single) => single.published && meetsMinimumStatus(single.edgeStatus, minEdgeStatus));
    const publishableSets = eligibleSets.filter((set) => passesLiveGate(input.modelMonitor, set.kind));
    const publishableSingles = eligibleSingles.filter((single) => passesLiveGate(input.modelMonitor, single.kind));
    const suppressedKinds = [
      ...eligibleSets.filter((set) => !passesLiveGate(input.modelMonitor, set.kind)).map((set) => set.label),
      ...eligibleSingles.filter((single) => !passesLiveGate(input.modelMonitor, single.kind)).map((single) => single.label)
    ];

    if (publishableSets.length === 0 && publishableSingles.length === 0) {
      lines.push(`🟡 Không có nhánh đạt ngưỡng “${statusLabel(minEdgeStatus)}”; hôm nay hệ thống chủ động không phát số.`);
    } else {
      publishableSets.forEach((set) => {
        lines.push(
          `• <b>${escapeHtml(set.label)}</b> [${escapeHtml(set.edgeLabel)}, ${set.backtestLift.toFixed(2)}x]: <code>${escapeHtml(set.numbers.join(' '))}</code>`
        );
      });
      publishableSingles.forEach((single) => {
        lines.push(
          `• <b>${escapeHtml(single.label)}</b> [${escapeHtml(single.edgeLabel)}, ${single.lift.toFixed(2)}x]: <code>${escapeHtml(single.number)}</code>`
        );
      });
      if (minEdgeStatus === 'watch') {
        lines.push('⚠️ Cấu hình đang cho phép gửi cả tín hiệu yếu; CI95 có thể vẫn cắt baseline.');
      }
    }
    if (suppressedKinds.length > 0) {
      lines.push(`⛔ Live gate tạm dừng: ${escapeHtml(suppressedKinds.join(', '))} (đủ ≥30 ngày nhưng đang dưới baseline).`);
    }
  }

  const aggregate = input.analysis.backtest.aggregate;
  lines.push(
    '',
    `<b>Kiểm định:</b> ${aggregate.modelScore.toFixed(2)}% so với nền ${aggregate.randomBaseline.toFixed(2)}% · ${aggregate.lift.toFixed(2)}x`,
    `<b>Dữ liệu:</b> ${input.analysis.dataQuality.dataPoints} kỳ, mới nhất ${escapeHtml(input.analysis.dataQuality.lastDate ?? 'không có')}`,
  );

  if (input.modelMonitor) {
    lines.push(
      `<b>Theo dõi live ${escapeHtml(input.analysis.meta.method)}:</b> ${input.modelMonitor.eligibleDays}/${input.modelMonitor.minimumDays} ngày · ${escapeHtml(input.modelMonitor.status)}`
    );
  }

  lines.push('', '<i>Chỉ là nghiên cứu thống kê. Xổ số có tính ngẫu nhiên; không có cam kết trúng.</i>');

  return truncateTelegramHtml(lines.join('\n'));
}

export async function sendDailyTelegramReport(
  input: DailyTelegramReportInput,
  options: { env?: NodeJS.ProcessEnv; fetcher?: TelegramFetch } = {}
): Promise<TelegramSendResult> {
  const config = getTelegramConfig(options.env);
  if (!config) {
    return {
      configured: false,
      sent: false,
      messageId: null,
      minEdgeStatus: 'qualified',
      reason: 'TELEGRAM_BOT_TOKEN hoặc TELEGRAM_CHAT_ID chưa được cấu hình'
    };
  }

  const message = buildDailyTelegramMessage(input, config.minEdgeStatus);
  const fetcher = options.fetcher ?? fetch;
  const response = await fetcher(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: config.chatId,
      text: message,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      disable_notification: config.disableNotification
    }),
    signal: AbortSignal.timeout(15_000)
  });

  const payload = await response.json().catch(() => null) as {
    ok?: boolean;
    description?: string;
    result?: { message_id?: number };
  } | null;

  if (!response.ok || !payload?.ok) {
    throw new Error(`Telegram send failed (${response.status}): ${payload?.description ?? 'unknown response'}`);
  }

  return {
    configured: true,
    sent: true,
    messageId: payload.result?.message_id ?? null,
    minEdgeStatus: config.minEdgeStatus
  };
}

function meetsMinimumStatus(status: EdgeStatus, minimum: 'qualified' | 'watch') {
  return STATUS_RANK[status] >= STATUS_RANK[minimum];
}

function passesLiveGate(monitor: ModelOutcomeMonitor | undefined, kind: PredictionKind | SinglePickKind) {
  return monitor?.byKind[kind]?.recommendation !== 'review_model';
}

function formatHitLine(label: string, hits: string[] | undefined) {
  return `${escapeHtml(label)}: ${hits?.length ? `<code>${escapeHtml(hits.join(' '))}</code>` : '—'}`;
}

function statusLabel(status: 'qualified' | 'watch') {
  return status === 'qualified' ? 'Đủ bằng chứng' : 'Tín hiệu yếu';
}

function parseBoolean(value: string | undefined) {
  return ['1', 'true', 'yes', 'on'].includes(value?.trim().toLowerCase() ?? '');
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function truncateTelegramHtml(message: string) {
  if (message.length <= 4000) return message;
  return `${message.slice(0, 3940)}\n<i>… báo cáo đã được rút gọn</i>`;
}
