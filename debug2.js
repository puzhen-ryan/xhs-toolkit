const puppeteer = require('puppeteer-core');
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  
  // 先去通知页截图看结构
  await page.goto('https://www.xiaohongshu.com/notification', { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(5000);
  
  await page.screenshot({ path: 'C:\\Users\\Administrator\\.openclaw\\workspace\\notify2.jpg', type: 'jpeg', quality: 90 });
  
  // dump HTML structure of first comment item
  const html = await page.evaluate(() => {
    return document.querySelector('.container-main, .notification-list, main, [class*="notify"], [class*="comment"]')?.innerHTML?.substring(0, 3000) || 'NOT FOUND - body classes: ' + document.body.className + ' | ids: ' + Array.from(document.querySelectorAll('[id]')).map(e=>e.id).join(',');
  });
  console.log('HTML:', html);
  
  // try clicking first 回复
  const clickResult = await page.evaluate(() => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const found = [];
    while (walker.nextNode()) {
      if (walker.currentNode.textContent.trim() === '回复') {
        const el = walker.currentNode.parentElement;
        found.push({ tag: el.tagName, class: el.className, visible: el.offsetParent !== null });
      }
    }
    return found;
  });
  console.log('Reply text nodes:', JSON.stringify(clickResult));
  
  browser.disconnect();
})();
