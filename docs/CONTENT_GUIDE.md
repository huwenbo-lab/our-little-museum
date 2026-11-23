# 内容维护指南

真实的照片、故事和信**只放在本地 `private/` 文件夹**，它被 `.gitignore` 排除，不会进入公开仓库。网站在本地运行时优先读取 `private/content.js`，没有这个文件就显示公开的示范内容 `content.js`。

## 一、整理照片（一条命令）

照片归档放在仓库上一级目录（`爱情博物馆/2024`、`2025`、`2026` 和 `照片归档清单.csv`）。在 `site/` 目录下运行：

```bash
python3 tools/prepare_photos.py
```

它会把清单里「按年月归档」的照片压缩到 `private/photos/<年>/<月>/`（长边 1800px；聊天截图宽 1080px），删除可能含 GPS 定位的元数据，并生成 `private/photo-index.json`，里面有每张图的日期、对应事件和网页路径。以后往归档里加了新照片、更新了清单，再运行一次即可（已处理的会跳过；加 `--force` 全部重做）。

## 二、写内容：`private/content.js`

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
- 普通照片默认完整显示（不裁人）。如果想让它铺满画框，加 `fit: 'cover'`，必要时加 `position: 'center 30%'` 控制保留哪一部分。
- 没有照片的事件写 `photos: []`，会显示 `cover` 指定的占位插画。

### 地点
```js
{ id: 'beidaihe', no: '01', name: '北戴河', short: '北戴河', caption: '副标题',
  description: '说明', photos: [ … ], events: ['beidaihe-god', 'beidaihe-together'],
  x: 74, y: 24 }   // 星图上的位置，0–100，不是经纬度
```

### 其他
- `since: '2024-03-16'`：显示“我们相识的第 N 天”。
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
