/**
 * TEST CRAWLER - Chỉ crawl 1 ngày để verify
 */

const puppeteer = require('puppeteer');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testCrawl() {
  console.log('🚀 Starting Puppeteer test...\n');
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    console.log('📍 Navigating to kqxsmb.co...');
    await page.goto('https://kqxsmb.co/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    console.log('✅ Page loaded\n');
    
    // Wait for content to render
    await sleep(3000);
    
    console.log('🔍 Extracting data...\n');
    
    // Extract data
    const data = await page.evaluate(() => {
      // Find all numbers on page
      const allText = document.body.innerText;
      
      // Find date
      const dateMatch = allText.match(/(\d{1,2}[-\/]\d{1,2}[-\/]\d{4})/);
      
      // Find all 5-digit numbers (potential special prize)
      const fiveDigits = allText.match(/\b\d{5}\b/g) || [];
      
      // Find all 4-digit numbers
      const fourDigits = allText.match(/\b\d{4}\b/g) || [];
      
      // Find all 3-digit numbers
      const threeDigits = allText.match(/\b\d{3}\b/g) || [];
      
      // Find all 2-digit numbers
      const twoDigits = allText.match(/\b\d{2}\b/g) || [];
      
      return {
        date: dateMatch ? dateMatch[0] : 'Not found',
        fiveDigits: fiveDigits.slice(0, 10),
        fourDigits: fourDigits.slice(0, 10),
        threeDigits: threeDigits.slice(0, 10),
        twoDigits: twoDigits.slice(0, 20)
      };
    });
    
    console.log('📊 RAW DATA EXTRACTED:\n');
    console.log('Date found:', data.date);
    console.log('\n5-digit numbers (first 10):', data.fiveDigits);
    console.log('4-digit numbers (first 10):', data.fourDigits);
    console.log('3-digit numbers (first 10):', data.threeDigits);
    console.log('2-digit numbers (first 20):', data.twoDigits);
    
    // Save screenshot for manual verification
    await page.screenshot({ path: '/tmp/kqxsmb-screenshot.png', fullPage: true });
    console.log('\n📸 Screenshot saved to /tmp/kqxsmb-screenshot.png');
    
    await browser.close();
    
    console.log('\n✅ Test complete!');
    console.log('\n📋 NEXT: Bạn verify data này có đúng với website không?');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (browser) await browser.close();
  }
}

testCrawl();
