const puppeteer = require('puppeteer-core');
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  
  // 去通知页，只看评论和@
  await page.goto('https://www.xiaohongshu.com/notification', { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(3000);
  
  // 点击"评论和@"
  await page.evaluate(() => {
    document.querySelectorAll('.reds-tab-item').forEach(el => {
      if (el.textContent.trim() === '评论和@') el.click();
    });
  });
  await sleep(3000);
  
  // 提取所有评论项的用户名和内容
  const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 5000));
  console.log(bodyText);
  
  await page.screenshot({ path: 'C:\\Users\\Administrator\\.openclaw\\workspace\\notify_current.jpg', type: 'jpeg', quality: 90 });
  
  browser.disconnect();
})();
