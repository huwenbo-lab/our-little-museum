# 内容维护指南

真实的照片、故事和信**只放在本地 `private/` 文件夹**，它被 `.gitignore` 排除，不会进入公开仓库。网站在本地运行时优先读取 `private/content.js`，没有这个文件就显示公开的示范内容 `content.js`。

## 一、整理照片（一条命令）

照片归档放在仓库上一级目录（`爱情博物馆/2024`、`2025`、`2026` 和 `照片归档清单.csv`）。在 `site/` 目录下运行：

```bash
python3 tools/prepare_photos.py
```

照片准备脚本需要 Python 的 Pillow 包（缺少时运行 `python3 -m pip install Pillow`）。它会把清单里「按年月归档」的照片压缩到 `private/photos/<年>/<月>/`（长边 1800px；聊天截图宽 1080px），删除可能含 GPS 定位的元数据，并生成 `private/photo-index.json`，里面有每张图的日期、对应事件和网页路径。使用 Pillow 解码，是为了兼容部分实际为 MPO 的旧照片，避免系统图片转换工具产生黑图。以后往归档里加了新照片、更新了清单，再运行一次即可（已处理的会跳过；加 `--force` 全部重做）。

少数旧照片没有正确的方向元数据，已经人工核验并在索引中记录 `displayRotation`（顺时针角度）。普通运行会保留此项，`--force` 重生成时也会应用该修正；请保留现有索引。原始照片不会因此改变。

填充后可运行 `node tools/check_content.mjs`，检查事件与地点引用、每件展品最多 6 张照片、图片与背面路径等。图片合页包含多日时，应在说明中标出共用日期；不要强行将整页作为某一天的独立正反面。

## 二、写内容：`private/content.js`

> `private/` 不在 Git 里，没有历史版本可以找回。动手改之前先复制一份，例如 `private/content.backup-20261124.js`。

结构和 `content.js` 完全一样。最常改的几块：

### 篇章
```js
chapters: [
  { id: 'chat', period: '2024.03 – 06', title: '在聊天里慢慢靠近', intro: '一句导语' },
]
```

### 一件时间展品
```js
{
  id: 'anniversary',            // 唯一，英文，不要和别的重复
  chapter: 'home',              // 属于哪个篇章
  date: '2024.09.26',           // 显示用，写法自由，如 '2024.04'、'2025.05 月底'
  title: '正式恋爱纪念日',
  subtitle: 'OUR DAY',          // 英文小标题，可省略
  short: '一句话',
  story: '正文。\n用 \\n 换段。',
  quote: '原话，可省略',
  highlight: true,              // 重要的日子，可省略
  place: 'zhengzhou',           // 对应地点 id，可省略
  photos: [ … ]                 // 见下
}
```
事件按数组顺序展示，请按时间先后排列。

### 三种照片写法
```js
photos: [
  { src: 'private/photos/2024/9月/IMG_3435.jpg', caption: '说明' },                  // 普通照片
  { src: 'private/photos/2024/3月/IMG_2343.jpg', type: 'chat', caption: '说明' },    // 聊天截图
  { src: 'private/photos/2026/1月/IMG_2411.jpg',                                     // 拍立得正面
    back: 'private/photos/2026/1月/IMG_2412.jpg',                                    // 拍立得背面
    type: 'polaroid', caption: '说明' }
]
```
- 普通照片和聊天截图都在页面内按原比例完整显示，同一事件的照片直接展开；拍立得正面与手写背面同时展示，点击只用于进一步放大。无需固定画框或裁切。
- 可填写 `width`、`height`（拍立得背面为 `backWidth`、`backHeight`）预留图片空间，避免长图加载时跳位。这些数字是网页派生图的像素尺寸，不改变原图。
- `caption` 默认保留作图片的无障碍说明。只有相册合页、共用日期等必要说明在图下显示；其他需要展示的图注可加 `showCaption: true`。
- 没有照片的事件写 `photos: []`，会显示 `cover` 指定的占位插画。
- 一件展品超过 2 张聊天截图时，只展开前 2 张，其余收进「还有 N 张聊天记录」。想指定展开哪几张，给它们加 `key: true`。
- 标题写成短句，例如“麦麦卡、蓝莓和稻香村”，不要用空格隔开几个关键词。

### 地点
```js
{ id: 'beidaihe', name: '北戴河', short: '北戴河', caption: '副标题',
  description: '说明', photos: [ … ], events: ['beidaihe-god', 'beidaihe-together'],
  lat: 39.83, lng: 119.48 }   // 城市大致经纬度，只用来决定星图上的相对方位
```
- 星图位置由 `lat/lng` 自动算出（中部会被适当拉开、太近的自动推开），地名放左放右也自动决定。没有 `lat/lng` 时才用 `x/y`（0–100）手动摆放。
- 星座线和地点顺序按 `events` 里最早的那件回忆决定，所以 `events` 要填全。这里展示故事发生的地方，也可以关联隔空回忆或返程出发地；连线不表示共同旅行路线。

### 其他
- `since: '2024-03-16'`：显示“我们相识的第 N 天”。
- `roomCovers`：大厅三张卡片的照片，`position` 控制露出照片的哪一部分（如 `'center 60%'`）：
  ```js
  roomCovers: { timeline: { src: 'private/photos/…', position: 'center 60%' }, places: { … }, letter: { … } }
  ```
- `letter`：终厅的信；`paragraphs` 每段一个字符串，可加 `date`。
- 全部完成后把 `demoMode` 改为 `false`，右上角的 DEMO 标记就会消失。

## 三、预览

```bash
python3 -m http.server 8000
```
打开 `http://localhost:8000/`。改完 `private/content.js` 刷新页面即可看到。手机预览：电脑和手机连同一个 Wi-Fi，手机打开 `http://<电脑的局域网 IP>:8000/`。

## 四、以后每年添加新展品

1. 照片放进归档文件夹，在清单里加一行；
2. 运行 `python3 tools/prepare_photos.py`；
3. 在 `private/content.js` 末尾加事件（必要时加新篇章、新地点）；
4. 刷新检查，按你选定的部署方式重新发布。
