(() => {
  'use strict';

  /* ------------------------------------------------------------------
   * 启动：先尝试加载本地私密内容 private/content.js（已被 .gitignore 排除），
   * 加载不到就使用公开仓库里的示范内容 content.js。
   * 公开构建显式标记为 demo；GitHub Pages 也跳过私密文件请求。
   * ------------------------------------------------------------------ */
  const PRIVATE_SRC = 'private/content.js';
  const shouldTryPrivate = document.documentElement.dataset.contentMode !== 'demo'
    && !/\.github\.io$/i.test(location.hostname);
  if (shouldTryPrivate) {
    const s = document.createElement('script');
    s.src = PRIVATE_SRC + '?t=' + Date.now(); // 不缓存：改完 private/content.js 刷新即可看到
    s.onload = () => boot(true);
    s.onerror = () => { s.remove(); boot(false); };
    document.head.appendChild(s);
  } else {
    boot(false);
  }

  function boot(fromPrivate) {
  const data = window.MUSEUM_CONTENT;
  if (!data) {
    document.getElementById('scene-root').innerHTML = '<p style="padding:60px;text-align:center">网站内容没有加载。请确认 content.js 与 index.html 在同一文件夹。</p>';
    return;
  }
  data.timeline = Array.isArray(data.timeline) ? data.timeline : [];
  data.places = Array.isArray(data.places) ? data.places : [];
  data.chapters = Array.isArray(data.chapters) ? data.chapters : [];

  const root = document.getElementById('scene-root');
  const tourbar = document.getElementById('tourbar');
  const drawer = document.getElementById('room-drawer');
  const drawerBackdrop = document.getElementById('drawer-backdrop');
  const drawerList = document.getElementById('drawer-room-list');
  const modal = document.getElementById('exhibit-modal');
  const modalContent = document.getElementById('modal-content');
  const toastEl = document.getElementById('toast');
  const ambienceBtn = document.getElementById('ambience-button');
  const sceneIds = ['intro', 'foyer', 'timeline', 'places', 'letter'];
  const tourIds = sceneIds.slice(1);
  const rooms = [
    { id: 'foyer', title: '中央大厅', en: 'THE GRAND FOYER', number: '00', image: 'assets/room-foyer.svg', description: '从这里选择你想去的展厅' },
    { id: 'timeline', title: '时间长廊', en: 'OUR TIMELINE', number: '01', image: 'assets/memory-walk.svg', description: '从最初的我们，一直走到今天' },
    { id: 'places', title: '足迹展厅', en: 'PLACES WE KEEP', number: '02', image: 'assets/place-city.svg', description: '重访故事发生的地方' },
    { id: 'letter', title: '终厅 · 一封信', en: 'THE LAST ROOM', number: '03', image: 'assets/room-letter.svg', description: '在参观的最后，有些话想对你说' }
  ];
  const state = { room: 'intro', timelineIndex: 0, placeIndex: 0, letterOpened: false, drawerOpen: false, modalOpen: false, soundOn: false, soundNodes: null, gallery: null };
  let toastTimer;
  let letterTimer;
  let lastFocus = null;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const e = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const validImage = value => { const url = String(value || ''); return /^((?:assets|private)\/[-\w.一-龥 /()]+\.(?:png|jpe?g|webp|svg|gif|avif)|https?:\/\/\S+|data:image\/svg\+xml;base64,[A-Za-z0-9+/=]+)$/i.test(url) ? url : 'assets/memory-beginning.svg'; };
  const img = (src, alt, className = '', extra = '', eager = false) => `<img src="${e(validImage(src))}" alt="${e(alt)}" class="${e(className)}" loading="${eager ? 'eager' : 'lazy'}" decoding="async" onerror="this.onerror=null;this.src='assets/memory-beginning.svg';this.classList.add('is-missing')" ${extra} />`; // 路径写错时显示占位图，不出现破图
  const pad2 = n => String(n).padStart(2, '0');

  /* 媒体统一格式：字符串或 {src,type,back,caption,alt,fit,position}
   * type: 'photo'（默认）| 'chat'（聊天截图，竖长）| 'polaroid'（拍立得，可翻面看背面 back） */
  function normalizeMedia(entry, fallbackCaption = '') {
    if (!entry) return null;
    if (typeof entry === 'string') return { src: entry, type: /\.png$/i.test(entry) && /IMG_|截图|chat/i.test(entry) ? 'chat' : 'photo', caption: fallbackCaption };
    return { type: 'photo', caption: fallbackCaption, ...entry };
  }
  function mediaOf(item) {
    const list = Array.isArray(item.photos) ? item.photos.map(p => normalizeMedia(p, item.title || item.name)).filter(Boolean) : [];
    return { list: list.length ? list : [normalizeMedia({ src: item.cover, type: 'placeholder' }, item.title || item.name)], real: list.length > 0 };
  }

  /* 相识天数：content.js 中填 since: 'YYYY-MM-DD' 才显示 */
  function daysSince(iso) {
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
    const [y, m, d] = iso.split('-').map(Number);
    const start = new Date(y, m - 1, d); const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const n = Math.floor((today - start) / 86400000) + 1;
    return n > 0 ? n : null;
  }
  const knownDays = daysSince(data.since);

  const isDemo = Boolean(data.demoMode);
  document.getElementById('demo-indicator').hidden = !isDemo;
  document.getElementById('demo-indicator').textContent = data.statusLabel || 'DEMO · 示例内容';
  document.title = `${data.englishTitle} · ${data.title}`;
  if (fromPrivate) document.documentElement.dataset.content = 'private';

  /* ---------------------------- 场景模板 ---------------------------- */
  function intro() {
    const dayLine = knownDays ? `<div class="entry-days">我们相识的第 <strong>${knownDays}</strong> 天</div>` : '';
    return `<section class="scene entry-scene" aria-label="博物馆入口">
      <div class="entry-stars" aria-hidden="true"></div>
      <div class="entry-layout">
        <div class="entry-copy">
          <h1>${e(data.title)}</h1>
          <p class="entry-line">${e(data.openingLine)}</p>
          <p class="entry-note">${e(data.openingNote)}</p>
          ${dayLine}
          <button type="button" class="primary-button" data-room="foyer">${e(data.entryButton)}</button>
        </div>
        <div class="entry-art" aria-hidden="true"><div class="portal-glow"></div><div class="portal-outer"><div class="portal-inner"><div class="portal-center-light"></div><div class="portal-moon"></div><img class="portal-botanical" src="assets/peony-botanical.svg" alt="" /></div></div><div class="portal-ornament"><img src="assets/peony-emblem.svg" alt="" /></div><div class="portal-float"><span>为 你 盛 开</span></div><div class="portal-plinth"></div></div>
      </div>
      <div class="entry-scroll">${e(data.recipient)}</div>
    </section>`;
  }

  function foyer() {
    const counts = { timeline: `${data.timeline.length} 段回忆`, places: `${data.places.length} 个地点`, letter: data.letter?.pending ? '一封待写的信' : '1 封信' };
    const covers = data.roomCovers || {};
    const roomTiles = rooms.slice(1).map(room => { const cover = covers[room.id]; const c = typeof cover === 'string' ? { src: cover } : cover; return `<button type="button" class="room-tile ${c ? 'has-photo' : ''}" data-room="${room.id}" aria-label="进入${e(room.title)}">
      ${c ? img(c.src, '', 'room-photo', c.position ? `style="object-position:${e(c.position)}"` : '', true) : img(room.image, `展厅 ${room.number} 的示意画面`)}
      <span class="tile-content"><h3>${e(room.title)}</h3><span class="tile-count">${e(counts[room.id])}</span></span>
    </button>`; }).join('');
    const days = knownDays ? `<span>相识第 <strong>${knownDays}</strong> 天 · 展览仍在更新</span>` : '';
    return `<section class="scene foyer-scene"><div class="room-content"><img src="assets/peony-botanical.svg" alt="" class="foyer-peony" aria-hidden="true"/>
      <div class="foyer-top"><div><h1 class="display-title">我们的故事</h1><p class="foyer-top-note">${e(data.foyerNote)}</p></div></div>
      <div class="room-grid">${roomTiles}</div>
      <div class="foyer-floor">${days}<span>${e(data.curatorSignature)}</span></div>
    </div></section>`;
  }

  /* 故事先读，图片直接展开。尺寸来自图片本身，长截图不裁切也不嵌套滚动。 */
  const CHAT_VISIBLE = 2;
  function memoryGallery(item, opts = {}) {
    const { list } = mediaOf(item);
    const conversation = list.every(m => m.type === 'chat');
    const chats = list.map((m, i) => ({ m, i })).filter(x => x.m.type === 'chat');
    const keyed = chats.filter(x => x.m.key);
    const shownChats = new Set((keyed.length ? keyed : chats.slice(0, CHAT_VISIBLE)).map(x => x.i));
    const folded = opts.foldChats && chats.length > CHAT_VISIBLE ? new Set(chats.filter(x => !shownChats.has(x.i)).map(x => x.i)) : new Set();
    const render = (m, i) => {
      const alt = m.alt || m.caption || item.title || item.name || '回忆照片';
      const size = (back = false) => {
        const w = Number(back ? m.backWidth : m.width), h = Number(back ? m.backHeight : m.height);
        return w > 0 && h > 0 ? `width="${w}" height="${h}"` : '';
      };
      const button = (back = false) => `<button type="button" class="memory-image-button" data-action="lightbox" data-index="${i}" data-side="${back ? 'back' : 'front'}" aria-label="放大观看：${e(alt)}${back ? '（背面）' : ''}">${img(back ? m.back : m.src, back ? `${alt}（背面）` : alt, 'memory-image', size(back), i === 0)}</button>`;
      const image = m.type === 'polaroid' && m.back
        ? `<div class="memory-pair"><div class="memory-side">${button()}<span class="memory-side-label">正面</span></div><div class="memory-side">${button(true)}<span class="memory-side-label">背面的字</span></div></div>`
        : button();
      // 归档标题仍用于图片的无障碍说明；只在画面下保留理解图片所需的说明。
      const caption = m.caption && (m.showCaption || /合页|共用/.test(m.caption)) ? `<figcaption class="memory-caption">${e(m.caption)}</figcaption>` : '';
      const portrait = Number(m.height) > Number(m.width) ? ' is-portrait' : '';
      return `<figure class="memory-figure is-${e(m.type)}${portrait}">${image}${caption}</figure>`;
    };
    const figure = list.map((m, i) => folded.has(i) ? '' : render(m, i)).join('');
    const more = folded.size ? `<details class="more-chats"><summary>还有 ${folded.size} 张聊天记录</summary><div class="memory-gallery is-conversation">${list.map((m, i) => folded.has(i) ? render(m, i) : '').join('')}</div></details>` : '';
    return `<div class="memory-gallery ${conversation ? 'is-conversation' : ''} ${list.length === 1 ? 'is-single' : ''}" aria-label="${e(item.title || item.name)}的照片">${figure}</div>${more}`;
  }

  function chapterOf(item) { return data.chapters.find(c => c.id === item.chapter) || null; }

  function eventNavigation(bottom = false) {
    const isLast = state.timelineIndex === data.timeline.length - 1;
    return `<nav class="event-nav ${bottom ? 'is-bottom' : ''}" aria-label="${bottom ? '照片后的回忆导航' : '这段故事的导航'}"><button type="button" class="outline-button" data-action="prev-event" ${state.timelineIndex === 0 ? 'disabled' : ''}>上一段</button>${isLast ? '<button type="button" class="outline-button" data-room="places">去足迹展厅</button>' : '<button type="button" class="outline-button" data-action="next-event">下一段</button>'}${bottom ? '<button type="button" class="text-button" data-action="story-top">回到这段故事</button>' : ''}</nav>`;
  }

  function timeline() {
    const item = data.timeline[state.timelineIndex] || data.timeline[0];
    if (!item) return '<section class="scene"><div class="room-content"><h1 class="display-title">还没有时间线展品</h1></div></section>';
    const chapter = chapterOf(item);
    const visible = data.timeline.map((ev, i) => ({ ev, i })).filter(({ ev }) => !chapter || ev.chapter === chapter.id);
    const chapterTabs = data.chapters.length ? `<div class="chapter-tabs" role="tablist" aria-label="选择篇章">${data.chapters.map(c => { const first = data.timeline.findIndex(ev => ev.chapter === c.id); return first < 0 ? '' : `<button type="button" role="tab" class="chapter-tab ${chapter && c.id === chapter.id ? 'is-active' : ''}" aria-selected="${chapter && c.id === chapter.id}" data-action="select-event" data-index="${first}">${c.period ? `<small>${e(c.period)}</small>` : ''}<span>${e(c.title)}</span></button>`; }).join('')}</div>` : '';
    const track = visible.map(({ ev, i }) => `<button class="timeline-node ${i === state.timelineIndex ? 'is-active' : ''} ${ev.highlight ? 'is-highlight' : ''}" data-action="select-event" data-index="${i}" type="button" aria-current="${i === state.timelineIndex ? 'step' : 'false'}"><small>${e(ev.date)}</small><span>${e(ev.title)}</span></button>`).join('');
    const quote = item.quote && !String(item.story || '').includes(item.quote) ? `<blockquote class="event-quote">“${e(item.quote)}”</blockquote>` : '';
    const placeLink = item.place ? (() => { const pi = data.places.findIndex(p => p.id === item.place); return pi < 0 ? '' : `<button type="button" class="text-button event-place" data-action="goto-place" data-index="${pi}">${e(data.places[pi].name)}</button>`; })() : '';
    return `<section class="scene timeline-scene"><div class="room-content">
      <div class="section-head"><h1 class="display-title">时间长廊</h1></div>
      ${chapterTabs}
      <div class="timeline-track" role="group" aria-label="选择时间线事件">${track}</div>
      <article class="timeline-exhibit reading-exhibit">
        <header class="event-content event-reading-head" aria-live="polite"><div class="event-date">${e(item.date)}</div><h2 class="event-title">${e(item.title)}</h2>${item.short ? `<p class="event-short">${e(item.short)}</p>` : ''}<p class="event-story">${e(item.story)}</p>${quote}${placeLink}${eventNavigation()}</header>
        ${memoryGallery(item, { foldChats: true })}
        ${eventNavigation(true)}
      </article>
    </div></section>`;
  }

  /* 足迹星图的布局：
   * 1. 有 lat/lng 的地点按大致方位投影（只保留相对位置，不按比例）；没有的用 x/y；
   * 2. 太近的光点互相推开（南昌、华林、吴城这类邻近地点不会叠在一起）；
   * 3. 按相关回忆在时间线中首次出现的顺序连线，左右键和地点条也按这个顺序。 */
  function placeLayout() {
    const hasGeo = p => p.lat !== null && p.lat !== undefined && p.lng !== null && p.lng !== undefined && Number.isFinite(+p.lat) && Number.isFinite(+p.lng);
    const firstVisit = p => { const idx = (p.events || []).map(id => data.timeline.findIndex(ev => ev.id === id)).filter(i => i >= 0); return idx.length ? Math.min(...idx) : Infinity; };
    const order = data.places.map((p, i) => ({ i, t: firstVisit(p) })).sort((a, b) => a.t - b.t || a.i - b.i).map(x => x.i);
    const geo = data.places.filter(hasGeo);
    let pos;
    if (geo.length >= 2) {
      // 先按经纬度得到相对方位，再从中心向外做一次“开方”拉伸：中部密集的城市被撑开，边远城市收回来
      const k = Math.cos(34 * Math.PI / 180);
      const raw = data.places.map(p => hasGeo(p) ? { x: +p.lng * k, y: -p.lat } : null);
      const known = raw.filter(Boolean);
      const cx = known.reduce((s, p) => s + p.x, 0) / known.length, cy = known.reduce((s, p) => s + p.y, 0) / known.length;
      const spread = raw.map(p => { if (!p) return null; const dx = p.x - cx, dy = p.y - cy, d = Math.hypot(dx, dy) || 1e-6, f = Math.pow(d, .55) / d; return { x: dx * f, y: dy * f }; });
      const sx = spread.filter(Boolean).map(p => p.x), sy = spread.filter(Boolean).map(p => p.y);
      const minX = Math.min(...sx), maxX = Math.max(...sx), minY = Math.min(...sy), maxY = Math.max(...sy);
      const span = Math.max(maxX - minX, maxY - minY) || 1, pad = 12, size = 100 - pad * 2;
      const offX = (size - (maxX - minX) / span * size) / 2, offY = (size - (maxY - minY) / span * size) / 2;
      pos = data.places.map((p, i) => spread[i]
        ? { x: pad + offX + (spread[i].x - minX) / span * size, y: pad + offY + (spread[i].y - minY) / span * size }
        : { x: Number(p.x) || 50, y: Number(p.y) || 50 });
    } else {
      pos = data.places.map(p => ({ x: Number(p.x) || 50, y: Number(p.y) || 50 }));
    }
    const MIN = 17;
    for (let step = 0; step < 200; step++) {
      let moved = false;
      for (let a = 0; a < pos.length; a++) for (let b = a + 1; b < pos.length; b++) {
        const dx = pos[b].x - pos[a].x, dy = pos[b].y - pos[a].y, d = Math.hypot(dx, dy);
        if (d < MIN) {
          const ux = d ? dx / d : .8, uy = d ? dy / d : .6, push = (MIN - d) / 2;
          pos[a].x -= ux * push; pos[a].y -= uy * push; pos[b].x += ux * push; pos[b].y += uy * push; moved = true;
        }
      }
      pos.forEach(p => { p.x = Math.max(8, Math.min(92, p.x)); p.y = Math.max(8, Math.min(90, p.y)); });
      if (!moved) break;
    }
    // 地名默认写在光点右边；右边放不下（靠边或会压到别的光点）就写在左边
    pos.forEach((p, i) => {
      // 按手机宽度（地图约 335px）估算标签宽度：光点间距 + 内边距 + 每个字约 4.6% + “×N” + 余量
      const w = 10 + String(data.places[i].short || data.places[i].name).length * 4.6 + ((data.places[i].events || []).length > 1 ? 4.6 : 0);
      const blocks = side => pos.some((q, j) => j !== i && Math.abs(q.y - p.y) < 8 && (side > 0 ? q.x > p.x && q.x < p.x + w + 3 : q.x < p.x && q.x > p.x - w - 3));
      const rightOk = p.x + w <= 96 && !blocks(1), leftOk = p.x - w >= 4 && !blocks(-1);
      p.side = rightOk ? '' : leftOk ? 'is-left' : 'is-below';
    });
    return { order, pos };
  }

  function places() {
    const place = data.places[state.placeIndex] || data.places[0];
    if (!place) return '<section class="scene"><div class="room-content"><h1 class="display-title">还没有地点展品</h1></div></section>';
    const { order, pos } = placeLayout();
    // 关联回忆首次出现的顺序决定连线；当前地点相邻的两段加深。
    const stops = order.filter(i => (data.places[i].events || []).length);
    const route = stops.slice(1).map((to, n) => { const from = stops[n]; const near = from === state.placeIndex || to === state.placeIndex; return `<line x1="${pos[from].x.toFixed(2)}" y1="${pos[from].y.toFixed(2)}" x2="${pos[to].x.toFixed(2)}" y2="${pos[to].y.toFixed(2)}" class="${near ? 'is-near' : ''}"/>`; }).join('');
    const markers = data.places.map((p, i) => {
      const visits = Array.isArray(p.events) ? p.events.length : 0;
      return `<button type="button" class="star ${pos[i].side} ${i === state.placeIndex ? 'is-active' : ''}" data-action="select-place" data-index="${i}" style="left:${pos[i].x.toFixed(2)}%;top:${pos[i].y.toFixed(2)}%" aria-label="${e(p.name)}${visits ? `，${visits} 段回忆` : ''}" aria-pressed="${i === state.placeIndex}"><span class="star-dot" aria-hidden="true"></span><span class="star-name" aria-hidden="true">${e(p.short || p.name)}${visits > 1 ? `<sup>×${visits}</sup>` : ''}</span></button>`;
    }).join('');
    const chips = order.map(i => `<button type="button" class="place-chip ${i === state.placeIndex ? 'is-active' : ''}" data-action="select-place" data-index="${i}" aria-pressed="${i === state.placeIndex}">${e(data.places[i].short || data.places[i].name)}</button>`).join('');
    const linked = (Array.isArray(place.events) ? place.events : []).map(id => data.timeline.findIndex(ev => ev.id === id)).filter(i => i >= 0);
    const visits = linked.length ? `<div class="place-visits"><span class="eyebrow">与这里有关的回忆 · ${linked.length} 段</span>${linked.map(i => `<button type="button" class="visit-link" data-action="goto-event" data-index="${i}"><small>${e(data.timeline[i].date)}</small>${e(data.timeline[i].title)}</button>`).join('')}</div>` : '';
    const since = linked.length ? e(data.timeline[linked[0]].date) : '';
    return `<section class="scene places-scene"><div class="room-content">
      <div class="section-head"><h1 class="display-title">足迹展厅</h1></div>
      <div class="atlas-layout">
        <div class="atlas-aside">
          <div class="atlas-map star-map" role="group" aria-label="故事发生的地方">
            <svg class="atlas-route" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${route}</svg>
            ${markers}
            <span class="atlas-compass" aria-hidden="true">北</span>
          </div>
          <p class="places-footnote">光点按大致方位摆放，不按比例；连线跟随相关回忆首次出现的顺序。</p>
        </div>
        <article class="place-detail">
          <div class="place-chips" role="group" aria-label="选择地点">${chips}</div>
          <div class="place-copy">${since ? `<span class="place-order">${since}</span>` : ''}<h3>${e(place.name)}</h3>${place.caption ? `<p class="place-caption">${e(place.caption)}</p>` : ''}<p>${e(place.description)}</p>${visits}</div>
          ${memoryGallery(place)}
        </article>
      </div>
    </div></section>`;
  }

  function letter() {
    const l = data.letter || {};
    const petals = Array.from({ length: 9 }, (_, i) => `<span class="letter-petal" aria-hidden="true" style="left:${9 + i * 10}%;bottom:${10 + (i % 4) * 11}%;animation-delay:-${i * 1.4}s;font-size:${12 + (i % 3) * 7}px">✧</span>`).join('');
    const paragraphs = (l.paragraphs || []).map(t => `<p>${e(t)}</p>`).join('');
    return `<section class="scene letter-scene"><div class="letter-layout"><img src="assets/peony-botanical.svg" alt="" class="letter-peony" aria-hidden="true"/>${petals}<h1 class="letter-title">${e(l.title)}</h1>
      ${state.letterOpened ? `<div class="letter-paper" tabindex="-1"><h3>${e(l.salutation)}</h3>${paragraphs}${l.signature ? `<div class="letter-sign">${e(l.signature)}</div>` : ''}${l.date ? `<div class="letter-date">${e(l.date)}</div>` : ''}${l.postscript ? `<div class="letter-postscript">${e(l.postscript)}</div>` : ''}</div><div class="letter-controls"><button class="outline-button" type="button" data-action="close-letter">合上这封信</button><button class="text-button" type="button" data-room="foyer">回到大厅</button></div>` : `<button type="button" class="envelope-button" data-action="open-letter" aria-label="打开给你的信"><span class="envelope-back"></span><span class="envelope-face"></span><span class="envelope-fold"></span><span class="envelope-bottom"></span><span class="wax-seal">❀</span></button>`}
    </div></section>`;
  }

  const templates = { intro, foyer, timeline, places, letter };

  function updateTourbar() {
    tourbar.hidden = state.room === 'intro';
    if (state.room === 'intro') return;
    const labels = { foyer: '大厅', timeline: '时间', places: '足迹', letter: '一封信' };
    const nav = tourIds.map(id => `<button type="button" class="nav-place ${id === state.room ? 'is-active' : ''}" data-room="${id}" aria-current="${id === state.room ? 'page' : 'false'}">${labels[id]}</button>`).join('');
    tourbar.innerHTML = nav;
  }
  function updateDrawer() {
    drawerList.innerHTML = rooms.map(r => `<button type="button" class="drawer-item ${state.room === r.id ? 'is-active' : ''}" data-room="${r.id}"><span class="dr-title">${e(r.title)}</span></button>`).join('');
  }

  /* 同展厅内切换事件不重播入场动画，并尽量保留操作位置。 */
  function render(opts = {}) {
    const active = document.activeElement;
    const focusKey = opts.soft && active && root.contains(active) && active.dataset ? { action: active.dataset.action, index: active.dataset.index } : null;
    root.innerHTML = templates[state.room]();
    if (opts.soft) root.querySelector('.scene')?.classList.add('is-soft');
    updateTourbar(); updateDrawer();
    if (focusKey && focusKey.action) {
      const sel = `[data-action="${focusKey.action}"]${focusKey.index != null ? `[data-index="${focusKey.index}"]` : ''}`;
      (root.querySelector(sel) || root.querySelector(`[data-action="${focusKey.action}"]`))?.focus({ preventScroll: true });
    }
    keepActiveNodeVisible();
  }
  function keepActiveNodeVisible() {
    root.querySelectorAll('.timeline-track .is-active, .chapter-tabs .is-active, .place-chips .is-active').forEach(el => {
      const track = el.parentElement;
      const left = el.offsetLeft - (track.clientWidth - el.offsetWidth) / 2;
      track.scrollTo({ left: Math.max(0, left), behavior: 'auto' });
    });
  }
  function navigate(id, writeHash = true) {
    if (!sceneIds.includes(id)) return;
    clearTimeout(letterTimer);
    letterTimer = null;
    closeDrawer(); closeModal();
    if (id !== state.room) state.letterOpened = false;
    state.room = id;
    if (writeHash && location.hash !== `#${id}`) history.pushState(null, '', `#${id}`);
    render();
    window.scrollTo({ top: 0, behavior: 'instant' });
    root.focus({ preventScroll: true });
  }
  /* 选完事件直接从这段故事读起，避免手机上先看到几屏导航。 */
  function revealExhibit() {
    const ex = root.querySelector('.event-reading-head');
    if (!ex) return;
    ex.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });
  }
  function switchEvent(index, reveal = false) {
    const length = data.timeline.length;
    if (!length) return;
    state.timelineIndex = (index + length) % length;
    render({ soft: true });
    if (reveal) revealExhibit();
  }
  function switchPlace(index, reveal = false) {
    if (!data.places.length) return;
    state.placeIndex = (index + data.places.length) % data.places.length;
    render({ soft: true });
    // 手机上地图和详情是上下排列：点了光点后把详情卡带进视野
    if (reveal && window.innerWidth <= 800) {
      const copy = root.querySelector('.place-copy');
      if (copy && copy.getBoundingClientRect().top > window.innerHeight * 0.7) window.scrollTo({ top: window.scrollY + root.querySelector('.place-chips').getBoundingClientRect().top - 90, behavior: reduceMotion ? 'auto' : 'smooth' });
    }
  }

  function openDrawer() {
    lastFocus = document.activeElement;
    state.drawerOpen = true; drawer.classList.add('is-open'); drawer.setAttribute('aria-hidden', 'false'); drawer.inert = false; drawerBackdrop.hidden = false;
    updateBackgroundInert();
    document.getElementById('map-button').setAttribute('aria-expanded', 'true');
    setTimeout(() => (drawer.querySelector('.drawer-item.is-active') || drawer.querySelector('.drawer-item'))?.focus(), 30);
  }
  function closeDrawer() {
    const wasOpen = state.drawerOpen;
    state.drawerOpen = false; drawer.classList.remove('is-open'); drawer.setAttribute('aria-hidden', 'true'); drawer.inert = true; drawerBackdrop.hidden = true;
    updateBackgroundInert();
    document.getElementById('map-button').setAttribute('aria-expanded', 'false');
    if (wasOpen && lastFocus && document.contains(lastFocus)) lastFocus.focus();
  }
  drawer.inert = true;

  function updateBackgroundInert() {
    // Both overlays live outside the app shell, so its controls must stay inactive.
    document.querySelector('.app-shell').inert = state.drawerOpen || state.modalOpen;
  }

  function openModal(markup) {
    if (!state.modalOpen) lastFocus = document.activeElement;
    modalContent.innerHTML = markup; modal.hidden = false; state.modalOpen = true; document.body.style.overflow = 'hidden';
    updateBackgroundInert();
    modal.querySelector('.modal-close').focus();
  }
  function closeModal() {
    if (!state.modalOpen) return;
    modal.hidden = true; state.modalOpen = false; state.gallery = null; document.body.style.overflow = '';
    updateBackgroundInert();
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
  }

  /* 灯箱：可以左右切换同一件展品的全部照片；拍立得会把背面作为下一张一起展示 */
  function expandForLightbox(list) {
    return list.flatMap(m => m.type === 'polaroid' && m.back ? [{ ...m, side: '正面' }, { src: m.back, type: 'polaroid-back', caption: `${m.caption || ''}（背面）` }] : [m]);
  }
  function openGallery(list, start, title, showBack = false) {
    const items = expandForLightbox(list);
    let idx = 0, seen = 0;
    list.forEach((m, i) => { if (i === start) idx = seen; seen += m.type === 'polaroid' && m.back ? 2 : 1; });
    if (showBack && list[start]?.type === 'polaroid' && list[start].back) idx += 1;
    state.gallery = { items, index: idx, title };
    renderGallery();
  }
  function renderGallery() {
    const g = state.gallery; if (!g) return;
    const m = g.items[g.index];
    const nav = g.items.length > 1 ? `<div class="lightbox-nav"><button type="button" class="mini-arrow" data-action="gallery-prev" aria-label="上一张">←</button><span>${g.index + 1} / ${g.items.length}</span><button type="button" class="mini-arrow" data-action="gallery-next" aria-label="下一张">→</button></div>` : '';
    const markup = `<h2 id="modal-title" class="modal-eyebrow">${e(g.title || 'A MOMENT WE KEEP')}</h2><div class="lightbox-frame ${m.type === 'chat' ? 'is-chat' : ''}" data-swipe="gallery">${img(m.src, m.caption || g.title, 'lightbox-image', '', true)}</div>${m.caption && m.caption !== g.title ? `<p class="modal-caption">${e(m.caption)}</p>` : ''}${nav}`;
    [1, -1].forEach(d => { const n = g.items[(g.index + d + g.items.length) % g.items.length]; if (n) new Image().src = validImage(n.src); }); // 预加载相邻照片
    if (state.modalOpen) { modalContent.innerHTML = markup; modal.querySelector('[data-action="' + (g.lastDir || 'gallery-next') + '"]')?.focus({ preventScroll: true }); }
    else openModal(markup);
  }
  function stepGallery(dir) {
    const g = state.gallery; if (!g || g.items.length < 2) return;
    g.index = (g.index + dir + g.items.length) % g.items.length; g.lastDir = dir > 0 ? 'gallery-next' : 'gallery-prev';
    renderGallery();
  }

  function openLetter() {
    const btn = root.querySelector('.envelope-button');
    clearTimeout(letterTimer);
    const done = () => {
      letterTimer = null;
      if (state.room !== 'letter') return;
      state.letterOpened = true; render({ soft: true }); root.querySelector('.letter-paper')?.focus({ preventScroll: true });
    };
    if (btn && !reduceMotion) { btn.classList.add('is-opening'); btn.disabled = true; letterTimer = setTimeout(done, 900); } else done();
  }
  function closeLetter() { state.letterOpened = false; render({ soft: true }); root.querySelector('.envelope-button')?.focus({ preventScroll: true }); }
  function toast(text) { clearTimeout(toastTimer); toastEl.textContent = text; toastEl.classList.add('is-visible'); toastTimer = setTimeout(() => toastEl.classList.remove('is-visible'), 2400); }

  async function toggleAmbience() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return toast('当前浏览器不支持背景氛围声');
    if (state.soundOn) {
      state.soundOn = false;
      const nodes = state.soundNodes;
      if (nodes) { nodes.gain.gain.setTargetAtTime(0, nodes.ctx.currentTime, .22); setTimeout(() => nodes.ctx.close().catch(() => {}), 1000); state.soundNodes = null; }
    } else {
      try {
        const ctx = new AudioCtx(); await ctx.resume();
        const gain = ctx.createGain(); gain.gain.value = 0; gain.connect(ctx.destination);
        const oscillators = [];
        [196, 293.66, 392].forEach((freq, i) => { const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = freq; const voice = ctx.createGain(); voice.gain.value = [.33, .24, .17][i]; osc.connect(voice).connect(gain); osc.start(); oscillators.push(osc); });
        gain.gain.setTargetAtTime(.032, ctx.currentTime, .7);
        state.soundNodes = { ctx, gain, oscillators }; state.soundOn = true;
        toast('已开启轻柔氛围声 · 可随时关闭');
      } catch (error) { return toast('浏览器暂时无法播放声音'); }
    }
    ambienceBtn.setAttribute('aria-pressed', String(state.soundOn));
  }

  function currentLightboxSource(node) {
    if (state.room === 'places') { const p = data.places[state.placeIndex]; return { list: mediaOf(p).list, start: Number(node.dataset.index) || 0, title: p.name, showBack: node.dataset.side === 'back' }; }
    const item = data.timeline[state.timelineIndex];
    return { list: mediaOf(item).list, start: Number(node.dataset.index) || 0, title: item.title, showBack: node.dataset.side === 'back' };
  }

  document.addEventListener('click', event => {
    if (event.target === modal) return closeModal();
    if (event.target === drawerBackdrop) return closeDrawer();
    const roomNode = event.target.closest('[data-room]');
    if (roomNode) { navigate(roomNode.dataset.room); return; }
    const actionNode = event.target.closest('[data-action]');
    if (!actionNode || actionNode.disabled) return;
    const action = actionNode.dataset.action, index = Number(actionNode.dataset.index);
    switch (action) {
      case 'home': navigate('intro'); break;
      case 'toggle-map': state.drawerOpen ? closeDrawer() : openDrawer(); break;
      case 'close-map': closeDrawer(); break;
      case 'toggle-ambience': toggleAmbience(); break;
      case 'prev-room': navigate(tourIds[Math.max(0, tourIds.indexOf(state.room) - 1)]); break;
      case 'next-room': navigate(tourIds[Math.min(tourIds.length - 1, tourIds.indexOf(state.room) + 1)]); break;
      case 'select-event': switchEvent(index, true); break;
      case 'next-event': switchEvent(state.timelineIndex + 1, true); break;
      case 'prev-event': switchEvent(state.timelineIndex - 1, true); break;
      case 'story-top': root.querySelector('.event-reading-head')?.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' }); break;
      case 'select-place': switchPlace(index, actionNode.classList.contains('star')); break;
      case 'goto-event': state.timelineIndex = index; navigate('timeline'); break;
      case 'goto-place': state.placeIndex = index; navigate('places'); break;
      case 'place-gallery':
      case 'lightbox': { const src = currentLightboxSource(actionNode); if (src.list[0]?.type === 'placeholder') { toast('这件展品还在等待真实照片'); break; } openGallery(src.list, src.start, src.title, src.showBack); break; }
      case 'gallery-prev': stepGallery(-1); break;
      case 'gallery-next': stepGallery(1); break;
      case 'close-modal': closeModal(); break;
      case 'open-letter': openLetter(); break;
      case 'close-letter': closeLetter(); break;
    }
  });

  /* 灯箱支持左右滑动；页面中的图片使用正常页面滚动。 */
  let touch = null;
  document.addEventListener('touchstart', ev => { const zone = ev.target.closest('[data-swipe]'); if (!zone || ev.touches.length !== 1) return; touch = { zone: zone.dataset.swipe, x: ev.touches[0].clientX, y: ev.touches[0].clientY }; }, { passive: true });
  document.addEventListener('touchend', ev => {
    if (!touch) return; const t = ev.changedTouches[0]; const dx = t.clientX - touch.x, dy = t.clientY - touch.y; const zone = touch.zone; touch = null;
    if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy) * 1.3) return;
    const dir = dx < 0 ? 1 : -1;
    if (zone === 'gallery') stepGallery(dir);
  }, { passive: true });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') { if (state.modalOpen) closeModal(); else if (state.drawerOpen) closeDrawer(); return; }
    if (state.modalOpen) {
      if (event.key === 'ArrowRight') { stepGallery(1); event.preventDefault(); }
      if (event.key === 'ArrowLeft') { stepGallery(-1); event.preventDefault(); }
      if (event.key === 'Tab') trapFocus(event, modal);
      return;
    }
    if (state.drawerOpen) { if (event.key === 'Tab') trapFocus(event, drawer); return; }
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
    if (state.room === 'timeline') {
      if (event.key === 'ArrowRight') { switchEvent(state.timelineIndex + 1, true); event.preventDefault(); }
      if (event.key === 'ArrowLeft') { switchEvent(state.timelineIndex - 1, true); event.preventDefault(); }
    }
    if (state.room === 'places') {
      const { order } = placeLayout(); const at = order.indexOf(state.placeIndex);
      if (event.key === 'ArrowRight') { switchPlace(order[(at + 1) % order.length]); event.preventDefault(); }
      if (event.key === 'ArrowLeft') { switchPlace(order[(at - 1 + order.length) % order.length]); event.preventDefault(); }
    }
  });
  function trapFocus(event, container) {
    const f = [...container.querySelectorAll('button:not([disabled]),[href],[tabindex]:not([tabindex="-1"])')].filter(el => el.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (event.shiftKey && document.activeElement === first) { last.focus(); event.preventDefault(); }
    else if (!event.shiftKey && document.activeElement === last) { first.focus(); event.preventDefault(); }
  }

  const restoreRoom = () => { const id = location.hash.replace('#', ''); if (id !== state.room && sceneIds.includes(id)) navigate(id, false); };
  window.addEventListener('hashchange', restoreRoom);
  window.addEventListener('popstate', restoreRoom);
  const initialRoom = sceneIds.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'intro';
  history.replaceState(null, '', `#${initialRoom}`);
  navigate(initialRoom, false);
  }
})();
