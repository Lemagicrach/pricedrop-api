// Create services/puppeteerScraper.js
const puppeteer = require('puppeteer');

async function scrapeWithBrowser(url, selectors) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Set realistic viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    );
    
    // Block unnecessary resources
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });
    
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Wait for key elements
    await page.waitForSelector(selectors.price, { timeout: 10000 });
    
    const data = await page.evaluate((sel) => {
      const getElementText = (selector) => {
        const el = document.querySelector(selector);
        return el ? el.textContent.trim() : null;
      };
      
      const getElementAttr = (selector, attr) => {
        const el = document.querySelector(selector);
        return el ? el.getAttribute(attr) : null;
      };
      
      return {
        title: getElementText(sel.title),
        price: getElementText(sel.price),
        image: getElementAttr(sel.image, 'src'),
        inStock: !document.body.innerText.includes('Out of Stock')
      };
    }, selectors);
    
    await browser.close();
    
    return {
      success: true,
      ...data,
      price: parseFloat(data.price.replace(/[^0-9.]/g, ''))
    };
  } catch (error) {
    if (browser) await browser.close();
    return { success: false, error: error.message };
  }
}

module.exports = { scrapeWithBrowser };