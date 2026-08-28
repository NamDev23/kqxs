import crypto from 'crypto';
import { PRODUCT_METHOD, ProductPredictionResult } from './product-prediction-engine';

export interface SnapshotRecordLike {
  date: Date;
  predictionFor: Date;
  revision?: number | null;
  de: string[];
  lo2: string[];
  lo3: string[];
  bacang: string[];
  bachThuLo?: string | null;
  bachThuDe?: string | null;
  songthulode: unknown;
  combinations?: unknown;
  dauduoi: unknown;
  sets?: unknown;
  singles?: unknown;
  backtest?: unknown;
  analysisView?: unknown;
  dataQuality?: unknown;
  modelMeta?: unknown;
  snapshotHash?: string | null;
}

export function buildPredictionRecordData(
  analysis: ProductPredictionResult,
  date: Date,
  predictionFor: Date,
  revision: number
) {
  const hash = createSnapshotHash(analysis);

  return {
    date,
    predictionFor,
    revision,
    de: analysis.prediction.de,
    lo2: analysis.prediction.lo2,
    lo3: analysis.prediction.lo3,
    bacang: analysis.prediction.bacang,
    bachThuLo: analysis.prediction.bachThuLo,
    bachThuDe: analysis.prediction.bachThuDe,
    songthulode: toJson(analysis.prediction.songthulode),
    combinations: toJson(analysis.prediction.combinations),
    dauduoi: toJson(analysis.prediction.dauduoi),
    sets: toJson(analysis.sets),
    singles: toJson(analysis.singles),
    backtest: toJson(analysis.backtest),
    analysisView: toJson(analysis.analysis),
    dataQuality: toJson(analysis.dataQuality),
    modelMeta: toJson({
      ...analysis.meta,
      method: PRODUCT_METHOD
    }),
    snapshotHash: hash,
    method: PRODUCT_METHOD,
    dataPoints: analysis.dataQuality.dataPoints
  };
}

export function createSnapshotHash(analysis: ProductPredictionResult): string {
  const stablePayload = {
    method: PRODUCT_METHOD,
    targetDate: analysis.meta.targetDate,
    trainingWindow: analysis.meta.trainingWindow,
    prediction: analysis.prediction,
    sets: analysis.sets,
    singles: analysis.singles,
    backtest: analysis.backtest,
    dataQuality: analysis.dataQuality
  };

  return crypto.createHash('sha256').update(stableStringify(stablePayload)).digest('hex');
}

export function materializePredictionSnapshot(record: SnapshotRecordLike, fallback: ProductPredictionResult) {
  return {
    prediction: {
      date: dateKey(record.predictionFor),
      de: record.de ?? fallback.prediction.de,
      lo2: record.lo2 ?? fallback.prediction.lo2,
      lo3: record.lo3 ?? fallback.prediction.lo3,
      bacang: record.bacang ?? fallback.prediction.bacang,
      bachThuLo: record.bachThuLo ?? record.lo2?.[0] ?? fallback.prediction.bachThuLo,
      bachThuDe: record.bachThuDe ?? record.de?.[0] ?? fallback.prediction.bachThuDe,
      songthulode: parseJsonField(record.songthulode, fallback.prediction.songthulode),
      combinations: parseJsonField(record.combinations, fallback.prediction.combinations),
      dauduoi: parseJsonField(record.dauduoi, fallback.prediction.dauduoi)
    },
    sets: parseJsonField(record.sets, fallback.sets),
    singles: parseJsonField(record.singles, fallback.singles),
    backtest: parseJsonField(record.backtest, fallback.backtest),
    analysis: parseJsonField(record.analysisView, fallback.analysis),
    dataQuality: parseJsonField(record.dataQuality, fallback.dataQuality),
    modelMeta: parseJsonField(record.modelMeta, fallback.meta)
  };
}

export function dateKey(value: Date | string): string {
  if (typeof value === 'string') return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

export function parseJsonField<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value !== 'string') return value as T;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, entryValue]) => entryValue !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));

  return `{${entries.map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`).join(',')}}`;
}

function toJson(value: unknown): any {
  return JSON.parse(JSON.stringify(value));
}
