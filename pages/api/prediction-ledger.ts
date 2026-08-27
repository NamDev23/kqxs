import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { dateKey, parseJsonField } from '@/lib/prediction-snapshot';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const days = clampNumber(Number(req.query.days ?? 14), 1, 90);
    const predictions = await prisma.prediction.findMany({
      include: { accuracy: true, evaluations: true },
      orderBy: [
        { predictionFor: 'desc' },
        { date: 'desc' },
        { revision: 'desc' }
      ],
      take: days * 4
    });
    const dates = Array.from(new Set(predictions.map((prediction) => dateKey(prediction.predictionFor))));
    const reports = await prisma.dailyLearningReport.findMany({
      where: {
        date: {
          in: dates.map((date) => new Date(`${date}T00:00:00.000Z`))
        }
      }
    });
    const reportByDate = new Map(reports.map((report) => [dateKey(report.date), report]));

    res.status(200).json({
      success: true,
      data: predictions.map((prediction) => {
        const predictionFor = dateKey(prediction.predictionFor);
        const report = reportByDate.get(predictionFor);

        return {
          id: prediction.id,
          snapshotDate: dateKey(prediction.date),
          predictionFor,
          revision: prediction.revision,
          method: prediction.method,
          dataPoints: prediction.dataPoints,
          de: prediction.de,
          lo2: prediction.lo2,
          lo3: prediction.lo3,
          bacang: prediction.bacang,
          bachThuLo: prediction.bachThuLo,
          bachThuDe: prediction.bachThuDe,
          accuracy: prediction.accuracy
            ? {
                de: prediction.accuracy.deAccuracy,
                lo2: prediction.accuracy.lo2Accuracy,
                lo3: prediction.accuracy.lo3Accuracy,
                bacang: prediction.accuracy.bacangAccuracy,
                bachThuLo: prediction.accuracy.bachThuLoAccuracy,
                bachThuDe: prediction.accuracy.bachThuDeAccuracy,
                overall: prediction.accuracy.overallAccuracy
              }
            : null,
          hits: report
            ? findHitsForPrediction(parseJsonField(report.byPrediction, []), prediction.id)
            : null,
          evaluations: prediction.evaluations.map((evaluation) => ({
            kind: evaluation.kind,
            scope: evaluation.scope,
            issuedBeforeDraw: evaluation.issuedBeforeDraw,
            modelProfile: evaluation.modelProfile,
            edgeStatus: evaluation.edgeStatus,
            metricName: evaluation.metricName,
            metricValue: evaluation.metricValue,
            baseline: evaluation.baseline,
            realizedLift: evaluation.realizedLift,
            predictedProbability: evaluation.predictedProbability,
            calibrationGap: evaluation.predictedProbability === null
              ? null
              : evaluation.predictedProbability - evaluation.metricValue,
            hits: evaluation.hitNumbers,
            actual: evaluation.actualNumbers
          })),
          learning: report
            ? {
                resultSpecial: report.resultSpecial,
                summary: parseJsonField(report.summary, null)
              }
            : null,
          meta: {
            snapshotHash: prediction.snapshotHash,
            createdAt: prediction.createdAt
          }
        };
      })
    });
  } catch (error) {
    console.error('Prediction ledger API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load prediction ledger'
    });
  }
}

function findHitsForPrediction(items: any[], predictionId: string) {
  return items.find((item) => item.predictionId === predictionId)?.hits ?? null;
}

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.floor(value)));
}
