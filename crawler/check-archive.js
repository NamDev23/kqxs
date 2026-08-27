const puppeteer = require('puppeteer');

async function checkArchive() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox']
  });
  
  const page = await browser.newPage();
  await page.goto('https://kqxsmb.co/', { waitUntil: 'networkidle2' });
  
  // Get all links
  const links = await page.evaluate(() => {
    const allLinks = Array.from(document.querySelectorAll('a'));
    return allLinks
      .map(a => a.href)
      .filter(href => href && href.includes('2026'))
      .slice(0, 10);
  });
  
  console.log('🔍 Links found with 2026:\n');
  links.forEach(link => console.log('  ', link));
  
  await browser.close();
}

checkArchive();
