/**
 * Statistical Analyzer V2 - Fixed Logic + Professional
 * - 3 càng = CHỈ từ giải đặc biệt
 * - Đề = CHỈ từ giải đặc biệt
 * - Lô = Từ TẤT CẢ giải
 */

export interface LotteryResult {
  date: string;
  special: string; // 5 chữ số
  first: string[];
  second: string[];
  third: string[];
  fourth: string[];
  fifth: string[];
  sixth: string[];
  seventh: string[];
}

export interface AnalysisResult {
  de: string[];          // 2 số cuối ĐẶC BIỆT
  lo2: string[];         // 2 số cuối TẤT CẢ giải
  bacang: string[];      // 3 số cuối ĐẶC BIỆT
  lo3: string[];         // 3 số cuối TẤT CẢ giải (xiên)
  songthulode: string[][];
  dauduoi: { dau: string[]; duoi: string[] };
  confidence: number;
  dataPoints: number;
}

export class StatisticalAnalyzerV2 {
  private data: LotteryResult[];

  constructor(data: LotteryResult[]) {
    this.data = data.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  // ============================================
  // ĐỀ - CHỈ TỪ GIẢI ĐẶC BIỆT
  // ============================================
  analyzeDe(): string[] {
    const freq = new Map<string, number>();
    
    this.data.forEach(result => {
      const de = result.special.slice(-2); // 2 số cuối ĐẶC BIỆT
      freq.set(de, (freq.get(de) || 0) + 1);
    });

    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([num]) => num);
  }

  // ============================================
  // 3 CÀNG (BẠCH THỦ) - CHỈ TỪ GIẢI ĐẶC BIỆT
  // ============================================
  analyzeBaCang(): string[] {
    const freq = new Map<string, number>();
    
    this.data.forEach(result => {
      const bacang = result.special.slice(-3); // 3 số cuối ĐẶC BIỆT
      freq.set(bacang, (freq.get(bacang) || 0) + 1);
    });

    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([num]) => num);
  }

  // ============================================
  // LÔ 2 SỐ - TỪ TẤT CẢ GIẢI
  // ============================================
  analyzeLo2(): string[] {
    const freq = new Map<string, number>();
    
    this.data.forEach(result => {
      const allNumbers = this.extractAllNumbers(result);
      allNumbers.forEach(num => {
        const lo2 = num.slice(-2);
        freq.set(lo2, (freq.get(lo2) || 0) + 1);
      });
    });

    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([num]) => num);
  }

  // ============================================
  // LÔ 3 SỐ (XIÊN) - TỪ TẤT CẢ GIẢI
  // ============================================
  analyzeLo3(): string[] {
    const freq = new Map<string, number>();
    
    this.data.forEach(result => {
      const allNumbers = this.extractAllNumbers(result);
      allNumbers.forEach(num => {
        if (num.length >= 3) {
          const lo3 = num.slice(-3);
          freq.set(lo3, (freq.get(lo3) || 0) + 1);
        }
      });
    });

    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([num]) => num);
  }

  // ============================================
  // SONG THỦ - Cặp số hay ra cùng nhau
  // ============================================
  analyzeSongThu(): string[][] {
    const pairs = new Map<string, number>();

    this.data.forEach(result => {
      const lo2Numbers = this.extractAllNumbers(result).map(n => n.slice(-2));
      
      // Tìm các cặp xuất hiện cùng nhau
      for (let i = 0; i < lo2Numbers.length; i++) {
        for (let j = i + 1; j < lo2Numbers.length; j++) {
          const pair = [lo2Numbers[i], lo2Numbers[j]].sort().join('-');
          pairs.set(pair, (pairs.get(pair) || 0) + 1);
        }
      }
    });

    return Array.from(pairs.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([pair]) => pair.split('-'));
  }

  // ============================================
  // ĐẦU ĐUÔI
  // ============================================
  analyzeDauDuoi(): { dau: string[]; duoi: string[] } {
    const dauFreq = new Map<string, number>();
    const duoiFreq = new Map<string, number>();

    this.data.forEach(result => {
      const lo2Numbers = this.extractAllNumbers(result).map(n => n.slice(-2));
      
      lo2Numbers.forEach(num => {
        const dau = num[0];
        const duoi = num[1];
        dauFreq.set(dau, (dauFreq.get(dau) || 0) + 1);
        duoiFreq.set(duoi, (duoiFreq.get(duoi) || 0) + 1);
      });
    });

    const dau = Array.from(dauFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([num]) => num);

    const duoi = Array.from(duoiFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([num]) => num);

    return { dau, duoi };
  }

  // ============================================
  // HELPER: Extract tất cả số từ 1 kết quả
  // ============================================
  private extractAllNumbers(result: LotteryResult): string[] {
    return [
      result.special,
      ...result.first,
      ...result.second,
      ...result.third,
      ...result.fourth,
      ...result.fifth,
      ...result.sixth,
      ...result.seventh
    ];
  }

  // ============================================
  // MAIN: Generate full analysis
  // ============================================
  generateFullAnalysis(): AnalysisResult {
    return {
      de: this.analyzeDe(),
      lo2: this.analyzeLo2(),
      bacang: this.analyzeBaCang(),
      lo3: this.analyzeLo3(),
      songthulode: this.analyzeSongThu(),
      dauduoi: this.analyzeDauDuoi(),
      confidence: 0.65,
      dataPoints: this.data.length
    };
  }
}
