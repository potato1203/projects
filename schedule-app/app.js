/* ─── State ───────────────────────────────────────────────────────── */
const COLORS = [
  '#6366f1','#818cf8','#22c55e','#ef4444','#f59e0b',
  '#06b6d4','#ec4899','#8b5cf6','#14b8a6','#f97316'
];

let state = {
  events: [],
  categories: [],
  view: 'month',
  cursor: new Date(),   // current nav position
  activeCategories: new Set(), // empty = show all
  search: '',
  editingEventId: null,
  editingCatId: null,
};

/* ─── Persistence ────────────────────────────────────────────────── */
function save() {
  localStorage.setItem('sched_events', JSON.stringify(state.events));
  localStorage.setItem('sched_cats',   JSON.stringify(state.categories));
}

function load() {
  try {
    state.events     = JSON.parse(localStorage.getItem('sched_events') || '[]');
    state.categories = JSON.parse(localStorage.getItem('sched_cats')   || '[]');
  } catch { state.events = []; state.categories = []; }

  if (!state.categories.length) {
    state.categories = [
      { id: uid(), name: 'Work',     color: COLORS[0] },
      { id: uid(), name: 'Personal', color: COLORS[2] },
      { id: uid(), name: 'Health',   color: COLORS[3] },
    ];
    save();
  }
}

/* ─── Utilities ──────────────────────────────────────────────────── */
function uid() { return Math.random().toString(36).slice(2,10) + Date.now().toString(36); }

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' });
}
function fmtTime(d) {
  return new Date(d).toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' });
}
function fmtDateTime(d) { return `${fmtDate(d)} · ${fmtTime(d)}`; }

function startOfDay(d) {
  const x = new Date(d); x.setHours(0,0,0,0); return x;
}
function sameDay(a, b) {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}
function isToday(d) { return sameDay(d, new Date()); }

function toLocalISO(d) {
  const dt = new Date(d);
  const pad = n => String(n).padStart(2,'0');
  return `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

function catColor(catId) {
  return (state.categories.find(c => c.id === catId) || {}).color || '#6366f1';
}
function catName(catId) {
  return (state.categories.find(c => c.id === catId) || {}).name || '';
}

function eventsForDay(date) {
  const day = startOfDay(date).getTime();
  return state.events.filter(e => {
    const eStart = startOfDay(new Date(e.start)).getTime();
    const eEnd   = startOfDay(new Date(e.end)).getTime();
    return day >= eStart && day <= eEnd;
  }).filter(e => {
    if (state.activeCategories.size && !state.activeCategories.has(e.categoryId)) return false;
    return true;
  });
}

function getEventCountsByDay(events) {
  const map = {};
  events.forEach(e => {
    const key = startOfDay(new Date(e.start)).toDateString();
    map[key] = (map[key] || 0) + 1;
  });
  return map;
}

/* ─── DOM Refs ───────────────────────────────────────────────────── */
const $ = id => document.getElementById(id);
const calendarArea   = $('calendarArea');
const currentLabel   = $('currentLabel');
const modalOverlay   = $('modalOverlay');
const catModalOverlay= $('catModalOverlay');
const eventPopover   = $('eventPopover');

/* ─── Render ─────────────────────────────────────────────────────── */
function render() {
  renderMiniCal();
  renderCategoryList();
  renderLabel();
  if (state.search) {
    renderSearch();
  } else {
    switch (state.view) {
      case 'month':  renderMonth(); break;
      case 'week':   renderWeek();  break;
      case 'day':    renderDay();   break;
      case 'agenda': renderAgenda();break;
    }
  }
}

/* ── Mini Calendar ── */
function renderMiniCal() {
  const mini = $('miniCal');
  const d = new Date(state.cursor);
  const year = d.getFullYear(), month = d.getMonth();

  const first = new Date(year, month, 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const daysInPrev  = new Date(year, month,   0).getDate();

  const countMap = getEventCountsByDay(state.events);

  let html = `<div class="mini-cal-header">
    <button id="miniPrev">&#8249;</button>
    <span>${first.toLocaleDateString('en-US',{month:'short',year:'numeric'})}</span>
    <button id="miniNext">&#8250;</button>
  </div><div class="mini-cal-grid">`;

  ['S','M','T','W','T','F','S'].forEach(n => html += `<span class="day-name">${n}</span>`);

  let cells = [];
  for (let i = startDow-1; i >= 0; i--)
    cells.push({ d: new Date(year, month-1, daysInPrev-i), other: true });
  for (let i = 1; i <= daysInMonth; i++)
    cells.push({ d: new Date(year, month, i), other: false });
  while (cells.length % 7) cells.push({ d: new Date(year, month+1, cells.length - daysInMonth - startDow + 1), other: true });

  cells.forEach(({d: day, other}) => {
    const todayCls  = isToday(day) ? ' today' : '';
    const otherCls  = other ? ' other-month' : '';
    const hasCls    = countMap[startOfDay(day).toDateString()] ? ' has-events' : '';
    const selCls    = sameDay(day, state.cursor) ? ' selected' : '';
    html += `<div class="mini-day${todayCls}${otherCls}${hasCls}${selCls}" data-date="${day.toISOString()}">${day.getDate()}</div>`;
  });

  html += '</div>';
  mini.innerHTML = html;

  mini.addEventListener('click', e => {
    const el = e.target.closest('.mini-day');
    if (el) { state.cursor = new Date(el.dataset.date); state.view='day'; updateViewBtns(); render(); return; }
    if (e.target.id === 'miniPrev') { state.cursor = new Date(year, month-1, 1); render(); }
    if (e.target.id === 'miniNext') { state.cursor = new Date(year, month+1, 1); render(); }
  });
}

/* ── Category List ── */
function renderCategoryList() {
  const ul = $('categoryList');
  ul.innerHTML = state.categories.map(cat => {
    const count = state.events.filter(e => e.categoryId === cat.id).length;
    const active = state.activeCategories.has(cat.id) ? ' active' : '';
    return `<li class="cat-item${active}" data-catid="${cat.id}">
      <span class="cat-dot" style="background:${cat.color}"></span>
      <span class="cat-name">${esc(cat.name)}</span>
      <span class="cat-count">${count}</span>
    </li>`;
  }).join('');

  ul.querySelectorAll('.cat-item').forEach(li => {
    li.addEventListener('click', e => {
      const id = li.dataset.catid;
      if (state.activeCategories.has(id)) state.activeCategories.delete(id);
      else state.activeCategories.add(id);
      render();
    });
    li.addEventListener('dblclick', () => openCatModal(li.dataset.catid));
  });
}

/* ── Header Label ── */
function renderLabel() {
  const d = state.cursor;
  if (state.view === 'month')
    currentLabel.textContent = d.toLocaleDateString('en-US',{month:'long',year:'numeric'});
  else if (state.view === 'week') {
    const mon = mondayOf(d);
    const sun = new Date(mon); sun.setDate(sun.getDate()+6);
    currentLabel.textContent = `${mon.toLocaleDateString('en-US',{month:'short',day:'numeric'})} – ${sun.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}`;
  } else if (state.view === 'day') {
    currentLabel.textContent = d.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'});
  } else {
    currentLabel.textContent = 'Agenda';
  }
}

/* ── Month ── */
function renderMonth() {
  const d = state.cursor;
  const year = d.getFullYear(), month = d.getMonth();
  const first = new Date(year, month, 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const daysInPrev  = new Date(year, month,   0).getDate();

  let cells = [];
  for (let i = startDow-1; i >= 0; i--)
    cells.push({ d: new Date(year, month-1, daysInPrev-i), other: true });
  for (let i = 1; i <= daysInMonth; i++)
    cells.push({ d: new Date(year, month, i), other: false });
  while (cells.length % 7) {
    const last = cells[cells.length-1].d;
    const next = new Date(last); next.setDate(next.getDate()+1);
    cells.push({ d: next, other: true });
  }

  const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  let html = `<div class="month-grid"><div class="month-header">
    ${DAY_NAMES.map(n=>`<span>${n}</span>`).join('')}
  </div><div class="month-body">`;

  cells.forEach(({d: day, other}) => {
    const todayCls  = isToday(day) ? ' today' : '';
    const otherCls  = other ? ' other-month' : '';
    const evts = eventsForDay(day);
    const maxShow = 3;
    let evtHtml = evts.slice(0, maxShow).map(e =>
      `<div class="cell-event" style="background:${catColor(e.categoryId)}" data-evtid="${e.id}">${esc(e.title)}</div>`
    ).join('');
    if (evts.length > maxShow)
      evtHtml += `<div class="more-events">+${evts.length - maxShow} more</div>`;

    html += `<div class="month-cell${todayCls}${otherCls}" data-date="${day.toISOString()}">
      <div class="cell-date">${day.getDate()}</div>
      <div class="cell-events">${evtHtml}</div>
    </div>`;
  });

  html += '</div></div>';
  calendarArea.innerHTML = html;

  calendarArea.addEventListener('click', e => {
    const evtEl = e.target.closest('.cell-event');
    if (evtEl) { e.stopPropagation(); showPopover(evtEl.dataset.evtid, evtEl); return; }
    const cell = e.target.closest('.month-cell');
    if (cell) {
      const dt = new Date(cell.dataset.date);
      dt.setHours(9,0,0,0);
      openEventModal(null, dt);
    }
  });
}

/* ── Week ── */
function mondayOf(d) {
  const x = new Date(d);
  const dow = x.getDay(); // 0=sun
  const diff = (dow === 0) ? -6 : 1 - dow;
  x.setDate(x.getDate() + diff);
  x.setHours(0,0,0,0);
  return x;
}

function renderWeek() {
  const mon = mondayOf(state.cursor);
  const days = Array.from({length:7}, (_,i) => { const d = new Date(mon); d.setDate(d.getDate()+i); return d; });

  const HOURS = Array.from({length:24}, (_,i) => i);
  const DAY_SHORT = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  let html = `<div class="week-grid">
    <div class="week-time-col"><div style="height:48px;border-bottom:1px solid var(--border)"></div>
      <div class="week-time-col-inner">`;
  HOURS.forEach(h => {
    const label = h === 0 ? '' : (h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h-12} PM`);
    html += `<div class="week-time-slot">${label}</div>`;
  });
  html += '</div></div>';

  days.forEach((day, i) => {
    const todayCls = isToday(day) ? ' today-col' : '';
    const evts = eventsForDay(day).filter(e => !e.allDay);
    html += `<div class="week-day-col" data-date="${day.toISOString()}">
      <div class="week-day-header${todayCls}">
        <span style="font-size:10px;color:var(--text2)">${DAY_SHORT[i]}</span>
        <span class="week-day-num">${day.getDate()}</span>
      </div>`;
    HOURS.forEach(h => {
      html += `<div class="week-hour-row" data-date="${day.toISOString()}" data-hour="${h}"></div>`;
    });
    // overlay events
    html += `<div class="week-events-overlay">`;
    evts.forEach(e => {
      const start = new Date(e.start), end = new Date(e.end);
      const sMin = start.getHours()*60 + start.getMinutes();
      const eMin = end.getHours()*60 + end.getMinutes();
      const top = 48 + (sMin / 60) * 60;
      const height = Math.max(((eMin - sMin) / 60) * 60, 20);
      html += `<div class="week-event" style="top:${top}px;height:${height}px;background:${catColor(e.categoryId)}" data-evtid="${e.id}">
        ${esc(e.title)}
      </div>`;
    });
    // Now line
    if (isToday(day)) {
      const now = new Date();
      const nowMin = now.getHours()*60 + now.getMinutes();
      const nowTop = 48 + (nowMin/60)*60;
      html += `<div class="week-now-line" style="top:${nowTop}px"></div>`;
    }
    html += '</div></div>';
  });

  html += '</div>';
  calendarArea.innerHTML = html;

  // Scroll to 7am
  setTimeout(() => {
    calendarArea.scrollTop = 7 * 60;
  }, 0);

  calendarArea.addEventListener('click', e => {
    const evtEl = e.target.closest('.week-event');
    if (evtEl) { e.stopPropagation(); showPopover(evtEl.dataset.evtid, evtEl); return; }
    const row = e.target.closest('.week-hour-row');
    if (row) {
      const dt = new Date(row.dataset.date);
      dt.setHours(parseInt(row.dataset.hour), 0, 0, 0);
      openEventModal(null, dt);
    }
  });
}

/* ── Day ── */
function renderDay() {
  const d = state.cursor;
  const HOURS = Array.from({length:24}, (_,i) => i);
  const todayLabel = d.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
  const evts = eventsForDay(d).filter(e => !e.allDay);

  let html = `<div class="day-grid">
    <div class="week-time-col"><div style="height:60px;border-bottom:1px solid var(--border)"></div>
      <div class="week-time-col-inner">`;
  HOURS.forEach(h => {
    const label = h === 0 ? '' : (h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h-12} PM`);
    html += `<div class="week-time-slot">${label}</div>`;
  });
  html += `</div></div>
    <div class="day-col" data-date="${d.toISOString()}">
      <div class="day-col-header">${todayLabel}</div>`;

  HOURS.forEach(h => {
    html += `<div class="week-hour-row" data-date="${d.toISOString()}" data-hour="${h}"></div>`;
  });

  html += `<div class="day-events-overlay">`;
  evts.forEach(e => {
    const start = new Date(e.start), end = new Date(e.end);
    const sMin = start.getHours()*60 + start.getMinutes();
    const eMin = end.getHours()*60 + end.getMinutes();
    const top = 60 + (sMin/60)*60;
    const height = Math.max(((eMin-sMin)/60)*60, 24);
    html += `<div class="day-event" style="top:${top}px;height:${height}px;background:${catColor(e.categoryId)}" data-evtid="${e.id}">
      <strong>${esc(e.title)}</strong>
      <div style="font-size:10px;opacity:.8">${fmtTime(start)} – ${fmtTime(end)}</div>
    </div>`;
  });

  if (isToday(d)) {
    const now = new Date();
    const nowMin = now.getHours()*60 + now.getMinutes();
    const nowTop = 60 + (nowMin/60)*60;
    html += `<div class="week-now-line" style="top:${nowTop}px"></div>`;
  }

  html += '</div></div></div>';
  calendarArea.innerHTML = html;

  setTimeout(() => { calendarArea.scrollTop = 7*60; }, 0);

  calendarArea.addEventListener('click', e => {
    const evtEl = e.target.closest('.day-event');
    if (evtEl) { e.stopPropagation(); showPopover(evtEl.dataset.evtid, evtEl); return; }
    const row = e.target.closest('.week-hour-row');
    if (row) {
      const dt = new Date(row.dataset.date);
      dt.setHours(parseInt(row.dataset.hour), 0, 0, 0);
      openEventModal(null, dt);
    }
  });
}

/* ── Agenda ── */
function renderAgenda() {
  const today = startOfDay(new Date());
  const sorted = [...state.events]
    .filter(e => {
      if (state.activeCategories.size && !state.activeCategories.has(e.categoryId)) return false;
      return new Date(e.end) >= today;
    })
    .sort((a,b) => new Date(a.start) - new Date(b.start));

  if (!sorted.length) {
    calendarArea.innerHTML = `<div class="agenda-view"><p class="agenda-empty">No upcoming events. Click + New to create one.</p></div>`;
    return;
  }

  // Group by day
  const groups = {};
  sorted.forEach(e => {
    const key = startOfDay(new Date(e.start)).toDateString();
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  });

  let html = '<div class="agenda-view">';
  Object.entries(groups).forEach(([key, evts]) => {
    const day = new Date(key);
    const todayCls = isToday(day) ? ' today-agenda' : '';
    html += `<div class="agenda-day">
      <div class="agenda-day-header${todayCls}">
        <span class="agenda-date-badge">${day.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}</span>
      </div>`;
    evts.forEach(e => {
      const timeStr = e.allDay ? 'All day' : `${fmtTime(e.start)} – ${fmtTime(e.end)}`;
      html += `<div class="agenda-event" data-evtid="${e.id}">
        <div class="agenda-event-color" style="background:${catColor(e.categoryId)}"></div>
        <div class="agenda-event-info">
          <div class="agenda-event-title">${esc(e.title)}</div>
          <div class="agenda-event-time">${timeStr} · ${esc(catName(e.categoryId))}</div>
          ${e.notes ? `<div class="agenda-event-notes">${esc(e.notes)}</div>` : ''}
        </div>
      </div>`;
    });
    html += '</div>';
  });
  html += '</div>';
  calendarArea.innerHTML = html;

  calendarArea.querySelectorAll('.agenda-event').forEach(el => {
    el.addEventListener('click', () => showPopover(el.dataset.evtid, el));
  });
}

/* ── Search ── */
function renderSearch() {
  const q = state.search.toLowerCase();
  const results = state.events.filter(e =>
    e.title.toLowerCase().includes(q) ||
    (e.notes||'').toLowerCase().includes(q) ||
    catName(e.categoryId).toLowerCase().includes(q)
  ).sort((a,b) => new Date(a.start)-new Date(b.start));

  let html = `<div class="search-results"><p class="section-label" style="margin-bottom:12px">${results.length} result${results.length!==1?'s':''} for "${esc(state.search)}"</p>`;
  if (!results.length) html += `<p style="color:var(--text2);font-size:13px">No events found.</p>`;
  results.forEach(e => {
    html += `<div class="search-result-item" data-evtid="${e.id}">
      <div style="width:10px;height:10px;border-radius:50%;background:${catColor(e.categoryId)};flex-shrink:0"></div>
      <div>
        <div style="font-size:13px;font-weight:600">${esc(e.title)}</div>
        <div style="font-size:11px;color:var(--text2)">${fmtDate(e.start)} · ${esc(catName(e.categoryId))}</div>
      </div>
    </div>`;
  });
  html += '</div>';
  calendarArea.innerHTML = html;

  calendarArea.querySelectorAll('.search-result-item').forEach(el => {
    el.addEventListener('click', () => showPopover(el.dataset.evtid, el));
  });
}

/* ─── Event Modal ────────────────────────────────────────────────── */
function openEventModal(eventId, defaultDate) {
  closePopover();
  state.editingEventId = eventId || null;
  $('modalTitle').textContent = eventId ? 'Edit Event' : 'New Event';
  $('btnDeleteEvt').style.display = eventId ? '' : 'none';

  // Populate category dropdown
  const sel = $('evtCategory');
  sel.innerHTML = state.categories.map(c =>
    `<option value="${c.id}">${esc(c.name)}</option>`
  ).join('');

  if (eventId) {
    const e = state.events.find(x => x.id === eventId);
    $('evtTitle').value   = e.title;
    $('evtStart').value   = toLocalISO(e.start);
    $('evtEnd').value     = toLocalISO(e.end);
    $('evtCategory').value= e.categoryId;
    $('evtRepeat').value  = e.repeat || 'none';
    $('evtNotes').value   = e.notes || '';
    $('evtAllDay').checked= !!e.allDay;
  } else {
    const start = defaultDate || new Date();
    const end   = new Date(start); end.setHours(end.getHours()+1);
    $('evtTitle').value   = '';
    $('evtStart').value   = toLocalISO(start);
    $('evtEnd').value     = toLocalISO(end);
    $('evtCategory').value= state.categories[0]?.id || '';
    $('evtRepeat').value  = 'none';
    $('evtNotes').value   = '';
    $('evtAllDay').checked= false;
  }

  modalOverlay.classList.add('open');
  setTimeout(() => $('evtTitle').focus(), 100);
}

function closeEventModal() { modalOverlay.classList.remove('open'); }

function saveEvent() {
  const title = $('evtTitle').value.trim();
  if (!title) { $('evtTitle').focus(); return; }

  const start = new Date($('evtStart').value);
  let end     = new Date($('evtEnd').value);
  if (end <= start) { end = new Date(start); end.setHours(end.getHours()+1); }

  const data = {
    title,
    start:      start.toISOString(),
    end:        end.toISOString(),
    categoryId: $('evtCategory').value,
    repeat:     $('evtRepeat').value,
    notes:      $('evtNotes').value.trim(),
    allDay:     $('evtAllDay').checked,
  };

  if (state.editingEventId) {
    const idx = state.events.findIndex(e => e.id === state.editingEventId);
    state.events[idx] = { ...state.events[idx], ...data };
  } else {
    state.events.push({ id: uid(), ...data });
  }

  save();
  closeEventModal();
  render();
}

function deleteEvent(id) {
  if (!confirm('Delete this event?')) return;
  state.events = state.events.filter(e => e.id !== id);
  save();
  closeEventModal();
  closePopover();
  render();
}

/* ─── Category Modal ─────────────────────────────────────────────── */
let selectedColor = COLORS[0];

function openCatModal(catId) {
  state.editingCatId = catId || null;
  $('btnDeleteCat').style.display = catId ? '' : 'none';

  const colorRow = $('colorRow');
  colorRow.innerHTML = COLORS.map(c =>
    `<div class="color-swatch" data-color="${c}" style="background:${c}"></div>`
  ).join('');

  if (catId) {
    const cat = state.categories.find(c => c.id === catId);
    $('catName').value = cat.name;
    selectedColor = cat.color;
  } else {
    $('catName').value = '';
    selectedColor = COLORS[0];
  }

  colorRow.querySelectorAll('.color-swatch').forEach(sw => {
    if (sw.dataset.color === selectedColor) sw.classList.add('selected');
    sw.addEventListener('click', () => {
      colorRow.querySelectorAll('.color-swatch').forEach(x => x.classList.remove('selected'));
      sw.classList.add('selected');
      selectedColor = sw.dataset.color;
    });
  });

  catModalOverlay.classList.add('open');
  setTimeout(() => $('catName').focus(), 100);
}

function closeCatModal() { catModalOverlay.classList.remove('open'); }

function saveCat() {
  const name = $('catName').value.trim();
  if (!name) { $('catName').focus(); return; }

  if (state.editingCatId) {
    const idx = state.categories.findIndex(c => c.id === state.editingCatId);
    state.categories[idx] = { ...state.categories[idx], name, color: selectedColor };
  } else {
    state.categories.push({ id: uid(), name, color: selectedColor });
  }

  save();
  closeCatModal();
  render();
}

function deleteCat(id) {
  if (!confirm('Delete this category? Events will become uncategorized.')) return;
  state.categories = state.categories.filter(c => c.id !== id);
  state.activeCategories.delete(id);
  save();
  closeCatModal();
  render();
}

/* ─── Popover ────────────────────────────────────────────────────── */
let currentPopoverEventId = null;

function showPopover(eventId, anchorEl) {
  const e = state.events.find(x => x.id === eventId);
  if (!e) return;
  currentPopoverEventId = eventId;

  $('popoverDot').style.background = catColor(e.categoryId);
  $('popoverTitle').textContent = e.title;
  $('popoverTime').textContent = e.allDay
    ? fmtDate(e.start)
    : `${fmtDateTime(e.start)} – ${fmtTime(e.end)}`;
  $('popoverCategory').textContent = catName(e.categoryId);
  $('popoverNotes').textContent = e.notes || '';

  // Position
  const rect = anchorEl.getBoundingClientRect();
  const pw = 260, ph = 180;
  let left = rect.right + 8;
  let top  = rect.top;
  if (left + pw > window.innerWidth - 8) left = rect.left - pw - 8;
  if (top + ph > window.innerHeight - 8) top = window.innerHeight - ph - 8;
  if (top < 8) top = 8;

  eventPopover.style.left = left + 'px';
  eventPopover.style.top  = top  + 'px';
  eventPopover.classList.add('open');
}

function closePopover() {
  eventPopover.classList.remove('open');
  currentPopoverEventId = null;
}

/* ─── Navigation ─────────────────────────────────────────────────── */
function navigate(dir) {
  const d = state.cursor;
  if (state.view === 'month') {
    state.cursor = new Date(d.getFullYear(), d.getMonth() + dir, 1);
  } else if (state.view === 'week') {
    state.cursor = new Date(d.getFullYear(), d.getMonth(), d.getDate() + dir * 7);
  } else if (state.view === 'day') {
    state.cursor = new Date(d.getFullYear(), d.getMonth(), d.getDate() + dir);
  }
  render();
}

function updateViewBtns() {
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === state.view);
  });
}

/* ─── XSS protection ────────────────────────────────────────────── */
function esc(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ─── Event Listeners ────────────────────────────────────────────── */
function init() {
  load();

  // Navigation
  $('btnPrev').addEventListener('click', () => navigate(-1));
  $('btnNext').addEventListener('click', () => navigate(1));
  $('btnToday').addEventListener('click', () => { state.cursor = new Date(); render(); });
  $('btnNew').addEventListener('click', () => openEventModal(null, null));

  // View switcher
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.view = btn.dataset.view;
      updateViewBtns();
      render();
    });
  });

  // Search
  $('searchInput').addEventListener('input', e => {
    state.search = e.target.value.trim();
    render();
  });

  // Event modal
  $('btnCloseModal').addEventListener('click', closeEventModal);
  $('btnCancelEvt').addEventListener('click', closeEventModal);
  $('btnSaveEvt').addEventListener('click', saveEvent);
  $('btnDeleteEvt').addEventListener('click', () => deleteEvent(state.editingEventId));
  modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeEventModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeEventModal(); closeCatModal(); closePopover(); } });

  // Category modal
  $('btnAddCategory').addEventListener('click', () => openCatModal(null));
  $('btnCloseCatModal').addEventListener('click', closeCatModal);
  $('btnCancelCat').addEventListener('click', closeCatModal);
  $('btnSaveCat').addEventListener('click', saveCat);
  $('btnDeleteCat').addEventListener('click', () => deleteCat(state.editingCatId));
  catModalOverlay.addEventListener('click', e => { if (e.target === catModalOverlay) closeCatModal(); });

  // Popover
  $('btnClosePopover').addEventListener('click', closePopover);
  $('btnEditPopover').addEventListener('click', () => {
    const id = currentPopoverEventId;
    closePopover();
    openEventModal(id, null);
  });
  $('btnDeletePopover').addEventListener('click', () => deleteEvent(currentPopoverEventId));
  document.addEventListener('click', e => {
    if (!eventPopover.contains(e.target) && !e.target.closest('.cell-event, .week-event, .day-event, .agenda-event, .search-result-item')) {
      closePopover();
    }
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
    if (e.key === 'n' || e.key === 'N') openEventModal(null, null);
    if (e.key === 't' || e.key === 'T') { state.cursor = new Date(); render(); }
    if (e.key === 'm') { state.view = 'month'; updateViewBtns(); render(); }
    if (e.key === 'w') { state.view = 'week';  updateViewBtns(); render(); }
    if (e.key === 'd') { state.view = 'day';   updateViewBtns(); render(); }
    if (e.key === 'a') { state.view = 'agenda';updateViewBtns(); render(); }
    if (e.key === 'ArrowLeft')  navigate(-1);
    if (e.key === 'ArrowRight') navigate(1);
  });

  render();

  // Auto-refresh now-line every minute
  setInterval(() => {
    if (state.view === 'week' || state.view === 'day') render();
  }, 60_000);
}

init();
