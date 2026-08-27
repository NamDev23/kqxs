/**
 * Advanced Analysis Engine với ML & Pattern Recognition
 */

export interface AdvancedConfig {
  historicalDays: number; // 365+ days
  useMLModel: boolean;
  considerCalendar: boolean;
  considerSpecialDays: boolean;
}

export interface CalendarFactor {
  date: Date;
  isHoliday: boolean;
  isWeekend: boolean;
  isLunarNew: boolean;
  moonPhase: number;
  dayOfWeek: number;
}

export class AdvancedAnalyzer {
  private config: AdvancedConfig;

  constructor(config: Partial<AdvancedConfig> = {}) {
    this.config = {
      historicalDays: 365, // 1 năm data
      useMLModel: true,
      considerCalendar: true,
      considerSpecialDays: true,
      ...config
    };
  }

  /**
   * Fix: 3 càng PHẢI là 3 số cuối của giải ĐẶC BIỆT
   */
  extract3Cang(results: any[]): string[] {
    const freq = new Map<string, number>();
    
    results.forEach(r => {
      // CHỈ lấy từ giải đặc biệt
      const bacang = r.special.slice(-3);
      freq.set(bacang, (freq.get(bacang) || 0) + 1);
    });

    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([num]) => num);
  }

  /**
   * Fix: Đề = 2 số cuối giải ĐẶC BIỆT (đúng rồi)
   */
  extractDe(results: any[]): string[] {
    const freq = new Map<string, number>();
    
    results.forEach(r => {
      const de = r.special.slice(-2);
      freq.set(de, (freq.get(de) || 0) + 1);
    });

    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([num]) => num);
  }

  /**
   * Calendar-based analysis
   * Một số ngày có pattern đặc biệt
   */
  getCalendarFactors(date: Date): CalendarFactor {
    const dayOfWeek = date.getDay();
    
    // Check holidays (Tết, 30/4, 1/5, 2/9...)
    const isHoliday = this.isVietnameseHoliday(date);
    
    // Check lunar calendar
    const isLunarNew = this.isLunarNewYear(date);
    
    // Moon phase (có người tin ảnh hưởng)
    const moonPhase = this.getMoonPhase(date);

    return {
      date,
      isHoliday,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      isLunarNew,
      moonPhase,
      dayOfWeek
    };
  }

  /**
   * Pattern recognition - tìm pattern lặp lại
   */
  findRepeatingPatterns(results: any[]): any[] {
    const patterns: any[] = [];
    
    // Pattern 1: Chuỗi số liên tiếp (01-02-03)
    // Pattern 2: Số gương (12-21)
    // Pattern 3: Số đôi (11, 22, 33...)
    // Pattern 4: Tổng chia hết cho X
    
    return patterns;
  }

  /**
   * Time-series analysis
   * Phân tích theo thời gian (trend, seasonality)
   */
  timeSeriesAnalysis(results: any[]): any {
    // Moving average
    // Exponential smoothing
    // ARIMA model (advanced)
    
    return {
      trend: 'up', // or 'down', 'stable'
      seasonality: null,
      confidence: 0.6
    };
  }

  /**
   * Ensemble method - kết hợp nhiều thuật toán
   */
  ensemblePrediction(results: any[]): any {
    const predictions = [];

    // Method 1: Frequency (weight: 0.25)
    const freq = this.frequencyMethod(results);
    predictions.push({ method: 'frequency', numbers: freq, weight: 0.25 });

    // Method 2: Hot numbers (weight: 0.25)
    const hot = this.hotNumbersMethod(results.slice(0, 30));
    predictions.push({ method: 'hot', numbers: hot, weight: 0.25 });

    // Method 3: ML model (weight: 0.30)
    const ml = this.mlMethod(results);
    predictions.push({ method: 'ml', numbers: ml, weight: 0.30 });

    // Method 4: Pattern (weight: 0.20)
    const pattern = this.patternMethod(results);
    predictions.push({ method: 'pattern', numbers: pattern, weight: 0.20 });

    // Weighted voting
    return this.weightedVoting(predictions);
  }

  private frequencyMethod(results: any[]): string[] {
    // Implementation
    return [];
  }

  private hotNumbersMethod(results: any[]): string[] {
    // Implementation
    return [];
  }

  private mlMethod(results: any[]): string[] {
    // Placeholder for ML model
    // Trong thực tế cần train model với TensorFlow.js
    return [];
  }

  private patternMethod(results: any[]): string[] {
    // Implementation
    return [];
  }

  private weightedVoting(predictions: any[]): string[] {
    const votes = new Map<string, number>();

    predictions.forEach(p => {
      p.numbers.forEach((num: string) => {
        votes.set(num, (votes.get(num) || 0) + p.weight);
      });
    });

    return Array.from(votes.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([num]) => num);
  }

  private isVietnameseHoliday(date: Date): boolean {
    // Check Vietnamese holidays
    const month = date.getMonth() + 1;
    const day = date.getDate();

    // 1/1, 30/4, 1/5, 2/9...
    if ((month === 1 && day === 1) ||
        (month === 4 && day === 30) ||
        (month === 5 && day === 1) ||
        (month === 9 && day === 2)) {
      return true;
    }

    return false;
  }

  private isLunarNewYear(date: Date): boolean {
    // Simplified - cần lunar calendar library
    return false;
  }

  private getMoonPhase(date: Date): number {
    // Simplified moon phase calculation
    // 0 = new moon, 0.5 = full moon
    return 0;
  }
}
