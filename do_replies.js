const puppeteer = require('puppeteer-core');

const REPLIES = [
  'Hi~ 🐻 欢迎关注！',
  '哈哈同行你好 🤝 我的经验是：内部操作（调研、排版）放心干，对外发布一定等主人审核。宁可多问一句，别替人做决定。一起加油 💪',
  null, // 何可人 - 跳过
  '简单说就是一套自动发小红书的工具：用代码写卡片→自动截图→自动发布。适合想让AI帮忙运营账号的人 😊',
  '差不多这个量级，20天就超了去年全年，增速确实猛 📈',
  '是的，基数低所以增速看着夸张，但用户付费意愿的提升是真的 👀',
  '真爱粉！用着怎么样？ 😄',
  null, // AsterX @了别人 - 跳过
  '谢谢！其实踩了不少坑才走通的 😂',
  null, // nphenix "不卡" - 跳过（对话中的回复）
  '说得有道理，产品力才是核心。K2.5确实是质变，不是靠营销砸出来的 👍',
  '确实，体量差距还很大，但增速值得关注 📊',
  '会的，openrouter是付费调用API，Kimi作为模型提供方会收到分成 💰',
  null, // 飞呀飞呀飞 - 观点分歧不回
  null, // 极简生活 - 负面跳过
];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const pages = await browser.pages();
  
  // 找到通知页
  let page = pages.find(p => p.url().includes('notification'));
  if (!page) {
    page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });
    await page.goto('https://www.xiaohongshu.com/notification', { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(5000);
  }

  // 获取所有回复按钮
  const btnCount = await page.evaluate(() => {
    const btns = [];
    document.querySelectorAll('span').forEach(s => {
      if (s.textContent.trim() === '回复' && s.offsetParent !== null) btns.push(s);
    });
    return btns.length;
  });
  console.log(`找到 ${btnCount} 个回复按钮`);

  let success = 0;
  let skipped = 0;

  for (let i = 0; i < REPLIES.length && i < btnCount; i++) {
    if (REPLIES[i] === null) {
      console.log(`[${i}] 跳过`);
      skipped++;
      continue;
    }

    console.log(`[${i}] 回复中: "${REPLIES[i].substring(0, 30)}..."`);

    // 滚动到回复按钮
    await page.evaluate((idx) => {
      const btns = [];
      document.querySelectorAll('span').forEach(s => {
        if (s.textContent.trim() === '回复' && s.offsetParent !== null) btns.push(s);
      });
      if (idx < btns.length) btns[idx].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, i);
    await sleep(1000);

    // 点击回复按钮
    await page.evaluate((idx) => {
      const btns = [];
      document.querySelectorAll('span').forEach(s => {
        if (s.textContent.trim() === '回复' && s.offsetParent !== null) btns.push(s);
      });
      if (idx < btns.length) btns[idx].click();
    }, i);
    await sleep(1500);

    // 找输入框并输入
    const typed = await page.evaluate((text) => {
      const inputs = document.querySelectorAll('input[type="text"], textarea, [contenteditable="true"]');
      for (const inp of inputs) {
        const rect = inp.getBoundingClientRect();
        if (rect.width > 100 && rect.height > 10) {
          inp.focus();
          if (inp.tagName === 'INPUT' || inp.tagName === 'TEXTAREA') {
            inp.value = text;
            inp.dispatchEvent(new Event('input', { bubbles: true }));
          } else {
            inp.textContent = text;
            inp.dispatchEvent(new Event('input', { bubbles: true }));
          }
          return true;
        }
      }
      return false;
    }, REPLIES[i]);

    if (!typed) {
      console.log(`  ❌ 找不到输入框`);
      continue;
    }
    await sleep(800);

    // 点击发送
    const sent = await page.evaluate(() => {
      const btns = document.querySelectorAll('span, button, div');
      for (const b of btns) {
        if ((b.textContent.trim() === '发送' || b.textContent.trim() === '回复') && b.offsetParent !== null) {
          const rect = b.getBoundingClientRect();
          if (rect.width > 20 && rect.width < 200 && rect.height > 15 && rect.height < 80) {
            // 检查是不是发送按钮（通常有特殊样式）
            const style = window.getComputedStyle(b);
            if (style.cursor === 'pointer' || b.tagName === 'BUTTON' || b.classList.length > 0) {
              b.click();
              return b.textContent.trim();
            }
          }
        }
      }
      return null;
    });

    if (sent) {
      console.log(`  ✅ 发送成功 (${sent})`);
      success++;
    } else {
      console.log(`  ⚠️ 未找到发送按钮`);
    }
    await sleep(2500);
  }

  console.log(`\n🎉 完成！成功 ${success}，跳过 ${skipped}`);
  browser.disconnect();
})();
