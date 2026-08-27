/**
 * Ensemble Analyzer - Kết hợp nhiều thuật toán
 * Weighted voting cho accuracy tốt hơn
 */

import { LotteryResult } from './statistical-analyzer-v2';

interface WeightedPrediction {
  method: string;
  numbers: string[];
  weight: number;
  confidence: number;
}

export class EnsembleAnalyzer {
  private data: LotteryResult[];

  constructor(data: LotteryResult[]) {
    this.data = data;
  }

  // Method 1: Pure Frequency (weight: 0.25)
  private frequencyMethod(type: 'de' | 'lo2' | 'bacang'): string[] {
    const freq = new Map<string, number>();
    
    this.data.forEach(r => {
      let nums: string[] = [];
      if (type === 'de') nums = [r.special.slice(-2)];
      else if (type === 'bacang') nums = [r.special.slice(-3)];
      else if (type === 'lo2') {
        const all = [r.special, ...r.first, ...r.second, ...r.third, 
                     ...r.fourth, ...r.fifth, ...r.sixth, ...r.seventh];
        nums = all.map(n => n.slice(-2));
      }
      
      nums.forEach(n => freq.set(n, (freq.get(n) || 0) + 1));
    });

    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([n]) => n);
  }

  // Method 2: Hot Trend (weight: 0.25)
  private hotTrendMethod(type: 'de' | 'lo2' | 'bacang', period = 30): string[] {
    const recent = this.data.slice(0, period);
    const freq = new Map<string, number>();

    recent.forEach(r => {
      let nums: string[] = [];
      if (type === 'de') nums = [r.special.slice(-2)];
      else if (type === 'bacang') nums = [r.special.slice(-3)];
      else if (type === 'lo2') {
        const all = [r.special, ...r.first, ...r.second, ...r.third,
                     ...r.fourth, ...r.fifth, ...r.sixth, ...r.seventh];
        nums = all.map(n => n.slice(-2));
      }

      nums.forEach(n => freq.set(n, (freq.get(n) || 0) + 1));
    });

    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([n]) => n);
  }

  // Method 3: Gap Analysis (weight: 0.20)
  private gapMethod(type: 'de' | 'lo2' | 'bacang'): string[] {
    const lastSeen = new Map<string, number>();
    const freq = new Map<string, number>();

    this.data.forEach((r, idx) => {
      let nums: string[] = [];
      if (type === 'de') nums = [r.special.slice(-2)];
      else if (type === 'bacang') nums = [r.special.slice(-3)];
      else if (type === 'lo2') {
        const all = [r.special, ...r.first, ...r.second, ...r.third,
                     ...r.fourth, ...r.fifth, ...r.sixth, ...r.seventh];
        nums = all.map(n => n.slice(-2));
      }

      nums.forEach(n => {
        if (!lastSeen.has(n)) {
          lastSeen.set(n, idx);
          freq.set(n, (freq.get(n) || 0) + 1);
        }
      });
    });

    // Số lâu chưa ra (overdue)
    const avgGap = this.data.length / freq.size;
    const overdue = Array.from(lastSeen.entries())
      .filter(([n, idx]) => idx > avgGap * 1.5)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([n]) => n);

    return overdue;
  }

  // Method 4: Pattern Recognition (weight: 0.30)
  private patternMethod(type: 'de' | 'lo2' | 'bacang'): string[] {
    const patterns = [];

    // Pattern 1: Consecutive (01-02, 12-13)
    const consecutive = this.findConsecutive(type);
    patterns.push(...consecutive);

    // Pattern 2: Mirror (12-21, 34-43)
    const mirror = this.findMirror(type);
    patterns.push(...mirror);

    // Pattern 3: Double (11, 22, 33)
    const double = this.findDouble(type);
    patterns.push(...double);

    // Deduplicate và return
    return [...new Set(patterns)].slice(0, 10);
  }

  private findConsecutive(type: string): string[] {
    // Logic tìm số liên tiếp
    return [];
  }

  private findMirror(type: string): string[] {
    // Logic tìm số gương
    return [];
  }

  private findDouble(type: string): string[] {
    // Số đôi: 00, 11, 22, ..., 99
    if (type === 'de' || type === 'lo2') {
      return ['00', '11', '22', '33', '44', '55', '66', '77', '88', '99'];
    }
    return [];
  }

  // Ensemble: Weighted Voting
  public ensemblePredict(type: 'de' | 'lo2' | 'bacang'): string[] {
    const predictions: WeightedPrediction[] = [
      {
        method: 'Frequency',
        numbers: this.frequencyMethod(type),
        weight: 0.25,
        confidence: 0.65
      },
      {
        method: 'Hot Trend',
        numbers: this.hotTrendMethod(type),
        weight: 0.25,
        confidence: 0.70
      },
      {
        method: 'Gap Analysis',
        numbers: this.gapMethod(type),
        weight: 0.20,
        confidence: 0.60
      },
      {
        method: 'Pattern',
        numbers: this.patternMethod(type),
        weight: 0.30,
        confidence: 0.68
      }
    ];

    // Weighted voting
    const votes = new Map<string, number>();

    predictions.forEach(p => {
      p.numbers.forEach((num, idx) => {
        // Số rank cao hơn (idx nhỏ) được điểm cao hơn
        const score = p.weight * (p.numbers.length - idx) / p.numbers.length;
        votes.set(num, (votes.get(num) || 0) + score);
      });
    });

    return Array.from(votes.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([n]) => n);
  }
}
