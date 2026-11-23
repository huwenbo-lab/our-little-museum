#!/usr/bin/env node
// Offline content checks. Run from any directory: node tools/check_content.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const fail = (label, field, message) => errors.push(`${label} ${field}: ${message}`);
const nonempty = value => typeof value === 'string' && value.trim().length > 0;

function readContent(relative, required) {
  const filename = path.join(site, relative);
  if (!fs.existsSync(filename)) {
    if (required) fail(relative, 'file', '文件不存在');
    return null;
  }
  const context = vm.createContext({ window: {} });
  try {
    vm.runInContext(fs.readFileSync(filename, 'utf8'), context, { filename: relative, timeout: 1000 });
    const data = context.window.MUSEUM_CONTENT;
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new TypeError();
    return data;
  } catch (error) {
    // Do not print exception excerpts: they may contain private story text.
    fail(relative, 'file', `无法读取内容对象（${error.name || 'Error'}）`);
    return null;
  }
}

function array(data, field, label) {
  if (!Array.isArray(data[field])) {
    fail(label, field, '应为数组');
    return [];
  }
  return data[field];
}

function ids(items, field, label) {
  const result = new Set();
  items.forEach((item, i) => {
    if (!item || typeof item !== 'object' || !nonempty(item.id)) {
      fail(label, `${field}[${i}].id`, '缺少有效 id');
    } else if (result.has(item.id)) {
      fail(label, `${field}[${i}].id`, 'id 重复');
    } else result.add(item.id);
  });
  return result;
}

function validDate(y, m, d) {
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

function check(data, label) {
  if (!data) return;
  const events = array(data, 'timeline', label);
  const chapters = array(data, 'chapters', label);
  const places = array(data, 'places', label);
  const eventIds = ids(events, 'timeline', label);
  const chapterIds = ids(chapters, 'chapters', label);
  const placeIds = ids(places, 'places', label);
  let photoItems = 0;
  let backSides = 0;
  let imageReferences = 0;

  if (data.since != null) {
    const match = typeof data.since === 'string' && data.since.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match || !validDate(Number(match[1]), Number(match[2]), Number(match[3]))) {
      fail(label, 'since', '应为有效 YYYY-MM-DD 日期或 null');
    }
  }

  function image(src, field) {
    imageReferences += 1;
    if (!nonempty(src)) return fail(label, field, '缺少图片路径');
    // Offline verification cannot confirm remote resources.
    if (/^[a-z][a-z\d+.-]*:/i.test(src) || src.startsWith('//')) {
      return fail(label, field, '离线核验要求使用本站本地图片路径');
    }
    const resolved = path.resolve(site, src);
    if (!resolved.startsWith(site + path.sep)) return fail(label, field, '图片路径超出站点目录');
    try {
      if (!fs.statSync(resolved).isFile()) fail(label, field, '图片目标不是文件');
    } catch {
      fail(label, field, '图片文件不存在');
    }
  }

  function photos(item, field, limit = false) {
    if (item.cover != null) image(item.cover, `${field}.cover`);
    if (!Array.isArray(item.photos)) return fail(label, `${field}.photos`, '应为数组，无照片时写 []');
    if (limit && item.photos.length > 6) fail(label, `${field}.photos`, '每件时间展品最多 6 张');
    item.photos.forEach((entry, i) => {
      photoItems += 1;
      const key = `${field}.photos[${i}]`;
      if (typeof entry === 'string') return image(entry, key);
      if (!entry || typeof entry !== 'object') return fail(label, key, '应为路径字符串或照片对象');
      image(entry.src, `${key}.src`);
      if (entry.type != null && !['photo', 'chat', 'polaroid'].includes(entry.type)) fail(label, `${key}.type`, '未知照片类型');
      if (entry.type === 'polaroid' && !nonempty(entry.back)) fail(label, `${key}.back`, '拍立得须配对背面路径');
      if (entry.back != null) {
        backSides += 1;
        image(entry.back, `${key}.back`);
      }
    });
  }

  events.forEach((item, i) => {
    if (!item || typeof item !== 'object') return;
    const key = `timeline[${i}]`;
    if (!nonempty(item.date)) fail(label, `${key}.date`, '缺少日期显示文字');
    else {
      // Display dates may include ranges or 月底/凌晨. Check the explicit leading date.
      const match = item.date.match(/^(\d{4})[.\-/年](\d{1,2})(?:[.\-/月](\d{1,2}))?/);
      if (match && !validDate(Number(match[1]), Number(match[2]), Number(match[3] || 1))) fail(label, `${key}.date`, '日期无效');
    }
    if (chapters.length && !chapterIds.has(item.chapter)) fail(label, `${key}.chapter`, '篇章引用不存在');
    if (item.chapter != null && !chapterIds.has(item.chapter)) {
      if (!chapters.length) fail(label, `${key}.chapter`, '篇章引用不存在');
    }
    if (item.place != null && !placeIds.has(item.place)) fail(label, `${key}.place`, '地点引用不存在');
    photos(item, key, true);
  });
  places.forEach((item, i) => {
    if (!item || typeof item !== 'object') return;
    const key = `places[${i}]`;
    if (item.events != null && !Array.isArray(item.events)) fail(label, `${key}.events`, '应为事件 id 数组');
    if (Array.isArray(item.events)) item.events.forEach((id, j) => {
      if (!eventIds.has(id)) fail(label, `${key}.events[${j}]`, '事件引用不存在');
    });
    photos(item, key);
  });
  console.log(`${label}: ${events.length} 件时间展品 / ${chapters.length} 个篇章 / ${places.length} 个地点 / ${photoItems} 件照片 / ${backSides} 张配对背面 / ${imageReferences} 处本地图片引用`);
}

function strings(value, field = '', output = []) {
  if (typeof value === 'string') output.push({ field, value });
  else if (Array.isArray(value)) value.forEach((v, i) => strings(v, `${field}[${i}]`, output));
  else if (value && typeof value === 'object') Object.entries(value).forEach(([k, v]) => strings(v, field ? `${field}.${k}` : k, output));
  return output;
}

function publicSafety(publicData, privateData) {
  if (!publicData) return;
  const label = 'content.js';
  if (publicData.demoMode !== true) fail(label, 'demoMode', '公开入口必须保留示例状态');
  if (publicData.since != null) fail(label, 'since', '公开示例不得填真实相识日期');
  const publicStrings = strings(publicData);
  for (const entry of publicStrings) {
    // Evaluate runtime values only: schema examples in source comments are allowed.
    if (/(?:^|[\\/])private[\\/]/i.test(entry.value)) fail(label, entry.field, '公开内容不得引用 private 路径');
    if (/(?:19|20)\d{2}[.\-/年]\d{1,2}/.test(entry.value)) fail(label, entry.field, '公开示例含具体日期，请确认未混入真实内容');
  }
  if (!privateData) return;
  const sensitive = new Set();
  for (const item of Array.isArray(privateData.timeline) ? privateData.timeline : []) {
    if (!item || typeof item !== 'object') continue;
    for (const field of ['story', 'short', 'quote']) if (nonempty(item[field]) && item[field].length >= (field === 'quote' ? 4 : 8)) sensitive.add(item[field].trim());
  }
  for (const item of Array.isArray(privateData.places) ? privateData.places : []) if (item && nonempty(item.description) && item.description.length >= 12) sensitive.add(item.description.trim());
  if (nonempty(privateData.openingNote) && privateData.openingNote.length >= 12) sensitive.add(privateData.openingNote.trim());
  if (privateData.letter?.pending === false || privateData.demoMode === false) {
    for (const paragraph of Array.isArray(privateData.letter?.paragraphs) ? privateData.letter.paragraphs : []) if (nonempty(paragraph) && paragraph.length >= 12) sensitive.add(paragraph.trim());
  }
  for (const entry of publicStrings) {
    if (sensitive.has(entry.value.trim())) fail(label, entry.field, '与私密叙事字段相同，可能混入真实内容');
  }
}

const publicData = readContent('content.js', true);
const privateData = readContent('private/content.js', false);
check(publicData, 'content.js');
check(privateData, 'private/content.js');
publicSafety(publicData, privateData);
if (errors.length) {
  console.error(`内容核验失败：${errors.length} 项错误。`);
  errors.forEach(message => console.error(`- ${message}`));
  process.exitCode = 1;
} else {
  console.log('内容核验通过。仅作结构、引用与公开内容混入检查，不代替人工隐私审阅。');
}
