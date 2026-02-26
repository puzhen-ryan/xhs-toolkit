const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const pages = await browser.pages();
  let page = pages.find(p => p.url().includes('notification'));
  if (!page) {
    console.log('No notification page found, opening one...');
    page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });
    await page.goto('https://www.xiaohongshu.com/notification', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 5000));
  }
  
  console.log('URL:', page.url());
  await page.screenshot({ path: 'C:\\Users\\Administrator\\.openclaw\\workspace\\notify2.jpg', type: 'jpeg', quality: 80 });
  
  // 找所有含"回复"文字的元素
  const replyElements = await page.evaluate(() => {
    const results = [];
    const all = document.querySelectorAll('*');
    for (const el of all) {
      if (el.children.length === 0 && el.textContent.trim() === '回复') {
        results.push({
          tag: el.tagName,
          class: el.className,
          parent: el.parentElement ? el.parentElement.className : '',
          visible: el.offsetParent !== null,
          rect: el.getBoundingClientRect()
        });
      }
    }
    return results;
  });
  console.log('回复 elements:', JSON.stringify(replyElements, null, 2));

  // Also check what clickable elements exist near comments
  const clickables = await page.evaluate(() => {
    const results = [];
    const all = document.querySelectorAll('span, button, a, div');
    for (const el of all) {
      const t = el.textContent.trim();
      if ((t === '回复' || t === 'Reply') && el.children.length === 0) {
        results.push({ tag: el.tagName, text: t, class: el.className, id: el.id });
      }
    }
    return results;
  });
  console.log('Clickable reply:', JSON.stringify(clickables));

  browser.disconnect();
})();
