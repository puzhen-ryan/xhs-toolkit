/**
 * publish.js — 自动发布小红书图文笔记
 *
 * 前提: 浏览器已启动 CDP 调试，且已登录小红书创作者中心
 *
 * 用法:
 *   node scripts/publish.js --dir ./my-post --title "标题" --desc "正文"
 *   node scripts/publish.js --dir ./my-post --title "标题" --desc-file desc.txt
 *
 * ⚠️ 注意事项:
 *   - 标题不超过 20 字！超了发布按钮无效但不报错
 *   - 多图上传必须一次性 uploadFile(...allFiles)
 *   - 发布页默认视频 tab，脚本会自动点"上传图文"
 */
const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const config = require('./config');

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { dir: '.', title: '', desc: '', descFile: '', slides: 0, dryRun: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dir' && args[i + 1]) opts.dir = args[++i];
    if (args[i] === '--title' && args[i + 1]) opts.title = args[++i];
    if (args[i] === '--desc' && args[i + 1]) opts.desc = args[++i];
    if (args[i] === '--desc-file' && args[i + 1]) opts.descFile = args[++i];
    if (args[i] === '--slides' && args[i + 1]) opts.slides = parseInt(args[++i]);
    if (args[i] === '--dry-run') opts.dryRun = true;
  }
  return opts;
}

async function main() {
  const opts = parseArgs();
  const dir = path.resolve(opts.dir);

  // 读取描述
  let desc = opts.desc;
  if (opts.descFile) {
    desc = fs.readFileSync(path.resolve(opts.descFile), 'utf-8');
  }

  // 验证标题
  if (!opts.title) { console.error('❌ 请指定 --title'); process.exit(1); }
  if ([...opts.title].length > 20) {
    console.error(`❌ 标题超过20字！当前 ${[...opts.title].length} 字: "${opts.title}"`);
    process.exit(1);
  }

  // 自动检测 slides
  let slideCount = opts.slides;
  if (!slideCount) {
    for (let i = 1; i <= 20; i++) {
      const jpg = path.join(dir, 'output', `slide${i}.jpg`);
      const jpeg = path.join(dir, 'output', `slide${i}.jpeg`);
      if (fs.existsSync(jpg) || fs.existsSync(jpeg)) slideCount = i;
      else break;
    }
  }
  if (!slideCount) { console.error('❌ 未找到 output/slide*.jpg'); process.exit(1); }

  const slides = [];
  for (let i = 1; i <= slideCount; i++) {
    const jpg = path.join(dir, 'output', `slide${i}.jpg`);
    if (fs.existsSync(jpg)) slides.push(jpg);
  }

  console.log(`🚀 发布: "${opts.title}" (${slides.length} 图)`);
  if (opts.dryRun) { console.log('🏁 Dry run, 不实际发布'); return; }

  // 连接浏览器
  const browser = await puppeteer.connect({ browserURL: config.cdpURL });

  // 关闭已有的发布页
  const pages = await browser.pages();
  for (const p of pages) {
    if (p.url().includes('creator.xiaohongshu.com/publish')) {
      try { await p.close(); } catch (e) {}
    }
  }
  await sleep(1000);

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  await page.goto(config.publishURL, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(3000);

  // 点击"上传图文"tab
  await page.evaluate(() => {
    const all = document.querySelectorAll('span, div, button, a, li');
    for (const el of all) {
      if (el.textContent.trim() === '上传图文') { el.click(); return; }
    }
  });
  await sleep(2000);
  console.log('  ✅ 点击"上传图文"');

  // 上传所有图片（必须一次性）
  await page.evaluate(() => {
    const inp = document.querySelector('input[type="file"]');
    if (inp) inp.setAttribute('multiple', 'true');
  });
  const input = await page.$('input[type="file"]');
  if (!input) { console.error('❌ 找不到文件上传控件'); process.exit(1); }
  await input.uploadFile(...slides);
  console.log(`  ✅ 上传 ${slides.length} 张图片`);
  await sleep(8000);

  // 填写标题
  await page.evaluate((t) => {
    const el = document.querySelector('[placeholder*="标题"]');
    if (el) {
      el.focus();
      el.value = t;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, opts.title);
  console.log(`  ✅ 标题: "${opts.title}"`);
  await sleep(1000);

  // 填写正文（逐行输入以触发标签识别）
  if (desc) {
    const lines = desc.split('\n');
    for (let i = 0; i < lines.length; i++) {
      await page.type('[contenteditable="true"], #post-textarea', lines[i], { delay: 10 });
      if (i < lines.length - 1) {
        await page.keyboard.press('Enter');
      }
    }
    console.log('  ✅ 正文已填写');
    await sleep(2000);
  }

  // 滚动到底部 + 点击发布
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await sleep(1000);

  const pubResult = await page.evaluate(() => {
    const btns = document.querySelectorAll('button');
    for (const b of btns) {
      if (b.textContent.trim() === '发布' || b.textContent.trim() === '发布笔记') {
        b.click();
        return b.textContent.trim();
      }
    }
    return 'not found';
  });
  console.log(`  ✅ 点击: ${pubResult}`);

  // 等待跳转
  await sleep(10000);
  const finalURL = page.url();
  console.log(`  📎 URL: ${finalURL}`);

  if (finalURL.includes('published=true') || finalURL.includes('publish/success')) {
    console.log('\n🎉 发布成功！');
  } else {
    console.log('\n⚠️ 请手动检查发布结果');
  }

  browser.disconnect();
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

main().catch(e => { console.error('❌', e.message); process.exit(1); });
