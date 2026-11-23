(() => {
  'use strict';
  const data = window.MUSEUM_CONTENT;
  if (!data) {
    document.getElementById('scene-root').innerHTML = '<p style="padding:60px;text-align:center">网站内容没有加载。请确认 content.js 与 index.html 在同一文件夹。</p>';
    return;
  }
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
    { id: 'places', title: '足迹展厅', en: 'PLACES WE KEEP', number: '02', image: 'assets/place-city.svg', description: '把地图上的地点，变成共同记忆' },
    { id: 'letter', title: '终厅 · 一封信', en: 'THE LAST ROOM', number: '03', image: 'assets/room-letter.svg', description: '在参观的最后，有些话想对你说' }
  ];
  const state = { room: 'intro', timelineIndex: 0, photoIndex: 0, placeIndex: 0, letterOpened: false, drawerOpen: false, modalOpen: false, soundOn: false, soundNodes: null };
  let toastTimer;
  let lastFocus = null;
  const e = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const validImage = value => { const url = String(value || ''); return /^(assets\/[-\w.\u4e00-\u9fa5 /()]+\.(?:png|jpe?g|webp|svg|gif)|https?:\/\/\S+|data:image\/svg\+xml;base64,[A-Za-z0-9+/=]+)$/i.test(url) ? url : 'assets/memory-beginning.svg'; };
  const selectedPhotos = item => Array.isArray(item.photos) && item.photos.length ? item.photos : [item.cover];
  const img = (src, alt, className = '') => `<img src="${e(validImage(src))}" alt="${e(alt)}" class="${e(className)}" loading="lazy" />`;
  const isDemo = Boolean(data.demoMode);
  document.getElementById('demo-indicator').hidden = !isDemo;
  document.title = `${data.englishTitle} · ${data.title}`;
  
  function intro() {
    return `<section class="scene entry-scene" aria-label="博物馆入口">
      <div class="entry-stars" aria-hidden="true"></div>
      <div class="entry-layout">
        <div class="entry-copy">
          <div class="overline-row">AN EXHIBITION FOR ONE SPECIAL PERSON</div>
          <h1>${e(data.title)}</h1>
          <div class="entry-english">${e(data.englishTitle)}</div>
          <p class="entry-line">${e(data.openingLine)}</p>
          <p class="entry-note">${e(data.openingNote)}</p>
          <button type="button" class="primary-button" data-room="foyer">${e(data.entryButton)} <span class="arrow" aria-hidden="true">↗</span></button>
          <div class="entry-footnote">PRIVATE EXHIBITION · ADMISSION FOR TWO</div>
        </div>
        <div class="entry-art" aria-hidden="true"><div class="portal-glow"></div><div class="portal-outer"><div class="portal-inner"><div class="portal-center-light"></div><div class="portal-moon"></div><img class="portal-botanical" src="assets/peony-botanical.svg" alt="" /></div></div><div class="portal-ornament"><img src="assets/peony-emblem.svg" alt="" /></div><div class="portal-float"><span>为 你 盛 开</span>PEONY EDITION · FOR YOU</div><div class="portal-plinth"></div></div>
      </div>
      <div class="entry-scroll">${e(data.recipient)} · ${e(data.founded)}</div><span class="entry-vertical">A VERY SMALL MUSEUM, A VERY BIG STORY</span>
    </section>`;
  }

  function foyer() {
    const roomTiles = rooms.slice(1).map(room => `<button type="button" class="room-tile" data-room="${room.id}" aria-label="进入${e(room.title)}">
      ${img(room.image, `展厅 ${room.number} 的示意画面`)}
      <span class="tile-number">GALLERY ${room.number} / 03</span>
      <span class="tile-content"><span class="small-caps">${e(room.en)}</span><h3>${e(room.title)}</h3><p>${e(room.description)}</p><span class="tile-arrow" aria-hidden="true">↗</span></span>
    </button>`).join('');
    return `<section class="scene foyer-scene"><div class="room-content"><img src="assets/peony-botanical.svg" alt="" class="foyer-peony" aria-hidden="true"/>
      <div class="foyer-top"><div><span class="eyebrow">WELCOME TO THE GRAND FOYER · 00</span><h1 class="display-title">从这里，走进<br>关于我们的故事。</h1><div class="title-rule"></div><p class="foyer-top-note">${e(data.foyerNote)}</p></div><div class="foyer-quote">“ 时间会往前走，<br>　但有些瞬间可以被永远珍藏。 ”</div></div>
      <div class="room-grid">${roomTiles}</div>
      <div class="foyer-floor"><span>THREE GALLERIES · COUNTLESS MEMORIES</span><span>CURATED BY <strong>${e(data.curatorSignature)}</strong></span></div>
    </div></section>`;
  }

  function timeline() {
    const item = data.timeline[state.timelineIndex] || data.timeline[0];
    if (!item) return '<section class="scene"><div class="room-content"><h1>还没有时间线展品</h1></div></section>';
    const photos = selectedPhotos(item);
    const photo = photos[state.photoIndex] || photos[0];
    const track = data.timeline.map((event, i) => `<button class="timeline-node ${i === state.timelineIndex ? 'is-active' : ''}" data-action="select-event" data-index="${i}" type="button" aria-current="${i === state.timelineIndex ? 'step' : 'false'}"><small>${e(event.no)} · ${e(event.date)}</small><span>${e(event.title)}</span></button>`).join('');
    const galleryBadge = Array.isArray(item.photos) && item.photos.length ? `${state.photoIndex + 1} / ${photos.length} PHOTOS` : 'IMAGE PLACEHOLDER · 可替换照片';
    return `<section class="scene timeline-scene"><div class="room-content">
      <div class="section-head"><div><span class="eyebrow">GALLERY 01 · CHRONICLES OF US</span><h1 class="display-title">时间长廊</h1></div><p>有些事情，过去很久也还记得。<br>选择一段时间，打开属于它的展柜。</p></div>
      <div class="timeline-track" role="group" aria-label="选择时间线事件">${track}</div>
      <div class="timeline-exhibit" aria-live="polite">
        <div><div class="photo-mat"><div class="cover-frame"><button data-action="lightbox" data-image="${e(photo)}" data-caption="${e(item.title)}" type="button" style="border:0;padding:0;display:block;width:100%;background:transparent;cursor:zoom-in" aria-label="放大观看展品图片">${img(photo, `展品：${item.title}`, 'exhibit-cover')}</button><div class="photo-label"><i></i>${e(galleryBadge)}</div></div><div class="photo-counter"><span>ARCHIVE ${e(item.no)} / ${String(data.timeline.length).padStart(2,'0')}</span><span class="spacer"></span><button type="button" class="mini-arrow" data-action="prev-photo" aria-label="上一张照片">←</button><button type="button" class="mini-arrow" data-action="next-photo" aria-label="下一张照片">→</button></div></div></div>
        <div class="event-content"><div class="event-num">${e(item.no)}</div><div class="event-date">${e(item.date)} · THE MEMORY COLLECTION</div><h2 class="event-title">${e(item.title)}</h2><span class="event-en">${e(item.subtitle)}</span><p class="event-short">${e(item.short)}</p><p class="event-story">${e(item.story)}</p><div class="exhibit-controls"><button type="button" class="outline-button" data-action="next-event">下一段回忆　→</button><span class="editorial-tag">EXHIBIT ${e(item.no)}</span></div></div>
      </div>
    </div></section>`;
  }

  function places() {
    const place = data.places[state.placeIndex] || data.places[0];
    if (!place) return '<section class="scene"><div class="room-content"><h1>还没有地点展品</h1></div></section>';
    const path = data.places.slice(1).map((p,i) => { const prev = data.places[i]; const x1 = Number(prev.x)||20, x2 = Number(p.x)||70, y1 = Number(prev.y)||50, y2 = Number(p.y)||50; return `<path d="M ${x1} ${y1} Q ${(x1+x2)/2} ${Math.min(y1,y2)-18} ${x2} ${y2}"/>`; }).join('');
    const markers = data.places.map((p,i) => `<button type="button" class="atlas-marker ${i===state.placeIndex ? 'is-active' : ''}" data-action="select-place" data-index="${i}" style="left:${Math.max(6,Math.min(94,Number(p.x)||50))}%;top:${Math.max(6,Math.min(94,Number(p.y)||50))}%" aria-label="查看${e(p.name)}" aria-pressed="${i===state.placeIndex}">${e(p.no)}</button>`).join('');
    const pagers = data.places.map((p,i) => `<button type="button" data-action="select-place" data-index="${i}" aria-label="查看地点${i+1}" class="${i===state.placeIndex?'is-active':''}">${i+1}</button>`).join('');
    const cover = selectedPhotos(place)[0];
    return `<section class="scene places-scene"><div class="room-content">
      <div class="section-head"><div><span class="eyebrow">GALLERY 02 · AN ATLAS OF MEMORIES</span><h1 class="display-title">足迹展厅</h1></div><p>有些地方，因为一起去过，<br>从此有了不同的意义。</p></div>
      <div class="atlas-layout">
        <div class="atlas-map" role="group" aria-label="可点击的回忆地点示意图"><div class="atlas-sun"></div><svg class="atlas-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${path}</svg><div class="atlas-corner">COORDINATES OF MEMORY</div><div class="atlas-corner bottom">NOT TO SCALE · 点击光点参观</div>${markers}</div>
        <article class="place-detail"><div class="place-cover">${img(cover, `地点：${place.name}`)}</div><div class="place-copy"><span class="eyebrow">LOCATION ${e(place.no)} / ${String(data.places.length).padStart(2,'0')}</span><h3>${e(place.name)}</h3><div class="event-en">${e(place.caption)}</div><p>${e(place.description)}</p><div class="place-pagers">${pagers}</div></div></article>
      </div>
      <p class="places-footnote">目前显示的是可交互的「回忆星图」，光点是设计位置，不代表真实经纬度。等你提供实际地点后，可以替换为真实地图。</p>
    </div></section>`;
  }

  function letter() {
    const l = data.letter;
    const petals = Array.from({length:9}, (_,i) => `<span class="letter-petal" aria-hidden="true" style="left:${9+i*10}%;bottom:${10+(i%4)*11}%;animation-delay:-${i*1.4}s;font-size:${12+(i%3)*7}px">✧</span>`).join('');
    const paragraphs = (l.paragraphs || []).map(t => `<p>${e(t)}</p>`).join('');
    return `<section class="scene letter-scene"><div class="letter-layout"><img src="assets/peony-botanical.svg" alt="" class="letter-peony" aria-hidden="true"/>${petals}<span class="eyebrow">${e(l.preface)}</span><h1 class="letter-title">${e(l.title)}</h1>
      ${state.letterOpened ? `<div class="letter-paper"><div class="paper-head">THE MUSEUM OF US · PERSONAL LETTER</div><h3>${e(l.salutation)}</h3>${paragraphs}<div class="letter-sign">${e(l.signature)}</div><div class="letter-postscript">${e(l.postscript)}</div></div><div class="letter-controls"><button class="outline-button" type="button" data-action="close-letter">合上这封信　✉</button><button class="text-button" type="button" data-room="foyer">再回去看看 ↗</button></div>` : `<p class="letter-instruction">这一间展厅，只准备了一封留给你的信。</p><button type="button" class="envelope-button" data-action="open-letter" aria-label="打开给你的信"><span class="envelope-back"></span><span class="envelope-face"></span><span class="envelope-fold"></span><span class="envelope-bottom"></span><span class="wax-seal">❀</span></button><p class="letter-after">轻轻点开信封。<br>有些话，不需要任何观众。</p>`}
    </div></section>`;
  }

  const templates = { intro, foyer, timeline, places, letter };
  function updateTourbar() {
    tourbar.hidden = state.room === 'intro';
    if (state.room === 'intro') return;
    const idx = tourIds.indexOf(state.room);
    const nav = tourIds.map((id,i) => `<button type="button" class="nav-place ${id === state.room ? 'is-active' : ''}" data-room="${id}" aria-current="${id === state.room ? 'page' : 'false'}">${i===0?'大厅':({timeline:'时间',places:'足迹',letter:'一封信'})[id]}</button>`).join('');
    tourbar.innerHTML = `<button type="button" class="nav-arrow" data-action="prev-room" ${idx===0?'disabled':''} aria-label="上一个展厅">←</button><span class="nav-divider"></span>${nav}<span class="nav-divider"></span><button type="button" class="nav-arrow" data-action="next-room" ${idx===tourIds.length-1?'disabled':''} aria-label="下一个展厅">→</button>`;
  }
  function updateDrawer() {
    drawerList.innerHTML = rooms.map(r => `<button type="button" class="drawer-item ${state.room===r.id?'is-active':''}" data-room="${r.id}"><span class="dr-num">${e(r.number)}</span><span class="dr-title">${e(r.title)}</span><span class="dr-arrow">↗</span></button>`).join('');
  }
  function render() {
    root.innerHTML = templates[state.room]();
    updateTourbar();updateDrawer();
  }
  function navigate(id, writeHash=true) {
    if (!sceneIds.includes(id)) return;
    closeDrawer();closeModal();
    state.room=id;
    if (writeHash && location.hash !== `#${id}`) history.replaceState(null,'',`#${id}`);
    render();
    window.scrollTo({top:0,behavior:'instant'});
  }
  function switchEvent(index) {
    const length = data.timeline.length;
    if (!length) return;
    state.timelineIndex = (index + length) % length;
    state.photoIndex=0;
    render();
  }
  function switchPhoto(direction) {
    const item = data.timeline[state.timelineIndex];
    const photos = selectedPhotos(item);
    state.photoIndex = (state.photoIndex + direction + photos.length) % photos.length;
    render();
  }
  function switchPlace(index) {
    if (!data.places.length) return;
    state.placeIndex = (index + data.places.length) % data.places.length;
    render();
  }
  function openDrawer() {
    state.drawerOpen=true;drawer.classList.add('is-open');drawer.setAttribute('aria-hidden','false');drawerBackdrop.hidden=false;
    document.getElementById('map-button').setAttribute('aria-expanded','true');
  }
  function closeDrawer() {
    state.drawerOpen=false;drawer.classList.remove('is-open');drawer.setAttribute('aria-hidden','true');drawerBackdrop.hidden=true;
    document.getElementById('map-button').setAttribute('aria-expanded','false');
  }
  function openModal(markup) {
    lastFocus=document.activeElement;
    modalContent.innerHTML=markup;modal.hidden=false;state.modalOpen=true;document.body.style.overflow='hidden';
    modal.querySelector('.modal-close').focus();
  }
  function closeModal() {
    if (!state.modalOpen) return;
    modal.hidden=true;state.modalOpen=false;document.body.style.overflow='';
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
  }
  function showLightbox(src, caption) {
    openModal(`<h2 id="modal-title" class="modal-eyebrow">A MOMENT WE KEEP</h2>${img(src,caption,'lightbox-image')}<p class="modal-caption">${e(caption)}</p>`);
  }
  function openLetter() {state.letterOpened=true;render();}
  function closeLetter() {state.letterOpened=false;render();}
  function toast(text) {clearTimeout(toastTimer);toastEl.textContent=text;toastEl.classList.add('is-visible');toastTimer=setTimeout(()=>toastEl.classList.remove('is-visible'),2400);}
  
  async function toggleAmbience() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return toast('当前浏览器不支持背景氛围声');
    if (state.soundOn) {
      state.soundOn=false;
      const nodes=state.soundNodes;
      if(nodes){nodes.gain.gain.setTargetAtTime(0,nodes.ctx.currentTime,.22);setTimeout(()=>nodes.ctx.close().catch(()=>{}),1000);state.soundNodes=null;}
    } else {
      try {
        const ctx=new AudioCtx();await ctx.resume();
        const gain=ctx.createGain();gain.gain.value=0;gain.connect(ctx.destination);
        const oscillators=[];
        [196,293.66,392].forEach((freq,i)=>{const osc=ctx.createOscillator();osc.type='sine';osc.frequency.value=freq;const voice=ctx.createGain();voice.gain.value=[.33,.24,.17][i];osc.connect(voice).connect(gain);osc.start();oscillators.push(osc);});
        gain.gain.setTargetAtTime(.032,ctx.currentTime,.7);
        state.soundNodes={ctx,gain,oscillators};state.soundOn=true;
        toast('已开启轻柔氛围声 · 可随时关闭');
      } catch(error) {return toast('浏览器暂时无法播放声音');}
    }
    ambienceBtn.setAttribute('aria-pressed',String(state.soundOn));
  }

  document.addEventListener('click', event => {
    if (event.target === modal) return closeModal();
    if (event.target === drawerBackdrop) return closeDrawer();
    const roomNode=event.target.closest('[data-room]');
    if(roomNode) {navigate(roomNode.dataset.room);return;}
    const actionNode=event.target.closest('[data-action]');
    if(!actionNode)return;
    const action=actionNode.dataset.action, index=Number(actionNode.dataset.index);
    switch(action) {
      case 'home':navigate('intro');break;
      case 'toggle-map':state.drawerOpen?closeDrawer():openDrawer();break;
      case 'close-map':closeDrawer();break;
      case 'toggle-ambience':toggleAmbience();break;
      case 'prev-room':navigate(tourIds[Math.max(0,tourIds.indexOf(state.room)-1)]);break;
      case 'next-room':navigate(tourIds[Math.min(tourIds.length-1,tourIds.indexOf(state.room)+1)]);break;
      case 'select-event':switchEvent(index);break;
      case 'next-event':switchEvent(state.timelineIndex+1);break;
      case 'prev-photo':switchPhoto(-1);break;
      case 'next-photo':switchPhoto(1);break;
      case 'select-place':switchPlace(index);break;
      case 'close-modal':closeModal();break;
      case 'lightbox':showLightbox(actionNode.dataset.image,actionNode.dataset.caption);break;
      case 'open-letter':openLetter();break;
      case 'close-letter':closeLetter();break;
    }
  });
  document.addEventListener('keydown', event => {
    if(event.key === 'Escape') {if(state.modalOpen)closeModal();else if(state.drawerOpen)closeDrawer();return;}
    if(state.modalOpen||state.drawerOpen||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;
    if(state.room==='timeline') {
      if(event.key==='ArrowRight'){switchEvent(state.timelineIndex+1);event.preventDefault();}
      if(event.key==='ArrowLeft'){switchEvent(state.timelineIndex-1);event.preventDefault();}
    }
  });
  window.addEventListener('hashchange',()=>{const id=location.hash.replace('#','');if(id!==state.room && sceneIds.includes(id)) navigate(id,false);});
  navigate(sceneIds.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'intro');
})();
