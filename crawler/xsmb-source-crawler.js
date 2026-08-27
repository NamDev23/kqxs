const axios = require('axios');
const cheerio = require('cheerio');

const EXPECTED = [
  ['special', 1, 5],
  ['first', 1, 5],
  ['second', 2, 5],
  ['third', 6, 5],
  ['fourth', 4, 4],
  ['fifth', 6, 4],
  ['sixth', 3, 3],
  ['seventh', 4, 2]
];

class XsmbSourceCrawler {
  constructor() {
    this.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';
    this.sources = [
      {
        name: 'xoso.com.vn',
        url: (dateKey) => {
          const { day, month, year } = splitDate(dateKey);
          return `https://xoso.com.vn/xsmb-${day}-${month}-${year}.html`;
        },
        parse: parseXoso
      },
      {
        name: 'minhngoc.net.vn',
        url: (dateKey) => {
          const { day, month, year } = splitDate(dateKey);
          return `https://www.minhngoc.net.vn/ket-qua-xo-so/mien-bac/${day}-${month}-${year}.html`;
        },
        parse: parseMinhNgoc
      }
    ];
  }

  async fetchDate(dateKey, options = {}) {
    const parsed = [];

    for (const source of this.sources) {
      try {
        const url = source.url(dateKey);
        const response = await axios.get(url, {
          headers: {
            'User-Agent': this.userAgent,
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8'
          },
          timeout: options.timeoutMs || 15000
        });

        const result = normalizeResult({
          date: dateKey,
          ...source.parse(response.data, dateKey)
        });
        const errors = validateResult(result);

        parsed.push({
          source: source.name,
          url,
          result,
          errors
        });
      } catch (error) {
        parsed.push({
          source: source.name,
          url: source.url(dateKey),
          result: null,
          errors: [error.message]
        });
      }
    }

    const valid = parsed.filter((item) => item.result && item.errors.length === 0);
    if (valid.length === 0) {
      throw new Error(`No valid XSMB result for ${dateKey}: ${parsed.map((item) => `${item.source}: ${item.errors.join(', ')}`).join(' | ')}`);
    }

    if (valid.length > 1 && !sameResult(valid[0].result, valid[1].result)) {
      throw new Error(`Source mismatch for ${dateKey}: ${valid.map((item) => item.source).join(' vs ')}`);
    }

    return {
      result: valid[0].result,
      verified: valid.length > 1,
      sources: valid.map((item) => item.source),
      sourceDetails: parsed
    };
  }
}

function parseXoso(html, dateKey) {
  const $ = cheerio.load(html);
  const result = emptyResult();
  const { day, month, year } = splitDate(dateKey);
  const table = $(`#kqngay_${day}${month}${year} table.table-result`)
    .add('table.table-result')
    .first();

  if (!table.length) return result;

  const classMap = {
    'special-prize': 'special',
    prize1: 'first',
    prize2: 'second',
    prize3: 'third',
    prize4: 'fourth',
    prize5: 'fifth',
    prize6: 'sixth',
    prize7: 'seventh'
  };

  Object.entries(classMap).forEach(([className, key]) => {
    const values = table
      .find(`.${className}`)
      .map((_, node) => digitsOnly($(node).text()))
      .get()
      .filter(Boolean);

    if (key === 'special') result.special = values[0] || '';
    else result[key] = values;
  });

  return result;
}

function parseMinhNgoc(html, dateKey) {
  const $ = cheerio.load(html);
  const result = emptyResult();
  const { day, month, year } = splitDate(dateKey);
  const dateText = `${day}/${month}/${year}`;
  const table = $('table.bkqmienbac')
    .filter((_, element) => $(element).text().includes(dateText))
    .first();

  if (!table.length) {
    return result;
  }

  const classMap = {
    giaidb: 'special',
    giai1: 'first',
    giai2: 'second',
    giai3: 'third',
    giai4: 'fourth',
    giai5: 'fifth',
    giai6: 'sixth',
    giai7: 'seventh'
  };

  Object.entries(classMap).forEach(([className, key]) => {
    const values = table
      .find(`.${className}`)
      .first()
      .find('div')
      .map((_, node) => digitsOnly($(node).text()))
      .get()
      .filter(Boolean);

    if (key === 'special') result.special = values[0] || '';
    else result[key] = values;
  });

  return result;
}

function emptyResult() {
  return {
    special: '',
    first: [],
    second: [],
    third: [],
    fourth: [],
    fifth: [],
    sixth: [],
    seventh: []
  };
}

function normalizeResult(result) {
  return {
    date: result.date,
    special: normalizeDigits(result.special, 5),
    first: normalizeList(result.first, 5),
    second: normalizeList(result.second, 5),
    third: normalizeList(result.third, 5),
    fourth: normalizeList(result.fourth, 4),
    fifth: normalizeList(result.fifth, 4),
    sixth: normalizeList(result.sixth, 3),
    seventh: normalizeList(result.seventh, 2)
  };
}

function validateResult(result) {
  const errors = [];

  EXPECTED.forEach(([key, count, digits]) => {
    const values = key === 'special' ? [result.special] : result[key];

    if (!Array.isArray(values) || values.length !== count) {
      errors.push(`${key} expected ${count}, got ${Array.isArray(values) ? values.length : 'invalid'}`);
      return;
    }

    values.forEach((value) => {
      if (!new RegExp(`^\\d{${digits}}$`).test(String(value))) {
        errors.push(`${key} invalid value ${value}`);
      }
    });
  });

  if (hasStrongDateLeak(result)) {
    errors.push('strong date leak signature detected');
  }

  return errors;
}

function hasStrongDateLeak(result) {
  const { year, month, day } = splitDate(result.date);
  const fourthYearCount = result.fourth.filter((value) => value === year).length;
  const seventhDateTokens = result.seventh.filter((value) => value === day || value === month).length;

  return fourthYearCount >= 2 || seventhDateTokens >= 3;
}

function sameResult(left, right) {
  return JSON.stringify(stripMeta(left)) === JSON.stringify(stripMeta(right));
}

function stripMeta(result) {
  return {
    special: result.special,
    first: result.first,
    second: result.second,
    third: result.third,
    fourth: result.fourth,
    fifth: result.fifth,
    sixth: result.sixth,
    seventh: result.seventh
  };
}

function normalizeList(value, digits) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => normalizeDigits(item, digits));
}

function normalizeDigits(value, digits) {
  const raw = digitsOnly(value);
  return raw ? raw.slice(-digits).padStart(digits, '0') : '';
}

function digitsOnly(value) {
  return String(value ?? '').replace(/\D/g, '');
}

function splitDate(dateKey) {
  const [year, month, day] = dateKey.split('-');
  return { year, month, day };
}

function addDays(dateKey, days) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function getVietnamDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);

  return `${parts.find((part) => part.type === 'year').value}-${parts.find((part) => part.type === 'month').value}-${parts.find((part) => part.type === 'day').value}`;
}

module.exports = {
  XsmbSourceCrawler,
  addDays,
  getVietnamDateKey,
  hasStrongDateLeak,
  normalizeResult,
  sameResult,
  validateResult
};
