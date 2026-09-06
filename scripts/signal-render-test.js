require('sucrase/register');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const OfficialSignals = require('../components/OfficialSignals.tsx').default;
const products = [{ kind: 'xien2', label: 'Xiên 2', selections: ['45+11'], forwardDays: 30, forwardRoi: 1 }];
const render = publication => renderToStaticMarkup(React.createElement(OfficialSignals, { publication }));
assert(render({ status: 'qualified', products }).includes('45+11'));
for (const status of ['no_signal', 'blocked']) {
  const html = render({ status, products });
  assert(html.includes('Không có tín hiệu đủ điều kiện'));
  assert(!html.includes('45+11'), 'Withheld picks must never render even in an inconsistent payload');
}
assert(!render(undefined).includes('45+11'));
console.log('PASS: signal rendering fails closed');
