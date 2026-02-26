# SKILL.md — XHS Toolkit 操作手册

> 本文档面向 AI Agent。指导你如何使用本工具包制作、截图、发布小红书图文笔记。

---

## 工作流程

```
选题 → 调研素材 → 写 slide HTML → 截图 → 发 Telegram 审核 → 发布
```

每一步的具体操作如下。

---

## 1. 创建帖子目录

在 workspace 下建目录，命名格式 `xhs_<话题>/`：

```
xhs_deepseek/
├── slide1.html    # 封面
├── slide2.html    # 内容页
├── ...
├── snap.js        # 可选，也可用 scripts/snap.js
└── output/
    ├── slide1.jpg
    └── ...
```

## 2. 写 HTML Slides

### 2.1 排版规范

| 项目 | 规范 |
|------|------|
| 尺寸 | **1080 × 1920px**（9:16竖屏） |
| 字体 | `'Noto Sans SC', sans-serif` |
| 标题 weight | **900**（Black） |
| 正文 weight | **700**（Bold） |
| 背景色 | `#FDF8F3`（暖白） |

### 2.2 字号（手机可读性优先，宁大勿小）

| 元素 | 字号 |
|------|------|
| 封面大标题 | 56-110px |
| 页内标题 | 42-56px |
| 副标题/区块标题 | 28-34px |
| 正文 | **24-28px（不低于24px）** |
| 标签/badge | 18-22px |
| 页脚水印 | 20-22px |

### 2.3 模板使用

三个模板在 `templates/` 目录，复制后修改：

- **`cover.html`** — 封面页。改 `.badge`、`.title`（用 `<span class="highlight">` 高亮）、`.sub`、`.tag`
- **`content.html`** — 内容页。改 `.page-title`、复制 `.card` 块。变体：`.card.warn`（黄）、`.card.danger`（红）、`.card.info`（蓝）
- **`opinion.html`** — 观点/总结页。改观点内容，用 `.divider` 分隔

主题色通过 CSS 变量 `--accent` 切换，每篇帖子用不同颜色：
```css
:root { --accent: #7C3AED; --accent-light: #EDE9FE; }
```

### 2.4 ⚠️ 字体注意

- ✅ `Noto Sans SC` — headless 可渲染
- ❌ `Google Fonts @import` — headless 无网络会卡死
- ❌ 得意黑 — 安装了但 headless Chromium 不加载

### 2.5 文件写入

**必须用 OpenClaw `write` 工具写 HTML 文件**。PowerShell `Set-Content` 会把 UTF-8 转成 GBK，中文全乱码。

---

## 3. 截图

```bash
node scripts/snap.js --dir ./xhs_deepseek
# 或指定张数
node scripts/snap.js --dir ./xhs_deepseek --slides 5
```

自动检测 `slide1.html` ~ `slideN.html`，输出到 `output/slide*.jpg`。

**配置**在 `scripts/config.js`：
```js
browserPath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
screenshot: { width: 1080, height: 1920, type: 'jpeg', quality: 90 },
```

---

## 4. 审核

截图后发送给用户审核：
- 用 `message` 工具发 Telegram，附带每张 slide 的 JPG
- 说明帖子主题、结构、内容来源
- 提醒敏感话题风险（如果有的话）
- **等待用户确认后再发布**

---

## 5. 发布

### 5.1 前提

- 浏览器已启动 CDP 调试模式（`--remote-debugging-port=9222`）
- 已在浏览器中登录小红书创作者中心

### 5.2 命令

```bash
node scripts/publish.js --dir ./xhs_deepseek --title "标题" --desc "正文"
# 或从文件读取正文
node scripts/publish.js --dir ./xhs_deepseek --title "标题" --desc-file desc.txt
# 试运行（不实际发布）
node scripts/publish.js --dir ./xhs_deepseek --title "标题" --desc "正文" --dry-run
```

### 5.3 ⚠️ 发布踩坑

| 坑 | 说明 |
|----|------|
| **标题限20字** | 超了发布按钮无效但不报错！脚本已内置校验 |
| **多图必须一次性上传** | `input.uploadFile(...allFiles)` 展开数组。逐张上传会覆盖，只剩最后一张 |
| **默认是视频tab** | 脚本自动点"上传图文"切换 |
| **发布成功标志** | URL 含 `published=true` |
| **发布失败标志** | URL 含 `from=tab_switch` 表示失败 |

---

## 6. 回复评论

```bash
node scripts/reply.js --replies replies.json
```

`replies.json` 格式：
```json
[
  "回复第1条评论",
  "回复第2条评论",
  null,
  "回复第4条（跳过第3条）"
]
```

按通知页（`xiaohongshu.com/notification`）评论顺序，逐条点击 `.action-reply` → 输入 textarea → 点击"发送"。

**注意**：每条评论只回复一次，避免重复。

---

## 7. 内容创作指南

### 7.1 选题来源

| 来源 | URL | 说明 |
|------|-----|------|
| 36氪快讯 | `36kr.com/newsflashes` | 国内AI实时新闻，可scrape |
| The Verge AI | `theverge.com/ai-artificial-intelligence` | 海外AI新闻 |
| Hacker News | `news.ycombinator.com` | 技术社区热点 |
| 百度搜索 | `baidu.com/s?wd=...` | 中文内容调研（Google/Bing 常被拦截） |

### 7.2 帖子结构（推荐5-7张）

1. **封面**（cover模板）— 抓眼球的大标题
2. **背景/事件**（content模板）— 发生了什么
3. **深度解析**（content模板）— 技术/数据/对比
4. **影响/争议**（content模板）— 多方观点
5. **Bear观点**（opinion模板）— 独立判断 + 预测

### 7.3 正文（desc）写作

- 开头用 emoji 抓注意力
- 核心数据/事实放前面
- 结尾加 hashtag（10个左右）
- 带一点观点和判断，不要纯搬运

---

## 参考

- 完整运营指南和历史踩坑记录：[GUIDE.md](./GUIDE.md)
- 示例帖子：[examples/deepseek-claude/](./examples/deepseek-claude/)
