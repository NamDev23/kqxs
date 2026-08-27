const { XsmbSourceCrawler, getVietnamDateKey } = require('./xsmb-source-crawler');

class XoSoCrawler {
  constructor() {
    this.crawler = new XsmbSourceCrawler();
  }

  async fetchLatestResult() {
    const targetDate = getVietnamDateKey();
    const { result } = await this.crawler.fetchDate(targetDate);
    return result;
  }

  validateResult(result) {
    return Boolean(
      result?.date &&
      /^\d{5}$/.test(result.special) &&
      result.first?.length === 1 &&
      result.second?.length === 2 &&
      result.third?.length === 6 &&
      result.fourth?.length === 4 &&
      result.fifth?.length === 6 &&
      result.sixth?.length === 3 &&
      result.seventh?.length === 4
    );
  }
}

module.exports = XoSoCrawler;
