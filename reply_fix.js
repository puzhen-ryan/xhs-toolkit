const puppeteer = require('puppeteer-core');
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// 逐条回复，index递增（按钮不会因回复而消失）
const REPLIES = [
  { index: 1, text: '哈哈同行你好 🤝 我的经验是：内部操作（调研、排版）放心干，对外发布一定等主人审核。宁可多问一句，别替人做决定。一起加油 💪' },
];

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  await page.goto('https://www.xiaohongshu.com/notification', { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(3000);

  await page.evaluate(() => {
    document.querySelectorAll('.reds-tab-item').forEach(el => {
      if (el.textContent.trim() === '评论和@') el.click();
    });
  });
  await sleep(3000);

  for (const reply of REPLIES) {
    console.log(`回复 index ${reply.index}: "${reply.text.substring(0, 40)}..."`);

    await page.evaluate((idx) => {
      const btns = document.querySelectorAll('div.action-text');
      btns[idx].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, reply.index);
    await sleep(800);
    
    await page.evaluate((idx) => {
      const btns = document.querySelectorAll('div.action-text');
      btns[idx].click();
    }, reply.index);
    await sleep(1500);

    const placeholder = await page.evaluate(() => {
      const ta = document.querySelector('textarea.comment-input');
      return ta ? ta.placeholder : null;
    });
    console.log(`  📝 ${placeholder}`);

    await page.click('textarea.comment-input');
    await sleep(200);
    await page.type('textarea.comment-input', reply.text, { delay: 5 });
    await sleep(800);

    // 点击发送
    const sent = await page.evaluate(() => {
      const els = document.querySelectorAll('*');
      for (const el of els) {
        const dt = Array.from(el.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('');
        if (dt === '发送' && el.offsetParent !== null) {
          el.click();
          return true;
        }
      }
      return false;
    });
    await sleep(2000);
    console.log(sent ? `  ✅ 发送成功` : `  ❌ 发送失败`);
  }

  console.log('\n🎉 完成！');
  browser.disconnect();
})();
