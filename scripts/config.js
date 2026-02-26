/**
 * config.js — 全局配置
 */
module.exports = {
  // 浏览器可执行文件路径
  browserPath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',

  // CDP 远程调试端口（发布脚本用，需浏览器已启动）
  cdpPort: 9222,
  get cdpURL() { return `http://127.0.0.1:${this.cdpPort}`; },

  // 截图配置
  screenshot: {
    width: 1080,
    height: 1920,
    type: 'jpeg',
    quality: 90,
  },

  // 小红书发布页
  publishURL: 'https://creator.xiaohongshu.com/publish/publish?source=official',

  // 水印文案
  watermark: '小红书 @朴真 · Bear 🐻',
};
