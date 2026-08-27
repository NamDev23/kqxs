const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

const env = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '';
const match = env.match(/^DATABASE_URL\s*=\s*"?([^"\n]+)"?/m);
if (match && !process.env.DATABASE_URL) process.env.DATABASE_URL = match[1];

const prisma = new PrismaClient();

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

function valuesFor(row, key) {
  return key === 'special' ? [row.special] : row[key];
}

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function validateRow(row) {
  const errors = [];
  const warnings = [];
  const date = dateKey(row.date);
  const [year, month, day] = date.split('-');

  EXPECTED.forEach(([key, count, digits]) => {
    const values = valuesFor(row, key);
    if (!Array.isArray(values) || values.length !== count) {
      errors.push(`${key}: expected ${count}, got ${Array.isArray(values) ? values.length : 'invalid'}`);
      return;
    }

    values.forEach((value) => {
      if (!new RegExp(`^\\d{${digits}}$`).test(String(value))) {
        errors.push(`${key}: invalid ${value}`);
      }
    });
  });

  const fourthYearCount = row.fourth.filter((value) => value === year).length;
  if (fourthYearCount >= 2) {
    errors.push(`fourth contains date year ${year} ${fourthYearCount} times`);
  }

  const seventhDateTokens = row.seventh.filter((value) => value === day || value === month);
  if (seventhDateTokens.length >= 3) {
    warnings.push(`seventh contains repeated date tokens ${seventhDateTokens.join(',')}`);
  }

  return { date, errors, warnings };
}

function collectLastDigits(rows, digits) {
  const counts = new Map();

  rows.forEach((row) => {
    const all = [
      row.special,
      ...row.first,
      ...row.second,
      ...row.third,
      ...row.fourth,
      ...row.fifth,
      ...row.sixth,
      ...row.seventh
    ];

    const seen = new Set(
      all
        .filter((value) => String(value).length >= digits)
        .map((value) => String(value).slice(-digits))
    );

    seen.forEach((number) => {
      counts.set(number, (counts.get(number) || 0) + 1);
    });
  });

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 15)
    .map(([number, days]) => ({ number, days, percentage: Number(((days / rows.length) * 100).toFixed(2)) }));
}

async function main() {
  const rows = await prisma.lotteryResult.findMany({ orderBy: { date: 'asc' } });
  const audits = rows.map(validateRow);
  const withErrors = audits.filter((item) => item.errors.length > 0);
  const withWarnings = audits.filter((item) => item.warnings.length > 0);

  const report = {
    rows: rows.length,
    firstDate: rows[0] ? dateKey(rows[0].date) : null,
    lastDate: rows.length ? dateKey(rows[rows.length - 1].date) : null,
    errorRows: withErrors.length,
    warningRows: withWarnings.length,
    errors: withErrors.slice(0, 25),
    warnings: withWarnings.slice(0, 25),
    topLo2DayFrequency: collectLastDigits(rows, 2),
    topLo3DayFrequency: collectLastDigits(rows, 3)
  };

  console.log(JSON.stringify(report, null, 2));

  if (withErrors.length > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
