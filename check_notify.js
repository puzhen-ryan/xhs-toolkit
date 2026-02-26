const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  
  // 先去主站确保登录
  await page.goto('https://www.xiaohongshu.com', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));
  
  // 尝试通知页
  await page.goto('https://www.xiaohongshu.com/notification', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 5000));
  console.log('URL:', page.url());
  
  await page.screenshot({ path: 'C:\\Users\\Administrator\\.openclaw\\workspace\\notify.jpg', type: 'jpeg', quality: 80 });
  
  const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 5000));
  console.log(bodyText);
  
  browser.disconnect();
})();
