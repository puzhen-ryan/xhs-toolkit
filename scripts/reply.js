/**
 * reply.js — 自动回复小红书评论
 *
 * 前提: 浏览器已启动 CDP 调试，且已登录小红书
 *
 * 用法:
 *   node scripts/reply.js --replies replies.json
 *
 * replies.json 格式 (按通知页评论顺序):
 * [
 *   "回复第1条评论的内容",
 *   "回复第2条评论的内容",
 *   null,   // null = 跳过这条
 *   "回复第4条评论的内容"
 * ]
 *
 * ⚠️ 已知坑:
 *   - 通知页默认可能在"赞和收藏"tab，需先切到"评论和@"
 *   - 回复按钮选择器是 div.action-text（不是 .action-reply）
 *   - 回复框是 textarea.comment-input
 *   - 发送按钮文字是"发送"，回车不生效
 *   - 每条回复使用固定 index（回复后按钮不会消失，索引稳定）
 *   - 每次回复前验证 placeholder 确认目标用户
 */
const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const config = require('./config');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { repliesFile: '', dryRun: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--replies' && args[i + 1]) opts.repliesFile = args[++i];
    if (args[i] === '--dry-run') opts.dryRun = true;
  }
  return opts;
}

async function replyToComment(page, idx, text, dryRun) {
  // 滚动到回复按钮
  await page.evaluate((i) => {
    const btns = document.querySelectorAll('div.action-text');
    if (i < btns.length) btns[i].scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, idx);
  await sleep(800);

  // 点击回复按钮
  await page.evaluate((i) => {
    const btns = document.querySelectorAll('div.action-text');
    if (i < btns.length) btns[i].click();
  }, idx);
  await sleep(1500);

  // 验证回复框出现并确认目标用户
  const placeholder = await page.evaluate(() => {
    const ta = document.querySelector('textarea.comment-input');
    return ta ? ta.placeholder : null;
  });

  if (!placeholder) {
    console.log(`  ❌ [${idx}] 回复框未出现`);
    return { ok: false, target: null };
  }

  // placeholder 格式: "回复 用户名"
  const target = placeholder.replace('回复 ', '');
  console.log(`  📝 [${idx}] 目标: ${target}`);

  if (dryRun) {
    console.log(`  🏁 [${idx}] Dry run, 跳过发送`);
    // 关闭回复框
    await page.evaluate(() => {
      const ta = document.querySelector('textarea.comment-input');
      if (ta) ta.blur();
    });
    await sleep(500);
    return { ok: true, target, dryRun: true };
  }

  // 输入回复内容
  await page.click('textarea.comment-input');
  await sleep(200);
  await page.type('textarea.comment-input', text, { delay: 5 });
  await sleep(800);

  // 点击发送按钮（回车不生效）
  const sent = await page.evaluate(() => {
    const els = document.querySelectorAll('*');
    for (const el of els) {
      const directText = Array.from(el.childNodes)
        .filter(n => n.nodeType === 3)
        .map(n => n.textContent.trim())
        .join('');
      if (directText === '发送' && el.offsetParent !== null) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 15 && rect.width < 200) {
          el.click();
          return true;
        }
      }
    }
    return false;
  });
  await sleep(2000);

  return { ok: sent, target };
}

async function main() {
  const opts = parseArgs();
  if (!opts.repliesFile) {
    console.error('❌ 请指定 --replies <file.json>');
    console.error('用法: node scripts/reply.js --replies replies.json [--dry-run]');
    process.exit(1);
  }

  const replies = JSON.parse(fs.readFileSync(path.resolve(opts.repliesFile), 'utf-8'));
  const toReply = replies.filter(r => r !== null).length;
  console.log(`💬 准备回复 ${toReply} 条评论${opts.dryRun ? ' (dry run)' : ''}\n`);

  const browser = await puppeteer.connect({ browserURL: config.cdpURL });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  await page.goto('https://www.xiaohongshu.com/notification', { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(3000);

  // 切换到"评论和@" tab
  await page.evaluate(() => {
    document.querySelectorAll('.reds-tab-item').forEach(el => {
      if (el.textContent.trim() === '评论和@') el.click();
    });
  });
  await sleep(3000);
  console.log('📋 已切换到"评论和@" tab\n');

  const btnCount = await page.evaluate(() => document.querySelectorAll('div.action-text').length);
  console.log(`📋 找到 ${btnCount} 个回复按钮\n`);

  let success = 0, skipped = 0, failed = 0;

  for (let i = 0; i < replies.length; i++) {
    if (replies[i] === null) {
      console.log(`  ⏭️ [${i}] 跳过`);
      skipped++;
      continue;
    }
    if (i >= btnCount) {
      console.log(`  ⚠️ [${i}] 超出范围 (只有 ${btnCount} 个按钮)`);
      break;
    }

    console.log(`  💬 [${i}] 回复: "${replies[i].substring(0, 40)}..."`);
    const result = await replyToComment(page, i, replies[i], opts.dryRun);

    if (result.ok) {
      console.log(`  ✅ [${i}] → ${result.target}`);
      success++;
    } else {
      console.log(`  ❌ [${i}] 发送失败`);
      failed++;
    }

    await sleep(1500);
  }

  console.log(`\n🎉 完成！成功 ${success}，跳过 ${skipped}，失败 ${failed}`);
  browser.disconnect();
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
