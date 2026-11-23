(() => {
  'use strict';

  /* ------------------------------------------------------------------
   * 启动：先尝试加载本地私密内容 private/content.js（已被 .gitignore 排除），
   * 加载不到就使用公开仓库里的示范内容 content.js。
   * 公开 DEMO（*.github.io）上不去请求私密文件，避免无意义的 404。
   * ------------------------------------------------------------------ */
  const PRIVATE_SRC = 'private/content.js';
  const shouldTryPrivate = !/\.github\.io$/i.test(location.hostname);
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
    { id: 'places', title: '足迹展厅', en: 'PLACES WE KEEP', number: '02', image: 'assets/place-city.svg', description: '把去过的地方，变成共同记忆' },
    { id: 'letter', title: '终厅 · 一封信', en: 'THE LAST ROOM', number: '03', image: 'assets/room-letter.svg', description: '在参观的最后，有些话想对你说' }
  ];
  const state = { room: 'intro', timelineIndex: 0, photoIndex: 0, placeIndex: 0, letterOpened: false, drawerOpen: false, modalOpen: false, soundOn: false, soundNodes: null, gallery: null };
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
          <div class="overline-row">AN EXHIBITION FOR ONE SPECIAL PERSON</div>
          <h1>${e(data.title)}</h1>
          <div class="entry-english">${e(data.englishTitle)}</div>
          <p class="entry-line">${e(data.openingLine)}</p>
          <p class="entry-note">${e(data.openingNote)}</p>
          ${dayLine}
          <button type="button" class="primary-button" data-room="foyer">${e(data.entryButton)} <span class="arrow" aria-hidden="true">↗</span></button>
          <div class="entry-footnote">PRIVATE EXHIBITION · ADMISSION FOR TWO</div>
        </div>
        <div class="entry-art" aria-hidden="true"><div class="portal-glow"></div><div class="portal-outer"><div class="portal-inner"><div class="portal-center-light"></div><div class="portal-moon"></div><img class="portal-botanical" src="assets/peony-botanical.svg" alt="" /></div></div><div class="portal-ornament"><img src="assets/peony-emblem.svg" alt="" /></div><div class="portal-float"><span>为 你 盛 开</span>PEONY EDITION · FOR YOU</div><div class="portal-plinth"></div></div>
      </div>
      <div class="entry-scroll">${e(data.recipient)} · ${e(data.founded)}</div><span class="entry-vertical">A VERY SMALL MUSEUM, A VERY BIG STORY</span>
    </section>`;
  }

  function foyer() {
    const counts = { timeline: `${data.timeline.length} 件时间展品`, places: `${data.places.length} 个地点`, letter: data.letter?.pending ? '一封待写的信' : '1 封信' };
    const roomTiles = rooms.slice(1).map(room => `<button type="button" class="room-tile" data-room="${room.id}" aria-label="进入${e(room.title)}">
      ${img(room.image, `展厅 ${room.number} 的示意画面`)}
      <span class="tile-number">GALLERY ${room.number} / 03</span>
      <span class="tile-content"><span class="small-caps">${e(room.en)}</span><h3>${e(room.title)}</h3><p>${e(room.description)}</p><span class="tile-count">${e(counts[room.id])}</span><span class="tile-arrow" aria-hidden="true">↗</span></span>
    </button>`).join('');
    const days = knownDays ? `<span>相识第 <strong>${knownDays}</strong> 天 · 展览仍在更新</span>` : '<span>THREE GALLERIES · COUNTLESS MEMORIES</span>';
    return `<section class="scene foyer-scene"><div class="room-content"><img src="assets/peony-botanical.svg" alt="" class="foyer-peony" aria-hidden="true"/>
      <div class="foyer-top"><div><span class="eyebrow">WELCOME TO THE GRAND FOYER · 00</span><h1 class="display-title">从这里，走进<br>关于我们的故事。</h1><div class="title-rule"></div><p class="foyer-top-note">${e(data.foyerNote)}</p></div><div class="foyer-quote">“ 时间会往前走，<br>　但有些瞬间可以被永远珍藏。 ”</div></div>
      <div class="room-grid">${roomTiles}</div>
      <div class="foyer-floor">${days}<span>CURATED BY <strong>${e(data.curatorSignature)}</strong></span></div>
    </div></section>`;
  }

  /* 单件媒体的展示：照片（模糊底 + 完整显示）、聊天截图（手机框）、拍立得（可翻面） */
  function mediaStage(m, item) {
    const alt = m.alt || m.caption || item.title || '';
    const open = `data-action="lightbox" aria-label="放大观看：${e(alt)}"`;
    if (m.type === 'chat') {
      return `<div class="media-stage is-chat"><button type="button" class="chat-phone" ${open}>${img(m.src, alt, 'chat-shot', '', true)}<span class="chat-hint">点开看完整聊天</span></button></div>`;
    }
    if (m.type === 'polaroid') {
      const back = m.back ? `<span class="polaroid-face polaroid-back">${img(m.back, `${alt}（背面）`)}</span>` : '';
      const ratio = m.ratio ? `style="--ratio:${e(m.ratio)}"` : '';
      return `<div class="media-stage is-polaroid"><div class="polaroid ${m.back ? 'has-back' : ''}" ${ratio}><button type="button" class="polaroid-inner" ${open}><span class="polaroid-face polaroid-front">${img(m.src, alt)}</span>${back}</button></div>${m.back ? '<button type="button" class="flip-button" data-action="flip-polaroid">翻到背面看看 ↻</button>' : ''}</div>`;
    }
    if (m.type === 'placeholder') {
      return `<div class="media-stage is-placeholder"><button type="button" class="photo-button" ${open}>${img(m.src, alt, 'exhibit-cover')}</button></div>`;
    }
    const fit = m.fit === 'cover' ? 'is-cover' : '';
    const pos = m.position ? `style="object-position:${e(m.position)}"` : '';
    return `<div class="media-stage is-photo ${fit}" style="--bg:url('${e(validImage(m.src))}')"><button type="button" class="photo-button" ${open}>${img(m.src, alt, 'exhibit-photo', pos, true)}</button></div>`;
  }

  function filmstrip(list, active) {
    if (list.length < 2) return '';
    return `<div class="filmstrip" role="group" aria-label="这件展品的全部照片">${list.map((m, i) => `<button type="button" class="film-thumb ${i === active ? 'is-active' : ''} ${m.type === 'chat' ? 'is-chat' : ''}" data-action="select-photo" data-index="${i}" aria-label="第 ${i + 1} 张" aria-current="${i === active}">${img(m.src, '', '')}</button>`).join('')}</div>`;
  }

  function chapterOf(item) { return data.chapters.find(c => c.id === item.chapter) || null; }

  function timeline() {
    const item = data.timeline[state.timelineIndex] || data.timeline[0];
    if (!item) return '<section class="scene"><div class="room-content"><h1 class="display-title">还没有时间线展品</h1></div></section>';
    const { list, real } = mediaOf(item);
    state.photoIndex = Math.min(state.photoIndex, list.length - 1);
    const m = list[state.photoIndex];
    const chapter = chapterOf(item);
    // 有章节时：只显示当前章节的节点，章节作为上方的“分馆”标签
    const visible = data.timeline.map((ev, i) => ({ ev, i })).filter(({ ev }) => !chapter || ev.chapter === chapter.id);
    const chapterTabs = data.chapters.length ? `<div class="chapter-tabs" role="tablist" aria-label="选择篇章">${data.chapters.map((c, ci) => { const first = data.timeline.findIndex(ev => ev.chapter === c.id); return first < 0 ? '' : `<button type="button" role="tab" class="chapter-tab ${chapter && c.id === chapter.id ? 'is-active' : ''}" aria-selected="${chapter && c.id === chapter.id}" data-action="select-event" data-index="${first}"><small>${e(c.period || `CHAPTER ${pad2(ci + 1)}`)}</small><span>${e(c.title)}</span></button>`; }).join('')}</div>` : '';
    const track = visible.map(({ ev, i }) => `<button class="timeline-node ${i === state.timelineIndex ? 'is-active' : ''} ${ev.highlight ? 'is-highlight' : ''}" data-action="select-event" data-index="${i}" type="button" aria-current="${i === state.timelineIndex ? 'step' : 'false'}"><small>${e(ev.date)}</small><span>${e(ev.title)}</span></button>`).join('');
    const badge = real ? (list.length > 1 ? `${state.photoIndex + 1} / ${list.length}` : 'ONE MOMENT') : 'IMAGE PLACEHOLDER · 可替换照片';
    const arrows = list.length > 1 ? `<button type="button" class="mini-arrow" data-action="prev-photo" aria-label="上一张照片">←</button><button type="button" class="mini-arrow" data-action="next-photo" aria-label="下一张照片">→</button>` : '';
    const caption = m.caption && m.caption !== item.title ? `<p class="media-caption">${e(m.caption)}</p>` : '';
    const quote = item.quote ? `<blockquote class="event-quote">“${e(item.quote)}”</blockquote>` : '';
    const placeLink = item.place ? (() => { const pi = data.places.findIndex(p => p.id === item.place); return pi < 0 ? '' : `<button type="button" class="text-button" data-action="goto-place" data-index="${pi}">⌖ ${e(data.places[pi].name)}</button>`; })() : '';
    const total = data.timeline.length;
    const isLast = state.timelineIndex === total - 1;
    return `<section class="scene timeline-scene"><div class="room-content">
      <div class="section-head"><div><span class="eyebrow">GALLERY 01 · CHRONICLES OF US</span><h1 class="display-title">时间长廊</h1></div><p>有些事情，过去很久也还记得。<br>选择一段时间，打开属于它的展柜。</p></div>
      ${chapterTabs}
      ${chapter && chapter.intro ? `<p class="chapter-intro">${e(chapter.intro)}</p>` : ''}
      <div class="timeline-track" role="group" aria-label="选择时间线事件">${track}</div>
      <div class="timeline-exhibit ${item.highlight ? 'is-highlight' : ''}" aria-live="polite">
        <div class="photo-mat">
          <div class="cover-frame" data-swipe="photo">${mediaStage(m, item)}<div class="photo-label"><i></i>${e(badge)}</div></div>
          ${caption}
          <div class="photo-counter"><span>ARCHIVE ${pad2(state.timelineIndex + 1)} / ${pad2(total)}</span><span class="spacer"></span>${arrows}</div>
          ${filmstrip(list, state.photoIndex)}
        </div>
        <div class="event-content"><div class="event-num">${pad2(state.timelineIndex + 1)}</div><div class="event-date">${e(item.date)}${item.highlight ? ' · <span class="peony-day">❀ 重要的日子</span>' : ' · THE MEMORY COLLECTION'}</div><h2 class="event-title">${e(item.title)}</h2><span class="event-en">${e(item.subtitle)}</span><p class="event-short">${e(item.short)}</p><p class="event-story">${e(item.story)}</p>${quote}
          <div class="exhibit-controls"><button type="button" class="outline-button" data-action="prev-event" ${state.timelineIndex === 0 ? 'disabled' : ''} aria-label="上一段回忆">←</button>${isLast ? '<button type="button" class="outline-button" data-room="places">去足迹展厅　→</button>' : '<button type="button" class="outline-button" data-action="next-event">下一段回忆　→</button>'}${placeLink}</div></div>
      </div>
    </div></section>`;
  }

  function places() {
    const place = data.places[state.placeIndex] || data.places[0];
    if (!place) return '<section class="scene"><div class="room-content"><h1 class="display-title">还没有地点展品</h1></div></section>';
    const path = data.places.slice(1).map((p, i) => { const prev = data.places[i]; const x1 = Number(prev.x) || 20, x2 = Number(p.x) || 70, y1 = Number(prev.y) || 50, y2 = Number(p.y) || 50; return `<path d="M ${x1} ${y1} Q ${(x1 + x2) / 2} ${Math.min(y1, y2) - 18} ${x2} ${y2}"/>`; }).join('');
    const markers = data.places.map((p, i) => { const visits = Array.isArray(p.events) ? p.events.length : 0; return `<button type="button" class="atlas-marker ${i === state.placeIndex ? 'is-active' : ''}" data-action="select-place" data-index="${i}" style="left:${Math.max(6, Math.min(94, Number(p.x) || 50))}%;top:${Math.max(6, Math.min(94, Number(p.y) || 50))}%" aria-label="查看${e(p.name)}" aria-pressed="${i === state.placeIndex}">${e(p.no || pad2(i + 1))}${visits > 1 ? `<span class="visit-count" aria-hidden="true">×${visits}</span>` : ''}<span class="marker-name" aria-hidden="true">${e(p.short || p.name)}</span></button>`; }).join('');
    const pagers = data.places.map((p, i) => `<button type="button" data-action="select-place" data-index="${i}" aria-label="查看地点：${e(p.name)}" class="${i === state.placeIndex ? 'is-active' : ''}">${i + 1}</button>`).join('');
    const { list, real } = mediaOf(place);
    const cover = list[0];
    const linked = (Array.isArray(place.events) ? place.events : []).map(id => ({ id, i: data.timeline.findIndex(ev => ev.id === id) })).filter(x => x.i >= 0);
    const visits = linked.length ? `<div class="place-visits"><span class="eyebrow">在这里发生过 · ${linked.length} 段回忆</span>${linked.map(({ i }) => `<button type="button" class="visit-link" data-action="goto-event" data-index="${i}"><small>${e(data.timeline[i].date)}</small>${e(data.timeline[i].title)}<span aria-hidden="true">↗</span></button>`).join('')}</div>` : '';
    return `<section class="scene places-scene"><div class="room-content">
      <div class="section-head"><div><span class="eyebrow">GALLERY 02 · AN ATLAS OF MEMORIES</span><h1 class="display-title">足迹展厅</h1></div><p>有些地方，因为一起去过，<br>从此有了不同的意义。</p></div>
      <div class="atlas-layout">
        <div class="atlas-map" role="group" aria-label="可点击的回忆地点示意图"><div class="atlas-sun"></div><svg class="atlas-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${path}</svg><div class="atlas-corner">COORDINATES OF MEMORY</div>${markers}</div>
        <article class="place-detail"><button type="button" class="place-cover" data-action="place-gallery" aria-label="查看${e(place.name)}的照片">${img(cover.src, `地点：${place.name}`)}${real && list.length > 1 ? `<span class="place-count">${list.length} 张照片 ↗</span>` : ''}</button><div class="place-copy"><span class="eyebrow">LOCATION ${pad2(state.placeIndex + 1)} / ${pad2(data.places.length)}</span><h3>${e(place.name)}</h3><div class="event-en">${e(place.caption)}</div><p>${e(place.description)}</p>${visits}<div class="place-pagers">${pagers}</div></div></article>
      </div>
      <p class="places-footnote">这是一张「回忆星图」：光点的位置按心意摆放，不代表真实的地理方位。</p>
    </div></section>`;
  }

  function letter() {
    const l = data.letter || {};
    const petals = Array.from({ length: 9 }, (_, i) => `<span class="letter-petal" aria-hidden="true" style="left:${9 + i * 10}%;bottom:${10 + (i % 4) * 11}%;animation-delay:-${i * 1.4}s;font-size:${12 + (i % 3) * 7}px">✧</span>`).join('');
    const paragraphs = (l.paragraphs || []).map(t => `<p>${e(t)}</p>`).join('');
    return `<section class="scene letter-scene"><div class="letter-layout"><img src="assets/peony-botanical.svg" alt="" class="letter-peony" aria-hidden="true"/>${petals}<span class="eyebrow">${e(l.preface)}</span><h1 class="letter-title">${e(l.title)}</h1>
      ${state.letterOpened ? `<div class="letter-paper" tabindex="-1"><div class="paper-head">THE MUSEUM OF US · PERSONAL LETTER</div><h3>${e(l.salutation)}</h3>${paragraphs}<div class="letter-sign">${e(l.signature)}</div>${l.date ? `<div class="letter-date">${e(l.date)}</div>` : ''}<div class="letter-postscript">${e(l.postscript)}</div></div><div class="letter-controls"><button class="outline-button" type="button" data-action="close-letter">合上这封信　✉</button><button class="text-button" type="button" data-room="foyer">再回去看看 ↗</button></div>` : `<p class="letter-instruction">这一间展厅，只准备了一封留给你的信。</p><button type="button" class="envelope-button" data-action="open-letter" aria-label="打开给你的信"><span class="envelope-back"></span><span class="envelope-face"></span><span class="envelope-fold"></span><span class="envelope-bottom"></span><span class="wax-seal">❀</span></button><p class="letter-after">轻轻点开信封。<br>有些话，不需要任何观众。</p>`}
    </div></section>`;
  }

  const templates = { intro, foyer, timeline, places, letter };

  function updateTourbar() {
    tourbar.hidden = state.room === 'intro';
    if (state.room === 'intro') return;
    const idx = tourIds.indexOf(state.room);
    const labels = { foyer: '大厅', timeline: '时间', places: '足迹', letter: '一封信' };
    const nav = tourIds.map(id => `<button type="button" class="nav-place ${id === state.room ? 'is-active' : ''}" data-room="${id}" aria-current="${id === state.room ? 'page' : 'false'}">${labels[id]}</button>`).join('');
    tourbar.innerHTML = `<button type="button" class="nav-arrow" data-action="prev-room" ${idx === 0 ? 'disabled' : ''} aria-label="上一个展厅">←</button><span class="nav-divider"></span>${nav}<span class="nav-divider"></span><button type="button" class="nav-arrow" data-action="next-room" ${idx === tourIds.length - 1 ? 'disabled' : ''} aria-label="下一个展厅">→</button>`;
  }
  function updateDrawer() {
    drawerList.innerHTML = rooms.map(r => `<button type="button" class="drawer-item ${state.room === r.id ? 'is-active' : ''}" data-room="${r.id}"><span class="dr-num">${e(r.number)}</span><span class="dr-title">${e(r.title)}</span><span class="dr-arrow">↗</span></button>`).join('');
  }

  /* render({soft:true})：同一展厅内切换（换事件 / 换照片）——不重播入场动画，并把焦点留在原来的按钮上 */
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
    root.querySelectorAll('.timeline-track .is-active, .chapter-tabs .is-active, .filmstrip .is-active').forEach(el => {
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
  /* 换事件后，如果展柜已经滚出视野（手机常见），把展柜带回视野 */
  function revealExhibit() {
    const ex = root.querySelector('.timeline-exhibit');
    if (!ex) return;
    const r = ex.getBoundingClientRect();
    if (r.top < 60 || r.top > window.innerHeight * 0.6) window.scrollTo({ top: window.scrollY + r.top - 96, behavior: reduceMotion ? 'auto' : 'smooth' });
  }
  function switchEvent(index, reveal = false) {
    const length = data.timeline.length;
    if (!length) return;
    state.timelineIndex = (index + length) % length;
    state.photoIndex = 0;
    render({ soft: true });
    if (reveal) revealExhibit();
  }
  function switchPhoto(direction, absolute = null) {
    const item = data.timeline[state.timelineIndex];
    if (!item) return;
    const { list } = mediaOf(item);
    state.photoIndex = absolute != null ? absolute : (state.photoIndex + direction + list.length) % list.length;
    render({ soft: true });
  }
  function switchPlace(index, reveal = false) {
    if (!data.places.length) return;
    state.placeIndex = (index + data.places.length) % data.places.length;
    render({ soft: true });
    // 手机上地图和详情是上下排列：点了光点后把详情卡带进视野
    if (reveal && window.innerWidth <= 800) {
      const copy = root.querySelector('.place-copy');
      if (copy && copy.getBoundingClientRect().top > window.innerHeight * 0.7) window.scrollTo({ top: window.scrollY + root.querySelector('.place-detail').getBoundingClientRect().top - 90, behavior: reduceMotion ? 'auto' : 'smooth' });
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
    if (state.room === 'places') { const p = data.places[state.placeIndex]; return { list: mediaOf(p).list, start: 0, title: p.name }; }
    const item = data.timeline[state.timelineIndex];
    return { list: mediaOf(item).list, start: state.photoIndex, title: item.title, showBack: Boolean(root.querySelector('.polaroid.is-flipped')) };
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
      case 'select-event': switchEvent(index); break;
      case 'next-event': switchEvent(state.timelineIndex + 1, true); break;
      case 'prev-event': switchEvent(state.timelineIndex - 1, true); break;
      case 'prev-photo': switchPhoto(-1); break;
      case 'next-photo': switchPhoto(1); break;
      case 'select-photo': switchPhoto(0, index); break;
      case 'flip-polaroid': { const p = root.querySelector('.polaroid'); const flipped = p?.classList.toggle('is-flipped'); actionNode.textContent = flipped ? '翻回正面 ↻' : '翻到背面看看 ↻'; break; }
      case 'select-place': switchPlace(index, actionNode.classList.contains('atlas-marker')); break;
      case 'goto-event': state.timelineIndex = index; state.photoIndex = 0; navigate('timeline'); break;
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

  /* 手机滑动：展柜照片左右滑切换；灯箱里左右滑切换 */
  let touch = null;
  document.addEventListener('touchstart', ev => { const zone = ev.target.closest('[data-swipe]'); if (!zone || ev.touches.length !== 1) return; touch = { zone: zone.dataset.swipe, x: ev.touches[0].clientX, y: ev.touches[0].clientY }; }, { passive: true });
  document.addEventListener('touchend', ev => {
    if (!touch) return; const t = ev.changedTouches[0]; const dx = t.clientX - touch.x, dy = t.clientY - touch.y; const zone = touch.zone; touch = null;
    if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy) * 1.3) return;
    const dir = dx < 0 ? 1 : -1;
    if (zone === 'gallery') stepGallery(dir);
    else if (zone === 'photo') { const { list } = mediaOf(data.timeline[state.timelineIndex] || {}); if (list.length > 1) switchPhoto(dir); }
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
      if (event.key === 'ArrowRight') { switchEvent(state.timelineIndex + 1); event.preventDefault(); }
      if (event.key === 'ArrowLeft') { switchEvent(state.timelineIndex - 1); event.preventDefault(); }
    }
    if (state.room === 'places') {
      if (event.key === 'ArrowRight') { switchPlace(state.placeIndex + 1); event.preventDefault(); }
      if (event.key === 'ArrowLeft') { switchPlace(state.placeIndex - 1); event.preventDefault(); }
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
