const $ = s => document.querySelector(s);
const DOW = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const KIND = {LEC: 'Lý thuyết', LAB: 'Thực hành', ONL: 'Học online', KG: 'Khai giảng', HACK: 'Hackathon',
  event: 'Workshop / Office hour', mentor_duty: 'Mentor duty', deadline: 'Hạn nộp', other: 'Sự kiện'};
const state = {view: 'day', day: null, sid: null, share: null, monday: null, week: null, upcoming: [], buildings: null, current: null,
  filters: new Set(['class', 'event', 'duty', 'deadline']), team: ''};

const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const mondayOf = d => { const x = new Date(d); x.setDate(x.getDate() - (x.getDay() + 6) % 7); return iso(x); };
const addDays = (s, n) => { const d = new Date(s + 'T00:00:00'); d.setDate(d.getDate() + n); return iso(d); };
const dm = s => `${s.slice(8, 10)}/${s.slice(5, 7)}`;
const hm = s => s.slice(11, 16);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const icon = id => `<svg class="ic" aria-hidden="true"><use href="#${id}"/></svg>`;
const ls = {get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} }};
const cat = x => x.is_deadline ? 'deadline' : x.source === 'tkb' ? 'class' : x.kind === 'mentor_duty' ? 'duty' : 'event';
const teamOf = x => (x.title.match(/Nhóm\s*\d+/i) || [''])[0];

async function api(path, opts) {
  const r = await fetch(path, opts);
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body.detail || body.question || `Lỗi ${r.status}`);
  return body;
}
const post = (path, data) => api(path, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)});
const weekUrl = monday => state.share ? `/api/shared/${state.share}?monday=${monday}`
  : `/api/week?monday=${monday}`;

/* ---------- Week ---------- */
async function loadWeek() {
  $('#grid').innerHTML = '<div class="card"><div class="skel"></div><div class="skel" style="width:70%"></div></div>';
  try { state.week = await api(weekUrl(state.monday)); }
  catch (e) { $('#grid').innerHTML = `<p class="msg err">${esc(e.message)}</p>`; return false; }
  render();
  loadUpcoming();
  resetSummary();
  return true;
}

function render() {
  const w = state.week, today = iso(new Date());
  if (!state.share) {
    $('#phxstate').innerHTML = w.phoenix_linked
      ? `Đã kết nối. Đồng bộ lần cuối ${esc((w.phoenix_synced_at || '').replace('T', ' ').slice(0, 16))}, tự cập nhật mỗi giờ. Dán link mới để đổi.`
      : $('#phxstate').innerHTML;
  }
  const teams = [...new Set(w.items.map(teamOf).filter(Boolean))].sort();
  $('#team').innerHTML = '<option value="">Mọi team</option>' + teams.map(t => `<option${t === state.team ? ' selected' : ''}>${esc(t)}</option>`).join('');
  $('#team').hidden = !teams.length;

  const clashIds = new Set(w.clashes.flat());
  const notes = [];
  (w.room_changes || []).forEach(c => notes.push(`<div class="notice warn">${icon('i-alert')}<span>Phòng buổi <b>${esc(c.name)}</b> ngày ${dm(c.date)} đã đổi: <b>${esc(c.old_room || '—')}</b> → <b>${esc(c.new_room)}</b>.</span></div>`));
  if (w.clashes.length) notes.push(`<div class="notice warn">${icon('i-alert')}<span>Tuần này có <b>${w.clashes.length}</b> chỗ trùng giờ giữa lịch học và lịch Phoenix (viền đỏ).</span></div>`);
  if (!state.share && !w.phoenix_linked) notes.push(`<div class="notice info">${icon('i-link')}<span>Chưa có lịch Phoenix. <a href="#caidat">Kết nối</a> để thấy workshop, mentor duty và hạn nộp.</span></div>`);
  $('#notices').innerHTML = notes.join('');

  const visible = x => state.filters.has(cat(x)) && (!state.team || cat(x) !== 'duty' || teamOf(x) === state.team);
  const now = new Date(), notPast = x => new Date(x.is_deadline ? x.start : x.end) > now;
  const card = (x, extra) => evCard(x, clashIds, extra);
  if (state.view === 'day') renderDay(w, visible, notPast, card, today, now);
  else renderWeek(w, visible, notPast, card, today);
  setNav(today);
  const v = w.tkb_version;
  $('#meta').textContent = v ? `Thời khoá biểu cập nhật ${v.received_at.replace('T', ' ').slice(0, 16)}.` : '';
  document.querySelectorAll('.ev').forEach(b => b.addEventListener('click', () => openPanel(b.dataset.id)));
}

/* ---------- Views: only what is next ---------- */
const dowOf = d => DOW[(new Date(d + 'T00:00:00').getDay() + 6) % 7];
const dayName = (d, today) => d === today ? 'Hôm nay' : d === addDays(today, 1) ? 'Ngày mai' : `${dowOf(d)} ${dm(d)}`;
const byStart = (a, b) => a.start.localeCompare(b.start);

function evCard(x, clashIds, extra = '') {
  if (x.is_deadline) return `<button class="ev dl" data-id="${esc(x.id)}"><span class="t">${hm(x.start)}</span><span class="n">${icon('i-flag')} ${esc(x.title)}</span>${extra}</button>`;
  const room = x.source === 'tkb'
    ? (x.kind === 'ONL' ? `<span class="room">${icon('i-video')}Online</span>` : x.my_room ? `<span class="room">${icon('i-pin')}${esc(x.my_room)}</span>` : '<span class="room">Chưa có phòng</span>')
    : (x.location ? `<span class="room">${icon('i-video')}Online</span>` : '');
  const clash = !x.cancelled && clashIds.has(x.id) ? `<span class="clashtag">${icon('i-alert')}Trùng giờ</span>` : '';
  if (x.changed_by_mentor) extra = `<span class="mtag">${x.cancelled ? 'Mentor đã huỷ ca này' : 'Mentor đã đổi lịch'}${x.note ? ': ' + esc(x.note) : ''}</span>` + extra;
  return `<button class="ev ${x.kind}${clash ? ' clash' : ''}${x.cancelled ? ' cancelled' : ''}" data-id="${esc(x.id)}"><span class="t">${hm(x.start)}<br>${hm(x.end)}</span><span class="n">${esc(x.title)}</span>${room}${clash}${extra}</button>`;
}

/* Daily: hour-based. Today shows only what is ongoing or still ahead. */
function renderDay(w, visible, notPast, card, today, now) {
  const d = state.day, isToday = d === today;
  let items = w.items.filter(x => x.start.slice(0, 10) === d && visible(x)).sort(byStart);
  if (isToday) items = items.filter(notPast);
  $('#weeklabel').textContent = isToday ? `Hôm nay · ${dowOf(d)} ${dm(d)}` : dayName(d, today) + (d === addDays(today, 1) ? ` · ${dowOf(d)} ${dm(d)}` : '');
  if (!items.length) {
    const nxt = w.items.filter(x => visible(x) && notPast(x) && x.start.slice(0, 10) > d).sort(byStart)[0];
    $('#grid').innerHTML = `<div class="card dayempty"><p><b>${isToday ? 'Hôm nay không còn lịch nào.' : 'Ngày này không có lịch.'}</b></p>${nxt
      ? `<button class="btn ghost sm" id="jumpnext">Tiếp theo: ${dayName(nxt.start.slice(0, 10), today)} ${hm(nxt.start)} · ${esc(nxt.title)}</button>`
      : '<p class="hint">Xem tiếp ở chế độ Tuần hoặc bấm mũi tên sang ngày sau.</p>'}</div>`;
    if (nxt) $('#jumpnext').addEventListener('click', () => go(nxt.start.slice(0, 10)));
    return;
  }
  const ongoing = isToday ? items.filter(x => !x.is_deadline && new Date(x.start) <= now) : [];
  const ahead = items.filter(x => !ongoing.includes(x));
  const rows = [];
  if (isToday) rows.push(`<div class="nowline"><span>Bây giờ ${pad(now.getHours())}:${pad(now.getMinutes())}</span></div>`);
  if (ongoing.length) rows.push(`<div class="hour live"><div class="hl">Đang diễn ra</div><div class="hi">${ongoing.map(x =>
    card(x, `<span class="left">Còn ${left(new Date(x.end) - now)}</span>`)).join('')}</div></div>`);
  const byHour = {};
  ahead.forEach(x => (byHour[+x.start.slice(11, 13)] ||= []).push(x));
  const hrs = Object.keys(byHour).map(Number);
  if (hrs.length) {
    let gap = null;
    for (let h = Math.min(...hrs); h <= Math.max(...hrs); h++) {
      if (!byHour[h]) { if (gap === null) gap = h; continue; }
      if (gap !== null) { rows.push(`<div class="gap">Trống ${pad(gap)}:00 – ${pad(h)}:00</div>`); gap = null; }
      const mins = isToday ? Math.round((new Date(byHour[h][0].start) - now) / 60000) : -1;
      rows.push(`<div class="hour"><div class="hl">${pad(h)}:00${mins >= 0 ? `<small>sau ${left(mins * 60000)}</small>` : ''}</div><div class="hi">${byHour[h].map(x => card(x)).join('')}</div></div>`);
    }
  }
  $('#grid').innerHTML = `<div class="timeline">${rows.join('')}</div>`;
}

/* Weekly: day-based, from today to Sunday (a future week shows in full). */
function renderWeek(w, visible, notPast, card, today) {
  const days = w.days.filter(d => d >= today);
  $('#weeklabel').textContent = state.monday === mondayOf(new Date())
    ? `Tuần này · ${dm(days[0] || today)} – ${dm(addDays(state.monday, 6))}` : `${dm(state.monday)} – ${dm(addDays(state.monday, 6))}`;
  $('#grid').style.setProperty('--cols', Math.max(days.length, 1));
  let shown = 0;
  const html = days.map(d => {
    let items = w.items.filter(x => x.start.slice(0, 10) === d && visible(x)).sort(byStart);
    if (d === today) items = items.filter(notPast);
    shown += items.length;
    const chips = items.filter(x => x.is_deadline).map(x => `<span class="chip">${icon('i-flag')}${hm(x.start)} ${esc(x.title.replace(/^Hạn nộp /, 'Hạn '))}</span>`).join('');
    const cards = items.filter(x => !x.is_deadline).map(x => card(x)).join('');
    const tag = d === today ? '<em>Hôm nay</em>' : d === addDays(today, 1) ? '<em>Ngày mai</em>' : '';
    return `<div class="day${d === today ? ' today' : ''}${items.length ? '' : ' empty-day'}">
      <div class="dayhead"><b>${dowOf(d)}</b><span>${dm(d)}</span>${tag}</div>
      ${chips ? `<div class="deadlines">${chips}</div>` : ''}
      <div class="items">${cards || (chips ? '' : `<span class="none">${d === today ? 'Không còn lịch hôm nay' : 'Không có lịch'}</span>`)}</div></div>`;
  }).join('');
  $('#grid').innerHTML = (shown ? '' : '<p class="muted">Phần còn lại của tuần không có mục nào khớp bộ lọc.</p>') + html;
}

function setNav(today) {
  const day = state.view === 'day', thisMonday = mondayOf(new Date());
  $('#prev').disabled = day ? state.day <= today : state.monday <= thisMonday;
  $('#prev').setAttribute('aria-label', day ? 'Ngày trước' : 'Tuần trước');
  $('#next').setAttribute('aria-label', day ? 'Ngày sau' : 'Tuần sau');
  $('#today').textContent = day ? 'Hôm nay' : 'Tuần này';
  $('#today').hidden = day ? state.day === today : state.monday === thisMonday;
  document.querySelectorAll('.segbtn').forEach(b => b.setAttribute('aria-selected', String(b.dataset.view === state.view)));
  $('#grid').classList.toggle('dayview', day);
  $('#grid').classList.toggle('weekview', !day);
}

async function go(day) {  // never go before today; reload only when the week changes
  const today = iso(new Date());
  state.day = day < today ? today : day;
  const m = mondayOf(new Date(state.day + 'T00:00:00'));
  if (m !== state.monday || !state.week) { state.monday = m; await loadWeek(); } else render();
}

/* ---------- Countdown to deadlines ---------- */
async function loadUpcoming() {
  const now = new Date(), m = mondayOf(now);
  try {
    const [a, b] = await Promise.all([api(weekUrl(m)), api(weekUrl(addDays(m, 7)))]);
    const seen = new Set();
    state.upcoming = [...a.items, ...b.items].filter(x => x.is_deadline && new Date(x.start) > now)
      .sort((x, y) => x.start.localeCompare(y.start))
      .filter(x => !seen.has(x.title) && seen.add(x.title)).slice(0, 4);  // next one of each kind
  } catch (e) { state.upcoming = []; }
  tickCountdown();
}

function left(ms) {
  const m = Math.floor(ms / 60000), d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mm = m % 60;
  return d ? `${d} ngày ${h} giờ` : h ? `${h} giờ ${pad(mm)} phút` : `${mm} phút`;
}

function tickCountdown() {
  const now = Date.now(), list = state.upcoming.filter(x => new Date(x.start) > now);
  $('#countdown').hidden = !list.length;
  $('#cdlist').innerHTML = list.map(x => {
    const ms = new Date(x.start) - now;
    return `<li class="${ms < 3600e3 * 3 ? 'urgent' : ''}"><span><span class="what">${esc(x.title)}</span><br><span class="when">${DOW[(new Date(x.start).getDay() + 6) % 7]} ${dm(x.start)} · ${hm(x.start)}</span></span><span class="left">còn ${left(ms)}</span></li>`;
  }).join('');
}
setInterval(tickCountdown, 30000);

/* ---------- AI weekly summary ---------- */
function resetSummary() {
  $('#summary').hidden = !!state.share;
  $('#sumbody').className = 'muted';
  $('#sumbody').textContent = 'Bấm để AI đọc phần còn lại của tuần (từ bây giờ) và liệt kê việc còn phải làm.';
}

async function loadSummary() {
  const btn = $('#sumbtn'); btn.disabled = true;
  $('#sumbody').className = ''; $('#sumbody').innerHTML = '<div class="skel"></div><div class="skel" style="width:80%"></div><div class="skel" style="width:60%"></div>';
  try {
    const s = await api(`/api/summary?monday=${state.monday}`);
    $('#sumbody').innerHTML = `<p class="sumhl">${esc(s.headline)}</p>
      <ul class="sumlist">${s.items.map(i => `<li><span class="w">${esc(i.when)}</span><span>${esc(i.what)}</span></li>`).join('')}</ul>
      ${s.tip ? `<p class="tip">${esc(s.tip)}</p>` : ''}
      <p class="meta">${s.ai ? `AI tóm tắt từ lịch của bạn (${esc(s.usage.model)}). Kiểm tra lại giờ trên lịch.` : 'Tóm tắt tự động từ lịch (không dùng AI).'}</p>`;
  } catch (e) { $('#sumbody').innerHTML = `<p class="msg err">${esc(e.message)}</p>`; }
  btn.disabled = false; btn.textContent = 'Tóm tắt lại';
}

/* ---------- Detail sheet + map + leave ---------- */
function openPanel(id) {
  const x = state.week.items.find(i => i.id === id);
  if (!x) return;
  state.current = x;
  $('#pkind').textContent = KIND[x.kind] || 'Sự kiện';
  $('#ptitle').textContent = x.title;
  $('#ptime').textContent = `${DOW[(new Date(x.start.slice(0, 10) + 'T00:00:00').getDay() + 6) % 7]}, ${dm(x.start)} · ${hm(x.start)}–${hm(x.end)}`;
  const rows = [];
  if (x.source === 'tkb') {
    rows.push(['Phòng của bạn', esc(x.kind === 'ONL' ? 'Online' : (x.my_room || 'Chưa được xếp phòng'))]);
    const all = (x.class_rooms || []).map(r => r.code + (r.backup ? ' (dự phòng)' : '')).join(', ');
    if (all) rows.push(['Phòng của cả lớp', esc(all)]);
  } else {
    if (x.location && x.location.startsWith('http')) rows.push(['Tham gia', `<a href="${esc(x.location)}" target="_blank" rel="noopener">Mở link buổi</a>`]);
    rows.push(['Nguồn', 'Lịch Phoenix']);
  }
  $('#pinfo').innerHTML = `<dl class="facts">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`;
  showMap(x.source === 'tkb' && x.kind !== 'ONL' ? x.my_room : null);
  $('#leave').hidden = x.source !== 'tkb' || !!state.share;
  $('#result').innerHTML = ''; $('#reason').value = '';
  $('#scrim').hidden = false; $('#panel').hidden = false;
  $('#close').focus();
}

/* ---------- Campus map (SVG, zoom + pan) ---------- */
const MAPV = {full: [0, 0, 1701, 2000], central: [290, 650, 760, 560]};  // central = parking lot + A/B/C/E/G/H/I
const map = {svg: null, vb: null, pts: new Map(), pinch: 0};

async function ensureMap() {
  if (map.svg) return map.svg;
  $('#cmap').innerHTML = await (await fetch('/static/campus-map.svg?v=2')).text();
  map.svg = $('#cmap svg');
  map.svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  const s = map.svg;
  const toSvg = (cx, cy) => { const p = s.createSVGPoint(); p.x = cx; p.y = cy; return p.matrixTransform(s.getScreenCTM().inverse()); };
  s.addEventListener('wheel', e => { e.preventDefault(); const p = toSvg(e.clientX, e.clientY); zoomMap(e.deltaY > 0 ? 1.2 : 1 / 1.2, p.x, p.y); }, {passive: false});
  s.addEventListener('pointerdown', e => { s.setPointerCapture(e.pointerId); map.pts.set(e.pointerId, [e.clientX, e.clientY]); map.pinch = 0; });
  s.addEventListener('pointermove', e => {
    if (!map.pts.has(e.pointerId)) return;
    const prev = map.pts.get(e.pointerId); map.pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (map.pts.size === 2) {  // pinch
      const [a, b] = [...map.pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (map.pinch) { const p = toSvg((a[0] + b[0]) / 2, (a[1] + b[1]) / 2); zoomMap(map.pinch / d, p.x, p.y); }
      map.pinch = d; return;
    }
    const k = Math.max(map.vb[2] / s.clientWidth, map.vb[3] / s.clientHeight);
    setView([map.vb[0] - (e.clientX - prev[0]) * k, map.vb[1] - (e.clientY - prev[1]) * k, map.vb[2], map.vb[3]]);
  });
  const up = e => { map.pts.delete(e.pointerId); map.pinch = 0; };
  s.addEventListener('pointerup', up); s.addEventListener('pointercancel', up);
  return s;
}

function setView(vb) {
  let [x, y, w, h] = vb;
  x = Math.min(Math.max(x, -w / 2), 1701 - w / 2);  // keep at least half the map in view
  y = Math.min(Math.max(y, -h / 2), 2000 - h / 2);
  map.vb = [x, y, w, h];
  map.svg.setAttribute('viewBox', map.vb.join(' '));
}

function zoomMap(f, cx, cy) {
  const [x, y, w, h] = map.vb, nw = w * f, nh = h * f;
  if (nw < 160 || (f > 1 && nw > 1701 * 1.4 && nh > 2000 * 1.4)) return;
  if (cx == null) { cx = x + w / 2; cy = y + h / 2; }
  setView([cx - (cx - x) * f, cy - (cy - y) * f, nw, nh]);
}

async function showMap(room) {
  const box = $('#pmap');
  box.querySelectorAll('.mapnote').forEach(n => n.remove());
  if (!room || !state.buildings) { box.hidden = true; return; }
  box.hidden = false;
  $('#tour').href = state.buildings.virtual_tour;
  const s = await ensureMap();
  s.querySelectorAll('.cm-b.on').forEach(g => g.classList.remove('on'));
  const b = state.buildings.buildings[room[0]], el = s.querySelector('#b-' + room[0]);
  let [x, y, w, h] = MAPV.central;
  if (b && el) {
    el.classList.add('on');
    const r = el.getBBox(), x1 = Math.max(x + w, r.x + r.width + 40), y1 = Math.max(y + h, r.y + r.height + 40);
    x = Math.min(x, r.x - 40); y = Math.min(y, r.y - 40); w = x1 - x; h = y1 - y;  // widen only if outside the centre
    box.insertAdjacentHTML('afterbegin', `<p class="mapnote"><b>Phòng ${esc(room)}</b> ở ${esc(b.label)}${b.note ? ' (' + esc(b.note) + ')' : ''}.</p>`);
  } else {
    box.insertAdjacentHTML('afterbegin', `<p class="mapnote">Tòa ${esc(room[0])} chưa có trên bản đồ 2D. Dùng bản đồ 3D để tìm đường.</p>`);
  }
  setView([x, y, w, h]);
}
$('#mapin').addEventListener('click', () => zoomMap(1 / 1.4));
$('#mapout').addEventListener('click', () => zoomMap(1.4));
$('#mapfit').addEventListener('click', () => setView([...MAPV.full]));
$('#mapcenter').addEventListener('click', () => setView([...MAPV.central]));
function closePanel() { $('#scrim').hidden = true; $('#panel').hidden = true; }

const sessionHint = x => /^(LEC|LAB) \d+$/.test(x.title) ? x.title : `${Number(hm(x.start).slice(0, 2)) < 12 ? 'sáng' : 'chiều'} ${dm(x.start)}`;
const outlookLink = (to, subject, body) => `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(to)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

async function copy(text, btn) {
  try { await navigator.clipboard.writeText(text); const t = btn.innerHTML; btn.textContent = 'Đã chép'; setTimeout(() => btn.innerHTML = t, 1400); }
  catch (e) { window.prompt('Sao chép:', text); }
}

async function submitLeave(ev) {
  ev.preventDefault();
  const x = state.current, btn = $('#draftbtn'), out = $('#result');
  btn.disabled = true; btn.innerHTML = '<span class="spin" aria-hidden="true"></span>Đang soạn…';
  out.innerHTML = '';
  try {
    const r = await post('/api/leave', {session: sessionHint(x), reason: $('#reason').value, evidence_type: $('#evidence').value});
    if (r.status !== 'ready') {
      out.innerHTML = `<div class="ask ${r.status === 'refuse' ? 'refuse' : ''}">${esc(r.question)}</div>`;
    } else {
      const e = r.email;
      out.innerHTML = `<div class="draft">
        <p class="basis">AI soạn dựa trên: ${r.based_on.map(esc).join('; ')}. Kiểm tra và sửa trước khi gửi.</p>
        <p class="to">${e.to ? `Gửi tới: <b>${esc(e.to)}</b>` : 'Chưa cấu hình người nhận (LEAVE_RECIPIENT). Nhập địa chỉ giáo vụ trong Outlook trước khi gửi.'}</p>
        <div class="field"><label for="dsub">Tiêu đề</label><input id="dsub" value="${esc(e.subject)}"></div>
        <div class="field"><label for="dbody">Nội dung</label><textarea id="dbody" rows="11">${esc(e.body)}</textarea></div>
        <p class="remind">${icon('i-alert')}Nhớ đính kèm minh chứng trong Outlook trước khi gửi.</p>
        <div class="actions">
          <a class="btn primary" id="olk" target="_blank" rel="noopener">${icon('i-mail')}Mở trong Outlook</a>
          <button class="btn" id="cpsub" type="button">${icon('i-copy')}Chép tiêu đề</button>
          <button class="btn" id="cpbody" type="button">${icon('i-copy')}Chép nội dung</button>
        </div>
        <p class="meta">${esc(r.usage.model)} · ${r.usage.tokens_in}/${r.usage.tokens_out} token. App không tự gửi email.</p></div>`;
      const sync = () => $('#olk').href = outlookLink(e.to, $('#dsub').value, $('#dbody').value);
      sync(); $('#dsub').addEventListener('input', sync); $('#dbody').addEventListener('input', sync);
      $('#cpsub').addEventListener('click', ev2 => copy($('#dsub').value, ev2.currentTarget));
      $('#cpbody').addEventListener('click', ev2 => copy($('#dbody').value, ev2.currentTarget));
    }
  } catch (e) { out.innerHTML = `<p class="msg err">${esc(e.message)}</p>`; }
  finally { btn.disabled = false; btn.innerHTML = `${icon('i-spark')}Soạn email bằng AI`; }
}

/* ---------- Settings: Phoenix, push, sync, share, ingest ---------- */
async function loadCalendarLinks() {
  try {
    const l = await api('/api/calendar-links');
    $('#gcal').href = l.google; $('#ocal').href = l.outlook; $('#copyics').dataset.url = l.ics;
  } catch (e) {}
}

const b64ToBytes = s => { const p = '='.repeat((4 - s.length % 4) % 4); const b = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(b, c => c.charCodeAt(0)); };

async function enablePush() {
  const msg = $('#pushmsg'); msg.className = 'msg';
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    msg.className = 'msg err'; msg.textContent = 'Trình duyệt này chưa hỗ trợ thông báo đẩy. Trên iPhone: thêm app vào Màn hình chính rồi mở từ đó.'; return;
  }
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') { msg.className = 'msg err'; msg.textContent = 'Bạn chưa cho phép thông báo. Bật lại trong cài đặt trình duyệt.'; return; }
  try {
    const reg = await navigator.serviceWorker.ready;
    const {key} = await api('/api/push/key');
    const sub = await reg.pushManager.getSubscription() || await reg.pushManager.subscribe({userVisibleOnly: true, applicationServerKey: b64ToBytes(key)});
    await post('/api/push/subscribe', {sub: sub.toJSON()});
    msg.className = 'msg ok'; msg.textContent = 'Đã bật thông báo trên thiết bị này.';
    $('#pushon').hidden = true; $('#pushtest').hidden = false;
  } catch (e) { msg.className = 'msg err'; msg.textContent = 'Không bật được thông báo: ' + e.message; }
}

async function pushState() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || Notification.permission !== 'granted') return;
  const reg = await navigator.serviceWorker.ready, sub = await reg.pushManager.getSubscription();
  if (sub) { $('#pushon').hidden = true; $('#pushtest').hidden = false; $('#pushmsg').className = 'msg ok'; $('#pushmsg').textContent = 'Thông báo đang bật trên thiết bị này.'; }
}

/* ---------- Start ---------- */
async function start(sid) {
  state.sid = sid.trim().toUpperCase(); state.share = null;
  state.day = iso(new Date()); state.monday = mondayOf(new Date());
  if (!(await loadWeek())) {
    $('#grid').innerHTML = ''; $('#whomsg').className = 'msg err';
    $('#whomsg').textContent = 'Không tìm thấy mã học viên này trong thời khoá biểu hiện tại.';
    return false;
  }
  $('#empty').hidden = true; $('#app').hidden = false; $('#tabbar').hidden = false;
  $('#whochip').hidden = false; $('#whoid').textContent = state.sid;
  loadCalendarLinks(); pushState();
  return true;
}

/* ---------- First run: no timetable yet ---------- */
async function loadSetup() {
  try { state.setup = await api('/api/setup/status'); } catch (e) { return; }
  const empty = !state.setup.timetable;
  $('#setup').hidden = !empty;
  $('#whoh').textContent = empty ? 'Bước 2: xem lịch của bạn' : 'Xem lịch của bạn';
}
$('#setup').addEventListener('submit', async e => {
  e.preventDefault();
  const msg = $('#setupmsg'), f = $('#setupfile').files[0];
  if (!f) return;
  const fd = new FormData(); fd.append('file', f);
  msg.className = 'msg'; msg.textContent = 'Đang đọc file…';
  try {
    const r = await api('/api/setup/timetable', {method: 'POST', body: fd});
    msg.className = 'msg ok';
    msg.textContent = r.new ? `Đã tải: ${r.students} học viên. Giờ nhập mã học viên của bạn ở dưới.` : 'Bản này đã có sẵn, không có gì thay đổi.';
    await loadSetup(); $('#setup').hidden = false; $('#whomsg').textContent = '';
    $('#sid').focus();
  } catch (err) { msg.className = 'msg err'; msg.textContent = err.message; }
});

async function startShared(token) {
  state.share = token; state.sid = null; state.day = iso(new Date()); state.monday = mondayOf(new Date());
  $('#empty').hidden = true; $('#app').hidden = false;
  $('#caidat').hidden = true; $('#summary').hidden = true;
  if (await loadWeek()) {
    $('#sharebanner').hidden = false;
    $('#sharebanner').innerHTML = `${icon('i-share')}<span>Bạn đang xem lịch của <b>${esc(state.week.owner || 'một thành viên')}</b> (chỉ xem). <a href="/">Mở lịch của bạn</a></span>`;
  }
}

/* ---------- Sign-in ---------- */
$('#stafftoggle').addEventListener('click', () => { $('#who').hidden = true; $('#setup').hidden = true; $('#stafflogin').hidden = false; $('#uname').focus(); });
$('#studenttoggle').addEventListener('click', () => { $('#stafflogin').hidden = true; $('#who').hidden = false; loadSetup(); });
$('#who').addEventListener('submit', async e => {
  e.preventDefault();
  const msg = $('#whomsg');
  msg.className = 'msg'; msg.textContent = 'Đang mở lịch…';
  let me;
  try { me = await post('/api/student/enter', {student_id: $('#sid').value.trim(), team: $('#team0').value.trim()}); }
  catch (err) {
    msg.className = 'msg err';
    msg.textContent = state.setup && !state.setup.timetable ? 'App chưa có thời khoá biểu. Tải file thời khoá biểu ở bước 1 trước.'
      : err.message + ' Nếu thời khoá biểu đã cũ, admin cần tải bản mới.';
    return;
  }
  msg.textContent = '';
  if (!(await onStudent(me))) return;
  const url = $('#phx0').value.trim();  // optional Phoenix link: a bad link warns but never blocks the schedule
  if (!url) return;
  try {
    const r = await post('/api/phoenix', {url});
    $('#phx0').value = '';
    await loadWeek();
    $('#notices').insertAdjacentHTML('afterbegin', `<div class="notice info">${icon('i-link')}<span>Đã kết nối lịch Phoenix: ${r.events} sự kiện.</span></div>`);
  } catch (err) {
    $('#notices').insertAdjacentHTML('afterbegin', `<div class="notice warn">${icon('i-alert')}<span>Chưa kết nối được lịch Phoenix: ${esc(err.message)} Thử lại trong <a href="#caidat">Cài đặt</a>.</span></div>`);
  }
});
$('#stafflogin').addEventListener('submit', async e => {
  e.preventDefault();
  const msg = $('#stafmsg');
  msg.className = 'msg'; msg.textContent = 'Đang đăng nhập…';
  try {
    const me = await post('/api/auth/login', {username: $('#uname').value.trim(), password: $('#pw').value});
    $('#pw').value = ''; msg.textContent = ''; onStaff(me);
  } catch (err) { msg.className = 'msg err'; msg.textContent = err.message; }
});
$('#pwform').addEventListener('submit', async e => {
  e.preventDefault();
  try {
    await post('/api/auth/password', {old: $('#pwold').value, new: $('#pwnew').value});
    $('#pwform').hidden = true; onStaff(await api('/api/auth/me'));
  } catch (err) { $('#pwmsg').className = 'msg err'; $('#pwmsg').textContent = err.message; }
});
$('#switch').addEventListener('click', async () => {
  try { await post(state.staff ? '/api/auth/logout' : '/api/student/exit', {}); } catch (e) {}
  location.hash = ''; location.reload();
});

function showTeam(me) {
  $('#teamstate').innerHTML = me.team
    ? `Bạn đang ở <b>${esc(me.team)}</b>${me.team_set_by === 'phoenix' ? ' (lấy từ lịch Phoenix)' : ''}. Lịch mentor duty và thay đổi của mentor sẽ theo nhóm này.`
    : 'Chưa có nhóm. Khi được chia nhóm, nhập số nhóm để nhận lịch và thông báo mentor duty.';
  $('#teamin').value = me.team ? me.team.replace(/\D/g, '') : '';
}
$('#teamform').addEventListener('submit', async e => {
  e.preventDefault();
  try {
    const me = await api('/api/student/team', {method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({team: $('#teamin').value.trim()})});
    showTeam(me); $('#teammsg').className = 'msg ok'; $('#teammsg').textContent = me.team ? 'Đã lưu.' : 'Đã xoá số nhóm.';
    loadWeek();
  } catch (err) { $('#teammsg').className = 'msg err'; $('#teammsg').textContent = err.message; }
});

async function onStudent(me) {
  state.staff = false;
  $('#setup').hidden = true; $('#caidat .admin').hidden = true;
  showTeam(me);
  return start(me.student_id);
}

function onStaff(me) {
  state.staff = true; state.me = me;
  $('#who').hidden = true; $('#stafflogin').hidden = true; $('#setup').hidden = true;
  $('#whochip').hidden = false; $('#whoid').textContent = me.username; $('#switch').textContent = 'Đăng xuất';
  if (me.must_change) { $('#pwform').hidden = false; return; }
  $('#staff').hidden = false;
  $('#staffh').textContent = me.role === 'admin' ? 'Tài khoản admin' : 'Tài khoản mentor';
  $('#stafftext').textContent = me.role === 'admin'
    ? `Xin chào ${me.display_name}. Bạn có thể cập nhật thời khoá biểu, sửa buổi học và quản lý tài khoản mentor.`
    : `Xin chào ${me.display_name}. Bạn phụ trách: ${me.teams.join(', ') || 'chưa được gán nhóm'}.`;
}
$('#prev').addEventListener('click', () => go(state.view === 'day' ? addDays(state.day, -1) : addDays(state.monday, -7)));
$('#next').addEventListener('click', () => go(state.view === 'day' ? addDays(state.day, 1) : addDays(state.monday, 7)));
$('#today').addEventListener('click', () => go(iso(new Date())));
document.querySelectorAll('.segbtn').forEach(b => b.addEventListener('click', () => { state.view = b.dataset.view; ls.set('view', state.view); render(); }));
state.view = ls.get('view') === 'week' ? 'week' : 'day';
setInterval(() => { if (state.week) render(); }, 60000);  // drop items as they end
$('#close').addEventListener('click', closePanel);
$('#scrim').addEventListener('click', closePanel);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#panel').hidden) closePanel(); });
$('#leaveform').addEventListener('submit', submitLeave);
$('#sumbtn').addEventListener('click', loadSummary);
document.querySelectorAll('.fchip').forEach(b => b.addEventListener('click', () => {
  const f = b.dataset.f, on = !state.filters.has(f);
  on ? state.filters.add(f) : state.filters.delete(f);
  b.classList.toggle('on', on); b.setAttribute('aria-pressed', on);
  render();
}));
$('#team').addEventListener('change', e => { state.team = e.target.value; render(); });
$('#pushon').addEventListener('click', enablePush);
$('#pushtest').addEventListener('click', async () => {
  try { const r = await post('/api/push/test', {}); $('#pushmsg').className = 'msg ok'; $('#pushmsg').textContent = `Đã gửi tới ${r.sent} thiết bị.`; }
  catch (e) { $('#pushmsg').className = 'msg err'; $('#pushmsg').textContent = e.message; }
});
$('#copyics').addEventListener('click', e => copy(e.currentTarget.dataset.url || '', e.currentTarget));
$('#sharebtn').addEventListener('click', async e => {
  try {
    const r = await api('/api/share');
    $('#sharemsg').className = 'msg ok'; $('#sharemsg').innerHTML = `Link: <code>${esc(r.url)}</code>`;
    if (navigator.share) { navigator.share({title: 'Lịch AI20K của mình', url: r.url}).catch(() => {}); } else { copy(r.url, e.currentTarget); }
  } catch (err) { $('#sharemsg').className = 'msg err'; $('#sharemsg').textContent = err.message; }
});
$('#phxform').addEventListener('submit', async e => {
  e.preventDefault();
  const msg = $('#phxmsg'); msg.className = 'msg'; msg.textContent = 'Đang tải lịch Phoenix…';
  try {
    const r = await post('/api/phoenix', {url: $('#phxurl').value});
    msg.className = 'msg ok'; msg.textContent = `Đã kết nối: ${r.events} sự kiện.`; $('#phxurl').value = '';
    loadWeek();
  } catch (err) { msg.className = 'msg err'; msg.textContent = err.message; }
});
$('#ingest').addEventListener('submit', async e => {
  e.preventDefault();
  const msg = $('#ingmsg'), f = $('#tkbfile').files[0];
  if (!f) return;
  const fd = new FormData(); fd.append('file', f);
  msg.className = 'msg'; msg.textContent = 'Đang xử lý…';
  try {
    const r = await api('/api/admin/ingest', {method: 'POST', body: fd});
    msg.className = 'msg ok';
    msg.textContent = r.new ? `Đã cập nhật: ${r.students} học viên, ${r.room_changes} phòng thay đổi.` : 'Bản này đã có, không có gì thay đổi.';
    if (state.sid) loadWeek();
  } catch (err) { msg.className = 'msg err'; msg.textContent = err.message; }
});

if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
api('/api/buildings').then(b => state.buildings = b).catch(() => {});
const shareTok = (location.hash.match(/^#share-([\w-]+)$/) || [])[1];
if (shareTok) startShared(shareTok);
else loadSetup().then(() => api('/api/student/me').then(onStudent).catch(() => api('/api/auth/me').then(onStaff).catch(() => {})));
