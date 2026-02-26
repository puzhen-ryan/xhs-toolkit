const puppeteer = require('puppeteer-core');
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  await page.goto('https://www.xiaohongshu.com/notification', { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(3000);

  // 点击"评论和@" tab
  await page.evaluate(() => {
    document.querySelectorAll('.reds-tab-item').forEach(el => {
      if (el.textContent.trim() === '评论和@') el.click();
    });
  });
  await sleep(3000);

  // 点击第一个回复按钮
  await page.evaluate(() => {
    const btns = document.querySelectorAll('div.action-text');
    if (btns.length > 0) btns[0].click();
  });
  await sleep(2000);

  // 截图看回复框出现在哪里
  await page.screenshot({ path: 'C:\\Users\\Administrator\\.openclaw\\workspace\\reply_click.jpg', type: 'jpeg', quality: 90 });

  // 列出所有input/textarea
  const inputs = await page.evaluate(() => {
    const results = [];
    document.querySelectorAll('input, textarea, [contenteditable="true"]').forEach(el => {
      const rect = el.getBoundingClientRect();
      results.push({
        tag: el.tagName,
        type: el.type || '',
        placeholder: el.placeholder || '',
        class: (el.className || '').substring(0, 80),
        visible: el.offsetParent !== null,
        w: rect.width,
        h: rect.height,
        y: rect.y
      });
    });
    return results;
  });
  console.log('All inputs after click:', JSON.stringify(inputs, null, 2));

  browser.disconnect();
})();
