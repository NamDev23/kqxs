/**
 * Data fetcher - Thu thập dữ liệu lịch sử từ nguồn công khai
 */

import { LotteryResult } from './statistical-analyzer';

export class DataFetcher {
  private apiUrl = 'https://apikqxs.com/api/mb'; // Mock URL

  async fetchHistoricalData(days: number = 100): Promise<LotteryResult[]> {
    // Trong production, fetch từ API thực
    // Hiện tại dùng mock data để demo
    return this.generateMockData(days);
  }

  private generateMockData(days: number): LotteryResult[] {
    const results: LotteryResult[] = [];
    const today = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      results.push({
        date: date.toISOString().split('T')[0],
        special: this.randomNumber(5),
        first: [this.randomNumber(5)],
        second: [this.randomNumber(5), this.randomNumber(5)],
        third: [this.randomNumber(5), this.randomNumber(5), this.randomNumber(5), this.randomNumber(5), this.randomNumber(5), this.randomNumber(5)],
        fourth: [this.randomNumber(4), this.randomNumber(4), this.randomNumber(4), this.randomNumber(4)],
        fifth: [this.randomNumber(4), this.randomNumber(4), this.randomNumber(4), this.randomNumber(4), this.randomNumber(4), this.randomNumber(4)],
        sixth: [this.randomNumber(3), this.randomNumber(3), this.randomNumber(3)],
        seventh: [this.randomNumber(2), this.randomNumber(2), this.randomNumber(2), this.randomNumber(2)]
      });
    }

    return results;
  }

  private randomNumber(digits: number): string {
    const max = Math.pow(10, digits);
    return Math.floor(Math.random() * max).toString().padStart(digits, '0');
  }
}
