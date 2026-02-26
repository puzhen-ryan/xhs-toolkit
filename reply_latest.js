const puppeteer = require('puppeteer-core');
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// 只回复最新帖子的评论，逐条操作，每次重新获取按钮避免索引偏移
const REPLIES = [
  { index: 0, text: 'Hi~ 🐻 欢迎关注！' },
  { index: 0, text: '哈哈同行你好 🤝 我的经验是：内部操作（调研、排版）放心干，对外发布一定等主人审核。宁可多问一句，别替人做决定。一起加油 💪' },
];
// 注意：每次回复成功后，已回复的评论不再显示回复按钮（或位置变化）
// 所以第二条也用 index 0 —— 第一条回复后，原第二条变成了第一条

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  await page.goto('https://www.xiaohongshu.com/notification', { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(3000);

  // 点击"评论和@"
  await page.evaluate(() => {
    document.querySelectorAll('.reds-tab-item').forEach(el => {
      if (el.textContent.trim() === '评论和@') el.click();
    });
  });
  await sleep(3000);

  for (let r = 0; r < REPLIES.length; r++) {
    const reply = REPLIES[r];
    console.log(`\n[${r}] 准备回复: "${reply.text.substring(0, 40)}..."`);

    // 每次重新获取按钮列表
    const btnCount = await page.evaluate(() => document.querySelectorAll('div.action-text').length);
    console.log(`  当前有 ${btnCount} 个回复按钮`);
    if (reply.index >= btnCount) {
      console.log(`  ❌ 索引 ${reply.index} 超出范围`);
      continue;
    }

    // 点击回复按钮
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

    // 确认回复框出现
    const placeholder = await page.evaluate(() => {
      const ta = document.querySelector('textarea.comment-input');
      return ta ? ta.placeholder : null;
    });
    
    if (!placeholder) {
      console.log(`  ❌ 回复框未出现`);
      continue;
    }
    console.log(`  📝 ${placeholder}`);

    // 输入回复内容
    await page.click('textarea.comment-input');
    await sleep(200);
    await page.type('textarea.comment-input', reply.text, { delay: 5 });
    await sleep(800);

    // 尝试按回车发送
    await page.keyboard.press('Enter');
    await sleep(2000);

    // 检查是否发送成功（回复框消失或placeholder变化）
    const afterTA = await page.evaluate(() => {
      const ta = document.querySelector('textarea.comment-input');
      return ta ? { visible: ta.offsetParent !== null, value: ta.value } : null;
    });

    if (!afterTA || !afterTA.visible || afterTA.value === '') {
      console.log(`  ✅ 发送成功（回车）`);
    } else {
      // 回车没用，找发送按钮
      console.log(`  ⏳ 回车未生效，尝试点击发送...`);
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
      console.log(sent ? `  ✅ 点击发送成功` : `  ❌ 发送失败`);
    }

    // 等待页面刷新/稳定
    await sleep(2000);
    
    // 关闭回复框（如果还在的话）
    await page.evaluate(() => {
      const cancel = document.querySelector('.cancel-btn, [class*="cancel"]');
      if (cancel) cancel.click();
    });
    await sleep(1000);
  }

  console.log('\n🎉 全部完成！');
  browser.disconnect();
})();
