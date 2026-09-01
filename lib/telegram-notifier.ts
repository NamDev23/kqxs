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
    const portfolio = input.analysis.prediction.combinations.officialPortfolio;
    const selectedProducts = Object.values(portfolio.products)
      .filter((product) => product.selectedPicks.length > 0);
    if (!portfolio.hasSignal || selectedProducts.length === 0) {
      lines.push('🟡 NO SIGNAL — model reward-aware không tìm thấy vé vượt cổng ROI, CI95 và ổn định thời gian; hôm nay chủ động không phát vé.');
    } else {
      selectedProducts.forEach((product) => lines.push(
        `• <b>${escapeHtml(product.label)}</b> [ROI WF ${product.backtest.roi.toFixed(2)}%]: <code>${escapeHtml(product.selectedPicks.map((pick) => pick.selection).join(' · '))}</code>`
      ));
    }
    const researchOnly = Object.values(portfolio.products)
      .filter((product) => product.researchPicks.length > 0 && product.selectedPicks.length === 0)
      .map((product) => product.label);
    if (researchOnly.length > 0) {
      lines.push(`🔬 Chỉ chạy shadow, không tính là vé phát: ${escapeHtml(researchOnly.join(', '))}.`);
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

function formatHitLine(label: string, hits: string[] | undefined) {
  return `${escapeHtml(label)}: ${hits?.length ? `<code>${escapeHtml(hits.join(' '))}</code>` : '—'}`;
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
