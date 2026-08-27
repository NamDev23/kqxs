import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Get latest system stats
    const stats = await prisma.systemStats.findFirst({
      orderBy: { date: 'desc' }
    });

    if (!stats) {
      return res.status(200).json({
        success: true,
        data: {
          totalPredictions: 0,
          correctPredictions: 0,
          overallAccuracy: 0,
          deAccuracy: 0,
          lo2Accuracy: 0,
          lo3Accuracy: 0,
          bacangAccuracy: 0,
          last7DaysAccuracy: 0,
          last30DaysAccuracy: 0
        }
      });
    }

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
}
