/* Pocket Australia · a static, offline-capable travel story for GitHub Pages. */
(() => {
  'use strict';
  const days = window.POCKET_DATA;
  const places = window.POCKET_PLACES;
  const geometry = window.AUSTRALIA_GEOMETRY;
  if (!Array.isArray(days) || !days.length) return;
  const $ = (id) => document.getElementById(id);
  const clamp = (n, a = 0, b = 1) => Math.min(b, Math.max(a, n));
  const pad = (n) => String(n).padStart(2, '0');
  const escape = (value) => String(value).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const world = $('travel-world');
  const crew = $('crew');
  const layers = [$('world-a'), $('world-b')];
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let active = -1;
  let activeLayer = 0;
  let lastScene = '';
  let chapterPositions = [];
  let chapterHeights = [];
  let frame = 0;
  let stopWalking = 0;
  let announceTimer = 0;
  let dialogScrollY = null;
  let dialogTrigger = null;
  let mapView = 'australia';
  let mapPlace = places[0];
  let stageMotion = null;
  let reduced = motionQuery.matches;
  try { reduced = reduced || localStorage.getItem('pocket-reduced-motion') === 'true'; } catch (_) {}

  function applyMotion() {
    document.documentElement.dataset.reducedMotion = String(reduced);
    $('motion-toggle').setAttribute('aria-pressed', String(reduced));
    $('motion-toggle').textContent = reduced ? 'Đang giảm chuyển động' : 'Giảm chuyển động';
    $('motion-toggle').disabled = motionQuery.matches;
    $('motion-toggle').title = motionQuery.matches ? 'Theo cài đặt giảm chuyển động của thiết bị' : '';
    crew.classList.remove('is-walking');
  }
  applyMotion();
  $('motion-toggle').addEventListener('click', () => {
    reduced = !reduced;
    try { localStorage.setItem('pocket-reduced-motion', String(reduced)); } catch (_) {}
    applyMotion();
  });
  const onMotionChange = () => {
    let saved = false;
    try { saved = localStorage.getItem('pocket-reduced-motion') === 'true'; } catch (_) {}
    reduced = motionQuery.matches || saved;
    applyMotion();
  };
  if (motionQuery.addEventListener) motionQuery.addEventListener('change', onMotionChange);
  else motionQuery.addListener(onMotionChange);

  $('chapter-track').innerHTML = days.map((day) => `<article class="chapter-marker" id="day-${pad(day.day)}" aria-label="Ngày ${day.day}: ${escape(day.name)}"><div class="chapter-text"><h3>Ngày ${day.day} — ${escape(day.name)}</h3><p>${escape(day.description)}</p></div></article>`).join('');
  $('plan-list').innerHTML = days.map((day) => `<li><button type="button" class="plan-day" data-goto="${day.day}"><span class="plan-day-number">${pad(day.day)}</span><span class="plan-day-name">${escape(day.name)}<span class="plan-day-meta">${escape(day.mode)} · Nghỉ tại ${escape(day.overnight)}</span></span><span aria-hidden="true">↗</span></button></li>`).join('');
  const markers = [...document.querySelectorAll('.chapter-marker')];

  function measure(anchor = null) {
    const y = dialogScrollY === null ? window.scrollY : dialogScrollY;
    chapterPositions = markers.map((el) => el.getBoundingClientRect().top + y);
    chapterHeights = markers.map((el) => el.offsetHeight);
    if (anchor && Number.isInteger(anchor.index)) {
      const nextY = chapterPositions[anchor.index] + chapterHeights[anchor.index] * anchor.fraction;
      if (dialogScrollY === null) window.scrollTo({top:nextY,behavior:'instant'});
      else {
        dialogScrollY = nextY;
        document.body.style.top = `-${nextY}px`;
      }
    }
    setLandscapeSize();
    if (active >= 0) renderStage(days[active]);
    if ($('map-dialog').open) renderMap();
    updateScroll();
  }

  const tiles = {pinnacles:[0,0], hutt:[1,0], kalbarri:[0,1], shell:[1,1]};
  function setLandscapeSize() {
    const w = world.clientWidth, h = world.clientHeight;
    const tile = Math.max(w, h);
    layers.forEach((layer) => {
      const panel = tiles[layer.dataset.art];
      if (!panel) return;
      layer.style.backgroundSize = `${tile * 2}px ${tile * 2}px`;
      layer.style.backgroundPosition = `${-panel[0]*tile-(tile-w)/2}px ${-panel[1]*tile-(tile-h)/2}px`;
    });
  }

  function setScene(scene) {
    if (scene === lastScene) return;
    lastScene = scene;
    const next = 1 - activeLayer;
    layers[next].dataset.art = scene;
    setLandscapeSize();
    layers[next].classList.add('is-visible');
    layers[activeLayer].classList.remove('is-visible');
    activeLayer = next;
  }

  function setActive(index, announce = false) {
    if (index === active) return;
    active = index;
    const day = days[index];
    world.dataset.scene = day.scene;
    world.dataset.theme = day.theme;
    setScene(day.scene);
    $('world-day').textContent = pad(day.day);
    $('world-kicker').textContent = day.kicker;
    // Titles are local authored content; every other value is text-only.
    $('world-title').innerHTML = day.title;
    $('world-description').textContent = day.description;
    $('route-from').textContent = day.from;
    $('route-mode').textContent = day.mode;
    $('route-to').textContent = day.to;
    $('bon-note').querySelector('p').textContent = day.bon;
    $('next-day').querySelector('span').textContent = index === days.length - 1 ? 'Về đích' : 'Đi tiếp';
    $('previous-day').setAttribute('aria-label', index === 0 ? 'Về chiếc vali' : `Đến ngày ${day.day - 1}`);
    $('day-details').setAttribute('aria-label', `Xem chi tiết ngày ${day.day}: ${day.name}`);
    document.querySelectorAll('.plan-day').forEach((button, i) => {
      if (i === index) button.setAttribute('aria-current','step');
      else button.removeAttribute('aria-current');
    });
    $('world-caption').classList.remove('is-entering');
    if (!reduced) requestAnimationFrame(() => $('world-caption').classList.add('is-entering'));
    renderStage(day);
    if (announce) {
      clearTimeout(announceTimer);
      announceTimer = setTimeout(() => { $('journey-announcement').textContent = `Ngày ${day.day}. ${day.name}. ${day.description}`; }, 220);
    }
  }

  function updateScroll() {
    frame = 0;
    if (!chapterPositions.length || dialogScrollY !== null) return;
    const y = window.scrollY;
    let index = 0;
    for (let i = 1; i < chapterPositions.length; i++) {
      if (y + 6 >= chapterPositions[i]) index = i;
      else break;
    }
    const inJourney = y >= chapterPositions[0] - 6 && y < chapterPositions[days.length-1] + chapterHeights[days.length-1];
    const changed = index !== active;
    setActive(index, changed && inJourney);
    const progress = clamp((y-chapterPositions[index])/chapterHeights[index]);
    const overall = clamp((index + progress) / days.length);
    $('world-progress-fill').style.transform = `scaleX(${overall})`;
    const mobile = window.innerWidth <= 700;
    crew.style.setProperty('--crew-x', `${(mobile ? 15 : 56) + progress*(mobile ? 14 : 12)}%`);
    world.style.setProperty('--scene-shift', `${reduced ? 0 : (progress-.5)*-15}px`);
    updateStageProgress(progress);
    if (changed && inJourney) {
      try { history.replaceState(null, '', `#day-${pad(index+1)}`); } catch (_) {}
    }
  }

  function onScroll() {
    if (dialogScrollY !== null) return;
    if (!frame) frame = requestAnimationFrame(updateScroll);
    if (!reduced && window.scrollY >= (chapterPositions[0] || 0)) {
      crew.classList.add('is-walking');
      clearTimeout(stopWalking);
      stopWalking = setTimeout(() => crew.classList.remove('is-walking'), 150);
    }
  }

  function goToDay(number, instant = false) {
    const target = markers[clamp(Number(number)-1,0,days.length-1)];
    if (!target) return;
    closeAllDialogs();
    const requestedIndex = markers.indexOf(target);
    const far = Math.abs(requestedIndex - active) > 2;
    const behavior = reduced || instant || far ? 'instant' : 'smooth';
    target.scrollIntoView({behavior,block:'start'});
    if (behavior === 'instant') setActive(requestedIndex,true);
    try { history.replaceState(null,'',`#${target.id}`); } catch (_) {}
    requestAnimationFrame(updateScroll);
  }

  function goToSection(id) {
    closeAllDialogs();
    $(id).scrollIntoView({behavior:reduced?'instant':'smooth',block:'start'});
    try { history.replaceState(null,'',`#${id}`); } catch (_) {}
  }

  function openDialog(id, trigger) {
    if (document.querySelector('dialog[open]')) closeAllDialogs();
    dialogTrigger = trigger || document.activeElement;
    dialogScrollY = window.scrollY;
    // Fixed-body locking preserves Safari's scroll position behind a modal.
    document.body.style.position = 'fixed';
    document.body.style.top = `-${dialogScrollY}px`;
    document.body.style.width = '100%';
    $(id).showModal();
    $(id).scrollTop = 0;
    $(id).querySelector('[data-close]')?.focus({preventScroll:true});
  }

  function releaseDialog() {
    if (document.querySelector('dialog[open]') || dialogScrollY === null) return;
    const y = dialogScrollY;
    dialogScrollY = null;
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    window.scrollTo({top:y,behavior:'instant'});
    dialogTrigger?.focus({preventScroll:true});
    dialogTrigger = null;
    requestAnimationFrame(updateScroll);
  }

  function closeAllDialogs() {
    document.querySelectorAll('dialog[open]').forEach((dialog) => dialog.close());
    releaseDialog();
  }

  document.querySelectorAll('dialog').forEach((dialog) => {
    dialog.addEventListener('close', releaseDialog);
    let downOutside = false;
    dialog.addEventListener('pointerdown', (event) => { downOutside = event.target === dialog; });
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog && downOutside) {
        const r = dialog.getBoundingClientRect();
        if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
      }
    });
  });

  function openDetails(trigger) {
    const day = days[Math.max(0,active)];
    $('detail-day').textContent = `NGÀY ${pad(day.day)} / 15 · DỰ KIẾN`;
    $('detail-title').textContent = day.name;
    $('detail-lead').textContent = day.description;
    const facts = [['Từ',day.from],['Đến',day.to],['Di chuyển',day.mode],['Dự kiến nghỉ tại',day.overnight]];
    $('detail-facts').innerHTML = facts.map(([label,value]) => `<div><dt>${escape(label)}</dt><dd>${escape(value)}</dd></div>`).join('');
    $('detail-highlight').textContent = day.highlight;
    $('detail-note').textContent = day.note;
    $('detail-next').innerHTML = `${active === days.length-1 ? 'Khép lại hành trình' : 'Sang ngày tiếp'} <span aria-hidden="true">→</span>`;
    openDialog('detail-dialog',trigger);
  }

  document.addEventListener('click', (event) => {
    const button = event.target.closest('button,a');
    if (!button) return;
    if (button.hasAttribute('data-close')) { button.closest('dialog').close(); return; }
    if (button.hasAttribute('data-goto')) { goToDay(button.dataset.goto); return; }
    if (button.hasAttribute('data-open-plan')) { openDialog('plan-dialog',button); return; }
    if (button.hasAttribute('data-open-map')) {
      mapPlace = places.find((p) => p.id === days[Math.max(0,active)].point) || places[0];
      mapView = active <= 0 || active === 14 ? 'australia' : 'west';
      openDialog('map-dialog',button);
      renderMap();
      showMapPlace(mapPlace);
      return;
    }
    if (button.hasAttribute('data-open-about')) { openDialog('about-dialog',button); return; }
    if (button.hasAttribute('data-map-view')) { mapView = button.dataset.mapView; renderMap(); return; }
    const hash = button.getAttribute('href');
    if (hash && /^#day-\d{2}$/.test(hash)) { event.preventDefault(); goToDay(Number(hash.slice(-2))); }
    if (hash === '#home' || hash === '#journey') { event.preventDefault(); goToSection(hash.slice(1)); }
  });
  $('day-details').addEventListener('click', (event) => openDetails(event.currentTarget));
  $('previous-day').addEventListener('click', () => active <= 0 ? goToSection('home') : goToDay(active));
  $('next-day').addEventListener('click', () => active >= days.length-1 ? goToSection('ending') : goToDay(active+2));
  $('detail-next').addEventListener('click', () => active >= days.length-1 ? goToSection('ending') : goToDay(active+2));
  $('detail-show-plan').addEventListener('click', () => openDialog('plan-dialog',$('day-details')));

  // Maps use a real Natural Earth coastline and a fitted equirectangular projection.
  function projector(view, width, height) {
    const bounds = view === 'west' ? [111.5,-34,120.4,-24.3] : [111,-44.7,155,-10];
    const c = Math.cos(27*Math.PI/180);
    const [west,south,east,north] = bounds;
    const margin = view === 'west' ? 28 : 25;
    const scale = Math.min((width-margin*2)/((east-west)*c),(height-margin*2)/(north-south));
    const x0 = (width-(east-west)*c*scale)/2 + (view==='west' && width<500 ? Math.min(50,width*.16) : 0);
    const y0 = (height-(north-south)*scale)/2;
    return (lon,lat) => [x0+(lon-west)*c*scale,y0+(north-lat)*scale];
  }
  function coastPath(project) {
    if (!geometry) return '';
    return geometry.flatMap((polygon) => polygon.map((ring) => ring.map(([lon,lat],i) => {
      const p = project(lon,lat);
      return `${i?'L':'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`;
    }).join('')+'Z')).join('');
  }
  const placeById = (id) => places.find((p) => p.id === id);
  const point = (project,id) => { const p = placeById(id); return project(p.lon,p.lat); };
  function linePath(project,ids) { return ids.map((id,i) => `${i?'L':'M'}${point(project,id).map(n=>n.toFixed(1)).join(',')}`).join(' '); }
  const roadIds = ['perth','pinnacles','geraldton','hutt','kalbarri','shell','denham'];
  const rounded = (n) => Number(n.toFixed(2));
  function flightGeometry(project,reverse=false) {
    const a = point(project,reverse?'perth':'sydney');
    const b = point(project,reverse?'sydney':'perth');
    const c = [(a[0]+b[0])/2,Math.min(a[1],b[1])-120];
    return {a,b,c,path:`M${a.join(',')} Q${c.join(',')} ${b.join(',')}`};
  }
  function mapBase(project,view) {
    const flight = flightGeometry(project);
    return `<path class="map-land" d="${coastPath(project)}"/><path class="map-road" d="${linePath(project,roadIds)}"/>${view==='australia'?`<path class="map-flight" d="${flight.path}"/>`:''}`;
  }

  function showMapPlace(place) {
    mapPlace = place;
    $('map-place-day').textContent = place.days;
    $('map-place-title').textContent = place.name;
    $('map-place-description').textContent = place.description;
    $('map-go').dataset.goto = String(place.day);
    $('map-go').setAttribute('aria-label',`Xem ngày ${place.day}: ${place.name}`);
    $('map-canvas').querySelectorAll('[data-place]').forEach((pin) => {
      const selected = pin.dataset.place === place.id;
      pin.classList.toggle('is-selected',selected);
      pin.setAttribute('aria-pressed',String(selected));
    });
  }

  function renderMap() {
    const canvas = $('map-canvas');
    const width = Math.max(canvas.clientWidth,300), height = Math.max(canvas.clientHeight,310);
    const project = projector(mapView,width,height);
    document.querySelectorAll('[data-map-view]').forEach((button) => {
      const selected = button.dataset.mapView === mapView;
      button.classList.toggle('is-active',selected);
      button.setAttribute('aria-pressed',String(selected));
    });
    const shown = mapView === 'west' ? places.filter(p=>p.id!=='sydney') : places.filter(p=>p.id==='sydney'||p.id==='perth');
    const offsets = {hutt:[-24,3],kalbarri:[27,-7],shell:[-14,11],denham:[23,-8]};
    let pins = shown.map((p) => {
      const [x,y] = project(p.lon,p.lat);
      const [dx,dy] = mapView==='west' ? (offsets[p.id]||[0,0]) : [0,0];
      const px=x+dx, py=y+dy;
      const left = mapView==='west' ? ['hutt','shell'].includes(p.id) : p.id==='sydney';
      const labelX = px + (left?-15:15);
      return `<g class="map-pin${p.id===mapPlace.id?' is-selected':''}" tabindex="0" role="button" aria-label="${escape(p.name)}, ${escape(p.days)}" aria-pressed="${p.id===mapPlace.id}" data-place="${p.id}">${dx||dy?`<path d="M${x},${y} L${px},${py}" stroke="#547c6c" stroke-width="1"/><circle cx="${x}" cy="${y}" r="2" fill="#547c6c"/>`:''}<circle class="pin-hit" cx="${px}" cy="${py}" r="22"/><circle class="pin-dot" cx="${px}" cy="${py}" r="7"/><text class="map-label" x="${labelX}" y="${py+5}" text-anchor="${left?'end':'start'}">${escape(p.name)}</text></g>`;
    }).join('');
    if (mapView === 'australia') {
      const p = point(project,'denham');
      pins += `<g class="map-pin" tabindex="0" role="button" aria-label="Zoom vào các điểm ở Tây Úc" data-zoom-west><circle class="pin-hit" cx="${p[0]}" cy="${p[1]}" r="25"/><circle class="pin-dot" cx="${p[0]}" cy="${p[1]}" r="10"/><text class="map-label" x="${p[0]+18}" y="${p[1]+4}">TÂY ÚC +6</text></g>`;
    }
    canvas.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="group" aria-label="Bản đồ ${mapView==='west'?'Tây Úc':'Australia'} và các điểm dự kiến">${mapBase(project,mapView)}${pins}</svg>`;
    showMapPlace(mapPlace);
  }
  function activatePin(event) {
    const pin = event.target.closest('[data-place],[data-zoom-west]');
    if (!pin) return;
    if (pin.hasAttribute('data-zoom-west')) { mapView='west'; renderMap(); }
    else showMapPlace(placeById(pin.dataset.place));
  }
  $('map-canvas').addEventListener('click',activatePin);
  $('map-canvas').addEventListener('keydown',(event) => {
    if (event.key==='Enter'||event.key===' ') { event.preventDefault(); activatePin(event); }
  });

  function renderStage(day) {
    const container = $('route-stage');
    const width = 760, height = 550;
    const view = day.day===1 || day.day===15 ? 'australia' : 'west';
    const project = projector(view,width,height);
    const target = point(project,day.point);
    let motion;
    if (day.day===1||day.day===15) motion=flightGeometry(project,day.day===15);
    else {
      const previous = days[Math.max(0,day.day-2)];
      const a = point(project,previous.point==='sydney'?'perth':previous.point);
      motion={a,b:target,path:`M${a.join(',')} L${target.join(',')}`};
    }
    stageMotion=motion;
    const labelPlaces = view==='australia' ? places.filter(p=>['perth','sydney'].includes(p.id)) : places.filter(p=>['perth','geraldton','denham'].includes(p.id));
    const labels = labelPlaces.map((p) => {
      const [x,y]=project(p.lon,p.lat);
      return `<circle cx="${x}" cy="${y}" r="4" fill="#3e7063"/><text class="map-label" x="${x+12}" y="${y+5}">${escape(p.name)}</text>`;
    }).join('');
    container.innerHTML=`<svg viewBox="0 0 ${width} ${height}">${mapBase(project,view)}${labels}<text class="stage-route-title" x="${view==='west'?440:365}" y="${view==='west'?260:270}" text-anchor="middle">${view==='west'?'WESTERN':'AUSTRALIA'}${view==='west'?'<tspan x="440" dy="28">AUSTRALIA</tspan>':''}</text><path id="stage-leg" class="map-progress-line" d="${motion.path}" pathLength="100" stroke-dasharray="100" stroke-dashoffset="100"/><circle id="stage-moving" class="map-position" cx="${motion.a[0]}" cy="${motion.a[1]}" r="9"/></svg>`;
  }
  function updateStageProgress(progress) {
    if (!stageMotion || ! $('stage-moving')) return;
    const t=clamp(progress*1.6);
    const {a,b,c}=stageMotion;
    const x=c?(1-t)*(1-t)*a[0]+2*(1-t)*t*c[0]+t*t*b[0]:a[0]+(b[0]-a[0])*t;
    const y=c?(1-t)*(1-t)*a[1]+2*(1-t)*t*c[1]+t*t*b[1]:a[1]+(b[1]-a[1])*t;
    $('stage-moving').setAttribute('cx',rounded(x));
    $('stage-moving').setAttribute('cy',rounded(y));
    $('stage-leg').setAttribute('stroke-dashoffset',rounded(100*(1-t)));
  }

  window.addEventListener('scroll',onScroll,{passive:true});
  let resizeFrame = 0;
  window.addEventListener('resize',() => {
    cancelAnimationFrame(resizeFrame);
    const y = dialogScrollY === null ? window.scrollY : dialogScrollY;
    const inJourney = active>=0 && y>=chapterPositions[0] && y<chapterPositions[days.length-1]+chapterHeights[days.length-1];
    const anchor = inJourney ? {index:active,fraction:clamp((y-chapterPositions[active])/chapterHeights[active])} : null;
    resizeFrame=requestAnimationFrame(()=>measure(anchor));
  },{passive:true});
  window.addEventListener('hashchange',() => {
    const match=location.hash.match(/^#day-(\d{2})$/);
    if (match) goToDay(Number(match[1]),true);
  });
  window.addEventListener('pageshow',measure);
  measure();
  document.fonts?.ready.then(measure);
  const initial=location.hash.match(/^#day-(\d{2})$/);
  if (initial) requestAnimationFrame(()=>goToDay(Number(initial[1]),true));
})();
