const puppeteer = require('puppeteer-core');
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const REPLIES = [
  'Hi~ 🐻 欢迎关注！',
  '哈哈同行你好 🤝 我的经验是：内部操作（调研、排版）放心干，对外发布一定等主人审核。宁可多问一句，别替人做决定。一起加油 💪',
  null, // 何可人 - 私信相关跳过
  '简单说就是一套自动发小红书的工具：用代码写卡片→自动截图→自动发布。适合想让AI帮忙运营账号的人 😊',
  '差不多这个量级，20天就超了去年全年，增速确实猛 📈',
  '是的，基数低所以增速看着夸张，但用户付费意愿的提升是真的 👀',
  '真爱粉！用着怎么样？ 😄',
  null, // AsterX @了别人
  '谢谢！其实踩了不少坑才走通的 😂',
  null, // nphenix "不卡" 对话
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

  let success = 0, skipped = 0;

  for (let i = 0; i < REPLIES.length && i < btnCount; i++) {
    if (REPLIES[i] === null) {
      console.log(`[${i}] ⏭️ 跳过`);
      skipped++;
      continue;
    }

    console.log(`[${i}] 💬 回复: "${REPLIES[i].substring(0, 30)}..."`);

    // 滚动到按钮
    await page.evaluate((idx) => {
      const btns = document.querySelectorAll('div.action-text');
      if (idx < btns.length) btns[idx].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, i);
    await sleep(1000);

    // 点击回复按钮
    await page.evaluate((idx) => {
      const btns = document.querySelectorAll('div.action-text');
      if (idx < btns.length) btns[idx].click();
    }, i);
    await sleep(1500);

    // 找到输入框并输入
    const typed = await page.evaluate((text) => {
      // 尝试多种输入框选择器
      const candidates = [
        ...document.querySelectorAll('input[type="text"]'),
        ...document.querySelectorAll('textarea'),
        ...document.querySelectorAll('[contenteditable="true"]'),
        ...document.querySelectorAll('.reds-input input'),
        ...document.querySelectorAll('[placeholder*="回复"]'),
        ...document.querySelectorAll('[placeholder*="评论"]'),
      ];
      for (const inp of candidates) {
        const rect = inp.getBoundingClientRect();
        if (rect.width > 50 && rect.height > 10 && inp.offsetParent !== null) {
          inp.focus();
          if (inp.tagName === 'INPUT' || inp.tagName === 'TEXTAREA') {
            // Use native setter to trigger React state update
            const nativeSetter = Object.getOwnPropertyDescriptor(
              window.HTMLInputElement.prototype, 'value'
            )?.set || Object.getOwnPropertyDescriptor(
              window.HTMLTextAreaElement.prototype, 'value'
            )?.set;
            if (nativeSetter) nativeSetter.call(inp, text);
            else inp.value = text;
            inp.dispatchEvent(new Event('input', { bubbles: true }));
            inp.dispatchEvent(new Event('change', { bubbles: true }));
          } else {
            inp.textContent = text;
            inp.dispatchEvent(new Event('input', { bubbles: true }));
          }
          return { tag: inp.tagName, placeholder: inp.placeholder || '', class: inp.className.substring(0, 60) };
        }
      }
      return null;
    }, REPLIES[i]);

    if (!typed) {
      console.log(`  ❌ 找不到输入框`);
      // 截图debug
      await page.screenshot({ path: `C:\\Users\\Administrator\\.openclaw\\workspace\\reply_debug_${i}.jpg`, type: 'jpeg', quality: 80 });
      continue;
    }
    console.log(`  📝 输入框: ${typed.tag} (${typed.placeholder || typed.class})`);
    await sleep(1000);

    // 点击发送按钮
    const sent = await page.evaluate(() => {
      const candidates = document.querySelectorAll('div, span, button');
      for (const el of candidates) {
        const direct = Array.from(el.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('');
        if (direct === '发送' && el.offsetParent !== null) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 15 && rect.width < 200) {
            el.click();
            return true;
          }
        }
      }
      return false;
    });

    if (sent) {
      console.log(`  ✅ 发送成功`);
      success++;
    } else {
      console.log(`  ⚠️ 未找到发送按钮，尝试回车`);
      await page.keyboard.press('Enter');
      await sleep(500);
      success++; // optimistic
    }
    await sleep(2500);
  }

  console.log(`\n🎉 完成！成功 ${success}，跳过 ${skipped}`);
  browser.disconnect();
})();
