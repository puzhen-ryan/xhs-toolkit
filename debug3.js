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
    const spans = document.querySelectorAll('span, div, a');
    for (const s of spans) {
      if (s.textContent.trim() === '评论和@' && s.children.length === 0) {
        s.click();
        return;
      }
    }
  });
  await sleep(3000);
  
  await page.screenshot({ path: 'C:\\Users\\Administrator\\.openclaw\\workspace\\notify3.jpg', type: 'jpeg', quality: 90 });
  console.log('Tab: 评论和@');
  
  // 获取页面HTML来理解结构
  const structure = await page.evaluate(() => {
    // Find comment items by looking for time indicators like "分钟前", "天前", "小时前"
    const items = document.querySelectorAll('[class*="notify"], [class*="comment"], [class*="item"], [class*="card"]');
    const info = [];
    items.forEach((el, i) => {
      if (i < 5) {
        info.push({
          tag: el.tagName,
          class: el.className.substring(0, 100),
          childCount: el.children.length,
          text: el.innerText?.substring(0, 100)
        });
      }
    });
    return info;
  });
  console.log('Structure:', JSON.stringify(structure, null, 2));
  
  // Find reply buttons - look for any element with text "回复" that's a leaf
  const replyInfo = await page.evaluate(() => {
    const all = document.querySelectorAll('*');
    const results = [];
    for (const el of all) {
      // Check direct text content (not children)
      const directText = Array.from(el.childNodes)
        .filter(n => n.nodeType === 3)
        .map(n => n.textContent.trim())
        .join('');
      if (directText === '回复') {
        results.push({
          tag: el.tagName,
          class: el.className?.substring?.(0, 80) || '',
          visible: el.offsetParent !== null,
          w: el.getBoundingClientRect().width,
          h: el.getBoundingClientRect().height
        });
      }
    }
    return results;
  });
  console.log('Reply buttons:', JSON.stringify(replyInfo));
  
  // Also look for chat/comment icons or SVGs near comment text
  const svgBtns = await page.evaluate(() => {
    const svgs = document.querySelectorAll('svg, use, [class*="reply"], [class*="Reply"]');
    return Array.from(svgs).slice(0, 10).map(s => ({
      tag: s.tagName,
      class: s.className?.baseVal || s.className || '',
      parent: s.parentElement?.className?.substring?.(0, 60) || ''
    }));
  });
  console.log('SVGs/reply classes:', JSON.stringify(svgBtns));
  
  browser.disconnect();
})();
