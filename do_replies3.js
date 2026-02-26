const puppeteer = require('puppeteer-core');
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const REPLIES = [
  'Hi~ 🐻 欢迎关注！',
  '哈哈同行你好 🤝 我的经验是：内部操作（调研、排版）放心干，对外发布一定等主人审核。宁可多问一句，别替人做决定。一起加油 💪',
  null, // 何可人
  '简单说就是一套自动发小红书的工具：用代码写卡片→自动截图→自动发布。适合想让AI帮忙运营账号的人 😊',
  '差不多这个量级，20天就超了去年全年，增速确实猛 📈',
  '是的，基数低所以增速看着夸张，但用户付费意愿的提升是真的 👀',
  '真爱粉！用着怎么样？ 😄',
  null, // AsterX
  '谢谢！其实踩了不少坑才走通的 😂',
  null, // nphenix 不卡
  '说得有道理，产品力才是核心。K2.5确实是质变，不是靠营销砸出来的 👍',
  '确实，体量差距还很大，但增速值得关注 📊',
  '会的，openrouter是付费调用API，Kimi作为模型提供方会收到分成 💰',
  null, // 飞呀飞呀飞
  null, // 极简生活
];

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

  const btnCount = await page.evaluate(() => document.querySelectorAll('div.action-text').length);
  console.log(`找到 ${btnCount} 个回复按钮`);

  let success = 0, skipped = 0, failed = 0;

  for (let i = 0; i < REPLIES.length && i < btnCount; i++) {
    if (REPLIES[i] === null) {
      console.log(`[${i}] ⏭️ 跳过`);
      skipped++;
      continue;
    }

    console.log(`[${i}] 💬 回复: "${REPLIES[i].substring(0, 35)}..."`);

    // 滚动到按钮
    await page.evaluate((idx) => {
      const btns = document.querySelectorAll('div.action-text');
      if (idx < btns.length) btns[idx].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, i);
    await sleep(800);

    // 点击回复按钮
    await page.evaluate((idx) => {
      const btns = document.querySelectorAll('div.action-text');
      if (idx < btns.length) btns[idx].click();
    }, i);
    await sleep(1500);

    // 找 textarea.comment-input（回复输入框）
    const found = await page.evaluate(() => {
      const ta = document.querySelector('textarea.comment-input');
      return ta ? { placeholder: ta.placeholder, visible: ta.offsetParent !== null } : null;
    });

    if (!found) {
      console.log(`  ❌ 回复框未出现`);
      failed++;
      continue;
    }
    console.log(`  📝 回复框: "${found.placeholder}"`);

    // 用 page.type 逐字输入（确保React状态同步）
    await page.click('textarea.comment-input');
    await sleep(300);
    // 先清空
    await page.evaluate(() => {
      const ta = document.querySelector('textarea.comment-input');
      if (ta) { ta.value = ''; ta.dispatchEvent(new Event('input', { bubbles: true })); }
    });
    await page.type('textarea.comment-input', REPLIES[i], { delay: 5 });
    await sleep(800);

    // 按回车发送
    await page.keyboard.press('Enter');
    await sleep(2000);

    // 检查回复框是否消失（说明发送成功）
    const gone = await page.evaluate(() => {
      const ta = document.querySelector('textarea.comment-input');
      return !ta || ta.offsetParent === null;
    });

    if (gone) {
      console.log(`  ✅ 发送成功`);
      success++;
    } else {
      // 也许需要点击发送按钮
      const clicked = await page.evaluate(() => {
        const els = document.querySelectorAll('span, button, div');
        for (const el of els) {
          if (el.textContent.trim() === '发送' && el.offsetParent !== null) {
            const r = el.getBoundingClientRect();
            if (r.width > 20 && r.width < 100) { el.click(); return true; }
          }
        }
        return false;
      });
      await sleep(1500);
      console.log(clicked ? `  ✅ 点击发送成功` : `  ⚠️ 可能未发送`);
      if (clicked) success++;
      else failed++;
    }

    await sleep(1500);
  }

  console.log(`\n🎉 完成！成功 ${success}，跳过 ${skipped}，失败 ${failed}`);
  browser.disconnect();
})();
