/**
 * reply.js — 自动回复小红书评论
 *
 * 前提: 浏览器已启动 CDP 调试，且已登录小红书
 *
 * 用法:
 *   node scripts/reply.js --replies replies.json
 *
 * replies.json 格式:
 * [
 *   "回复第1条评论的内容",
 *   "回复第2条评论的内容",
 *   null,   // null = 跳过这条
 *   "回复第4条评论的内容"
 * ]
 *
 * 脚本会按通知页评论顺序，逐条点击"回复" → 输入 → 点击"发送"。
 */
const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const config = require('./config');

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { repliesFile: '' };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--replies' && args[i + 1]) opts.repliesFile = args[++i];
  }
  return opts;
}

async function replyToComment(page, idx, text) {
  // 滚动到按钮位置
  await page.evaluate((i) => {
    const btns = document.querySelectorAll('.action-reply');
    if (i < btns.length) btns[i].scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, idx);
  await sleep(800);

  // 点击回复按钮
  await page.evaluate((i) => {
    const btns = document.querySelectorAll('.action-reply');
    if (i < btns.length) btns[i].click();
  }, idx);
  await sleep(1500);

  // 输入文字
  const textarea = await page.$('textarea');
  if (!textarea) { console.log(`  ⚠️ [${idx}] 找不到输入框`); return false; }
  await textarea.click({ clickCount: 3 });
  await sleep(200);
  await textarea.type(text, { delay: 10 });
  await sleep(800);

  // 点击发送
  const sent = await page.evaluate(() => {
    const spans = document.querySelectorAll('span, button, div');
    for (const s of spans) {
      if (s.textContent.trim() === '发送' && s.offsetParent !== null) {
        const rect = s.getBoundingClientRect();
        if (rect.width > 20 && rect.width < 150) { s.click(); return true; }
      }
    }
    return false;
  });

  await sleep(2000);
  return sent;
}

async function main() {
  const opts = parseArgs();
  if (!opts.repliesFile) { console.error('❌ 请指定 --replies <file.json>'); process.exit(1); }

  const replies = JSON.parse(fs.readFileSync(path.resolve(opts.repliesFile), 'utf-8'));
  console.log(`💬 准备回复 ${replies.filter(r => r !== null).length} 条评论\n`);

  const browser = await puppeteer.connect({ browserURL: config.cdpURL });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  await page.goto('https://www.xiaohongshu.com/notification', { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(5000);

  const btnCount = await page.evaluate(() => document.querySelectorAll('.action-reply').length);
  console.log(`📋 通知页共 ${btnCount} 条评论\n`);

  let success = 0;
  for (let i = 0; i < replies.length; i++) {
    if (replies[i] === null) { console.log(`  ⏭️ [${i}] 跳过`); continue; }
    if (i >= btnCount) { console.log(`  ⚠️ [${i}] 超出范围`); break; }
    console.log(`  💬 [${i}] 回复中...`);
    const ok = await replyToComment(page, i, replies[i]);
    console.log(ok ? `  ✅ [${i}] 发送成功` : `  ❌ [${i}] 发送失败`);
    if (ok) success++;
    await sleep(2000);
  }

  console.log(`\n🎉 完成！成功 ${success}/${replies.filter(r => r !== null).length}`);
  browser.disconnect();
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

main().catch(e => { console.error('❌', e.message); process.exit(1); });
