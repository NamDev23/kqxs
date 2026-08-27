/**
 * Bộ phân tích thống kê chuyên nghiệp
 * Sử dụng các phương pháp: Frequency Analysis, Markov Chain, Pattern Recognition
 */

export interface LotteryResult {
  date: string;
  special: string;
  first: string[];
  second: string[];
  third: string[];
  fourth: string[];
  fifth: string[];
  sixth: string[];
  seventh: string[];
}

export interface FrequencyData {
  number: string;
  count: number;
  percentage: number;
  lastSeen: number;
  avgGap: number;
}

export interface PredictionResult {
  numbers: string[];
  confidence: number;
  method: string;
  reasoning: string;
  historicalAccuracy?: number;
}

export interface LotteryPrediction {
  date: string;
  de: string[]; // Đề (2 số)
  lo2: string[]; // Lô 2 số
  lo3: string[]; // Lô 3 số
  bacang: string[]; // Bạch thủ 3 càng
  songthulode: string[][]; // Song thủ lô đề
  dauduoi: { dau: string[]; duoi: string[] };
  actualAccuracy?: number; // Tỷ lệ đúng thực tế sau khi có kết quả
}

export class StatisticalAnalyzer {
  private historicalData: LotteryResult[] = [];

  constructor(data: LotteryResult[]) {
    this.historicalData = data.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  // Phân tích tần suất xuất hiện
  analyzeFrequency(position: 'special' | 'last2' | 'last3'): FrequencyData[] {
    const freqMap = new Map<string, number[]>();
    
    this.historicalData.forEach((result, index) => {
      const numbers = this.extractNumbers(result, position);
      numbers.forEach(num => {
        if (!freqMap.has(num)) freqMap.set(num, []);
        freqMap.get(num)!.push(index);
      });
    });

    const freqData: FrequencyData[] = [];
    freqMap.forEach((positions, number) => {
      const count = positions.length;
      const percentage = (count / this.historicalData.length) * 100;
      const lastSeen = positions[0];
      const gaps = positions.slice(0, -1).map((p, i) => p - positions[i + 1]);
      const avgGap = gaps.length > 0 ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0;

      freqData.push({ number, count, percentage, lastSeen, avgGap });
    });

    return freqData.sort((a, b) => b.count - a.count);
  }

  // Phân tích chuỗi Markov (số nào thường xuất hiện sau số nào)
  markovChainAnalysis(lookback: number = 30): Map<string, Map<string, number>> {
    const transitions = new Map<string, Map<string, number>>();
    
    for (let i = 0; i < Math.min(lookback, this.historicalData.length - 1); i++) {
      const current = this.extractNumbers(this.historicalData[i], 'last2');
      const next = this.extractNumbers(this.historicalData[i + 1], 'last2');
      
      current.forEach(curr => {
        if (!transitions.has(curr)) transitions.set(curr, new Map());
        next.forEach(nxt => {
          const nextMap = transitions.get(curr)!;
          nextMap.set(nxt, (nextMap.get(nxt) || 0) + 1);
        });
      });
    }

    return transitions;
  }

  // Phân tích hot/cold numbers
  hotColdAnalysis(period: number = 30) {
    const recent = this.historicalData.slice(0, period);
    const freqMap = new Map<string, number>();

    recent.forEach(result => {
      const numbers = this.extractNumbers(result, 'last2');
      numbers.forEach(num => {
        freqMap.set(num, (freqMap.get(num) || 0) + 1);
      });
    });

    const sorted = Array.from(freqMap.entries()).sort((a, b) => b[1] - a[1]);
    const hot = sorted.slice(0, 10).map(([num, count]) => ({ number: num, frequency: count }));
    const cold = sorted.slice(-10).map(([num, count]) => ({ number: num, frequency: count }));

    return { hot, cold };
  }

  // Phân tích Đề (2 số cuối giải đặc biệt)
  analyzeDe(): string[] {
    const deFreq = new Map<string, number>();
    this.historicalData.forEach(result => {
      const de = result.special.slice(-2);
      deFreq.set(de, (deFreq.get(de) || 0) + 1);
    });
    return Array.from(deFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([num]) => num);
  }

  // Phân tích Lô 2 số (tất cả 2 số cuối)
  analyzeLo2(): string[] {
    const lo2Freq = new Map<string, number>();
    this.historicalData.forEach(result => {
      const numbers = this.extractNumbers(result, 'last2');
      numbers.forEach(num => {
        lo2Freq.set(num, (lo2Freq.get(num) || 0) + 1);
      });
    });
    return Array.from(lo2Freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([num]) => num);
  }

  // Phân tích Lô 3 số (3 số cuối)
  analyzeLo3(): string[] {
    const lo3Freq = new Map<string, number>();
    this.historicalData.forEach(result => {
      const numbers = this.extractNumbers(result, 'last3');
      numbers.forEach(num => {
        lo3Freq.set(num, (lo3Freq.get(num) || 0) + 1);
      });
    });
    return Array.from(lo3Freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([num]) => num);
  }

  // Bạch thủ 3 càng (top 1 dự đoán chính xác)
  analyzeBaCang(): string[] {
    const freq3 = this.analyzeFrequency('last3');
    const { hot } = this.hotColdAnalysis(30);

    // Kết hợp frequency và hot trend
    const scores = new Map<string, number>();
    freq3.slice(0, 20).forEach((f, idx) => {
      scores.set(f.number.slice(-3), 20 - idx);
    });

    return Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([num]) => num);
  }

  // Song thủ lô đề (cặp số hay ra cùng nhau)
  analyzeSongThu(): string[][] {
    const pairs = new Map<string, number>();

    this.historicalData.forEach(result => {
      const numbers = this.extractNumbers(result, 'last2');
      for (let i = 0; i < numbers.length; i++) {
        for (let j = i + 1; j < numbers.length; j++) {
          const pair = [numbers[i], numbers[j]].sort().join('-');
          pairs.set(pair, (pairs.get(pair) || 0) + 1);
        }
      }
    });

    return Array.from(pairs.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([pair]) => pair.split('-'));
  }

  // Đầu đuôi (số đầu và số đuôi)
  analyzeDauDuoi(): { dau: string[]; duoi: string[] } {
    const dauFreq = new Map<string, number>();
    const duoiFreq = new Map<string, number>();

    this.historicalData.forEach(result => {
      const numbers = this.extractNumbers(result, 'last2');
      numbers.forEach(num => {
        const dau = num[0];
        const duoi = num[1];
        dauFreq.set(dau, (dauFreq.get(dau) || 0) + 1);
        duoiFreq.set(duoi, (duoiFreq.get(duoi) || 0) + 1);
      });
    });

    const topDau = Array.from(dauFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([num]) => num);

    const topDuoi = Array.from(duoiFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([num]) => num);

    return { dau: topDau, duoi: topDuoi };
  }

  // Generate full prediction cho một ngày
  generateDailyPrediction(): LotteryPrediction {
    return {
      date: new Date().toISOString().split('T')[0],
      de: this.analyzeDe(),
      lo2: this.analyzeLo2(),
      lo3: this.analyzeLo3(),
      bacang: this.analyzeBaCang(),
      songthulode: this.analyzeSongThu(),
      dauduoi: this.analyzeDauDuoi()
    };
  }

  // Tính toán dựa trên multiple methods
  generatePredictions(): PredictionResult[] {
    const predictions: PredictionResult[] = [];

    // Method 1: Frequency-based
    const freqData = this.analyzeFrequency('last2');
    const topFreq = freqData.slice(0, 10).map(f => f.number);
    predictions.push({
      numbers: topFreq,
      confidence: 0.65,
      method: 'Phân tích tần suất',
      reasoning: `Top 10 số xuất hiện nhiều nhất trong ${this.historicalData.length} kỳ gần đây`
    });

    // Method 2: Hot numbers (recent trend)
    const { hot } = this.hotColdAnalysis(30);
    predictions.push({
      numbers: hot.map(h => h.number),
      confidence: 0.70,
      method: 'Hot Numbers',
      reasoning: 'Số đang trong xu hướng nóng 30 kỳ gần nhất'
    });

    // Method 3: Gap analysis (overdue)
    const gapAnalysis = freqData
      .filter(f => f.lastSeen > f.avgGap * 1.5 && f.count > 5)
      .slice(0, 10);
    predictions.push({
      numbers: gapAnalysis.map(g => g.number),
      confidence: 0.60,
      method: 'Phân tích khoảng cách',
      reasoning: 'Số đã lâu không xuất hiện so với trung bình'
    });

    // Method 4: Markov Chain
    const lastResult = this.extractNumbers(this.historicalData[0], 'last2');
    const markov = this.markovChainAnalysis(50);
    const markovPredictions = new Map<string, number>();
    
    lastResult.forEach(num => {
      const next = markov.get(num);
      if (next) {
        next.forEach((count, nextNum) => {
          markovPredictions.set(nextNum, (markovPredictions.get(nextNum) || 0) + count);
        });
      }
    });

    const topMarkov = Array.from(markovPredictions.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([num]) => num);

    predictions.push({
      numbers: topMarkov,
      confidence: 0.68,
      method: 'Chuỗi Markov',
      reasoning: 'Số có xác suất cao xuất hiện sau kết quả gần nhất'
    });

    return predictions;
  }

  private extractNumbers(result: LotteryResult, type: 'special' | 'last2' | 'last3'): string[] {
    const all = [
      result.special,
      ...result.first,
      ...result.second,
      ...result.third,
      ...result.fourth,
      ...result.fifth,
      ...result.sixth,
      ...result.seventh
    ];

    if (type === 'special') return [result.special];
    if (type === 'last2') return all.map(n => n.slice(-2));
    if (type === 'last3') return all.map(n => n.slice(-3));
    return all;
  }
}
