/**
 * snap.js — 批量截图 HTML slides → JPG
 *
 * 用法:
 *   node scripts/snap.js                          # 当前目录, 自动检测 slide*.html
 *   node scripts/snap.js --dir ./my-post          # 指定目录
 *   node scripts/snap.js --dir ./my-post --slides 5  # 指定张数
 */
const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const config = require('./config');

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { dir: '.', slides: 0 };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dir' && args[i + 1]) opts.dir = args[++i];
    if (args[i] === '--slides' && args[i + 1]) opts.slides = parseInt(args[++i]);
  }
  return opts;
}

async function main() {
  const opts = parseArgs();
  const dir = path.resolve(opts.dir);

  // 自动检测 slide 数量
  let slideCount = opts.slides;
  if (!slideCount) {
    for (let i = 1; i <= 20; i++) {
      if (fs.existsSync(path.join(dir, `slide${i}.html`))) slideCount = i;
      else break;
    }
  }
  if (!slideCount) {
    console.error('❌ 未找到 slide*.html 文件');
    process.exit(1);
  }

  // 确保 output 目录存在
  const outDir = path.join(dir, 'output');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  console.log(`📸 截图 ${slideCount} 张 slides (${dir})`);

  const browser = await puppeteer.launch({
    executablePath: config.browserPath,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-web-security'],
  });

  for (let i = 1; i <= slideCount; i++) {
    const page = await browser.newPage();
    await page.setViewport({ width: config.screenshot.width, height: config.screenshot.height });

    const htmlFile = path.join(dir, `slide${i}.html`);
    await page.goto(`file:///${htmlFile.replace(/\\/g, '/')}`, {
      waitUntil: 'networkidle0',
      timeout: 10000,
    });
    await new Promise(r => setTimeout(r, 500));

    const outPath = path.join(outDir, `slide${i}.${config.screenshot.type}`);
    await page.screenshot({
      path: outPath,
      type: config.screenshot.type,
      quality: config.screenshot.quality,
    });

    console.log(`  ✅ slide${i}.${config.screenshot.type}`);
    await page.close();
  }

  await browser.close();
  console.log(`\n🎉 完成！输出目录: ${outDir}`);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
