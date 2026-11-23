# Our Little Museum · 我们的爱情博物馆

一个正在制作中的互动式私人爱情博物馆。当前是**浅色芍药主题的 DEMO**：用展厅的方式串联两个人的回忆，计划在未来持续添加照片、故事、地点和纪念日。真实情侣素材和最终情书尚未填充。

> **交接 Claude Code，请先阅读 [PROJECT_HANDOFF.md](PROJECT_HANDOFF.md)（项目起源、设计决定、开发进度）与 [AGENTS.md](AGENTS.md)（开发规范与隐私要求）。**
>
> 本仓库是项目的**唯一正式源代码仓库**；不要回到其他学术仓库的临时分支继续维护。

## 当前功能与展厅

- **入口（intro）**：芍药主题开场及「开启参观」。
- **中央大厅（foyer）**：选择三个内容展厅。
- **时间长廊（timeline）**：按事件浏览日期、故事与照片；现有 6 个演示事件。
- **足迹展厅（places）**：以艺术化的回忆星图展示地点与故事；现有 3 个演示地点。**还不是真实地理地图**。
- **终厅情书（letter）**：互动打开信封、查看示范信件；正式送出前必须替换成用户亲笔内容。

此前的「私人珍藏」展厅已按用户要求删除。网站是轻量级 2D 沉浸式网页，而非 3D 游戏。

## 技术与文件

无需安装依赖、运行构建命令或配置服务器后端。

| 路径 | 作用 |
| --- | --- |
| `index.html` | 网页入口和结构 |
| `app.js` | 页面渲染、切换、展品交互、导航、情书和音效 |
| `content.js` | 可编辑的展品资料、照片路径、站点文案 |
| `styles.css` | 基础样式 |
| `light-theme.css` | 明亮主题覆盖 |
| `peony-theme.css` | 奶油白、芍药粉、浅香槟金主题覆盖 |
| `assets/` | 当前原创 SVG 占位插画；后续可放获授权的公开图片 |

本地运行：

```bash
python3 -m http.server 8000
```

然后打开 `http://localhost:8000/`。也可直接打开 `index.html`，但建议使用本地服务器检查实际部署行为。

## 如何添加真实内容

重点修改 `content.js` 中的 `window.MUSEUM_CONTENT`：

1. **首页**：`title`、`recipient`、`openingLine`、`openingNote`。
2. **时间线**：`timeline` 数组，每个事件的 `date`、`title`、`short`、`story`、`cover`、`photos`。同一事件可以有多张照片，例如 `photos: ['assets/first-trip-01.webp', 'assets/first-trip-02.webp']`。
3. **地点**：`places` 数组的 `name`、`description`、`photos`；当前 `x/y` 仅为艺术星图位置，`lat/lng` 尚未提供。
4. **最后的信**：`letter.salutation`、`letter.paragraphs`、`letter.signature`。**现有文本只是示范，不代表真实感情经历**。
5. 当真实内容全部替换完成、页面检查无误后，再将 `demoMode: true` 改为 `false`。

此前建议首版先准备 6–10 段重要回忆、20–35 张代表性照片、3–5 个地点和一封信；这是建议范围而非技术要求。优先保留有故事感的素材，避免只堆照片。

## 部署与隐私

代码已提交 GitHub；**GitHub Pages 的实际部署状态尚未核实**。如要使用 GitHub Pages，可前往仓库 `Settings → Pages → Build and deployment`，选择 `Deploy from a branch → main → /(root)`。完成并确认部署后，通常会获得形如 `https://huwenbo-lab.github.io/our-little-museum/` 的网址；**在验证前不要视为已上线**。

**本仓库当前为 PUBLIC，GitHub Pages 也是公开静态托管。** 不要将真实私人照片、私密聊天、个人身份信息和正式情书直接提交进来，除非用户明确同意该内容公开。即使之后删除文件，Git 历史也可能保留原内容。「隐藏链接」或前端 JavaScript 密码弹窗不构成安全的访问控制。如需仅供两个人访问，必须另行选择真正具备身份认证/访问控制的部署方案。

## 项目下一步

先让 Claude Code 按 [PROJECT_HANDOFF.md](PROJECT_HANDOFF.md) 检查现有站点并修复真实问题，优化手机端与视觉；接着由用户提供真实素材，制定安全的导入与部署方式，最后测试、发布。**不要在无真实素材的情况下自行编造两个人的相识时间、旅行地点或情书。**
