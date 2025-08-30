(() => {
  // Elements
  const fileInput = document.getElementById('file');
  const loadSampleBtn = document.getElementById('loadSample');
  const exportBtn = document.getElementById('exportPdf');
  const exportJsonBtn = document.getElementById('exportJson');
  const exportPngSheetBtn = document.getElementById('exportPngSheet');
  const preview = document.getElementById('preview');
  const cEmojiStacked = document.getElementById('emojiStacked');
  const cSentimentLine = document.getElementById('sentimentLine');
  const cFlipRateLine = document.getElementById('flipRateLine');
  const cTopIDsBar = document.getElementById('topIDsBar');
  const cReturningRateLine = document.getElementById('returningRateLine');
  const ternaryCanvas = document.getElementById('ternaryMix');
  const cDowHeatmap = document.getElementById('dowHeatmap');
  const cCalendarHeatmap = document.getElementById('calendarHeatmap');
  const cTransMatrix = document.getElementById('transitionsMatrix');
  const cRetentionBars = document.getElementById('retentionBars');
  const cCohortBars = document.getElementById('cohortBars');
  const dayDrilldown = document.getElementById('dayDrilldown');
  const mTotal = document.getElementById('mTotal');
  const mWindow = document.getElementById('mWindow');
  const mUnique = document.getElementById('mUnique');
  const mRepeaters = document.getElementById('mRepeaters');
  const legendEmoji = document.getElementById('legendEmoji');
  const stackModeInputs = Array.from(document.querySelectorAll('input[name="stackMode"]'));
  const outlierModeSel = document.getElementById('outlierMode');
  const showBandsChk = document.getElementById('showBands');
  const audModeInputs = Array.from(document.querySelectorAll('input[name="audMode"]'));
  const wkdMetricInputs = Array.from(document.querySelectorAll('input[name="wkdMetric"]'));
  const editLayoutChk = document.getElementById('editLayout');

  // State
  let rawRows = [];
  let headers = [];
  let computed = null;
  let currentOutlierMode = 'zscore';
  let currentAudience = 'all';
  let currentWkdMetric = 'total';
  let selectedDay = null;
  let editMode = false;

  // Layout persistence
  const LAYOUT_KEY = 'vbviz_layout_v1';
  function getPanelId(panel) {
    if (panel.dataset.pid) return panel.dataset.pid;
    const h = panel.querySelector('h2');
    const base = (h?.textContent || 'panel').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const pid = base + '-' + Math.random().toString(36).slice(2,7);
    panel.dataset.pid = pid;
    return pid;
  }
  function applySavedLayout() {
    const saved = JSON.parse(localStorage.getItem(LAYOUT_KEY) || 'null');
    const container = document.querySelector('section.layout.charts');
    if (!saved || !container) return;
    const panels = Array.from(container.querySelectorAll('.panel'));
    const byId = new Map(panels.map(p => [getPanelId(p), p]));
    // Reorder
    saved.order?.forEach(id => {
      const p = byId.get(id);
      if (p) container.appendChild(p);
    });
    // Heights
    panels.forEach(p => {
      const id = getPanelId(p);
      const hmap = saved.heights || {};
      const h = hmap[id];
      if (h && h > 60) {
        const cv = p.querySelector('canvas');
        if (cv) { cv.style.height = h + 'px'; }
      }
    });
  }
  function saveLayout() {
    const container = document.querySelector('section.layout.charts');
    if (!container) return;
    const panels = Array.from(container.querySelectorAll('.panel'));
    const order = panels.map(p => getPanelId(p));
    const heights = {};
    panels.forEach(p => {
      const id = getPanelId(p);
      const cv = p.querySelector('canvas');
      if (cv) {
        const rect = cv.getBoundingClientRect();
        heights[id] = Math.floor(rect.height);
      }
    });
    localStorage.setItem(LAYOUT_KEY, JSON.stringify({ order, heights }));
  }

  function enableEditMode(on) {
    editMode = !!on;
    document.body.classList.toggle('edit-on', editMode);
    const container = document.querySelector('section.layout.charts');
    if (!container) return;
    const panels = Array.from(container.querySelectorAll('.panel'));
    panels.forEach(p => {
      p.setAttribute('draggable', String(editMode));
      getPanelId(p); // ensure id assigned
      // resizer handle on the first canvas panel element
      const cv = p.querySelector('canvas');
      if (cv && editMode) {
        cv.classList.add('resizer');
      } else if (cv) {
        cv.classList.remove('resizer');
      }
    });

    if (editMode) {
      attachDnD(container);
      attachResize(container);
    }
  }

  // Small helper to trigger downloads
  function downloadDataUrl(dataUrl, filename) {
    const a = document.createElement('a');
    a.href = dataUrl; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  // Add a small "PNG" button to each panel with a canvas
  function injectPanelExportButtons() {
    const panels = Array.from(document.querySelectorAll('.panel'));
    panels.forEach(p => {
      const canvas = p.querySelector('canvas');
      if (!canvas) return;
      const head = p.querySelector('.panel-head') || p.querySelector('h2')?.parentElement || p;
      if (!head) return;
      // avoid duplicate
      if (head.querySelector('.panel-actions')) return;
      const actions = document.createElement('div');
      actions.className = 'panel-actions';
      const btn = document.createElement('button');
      btn.className = 'icon-btn';
      btn.title = 'Download PNG';
      btn.textContent = 'PNG';
      btn.addEventListener('click', () => exportCanvasPNG(canvas));
      actions.appendChild(btn);
      head.appendChild(actions);
    });
  }

  // Export a single canvas as PNG with overscale for crispness
  function exportCanvasPNG(canvas, scale = 2) {
    try {
      const parent = canvas.parentElement;
      // Temporarily render at a higher scale
      renderAllScaled(scale);
      const url = canvas.toDataURL('image/png');
      const title = parent?.closest('.panel')?.querySelector('h2')?.textContent?.toLowerCase().replace(/[^a-z0-9]+/g,'-') || 'chart';
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      downloadDataUrl(url, `${title}-${ts}.png`);
    } catch (e) {
      console.error('PNG export failed', e);
      alert('PNG export failed. Try again after loading data.');
    } finally {
      // Re-render normal scale
      renderAllScaled(1);
    }
  }

  // Export a single large PNG sheet with all major charts arranged 2 per row
  async function exportPngSheet(scale = 2) {
    if (!computed) { alert('Load a CSV first to export.'); return; }
    try {
      renderAllScaled(scale);
      const charts = [
        cEmojiStacked, cSentimentLine, cFlipRateLine,
        cCalendarHeatmap, ternaryCanvas, cTopIDsBar,
        cTransMatrix, cRetentionBars, cCohortBars,
        cDowHeatmap, cReturningRateLine,
      ].filter(Boolean);
      const imgs = charts.map(c => ({ el: c, url: c.toDataURL('image/png') }));
      // Load images
      const bitmaps = await Promise.all(imgs.map(({url}) => new Promise((res) => { const img = new Image(); img.onload = () => res(img); img.src = url; })));
      // Layout: 2 columns; width = max canvas width * 2 + gaps
      const gap = 24;
      const colW = Math.max(...charts.map(c => Math.floor(c.getBoundingClientRect().width))) || 600;
      const rowH = (i) => Math.floor(charts[i].getBoundingClientRect().height) || 300;
      const cols = 2;
      const rows = Math.ceil(bitmaps.length / cols);
      const width = cols * colW + (cols + 1) * gap;
      let height = gap; // accumulate per row
      for (let r = 0; r < rows; r++) {
        const i1 = r * cols, i2 = i1 + 1;
        height += Math.max(rowH(i1), charts[i2] ? rowH(i2) : 0) + gap;
      }
      const off = document.createElement('canvas');
      off.width = Math.floor(width * window.devicePixelRatio * 1);
      off.height = Math.floor(height * window.devicePixelRatio * 1);
      const ctx = off.getContext('2d');
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0,0,width,height);
      // Draw title
      ctx.fillStyle = '#111827';
      ctx.font = 'bold 18px system-ui, -apple-system, Segoe UI, Roboto';
      const start = computed.minDate.toISOString().slice(0,10);
      const end = computed.maxDate.toISOString().slice(0,10);
      ctx.fillText(`VB Daily — Reactions (${start} to ${end} UTC)`, gap, gap - 6);
      // Draw images
      let y = gap + 8;
      for (let r = 0; r < rows; r++) {
        const i1 = r * cols, i2 = i1 + 1;
        const h1 = charts[i1] ? rowH(i1) : 0;
        const h2 = charts[i2] ? rowH(i2) : 0;
        const rowHeight = Math.max(h1, h2);
        // left
        if (bitmaps[i1]) ctx.drawImage(bitmaps[i1], gap, y, colW, h1);
        // right
        if (bitmaps[i2]) ctx.drawImage(bitmaps[i2], gap*2 + colW, y, colW, h2);
        y += rowHeight + gap;
      }
      const url = off.toDataURL('image/png');
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      downloadDataUrl(url, `vb-daily-dashboard-${ts}.png`);
    } catch (e) {
      console.error(e);
      alert('PNG sheet export failed.');
    } finally {
      renderAllScaled(1);
    }
  }

  function attachDnD(container) {
    let dragEl = null;
    container.addEventListener('dragstart', (e) => {
      const p = e.target.closest('.panel');
      if (!p) return;
      dragEl = p;
      p.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    container.addEventListener('dragend', (e) => {
      if (dragEl) dragEl.classList.remove('dragging');
      dragEl = null;
      saveLayout();
      renderAll();
    });
    container.addEventListener('dragover', (e) => {
      e.preventDefault();
      const afterEl = getDragAfterElement(container, e.clientY);
      const cur = container.querySelector('.panel.dragging');
      if (!cur) return;
      if (afterEl == null) container.appendChild(cur);
      else container.insertBefore(cur, afterEl);
    });
    function getDragAfterElement(container, y) {
      const els = [...container.querySelectorAll('.panel:not(.dragging)')];
      let closest = { offset: Number.NEGATIVE_INFINITY, element: null };
      els.forEach(el => {
        const rect = el.getBoundingClientRect();
        const offset = y - rect.top - rect.height / 2;
        if (offset < 0 && offset > closest.offset) closest = { offset, element: el };
      });
      return closest.element;
    }
  }

  function attachResize(container) {
    let resizing = null; // { canvas, startY, startH }
    container.addEventListener('mousedown', (e) => {
      if (!editMode) return;
      const cv = e.target.closest('canvas.resizer');
      if (!cv) return;
      const rect = cv.getBoundingClientRect();
      // hit test bottom-right corner approx (16px square)
      const withinGrip = (e.clientX > rect.right - 20) && (e.clientY > rect.bottom - 20);
      if (!withinGrip) return;
      e.preventDefault();
      resizing = { canvas: cv, startY: e.clientY, startH: rect.height };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp, { once: true });
    });
    function onMove(e) {
      if (!resizing) return;
      const dy = e.clientY - resizing.startY;
      const newH = Math.max(120, Math.floor(resizing.startH + dy));
      resizing.canvas.style.height = newH + 'px';
      renderAll();
    }
    function onUp() {
      window.removeEventListener('mousemove', onMove);
      saveLayout();
      resizing = null;
    }
  }

  // Config
  const EMOJI_WEIGHTS = new Map([
    ['🤯', 1],
    ['🤔', 0],
    ['😴', -1],
  ]);
  const EMOJI_COLORS = new Map([
    ['🤯', '#34d399'],
    ['🤔', '#fbbf24'],
    ['😴', '#f87171'],
  ]);
  const EMOJI_LABELS = new Map([
    ['🤯', 'Wow'],
    ['🤔', 'Curious'],
    ['😴', 'Boring'],
  ]);

  // HiDPI canvas scaling
function setupCanvas(cnv, overscale = 1) {
    const dpr = Math.max(1, (window.devicePixelRatio || 1)) * Math.max(1, overscale);
    const rect = cnv.getBoundingClientRect();
    const cssW = Math.max(1, Math.floor(rect.width));
    const cssH = Math.max(1, Math.floor(rect.height));
    const w = Math.max(1, Math.floor(cssW * dpr));
    const h = Math.max(1, Math.floor(cssH * dpr));
    if (cnv.width !== w) cnv.width = w;
    if (cnv.height !== h) cnv.height = h;
    const ctx = cnv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
}

function clearCanvas(ctx, cnv) {
  const rect = cnv.getBoundingClientRect();
  ctx.clearRect(0, 0, Math.floor(rect.width), Math.floor(rect.height));
}

  // CSV parser supporting quotes and commas (RFC4180-ish)
  function parseCSV(text, delimiter = ',') {
    const out = [];
    const row = [];
    let i = 0;
    let cur = '';
    let inQuotes = false;
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    while (i < text.length) {
      const ch = text[i];
      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') { cur += '"'; i += 2; continue; }
          inQuotes = false; i++; continue;
        } else { cur += ch; i++; continue; }
      } else {
        if (ch === '"') { inQuotes = true; i++; continue; }
        if (ch === delimiter) { row.push(cur); cur = ''; i++; continue; }
        if (ch === '\n') { row.push(cur); out.push(row.slice()); row.length = 0; cur=''; i++; continue; }
        cur += ch; i++;
      }
    }
    row.push(cur); out.push(row);
    if (out.length && out[out.length - 1].length === 1 && out[out.length - 1][0] === '') out.pop();
    return out;
  }

  // Utils
  const fmtNum = (n) => n.toLocaleString();
  const fmtPct = (x) => `${Math.round(x * 100)}%`;
  const dayKey = (d) => {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };

  // Simple stats helpers
  const mean = (arr) => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
  const stddev = (arr) => {
    if (arr.length <= 1) return 0;
    const m = mean(arr);
    const v = mean(arr.map(x => (x - m) * (x - m)));
    return Math.sqrt(Math.max(0, v));
  };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const median = (arr) => {
    if (!arr.length) return 0;
    const a = arr.slice().sort((x, y) => x - y);
    const m = Math.floor(a.length / 2);
    return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
  };
  const mad = (arr, med = null) => {
    if (!arr.length) return 0;
    const m = med == null ? median(arr) : med;
    const dev = arr.map(v => Math.abs(v - m));
    return median(dev);
  };
  const rollingMean = (arr, win) => arr.map((_, i) => {
    const s = Math.max(0, i - win + 1);
    const slice = arr.slice(s, i + 1);
    return slice.length ? slice.reduce((a, b) => a + b, 0) / slice.length : 0;
  });
  const rollingMAD = (arr, win) => arr.map((_, i) => {
    const s = Math.max(0, i - win + 1);
    const slice = arr.slice(s, i + 1);
    const med = median(slice);
    return mad(slice, med);
  });

  function parseVB(rows, hdrs) {
    const getIdx = (name, fallback) => {
      const idx = hdrs.findIndex(h => h.trim().toLowerCase() === name.trim().toLowerCase());
      return idx >= 0 ? idx : fallback;
    };
    const IDX_EMOJI = getIdx("How did today's edition of VB Daily make you feel?", 1);
    const IDX_SUBMIT = getIdx('Submit Date (UTC)', 8);
    const IDX_NETID = getIdx('Network ID', 9);

    const parsed = [];
    for (const r of rows) {
      const emo = (r[IDX_EMOJI] || '').trim();
      const dateStr = (r[IDX_SUBMIT] || '').trim();
      const id = (r[IDX_NETID] || '').trim();
      if (!emo || !dateStr) continue;
      const d = new Date(dateStr.replace(' ', 'T') + 'Z'); // treat as UTC
      if (Number.isNaN(d.getTime())) continue;
      parsed.push({ emoji: emo, date: d, day: dayKey(d), id });
    }
    return parsed.sort((a, b) => a.date - b.date);
  }

  function computeMetrics(items) {
    if (!items.length) return null;
    const byDay = new Map();
    const seen = new Set();
    const idCounts = new Map();
    const idToItems = new Map();
    let minD = items[0].date, maxD = items[0].date;

    for (const it of items) {
      if (!byDay.has(it.day)) byDay.set(it.day, []);
      byDay.get(it.day).push(it);
      if (it.date < minD) minD = it.date;
      if (it.date > maxD) maxD = it.date;
      if (it.id) {
        idCounts.set(it.id, (idCounts.get(it.id) || 0) + 1);
        if (!idToItems.has(it.id)) idToItems.set(it.id, []);
        idToItems.get(it.id).push(it);
      }
    }

    const days = Array.from(byDay.keys()).sort();
    const emojiSet = new Set(items.map(i => i.emoji));
    // Keep known order for main three
    const order = ['🤯', '🤔', '😴', ...Array.from(emojiSet).filter(e => !['🤯','🤔','😴'].includes(e))];

    // Stacked counts per day
    const stacked = new Map(Array.from(order, e => [e, []]));
    const stackedNew = new Map(Array.from(order, e => [e, []]));
    const stackedRet = new Map(Array.from(order, e => [e, []]));
    const sentimentSeries = [];
    const sentNew = [];
    const sentRet = [];
    const returningRate = [];
    const seenBefore = new Set();
    const dailyTotals = [];
    const dailyShares = [];
    const perDay = new Map();
    // Pacific Time aggregations
    const ptDowCounts = Array(7).fill(0);
    const ptDowWow = Array(7).fill(0);
    const ptGridCounts = Array.from({ length: 7 }, () => Array(24).fill(0));
    const ptGridWow = Array.from({ length: 7 }, () => Array(24).fill(0));
    const ptGridCur = Array.from({ length: 7 }, () => Array(24).fill(0));
    const ptGridBor = Array.from({ length: 7 }, () => Array(24).fill(0));
    const fmtPTWeek = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', weekday: 'short' });
    const fmtPTHour = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hour: '2-digit', hourCycle: 'h23' });
    const WEEK = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const toPTDow = (d) => WEEK.indexOf(fmtPTWeek.format(d));
    const toPTHour = (d) => parseInt(fmtPTHour.format(d), 10) || 0;

    for (const day of days) {
      const arr = byDay.get(day);
      const counts = new Map();
      const countsNew = new Map();
      const countsRet = new Map();
      let sentSum = 0, sentN = 0;
      let sentSumNew = 0, sentNNew = 0;
      let sentSumRet = 0, sentNRet = 0;
      let returning = 0;
      for (const it of arr) {
        counts.set(it.emoji, (counts.get(it.emoji) || 0) + 1);
        const w = EMOJI_WEIGHTS.get(it.emoji);
        if (w !== undefined) { sentSum += w; sentN += 1; }
        const isRet = !!(it.id && seenBefore.has(it.id));
        if (isRet) {
          returning += 1;
          countsRet.set(it.emoji, (countsRet.get(it.emoji) || 0) + 1);
          if (w !== undefined) { sentSumRet += w; sentNRet += 1; }
        } else {
          countsNew.set(it.emoji, (countsNew.get(it.emoji) || 0) + 1);
          if (w !== undefined) { sentSumNew += w; sentNNew += 1; }
        }
      }
      // aggregate Pacific Time DOW/Hour at item level
      for (const it of arr) {
        const dow = toPTDow(it.date);
        const hod = toPTHour(it.date);
        if (dow >= 0) {
          ptDowCounts[dow] += 1;
          ptGridCounts[dow][hod] += 1;
          if (it.emoji === '🤯') { ptDowWow[dow] += 1; ptGridWow[dow][hod] += 1; }
          if (it.emoji === '🤔') { ptGridCur[dow][hod] += 1; }
          if (it.emoji === '😴') { ptGridBor[dow][hod] += 1; }
        }
      }
      // push counts in fixed order
      for (const e of order) stacked.get(e).push(counts.get(e) || 0);
      for (const e of order) stackedNew.get(e).push(countsNew.get(e) || 0);
      for (const e of order) stackedRet.get(e).push(countsRet.get(e) || 0);
      const total = Array.from(counts.values()).reduce((s, v) => s + v, 0);
      dailyTotals.push(total);
      const wow = (counts.get('🤯') || 0) / (total || 1);
      const cur = (counts.get('🤔') || 0) / (total || 1);
      const bor = (counts.get('😴') || 0) / (total || 1);
      dailyShares.push({ wow, cur, bor });
      sentimentSeries.push(sentN ? sentSum / sentN : 0);
      sentNew.push(sentNNew ? sentSumNew / sentNNew : 0);
      sentRet.push(sentNRet ? sentSumRet / sentNRet : 0);
      returningRate.push(arr.length ? returning / arr.length : 0);
      // store per-day aggregates for drilldown
      const countsObj = { '🤯': counts.get('🤯')||0, '🤔': counts.get('🤔')||0, '😴': counts.get('😴')||0 };
      perDay.set(day, {
        day,
        total,
        counts: countsObj,
        returningCount: returning,
        newCount: Math.max(0, total - returning),
        items: arr.slice().sort((a,b)=> a.date - b.date),
      });
      // mark seen after the day's tally
      for (const it of arr) { if (it.id) seenBefore.add(it.id); }
    }

    // Outlier detection (z-score) for engagement index and emoji shares
    const zThresh = 2.0;
    const sentMean = mean(sentimentSeries);
    const sentStd = stddev(sentimentSeries);
    const wowShares = dailyShares.map(s => s.wow);
    const curShares = dailyShares.map(s => s.cur);
    const borShares = dailyShares.map(s => s.bor);
    const wowMean = mean(wowShares), wowStd = stddev(wowShares);
    const curMean = mean(curShares), curStd = stddev(curShares);
    const borMean = mean(borShares), borStd = stddev(borShares);
    const outlierMap = new Map(); // day -> { idx, tags:[], info:[] }
    function addOutlier(i, tag, info) {
      const d = days[i];
      if (!outlierMap.has(d)) outlierMap.set(d, { day: d, idx: i, tags: [], info: [], total: dailyTotals[i] });
      outlierMap.get(d).tags.push(tag);
      if (info) outlierMap.get(d).info.push(info);
    }
    for (let i = 0; i < days.length; i++) {
      if (sentStd > 0) {
        const z = (sentimentSeries[i] - sentMean) / sentStd;
        if (z >= zThresh) addOutlier(i, 'Engagement spike', `z=${z.toFixed(2)}`);
        if (z <= -zThresh) addOutlier(i, 'Engagement dip', `z=${z.toFixed(2)}`);
      }
      if (wowStd > 0) {
        const z = (wowShares[i] - wowMean) / wowStd;
        if (z >= zThresh) addOutlier(i, 'Wow spike', `z=${z.toFixed(2)}`);
        if (z <= -zThresh) addOutlier(i, 'Wow low', `z=${z.toFixed(2)}`);
      }
      if (curStd > 0) {
        const z = (curShares[i] - curMean) / curStd;
        if (z >= zThresh) addOutlier(i, 'Curious spike', `z=${z.toFixed(2)}`);
        if (z <= -zThresh) addOutlier(i, 'Curious low', `z=${z.toFixed(2)}`);
      }
      if (borStd > 0) {
        const z = (borShares[i] - borMean) / borStd;
        if (z >= zThresh) addOutlier(i, 'Boring spike', `z=${z.toFixed(2)}`);
        if (z <= -zThresh) addOutlier(i, 'Boring low', `z=${z.toFixed(2)}`);
      }
    }
    const outliersZ = Array.from(outlierMap.values()).sort((a, b) => b.total - a.total);

    // MAD-based outliers for engagement index (robust)
    const modZThresh = 3.5;
    const mSent = median(sentimentSeries);
    const madSent = mad(sentimentSeries, mSent);
    const scale = madSent > 0 ? (0.6745 / madSent) : 0;
    const outlierMapMAD = new Map();
    function addOutlierMAD(i, tag, info) {
      const d = days[i];
      if (!outlierMapMAD.has(d)) outlierMapMAD.set(d, { day: d, idx: i, tags: [], info: [], total: dailyTotals[i] });
      outlierMapMAD.get(d).tags.push(tag);
      if (info) outlierMapMAD.get(d).info.push(info);
    }
    if (scale > 0) {
      for (let i = 0; i < days.length; i++) {
        const mz = Math.abs((sentimentSeries[i] - mSent) * scale);
        if (mz >= modZThresh) {
          addOutlierMAD(i, sentimentSeries[i] >= mSent ? 'Engagement spike (MAD)' : 'Engagement dip (MAD)', `mz=${mz.toFixed(2)}`);
        }
      }
    }
    const outliersMAD = Array.from(outlierMapMAD.values()).sort((a, b) => b.total - a.total);

    // Sentiment insights per emoji
    function insightsFor(label, shares) {
      const avg = mean(shares);
      const peakIdx = shares.reduce((bi, v, i, arr) => (v > arr[bi] ? i : bi), 0);
      const lowIdx = shares.reduce((bi, v, i, arr) => (v < arr[bi] ? i : bi), 0);
      const lastN = Math.min(7, shares.length);
      const lastAvg = lastN ? mean(shares.slice(-lastN)) : 0;
      const change = lastAvg - avg; // recent vs overall
      return {
        label,
        avg,
        peak: { day: days[peakIdx], value: shares[peakIdx] },
        low: { day: days[lowIdx], value: shares[lowIdx] },
        recentAvg: lastAvg,
        change,
      };
    }
    const insights = {
      wow: insightsFor('Wow', wowShares),
      curious: insightsFor('Curious', curShares),
      boring: insightsFor('Boring', borShares),
    };

    const uniqueIDs = idCounts.size;
    const repeaters = Array.from(idCounts.values()).filter(c => c > 1).length;
    const topIDs = Array.from(idCounts.entries()).filter(([,c]) => c > 1).sort((a,b) => b[1]-a[1]).slice(0, 20);

    // Build story objects for top 3
    const top3Stories = topIDs.slice(0, 3).map(([id, count]) => {
      const arr = (idToItems.get(id) || []).slice().sort((a,b) => a.date - b.date);
      const first = arr[0]?.date || minD;
      const last = arr[arr.length - 1]?.date || maxD;
      const daysActive = new Set(arr.map(a => a.day)).size;
      const mix = new Map();
      let sentSum = 0, sentN = 0;
      const series = [];
      for (const a of arr) {
        mix.set(a.emoji, (mix.get(a.emoji) || 0) + 1);
        const w = EMOJI_WEIGHTS.get(a.emoji);
        if (w !== undefined) { sentSum += w; sentN++; series.push({ date: a.date, value: w }); }
      }
      const lastEmoji = arr[arr.length - 1]?.emoji || '';
      return {
        id, count, first, last, daysActive, mix, lastEmoji,
        sentimentAvg: sentN ? sentSum / sentN : 0,
        series,
      };
    });

    // Transitions: per ID, use last emoji per day; transitions between consecutive active days
    const MAIN = ['🤯','🤔','😴'];
    const idxOf = (e) => MAIN.indexOf(e);
    const dayIndex = new Map(computedDaysToIndex(days));
    function computedDaysToIndex(dys){ return dys.map((d,i)=>[d,i]); }
    const transCounts = Array.from({ length: 3 }, () => Array(3).fill(0));
    const dailyFlipNumer = Array(days.length).fill(0);
    const dailyFlipDenom = Array(days.length).fill(0);
    for (const [id, arr] of idToItems.entries()) {
      // map of day->last emoji
      const byD = new Map();
      const sorted = arr.slice().sort((a,b)=> a.date - b.date);
      for (const ev of sorted) byD.set(ev.day, ev.emoji);
      const dayIdxs = Array.from(byD.keys()).map(d => dayIndex.get(d)).filter(i => i != null).sort((a,b)=>a-b);
      for (let i = 0; i < dayIdxs.length - 1; i++) {
        const e1 = byD.get(days[dayIdxs[i]]);
        const e2 = byD.get(days[dayIdxs[i+1]]);
        const r = idxOf(e1), c = idxOf(e2);
        if (r >= 0 && c >= 0) transCounts[r][c] += 1;
        // flip = changed emoji
        dailyFlipDenom[dayIdxs[i+1]] += 1;
        if (e1 !== e2) dailyFlipNumer[dayIdxs[i+1]] += 1;
      }
    }
    const transRowSums = transCounts.map(row => row.reduce((a,b)=>a+b,0));
    const transProb = transCounts.map((row,i) => row.map(v => (transRowSums[i] ? v/transRowSums[i] : 0)));
    const flipRate = dailyFlipNumer.map((n,i)=> (dailyFlipDenom[i] ? n/dailyFlipDenom[i] : 0));

    // Retention: overall fraction of IDs returning within 1/3/7 days of first seen
    const idDayIdxs = new Map();
    for (const [id, arr] of idToItems.entries()) {
      const s = new Set(arr.map(ev => dayIndex.get(ev.day)).filter(i => i != null));
      idDayIdxs.set(id, Array.from(s).sort((a,b)=>a-b));
    }
    const ids = Array.from(idDayIdxs.keys());
    const totalIds = ids.length || 1;
    let d1 = 0, d3 = 0, d7 = 0;
    // First-sentiment cohorts buckets
    const cohortBase = { '🤯':0,'🤔':0,'😴':0 };
    const cohortD1 = { '🤯':0,'🤔':0,'😴':0 };
    const cohortD3 = { '🤯':0,'🤔':0,'😴':0 };
    const cohortD7 = { '🤯':0,'🤔':0,'😴':0 };
    for (const id of ids) {
      const idxs = idDayIdxs.get(id);
      if (!idxs || !idxs.length) continue;
      const first = idxs[0];
      // first emoji
      const firstDay = days[first];
      const firstItems = (idToItems.get(id) || []).filter(ev => ev.day === firstDay);
      const firstEmoji = firstItems.length ? firstItems[firstItems.length-1].emoji : null;
      if (firstEmoji && cohortBase[firstEmoji] != null) cohortBase[firstEmoji] += 1;
      if (idxs.some(i => i - first <= 1 && i - first >= 1)) d1++;
      if (idxs.some(i => i - first <= 3 && i - first >= 1)) d3++;
      if (idxs.some(i => i - first <= 7 && i - first >= 1)) d7++;
      if (firstEmoji && cohortBase[firstEmoji] != null) {
        if (idxs.some(i => i - first <= 1 && i - first >= 1)) cohortD1[firstEmoji] += 1;
        if (idxs.some(i => i - first <= 3 && i - first >= 1)) cohortD3[firstEmoji] += 1;
        if (idxs.some(i => i - first <= 7 && i - first >= 1)) cohortD7[firstEmoji] += 1;
      }
    }
    const retention = { d1: d1/totalIds, d3: d3/totalIds, d7: d7/totalIds, total: totalIds };
    const cohortRetention = {
      base: cohortBase,
      d1: cohortD1,
      d3: cohortD3,
      d7: cohortD7,
      rates: {
        '🤯': {
          d1: cohortBase['🤯'] ? cohortD1['🤯']/cohortBase['🤯'] : 0,
          d3: cohortBase['🤯'] ? cohortD3['🤯']/cohortBase['🤯'] : 0,
          d7: cohortBase['🤯'] ? cohortD7['🤯']/cohortBase['🤯'] : 0,
        },
        '🤔': {
          d1: cohortBase['🤔'] ? cohortD1['🤔']/cohortBase['🤔'] : 0,
          d3: cohortBase['🤔'] ? cohortD3['🤔']/cohortBase['🤔'] : 0,
          d7: cohortBase['🤔'] ? cohortD7['🤔']/cohortBase['🤔'] : 0,
        },
        '😴': {
          d1: cohortBase['😴'] ? cohortD1['😴']/cohortBase['😴'] : 0,
          d3: cohortBase['😴'] ? cohortD3['😴']/cohortBase['😴'] : 0,
          d7: cohortBase['😴'] ? cohortD7['😴']/cohortBase['😴'] : 0,
        }
      }
    };

    // Control bands (rolling mean ± K * rolling MAD * 1.4826)
    const WIN = 7, K = 3;
    const rollMean = rollingMean(sentimentSeries, WIN);
    const rollMAD = rollingMAD(sentimentSeries, WIN).map(v => v * 1.4826);
    const bandUpper = rollMean.map((m, i) => m + K * (rollMAD[i] || 0));
    const bandLower = rollMean.map((m, i) => m - K * (rollMAD[i] || 0));

    return {
      days, order, stacked, stackedNew, stackedRet, sentimentSeries, sentNew, sentRet, returningRate,
      dailyTotals, dailyShares,
      total: items.length,
      minDate: minD, maxDate: maxD,
      uniqueIDs, repeaters, topIDs, idToItems,
      top3Stories,
      outliersZ,
      outliersMAD,
      insights,
      bands: { mean: rollMean, upper: bandUpper, lower: bandLower },
      pt: { dow: { counts: ptDowCounts, wow: ptDowWow }, grid: { counts: ptGridCounts, wow: ptGridWow, cur: ptGridCur, bor: ptGridBor } },
      perDay,
      transitions: { counts: transCounts, prob: transProb, rows: MAIN, cols: MAIN },
      retention,
      flipRate,
      cohortRetention,
      recent: items.slice(-100).reverse(),
    };
  }

  // Drawing helpers
  function drawAxes(ctx, x, y, w, h) {
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x + w, y + h);
    ctx.stroke();
  }

  function drawStackedArea(canvas, days, order, stacked, mode = 'counts', overscale = 1) {
    const ctx = setupCanvas(canvas, overscale);
    clearCanvas(ctx, canvas);
    const rect = canvas.getBoundingClientRect();
    const W = Math.floor(rect.width);
    const H = Math.max(220, Math.floor(rect.height));
    const pad = { left: 50, right: 20, top: 18, bottom: 34 };
    const X = pad.left, Y = pad.top, PW = W - pad.left - pad.right, PH = H - pad.top - pad.bottom;
    drawAxes(ctx, X, Y, PW, PH);

    const n = Math.max(1, days.length);
    const totals = Array.from({ length: n }, (_, i) => order.reduce((s, e) => s + (stacked.get(e)[i] || 0), 0));
    const maxTotal = Math.max(1, ...totals);
    const denom = (i) => mode === 'share' ? (totals[i] || 1) : maxTotal;
    const stepX = PW / Math.max(1, n - 1);

    // grid + x labels sparse
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto';
    ctx.textAlign = 'center';
    const xticks = 6;
    for (let t = 0; t <= xticks; t++) {
      const i = Math.floor((t / xticks) * (n - 1));
      const tx = X + i * stepX;
      ctx.fillText(days[i] || '', tx, Y + PH + 16);
    }

    // stacked areas
    let acc = Array(n).fill(0);
    for (const e of order) {
      const data = stacked.get(e);
      const color = EMOJI_COLORS.get(e) || '#6ca0ff';
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const x = X + i * stepX;
        const y = Y + PH - (acc[i] + (mode === 'share' ? (data[i] / (totals[i] || 1)) : data[i])) / denom(i) * PH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      for (let i = n - 1; i >= 0; i--) {
        const x = X + i * stepX;
        const y = Y + PH - acc[i] / denom(i) * PH;
        ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = hexToRgba(color, 0.5);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.stroke();
      // update accumulator
      for (let i = 0; i < n; i++) acc[i] += (mode === 'share' ? (data[i] / (totals[i] || 1)) : data[i]);
    }
  }

  // Ternary plot of daily mix (Wow/Curious/Boring)
  function drawTernary(canvas, days, shares, totals, sentiment, overscale = 1) {
    if (!canvas) return;
    const ctx = setupCanvas(canvas, overscale);
    clearCanvas(ctx, canvas);
    const rect = canvas.getBoundingClientRect();
    const W = Math.floor(rect.width);
    const H = Math.max(260, Math.floor(rect.height));
    const pad = { left: 40, right: 20, top: 20, bottom: 34 };
    const X = pad.left, Y = pad.top, PW = W - pad.left - pad.right, PH = H - pad.top - pad.bottom;

    const h = Math.sqrt(3) / 2;
    const V = { wow: [0.5, 0], cur: [0, h], bor: [1, h] };
    const toCanvas = ([ux, uy]) => [X + ux * PW, Y + (h - uy) / h * PH];

    // draw triangle
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    const [wx, wy] = toCanvas(V.wow);
    const [cx, cy] = toCanvas(V.cur);
    const [bx, by] = toCanvas(V.bor);
    ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(cx, cy); ctx.lineTo(bx, by); ctx.closePath(); ctx.stroke();
    ctx.fillStyle = '#94a3b8'; ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto';
    ctx.fillText('Wow', wx - 12, wy - 6);
    ctx.fillText('Curious', cx - 28, cy + 14);
    ctx.fillText('Boring', bx - 26, by + 14);

    // points
    const maxN = Math.max(1, ...totals);
    for (let i = 0; i < shares.length; i++) {
      const s = shares[i];
      const ux = s.wow * V.wow[0] + s.cur * V.cur[0] + s.bor * V.bor[0];
      const uy = s.wow * V.wow[1] + s.cur * V.cur[1] + s.bor * V.bor[1];
      const [x, y] = toCanvas([ux, uy]);
      const r = 3 + 8 * (totals[i] / maxN);
      const idx = sentiment[i] ?? 0;
      const col = lerpColor('#f87171', '#34d399', (idx + 1) / 2);
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
  }

  function lerpColor(a, b, t) {
    const pa = hexToRgb(a), pb = hexToRgb(b);
    const r = Math.round(pa.r + (pb.r - pa.r) * t);
    const g = Math.round(pa.g + (pb.g - pa.g) * t);
    const bl = Math.round(pa.b + (pb.b - pa.b) * t);
    return `rgb(${r}, ${g}, ${bl})`;
  }

  function hexToRgb(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!m) return { r: 108, g: 160, b: 255 };
    return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
  }

  function drawLine(canvas, days, values, yMin, yMax, fmtY = (v)=>v.toFixed(2), overscale = 1, markers = null, bands = null) {
    const ctx = setupCanvas(canvas, overscale);
    clearCanvas(ctx, canvas);
    const rect = canvas.getBoundingClientRect();
    const W = Math.floor(rect.width);
    const H = Math.max(220, Math.floor(rect.height));
    const pad = { left: 50, right: 20, top: 18, bottom: 34 };
    const X = pad.left, Y = pad.top, PW = W - pad.left - pad.right, PH = H - pad.top - pad.bottom;
    drawAxes(ctx, X, Y, PW, PH);

    const n = Math.max(1, days.length);
    const stepX = PW / Math.max(1, n - 1);
    const toY = (v) => Y + PH - (v - yMin) / (yMax - yMin || 1) * PH;

    // x labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto';
    ctx.textAlign = 'center';
    const xticks = 6;
    for (let t = 0; t <= xticks; t++) {
      const i = Math.floor((t / xticks) * (n - 1));
      const tx = X + i * stepX;
      ctx.fillText(days[i] || '', tx, Y + PH + 16);
    }
    // y labels
    ctx.textAlign = 'right';
    const yticks = 4;
    for (let t = 0; t <= yticks; t++) {
      const v = yMin + (t / yticks) * (yMax - yMin);
      const ty = toY(v);
      ctx.fillText(fmtY(v), X - 6, ty + 4);
      ctx.strokeStyle = '#1e293b';
      ctx.beginPath(); ctx.moveTo(X, ty); ctx.lineTo(X + PW, ty); ctx.stroke();
    }

    // zero line (if within range)
    if (yMin < 0 && yMax > 0) {
      const zy = toY(0);
      ctx.strokeStyle = '#475569';
      ctx.beginPath(); ctx.moveTo(X, zy); ctx.lineTo(X + PW, zy); ctx.stroke();
    }

    // control bands (optional)
    if (bands && bands.upper && bands.lower) {
      ctx.save();
      ctx.strokeStyle = '#475569';
      ctx.setLineDash([4, 4]);
      // upper
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const x = X + i * stepX;
        const y = toY(bands.upper[i] ?? 0);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      // lower
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const x = X + i * stepX;
        const y = toY(bands.lower[i] ?? 0);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      // mean
      ctx.setLineDash([]);
      ctx.strokeStyle = '#64748b';
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const x = X + i * stepX;
        const y = toY((bands.mean?.[i]) ?? 0);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    }

    // line
    ctx.strokeStyle = '#7dd3fc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x = X + i * stepX;
      const y = toY(values[i] ?? 0);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // markers (outliers)
    if (markers && markers.length) {
      for (const m of markers) {
        const i = m.idx;
        if (i < 0 || i >= n) continue;
        const x = X + i * stepX;
        const y = toY(values[i] ?? 0);
        ctx.fillStyle = m.color || '#fbbf24';
        ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  function drawHorizontalBars(canvas, entries, overscale = 1) {
    const ctx = setupCanvas(canvas, overscale);
    clearCanvas(ctx, canvas);
    const rect = canvas.getBoundingClientRect();
    const W = Math.floor(rect.width);
    const H = Math.max(260, Math.floor(rect.height));
    const pad = { left: 150, right: 20, top: 18, bottom: 24 };
    const X = pad.left, Y = pad.top, PW = W - pad.left - pad.right, PH = H - pad.top - pad.bottom;
    drawAxes(ctx, X, Y, PW, PH);

    const maxVal = Math.max(1, ...entries.map(([, c]) => c));
    const barH = PH / Math.max(1, entries.length);
    ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto';
    entries.forEach(([id, count], i) => {
      const y = Y + i * barH + 4;
      const w = (count / maxVal) * (PW - 2);
      ctx.fillStyle = '#6ca0ff';
      ctx.fillRect(X + 1, y, Math.max(0, w), Math.max(0, barH - 8));
      // labels
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'right';
      const label = id.length > 10 ? id.slice(0, 10) + '…' : id;
      ctx.fillText(label, X - 8, y + barH / 2 + 4);
      ctx.textAlign = 'left';
      ctx.fillText(String(count), X + 8 + w, y + barH / 2 + 4);
    });
  }

  function hexToRgba(hex, a) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!m) return hex;
    const r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  function drawSparkline(canvas, series, overscale = 1) {
    const ctx = setupCanvas(canvas, overscale);
    clearCanvas(ctx, canvas);
    const rect = canvas.getBoundingClientRect();
    const W = Math.floor(rect.width);
    const H = Math.max(40, Math.floor(rect.height));
    const pad = { left: 6, right: 6, top: 6, bottom: 6 };
    const X = pad.left, Y = pad.top, PW = W - pad.left - pad.right, PH = H - pad.top - pad.bottom;
    // background grid midline
    ctx.strokeStyle = '#1e293b';
    ctx.beginPath(); ctx.moveTo(X, Y + PH/2); ctx.lineTo(X + PW, Y + PH/2); ctx.stroke();
    if (!series.length) return;
    const minV = -1, maxV = 1;
    const n = series.length;
    const stepX = PW / Math.max(1, n - 1);
    const toY = (v) => Y + PH - (v - minV) / (maxV - minV) * PH;

    ctx.strokeStyle = '#7dd3fc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x = X + i * stepX;
      const y = toY(series[i].value);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  function drawMatrix(canvas, labelsRow, labelsCol, probs, counts, overscale = 1) {
    if (!canvas) return;
    const ctx = setupCanvas(canvas, overscale);
    clearCanvas(ctx, canvas);
    const rect = canvas.getBoundingClientRect();
    const W = Math.floor(rect.width), H = Math.max(200, Math.floor(rect.height));
    const pad = { left: 70, right: 10, top: 24, bottom: 28 };
    const X = pad.left, Y = pad.top, PW = W - pad.left - pad.right, PH = H - pad.top - pad.bottom;
    const rows = labelsRow.length, cols = labelsCol.length;
    const cw = PW / Math.max(1, cols), ch = PH / Math.max(1, rows);
    ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const p = probs[r][c] || 0;
        const col = lerpColor('#0f172a', '#34d399', p);
        const x = X + c * cw, y = Y + r * ch;
        ctx.fillStyle = col; ctx.fillRect(x, y, Math.ceil(cw), Math.ceil(ch));
        ctx.strokeStyle = '#0b1220'; ctx.strokeRect(x + 0.5, y + 0.5, Math.ceil(cw) - 1, Math.ceil(ch) - 1);
        ctx.fillStyle = p > 0.5 ? '#0b0f14' : '#e6edf3';
        const pct = Math.round(p * 100) + '%';
        const cnt = counts[r][c] || 0;
        ctx.fillText(`${pct} • ${cnt}`, x + cw/2, y + ch/2);
      }
    }
    // labels
    ctx.fillStyle = '#94a3b8';
    for (let c = 0; c < cols; c++) ctx.fillText(labelsCol[c], X + c * cw + cw/2, Y + PH + 12);
    ctx.textAlign = 'right';
    for (let r = 0; r < rows; r++) ctx.fillText(labelsRow[r], X - 8, Y + r * ch + ch/2);
  }

  function drawRetention(canvas, r, overscale = 1) {
    if (!canvas || !r) return;
    const ctx = setupCanvas(canvas, overscale);
    clearCanvas(ctx, canvas);
    const rect = canvas.getBoundingClientRect();
    const W = Math.floor(rect.width), H = Math.max(140, Math.floor(rect.height));
    const pad = { left: 120, right: 20, top: 18, bottom: 24 };
    const X = pad.left, Y = pad.top, PW = W - pad.left - pad.right, PH = H - pad.top - pad.bottom;
    const entries = [
      ['D+1', r.d1],
      ['D+3', r.d3],
      ['D+7', r.d7],
    ];
    const maxV = 1;
    const barH = PH / entries.length;
    ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto';
    entries.forEach(([label, val], i) => {
      const y = Y + i * barH + 4;
      const w = (val / maxV) * (PW - 2);
      ctx.fillStyle = '#34d399';
      ctx.fillRect(X + 1, y, Math.max(0, w), Math.max(0, barH - 8));
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'right';
      ctx.fillText(label, X - 8, y + barH/2 + 4);
      ctx.textAlign = 'left';
      ctx.fillText(fmtPct(val), X + 8 + w, y + barH/2 + 4);
    });
  }

  function drawGroupedBars(canvas, categories, series, overscale = 1) {
    // series: [{ name, color, values: [..] }]
    if (!canvas || !categories?.length || !series?.length) return;
    const ctx = setupCanvas(canvas, overscale);
    clearCanvas(ctx, canvas);
    const rect = canvas.getBoundingClientRect();
    const W = Math.floor(rect.width), H = Math.max(200, Math.floor(rect.height));
    const pad = { left: 50, right: 20, top: 18, bottom: 34 };
    const X = pad.left, Y = pad.top, PW = W - pad.left - pad.right, PH = H - pad.top - pad.bottom;
    drawAxes(ctx, X, Y, PW, PH);
    const groups = categories.length;
    const barW = PW / Math.max(1, groups);
    const gap = 8;
    const innerW = Math.max(1, barW - gap);
    const n = series.length;
    const colW = innerW / Math.max(1, n);
    const maxV = 1; // percentages
    ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto';
    // x labels
    ctx.fillStyle = '#94a3b8'; ctx.textAlign = 'center';
    categories.forEach((c, i) => {
      const cx = X + i * barW + barW / 2;
      ctx.fillText(c, cx, Y + PH + 16);
    });
    // bars
    for (let i = 0; i < groups; i++) {
      for (let s = 0; s < n; s++) {
        const val = series[s].values[i] || 0;
        const x = X + i * barW + gap/2 + s * colW;
        const h = (val / maxV) * PH;
        const y = Y + PH - h;
        ctx.fillStyle = series[s].color || '#6ca0ff';
        ctx.fillRect(x, y, Math.max(0, colW - 2), Math.max(0, h));
      }
    }
    // legend
    let lx = X, ly = Y - 6;
    series.forEach(s => {
      ctx.fillStyle = s.color || '#6ca0ff'; ctx.fillRect(lx, ly - 10, 10, 10);
      ctx.fillStyle = '#94a3b8'; ctx.fillText(s.name, lx + 16, ly);
      lx += ctx.measureText(s.name).width + 46;
    });
  }

  function drawHeatmap(canvas, cols, rows, values, countLabels, colLabels = [], rowLabels = [], overscale = 1) {
    if (!canvas) return;
    const ctx = setupCanvas(canvas, overscale);
    clearCanvas(ctx, canvas);
    const rect = canvas.getBoundingClientRect();
    const W = Math.floor(rect.width);
    const H = Math.max(100, Math.floor(rect.height));
    const pad = { left: 60, right: 10, top: 18, bottom: 28 };
    const X = pad.left, Y = pad.top, PW = W - pad.left - pad.right, PH = H - pad.top - pad.bottom;
    const cw = PW / cols, ch = PH / rows;
    ctx.font = '11px system-ui, -apple-system, Segoe UI, Roboto';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const v = values[r][c] ?? 0;
        const col = lerpColor('#f87171', '#34d399', v);
        const x = X + c * cw, y = Y + r * ch;
        ctx.fillStyle = col; ctx.fillRect(x, y, Math.ceil(cw), Math.ceil(ch));
        ctx.strokeStyle = '#0b1220'; ctx.strokeRect(x + 0.5, y + 0.5, Math.ceil(cw) - 1, Math.ceil(ch) - 1);
        const label = countLabels?.[r]?.[c];
        if (label != null) {
          ctx.fillStyle = '#0b0f14';
          ctx.fillText(String(label), x + cw / 2, y + ch / 2);
        }
      }
    }
    ctx.fillStyle = '#94a3b8';
    for (let c = 0; c < Math.min(cols, colLabels.length); c++) {
      ctx.fillText(String(colLabels[c] ?? ''), X + c * cw + cw / 2, Y + PH + 12);
    }
    ctx.textAlign = 'right';
    for (let r = 0; r < Math.min(rows, rowLabels.length); r++) {
      ctx.fillText(String(rowLabels[r] ?? ''), X - 8, Y + r * ch + ch / 2);
    }
  }

  // Calendar heatmap (weeks x weekdays), values in [0,1] from Wow share
  function drawCalendar(canvas, days, perDay, overscale = 1) {
    if (!canvas || !days.length) return;
    const ctx = setupCanvas(canvas, overscale);
    clearCanvas(ctx, canvas);
    const rect = canvas.getBoundingClientRect();
    const W = Math.floor(rect.width);
    const H = Math.max(200, Math.floor(rect.height));
    const pad = { left: 50, right: 10, top: 18, bottom: 24 };
    const X = pad.left, Y = pad.top, PW = W - pad.left - pad.right, PH = H - pad.top - pad.bottom;

    // Build date objects for each day string
    const dObjs = days.map(d => new Date(d + 'T00:00:00Z'));
    const start = new Date(dObjs[0]);
    const end = new Date(dObjs[dObjs.length - 1]);
    // Align start to previous Sunday for grid
    const startDow = start.getUTCDay();
    const gridStart = new Date(start);
    gridStart.setUTCDate(start.getUTCDate() - startDow);
    // Compute number of weeks
    const msPerDay = 86400000;
    const totalDays = Math.ceil((end - gridStart) / msPerDay) + 1;
    const weeks = Math.ceil(totalDays / 7);
    const cw = PW / Math.max(1, weeks);
    const ch = PH / 7;

    ctx.font = '11px system-ui, -apple-system, Segoe UI, Roboto';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    // Weekday labels
    const WD = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    ctx.fillStyle = '#94a3b8';
    for (let r = 0; r < 7; r++) {
      ctx.textAlign = 'right';
      ctx.fillText(WD[r], X - 8, Y + r * ch + ch / 2);
    }

    // Draw cells
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(gridStart.getTime() + i * msPerDay);
      const col = Math.floor(i / 7);
      const row = d.getUTCDay();
      const key = d.toISOString().slice(0,10);
      const agg = perDay.get(key);
      const total = agg?.total || 0;
      const wow = agg?.counts?.['🤯'] || 0;
      const share = total ? wow / total : 0;
      const x = X + col * cw, y = Y + row * ch;
      const color = lerpColor('#0f172a', '#34d399', share);
      ctx.fillStyle = color; ctx.fillRect(x, y, Math.ceil(cw), Math.ceil(ch));
      ctx.strokeStyle = '#0b1220'; ctx.strokeRect(x + 0.5, y + 0.5, Math.ceil(cw) - 1, Math.ceil(ch) - 1);
      // selection outline
      if (selectedDay === key) {
        ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, Math.ceil(cw) - 2, Math.ceil(ch) - 2);
        ctx.lineWidth = 1;
      }
    }

    // Month labels (sparse)
    ctx.fillStyle = '#94a3b8'; ctx.textAlign = 'center';
    for (let w = 0; w < weeks; w++) {
      const d = new Date(gridStart.getTime() + w * 7 * msPerDay);
      if (d.getUTCDate() <= 7) {
        const label = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
        ctx.fillText(label, X + w * cw + cw / 2, Y + PH + 12);
      }
    }

    // Click handling to set selected day
    canvas.onclick = (ev) => {
      const rect = canvas.getBoundingClientRect();
      const mx = ev.clientX - rect.left;
      const my = ev.clientY - rect.top;
      if (mx < X || mx > X + PW || my < Y || my > Y + PH) return;
      const c = Math.floor((mx - X) / cw);
      const r = Math.floor((my - Y) / ch);
      const dayMs = gridStart.getTime() + (c * 7 + r) * msPerDay;
      const key = new Date(dayMs).toISOString().slice(0,10);
      if (perDay.has(key)) { selectedDay = key; renderDayDetails(); }
    };
  }

  function renderDayDetails() {
    if (!dayDrilldown || !computed) return;
    dayDrilldown.innerHTML = '';
    if (!selectedDay || !computed.perDay?.has(selectedDay)) {
      dayDrilldown.innerHTML = '<div class="muted" style="padding:8px">Select a day from the calendar above.</div>';
      return;
    }
    const d = computed.perDay.get(selectedDay);
    const wrap = document.createElement('div');
    const pretty = selectedDay;
    const counts = d.counts;
    wrap.innerHTML = `
      <div class="card" style="margin-bottom:8px">
        <div class="label">${pretty}</div>
        <div class="value">${d.total} responses • ${d.newCount} new • ${d.returningCount} returning</div>
        <div class="muted" style="margin-top:6px">🤯 ${counts['🤯']||0} • 🤔 ${counts['🤔']||0} • 😴 ${counts['😴']||0}</div>
      </div>
    `;
    // table of up to 50 items
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const trh = document.createElement('tr');
    ['Time (UTC)', 'Emoji', 'Network ID'].forEach(h => { const th = document.createElement('th'); th.textContent = h; trh.appendChild(th); });
    thead.appendChild(trh); table.appendChild(thead);
    const tbody = document.createElement('tbody');
    d.items.slice(0,50).forEach(it => {
      const tr = document.createElement('tr');
      const time = it.date.toISOString().slice(11,19);
      [time, it.emoji, it.id].forEach(v => { const td = document.createElement('td'); td.textContent = v || ''; tr.appendChild(td); });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
    dayDrilldown.appendChild(wrap);
  }

  function renderStories(c, overscale = 1) {
    const container = document.getElementById('storiesContainer');
    if (!container) return;
    container.innerHTML = '';
    (c.top3Stories || []).forEach((s, idx) => {
      const card = document.createElement('div');
      card.className = 'story-card';
      const shortId = s.id && s.id.length > 12 ? s.id.slice(0, 12) + '…' : (s.id || '—');
      const first = s.first.toISOString().replace('T', ' ').slice(0, 19);
      const last = s.last.toISOString().replace('T', ' ').slice(0, 19);
      const mixStr = ['🤯','🤔','😴'].map(e => `${e} ${(s.mix.get(e)||0)}`).join('  ');
      const sentiment = (s.sentimentAvg >= 0 ? '+' : '') + s.sentimentAvg.toFixed(2);
      card.innerHTML = `
        <div class="story-title">#${idx+1} ${shortId} — ${s.count} responses</div>
        <div class="story-sub">${first} → ${last} • ${s.daysActive} active day(s)</div>
        <div class="story-mix">Mix: ${mixStr} • Avg sentiment ${sentiment} • Last ${s.lastEmoji || '—'}</div>
        <canvas class="sparkline" height="60"></canvas>
      `;
      container.appendChild(card);
      const canvas = card.querySelector('canvas');
      drawSparkline(canvas, s.series, overscale);
    });
  }

  // UI builders
  function renderSummary(c) {
    mTotal.textContent = fmtNum(c.total);
    const start = c.minDate.toISOString().replace('T', ' ').slice(0, 19).replace(/\..*$/, '');
    const end = c.maxDate.toISOString().replace('T', ' ').slice(0, 19).replace(/\..*$/, '');
    mWindow.textContent = `${start} → ${end}`;
    mUnique.textContent = fmtNum(c.uniqueIDs);
    mRepeaters.textContent = fmtNum(c.repeaters);

    // Legend with labels
    legendEmoji.innerHTML = c.order.map(e => {
      const color = EMOJI_COLORS.get(e) || '#6ca0ff';
      const label = EMOJI_LABELS.get(e) || '';
      return `<span style="display:inline-flex;align-items:center;gap:6px;margin-right:14px"><span style="width:10px;height:10px;border-radius:2px;background:${color};display:inline-block"></span>${e} ${label}</span>`;
    }).join('');
  }

  function renderTables(c) {
    const headers = ['Submit Date (UTC)', 'Emoji', 'Network ID'];
    const el = document.createElement('div');
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const trh = document.createElement('tr');
    headers.forEach(h => { const th = document.createElement('th'); th.textContent = h; trh.appendChild(th); });
    thead.appendChild(trh); table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const r of c.recent) {
      const tr = document.createElement('tr');
      const dt = r.date.toISOString().replace('T', ' ').slice(0, 19);
      [dt, r.emoji, r.id].forEach(v => { const td = document.createElement('td'); td.textContent = v || ''; tr.appendChild(td); });
      tbody.appendChild(tr);
    }
    table.appendChild(tbody); el.appendChild(table);
    preview.innerHTML = ''; preview.appendChild(el);
  }

  function renderOutliers(c, outliers) {
    const el = document.getElementById('outliersList');
    if (!el) return;
    el.innerHTML = '';
    if (!outliers || !outliers.length) {
      el.innerHTML = '<div class="muted" style="padding:8px">No outliers detected (z-score threshold 2.0)</div>';
      return;
    }
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const trh = document.createElement('tr');
    ['Day', 'Responses', 'Flags'].forEach(h => { const th = document.createElement('th'); th.textContent = h; trh.appendChild(th); });
    thead.appendChild(trh); table.appendChild(thead);
    const tbody = document.createElement('tbody');
    outliers.slice(0, 12).forEach(o => {
      const tr = document.createElement('tr');
      const day = o.day;
      const tdDay = document.createElement('td'); tdDay.textContent = day; tr.appendChild(tdDay);
      const tdN = document.createElement('td'); tdN.textContent = String(o.total || 0); tr.appendChild(tdN);
      const tdFlags = document.createElement('td'); tdFlags.textContent = o.tags.join(', '); tr.appendChild(tdFlags);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody); el.appendChild(table);
  }

  function renderInsights(c) {
    const el = document.getElementById('sentimentInsights');
    if (!el) return;
    el.innerHTML = '';
    const parts = [
      { key: 'wow', emoji: '🤯', color: '#34d399' },
      { key: 'curious', emoji: '🤔', color: '#fbbf24' },
      { key: 'boring', emoji: '😴', color: '#f87171' },
    ];
    for (const p of parts) {
      const s = c.insights[p.key];
      const card = document.createElement('div');
      card.className = 'card';
      const changePct = (s.change >= 0 ? '+' : '') + Math.round(s.change * 100) + '%';
      card.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <div style="width:10px;height:10px;border-radius:2px;background:${p.color}"></div>
          <div style="font-weight:600">${p.emoji} ${s.label}</div>
        </div>
        <div class="muted" style="margin-bottom:6px">Avg share ${fmtPct(s.avg)} • Peak ${fmtPct(s.peak.value)} on ${s.peak.day}</div>
        <div class="muted">Recent 7-day avg ${fmtPct(s.recentAvg)} (${changePct} vs overall)</div>
      `;
      el.appendChild(card);
    }
  }

  function renderAllScaled(scale = 1) {
    if (!computed) return;
    renderSummary(computed);
    const stackedMap = currentAudience === 'new' ? computed.stackedNew : currentAudience === 'returning' ? computed.stackedRet : computed.stacked;
    drawStackedArea(cEmojiStacked, computed.days, computed.order, stackedMap, currentStackMode, scale);
    const series = currentAudience === 'new' ? computed.sentNew : currentAudience === 'returning' ? computed.sentRet : computed.sentimentSeries;
    const selectedOutliers = (currentOutlierMode === 'mad' ? computed.outliersMAD : computed.outliersZ) || [];
    const markers = selectedOutliers
      .filter(o => o.tags.some(t => t.toLowerCase().includes('engagement')))
      .map(o => ({ idx: o.idx, color: '#fbbf24' }));
    const bands = (showBandsChk && showBandsChk.checked) ? computed.bands : null;
    drawLine(cSentimentLine, computed.days, series, -1, 1, v => v.toFixed(2), scale, markers, bands);
    drawHorizontalBars(cTopIDsBar, computed.topIDs, scale);
    drawLine(cReturningRateLine, computed.days, computed.returningRate, 0, 1, v => fmtPct(v), scale);
    drawLine(cFlipRateLine, computed.days, computed.flipRate || [], 0, 1, v => fmtPct(v), scale);
    drawTernary(ternaryCanvas, computed.days, computed.dailyShares, computed.dailyTotals, computed.sentimentSeries, scale);
    drawCalendar(cCalendarHeatmap, computed.days, computed.perDay, scale);
    drawMatrix(cTransMatrix, (computed.transitions?.rows)||[], (computed.transitions?.cols)||[], (computed.transitions?.prob)||[], (computed.transitions?.counts)||[], scale);
    drawRetention(cRetentionBars, computed.retention, scale);
    // Cohort grouped bars
    if (cCohortBars && computed.cohortRetention) {
      const cats = ['D+1','D+3','D+7'];
      const series = [
        { name: '🤯 Wow', color: '#34d399', values: [computed.cohortRetention.rates['🤯'].d1, computed.cohortRetention.rates['🤯'].d3, computed.cohortRetention.rates['🤯'].d7] },
        { name: '🤔 Curious', color: '#fbbf24', values: [computed.cohortRetention.rates['🤔'].d1, computed.cohortRetention.rates['🤔'].d3, computed.cohortRetention.rates['🤔'].d7] },
        { name: '😴 Boring', color: '#f87171', values: [computed.cohortRetention.rates['😴'].d1, computed.cohortRetention.rates['😴'].d3, computed.cohortRetention.rates['😴'].d7] },
      ];
      drawGroupedBars(cCohortBars, cats, series, scale);
    }
    // Heatmaps (Pacific Time): Weekdays (Mon–Fri) and Weekends (Sat–Sun)
    const WEEK = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    if (cDowHeatmap && computed.pt) {
      const colsWk = ['Mon','Tue','Wed','Thu','Fri'];
      const colIdx = colsWk.map(n => WEEK.indexOf(n));
      const rows = 24, cols = colsWk.length;
      // choose grid based on metric
      const grid = currentWkdMetric === 'total' ? computed.pt.grid.counts
                  : currentWkdMetric === 'wow' ? computed.pt.grid.wow
                  : currentWkdMetric === 'curious' ? computed.pt.grid.cur
                  : computed.pt.grid.bor;
      const counts = Array.from({ length: rows }, (_, h) => colIdx.map(di => grid[di][h]));
      const maxV = Math.max(1, ...counts.flat());
      const values = counts.map(row => row.map(v => v / maxV));
      const rowLabels = Array(24).fill(0).map((_,h)=>String(h).padStart(2,'0'));
      drawHeatmap(cDowHeatmap, cols, rows, values, counts, colsWk, rowLabels, scale);
    }
    renderTables(computed);
    renderStories(computed, scale);
    renderOutliers(computed, selectedOutliers);
    renderInsights(computed);
  }

  function renderAll() { renderAllScaled(1); }

  function handleCSVText(text) {
    const data = parseCSV(text);
    if (!data.length) return;
    headers = data[0];
    rawRows = data.slice(1);
    const items = parseVB(rawRows, headers);
    computed = computeMetrics(items);
    renderAll();
  }

  // Events
  let currentStackMode = 'counts';
  stackModeInputs.forEach(inp => inp.addEventListener('change', () => {
    currentStackMode = stackModeInputs.find(i => i.checked)?.value || 'counts';
    renderAll();
  }));
  audModeInputs.forEach(inp => inp.addEventListener('change', () => {
    currentAudience = audModeInputs.find(i => i.checked)?.value || 'all';
    renderAll();
  }));
  outlierModeSel?.addEventListener('change', () => {
    currentOutlierMode = outlierModeSel.value || 'zscore';
    renderAll();
  });
  showBandsChk?.addEventListener('change', () => renderAll());
  wkdMetricInputs.forEach(inp => inp.addEventListener('change', () => {
    currentWkdMetric = wkdMetricInputs.find(i => i.checked)?.value || 'total';
    renderAll();
  }));
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => handleCSVText(String(reader.result || ''));
    reader.readAsText(file);
  });

  loadSampleBtn?.addEventListener('click', async () => {
    try {
      const res = await fetch('data/responses.csv', { cache: 'no-store' });
      const text = await res.text();
      handleCSVText(text);
    } catch (e) {
      alert('Unable to load data/responses.csv. If opening from file://, run `make serve` and try again.');
    }
  });

  // Layout edit toggle + restore saved layout
  applySavedLayout();
  editLayoutChk?.addEventListener('change', () => enableEditMode(!!editLayoutChk.checked));
  // Inject export buttons into panel heads
  injectPanelExportButtons();

  // Export: structured JSON of computed analysis for downstream tools
  exportJsonBtn?.addEventListener('click', () => {
    if (!computed) { alert('Load a CSV first to export.'); return; }
    try {
      const toObj = (m) => Object.fromEntries(Array.from(m.entries()));
      const c = computed;
      const analysis = {
        meta: {
          generated_at: new Date().toISOString(),
          app_version: 'v1',
          emoji_weights: Object.fromEntries(Array.from(EMOJI_WEIGHTS.entries())),
        },
        summary: {
          total: c.total,
          uniqueIDs: c.uniqueIDs,
          repeaters: c.repeaters,
          days: c.days.length,
          window_utc: { start: c.minDate.toISOString(), end: c.maxDate.toISOString() },
        },
        series: {
          days: c.days,
          stacked_all: toObj(c.stacked),
          stacked_new: toObj(c.stackedNew),
          stacked_returning: toObj(c.stackedRet),
          sentiment_all: c.sentimentSeries,
          sentiment_new: c.sentNew,
          sentiment_returning: c.sentRet,
          returning_rate: c.returningRate,
          daily_totals: c.dailyTotals,
          daily_shares: c.dailyShares,
          control_bands: c.bands,
          flip_rate: c.flipRate,
        },
        outliers: {
          zscore: c.outliersZ,
          mad: c.outliersMAD,
        },
        insights: c.insights,
        per_day: Array.from(c.perDay.entries()).map(([day, v]) => ({ day, ...v })),
        pacific_time: {
          grid_counts: c.pt?.grid?.counts || [],
          grid_wow: c.pt?.grid?.wow || [],
          grid_curious: c.pt?.grid?.cur || [],
          grid_boring: c.pt?.grid?.bor || [],
          dow_counts: c.pt?.dow?.counts || [],
          dow_wow: c.pt?.dow?.wow || [],
        },
        transitions: {
          labels: { rows: c.transitions?.rows || [], cols: c.transitions?.cols || [] },
          counts: c.transitions?.counts || [],
          prob: c.transitions?.prob || [],
        },
        retention: c.retention,
        cohorts: c.cohortRetention,
        top_ids: c.topIDs,
        recent: c.recent.map(r => ({ date: r.date.toISOString(), day: r.day, emoji: r.emoji, id: r.id })),
      };
      const blob = new Blob([JSON.stringify(analysis, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      a.download = `vb-daily-analysis-${ts}.json`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('JSON export failed. Please try again or check console.');
    }
  });

  // Export: open a printable window with chart images and key metrics
  exportBtn?.addEventListener('click', () => {
    if (!computed) {
      alert('Load a CSV first to export.');
      return;
    }
    try {
      // High-DPI render before capture
      const EXPORT_SCALE = 2; // increase to 3 for ultra crisp
      renderAllScaled(EXPORT_SCALE);
      const imgStacked = cEmojiStacked.toDataURL('image/png');
      const imgSent = cSentimentLine.toDataURL('image/png');
      const imgTern = ternaryCanvas ? ternaryCanvas.toDataURL('image/png') : null;
      const imgIDs = cTopIDsBar.toDataURL('image/png');
      // Capture story sparklines (if present)
      const storyCanvases = Array.from(document.querySelectorAll('#storiesContainer canvas'));
      const storyImgs = storyCanvases.map(c => {
        try { return c.toDataURL('image/png'); } catch { return null; }
      });

      // Build simple printable HTML
      const w = window.open('', '_blank');
      if (!w) return;
      const start = computed.minDate.toISOString().slice(0,19).replace('T',' ');
      const end = computed.maxDate.toISOString().slice(0,19).replace('T',' ');
      const doc = `<!doctype html>
        <html>
        <head>
          <meta charset="utf-8" />
          <title>VB Daily — Infographic Export</title>
          <style>
            @page { size: Letter; margin: 14mm; }
            @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
            body { font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Arial; color: #111827; }
            .header { display:flex; justify-content:space-between; align-items:flex-end; margin-bottom: 12px; }
            .title { font-weight:700; font-size: 18px; }
            .muted { color:#6b7280; font-size:12px; }
            .grid { display:grid; grid-template-columns: 1fr; gap: 12px; }
            .row2 { display:grid; grid-template-columns: 1fr 1fr; gap: 12px; }
            .row3 { display:grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
            .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; }
            .metrics { display:grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 8px; margin-bottom: 8px; }
            .metric { border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px; }
            .metric .label { color:#6b7280; font-size: 11px; }
            .metric .value { font-size: 18px; font-weight: 600; }
            img.chart { width: 100%; border: 1px solid #e5e7eb; border-radius: 8px; }
            h3 { margin: 0 0 6px 0; font-size: 14px; color:#374151; }
            ul { margin: 6px 0 0 16px; padding: 0; font-size: 12px; color:#374151; }
            .story { display:flex; flex-direction:column; gap:6px; }
            .story .title { font-size: 13px; font-weight: 600; color:#111827; }
            .story .sub, .story .mix { font-size: 12px; color:#374151; }
            img.spark { width: 100%; border: 1px solid #e5e7eb; border-radius: 6px; }
            /* Extras for nicer look */
            .brand { height: 8px; background: linear-gradient(90deg, #1e3a8a, #3b82f6); border-radius: 6px; margin-bottom: 8px; }
            .legend { display:flex; gap:10px; align-items:center; margin: 4px 0 6px; }
            .chip { display:inline-flex; align-items:center; gap:6px; }
            .dot { width:10px; height:10px; border-radius:2px; display:inline-block; }
            .footer { margin-top: 8px; text-align:right; color:#6b7280; font-size: 11px; }
          </style>
        </head>
        <body>
          <div class="brand"></div>
          <div class="header">
            <div class="title">VB Daily — Reader Reactions</div>
            <div class="muted">${start} → ${end}</div>
          </div>

          <div class="metrics">
            <div class="metric"><div class="label">Total Responses</div><div class="value">${fmtNum(computed.total)}</div></div>
            <div class="metric"><div class="label">Unique IDs</div><div class="value">${fmtNum(computed.uniqueIDs)}</div></div>
            <div class="metric"><div class="label">Repeaters</div><div class="value">${fmtNum(computed.repeaters)}</div></div>
            <div class="metric"><div class="label">Days Covered</div><div class="value">${computed.days.length}</div></div>
          </div>

          <div class="grid">
            <div class="card">
              <h3>Emoji Distribution Over Time (${document.querySelector('input[name="stackMode"]:checked')?.value || 'counts'})</h3>
              <div class="legend">
                <span class="chip"><span class="dot" style="background:#34d399"></span>🤯 Wow</span>
                <span class="chip"><span class="dot" style="background:#fbbf24"></span>🤔 Curious</span>
                <span class="chip"><span class="dot" style="background:#f87171"></span>😴 Boring</span>
              </div>
              <img class="chart" src="${imgStacked}" />
            </div>
            <div class="row2">
              <div class="card">
                <h3>Engagement Index</h3>
                <img class="chart" src="${imgSent}" />
              </div>
              <div class="card">
                <h3>Daily Mix — Ternary</h3>
                ${imgTern ? `<img class=\"chart\" src=\"${imgTern}\" />` : '<div class="muted">No ternary chart</div>'}
              </div>
            </div>
            <div class="card">
              <h3>Top Returning Network IDs</h3>
              <img class="chart" src="${imgIDs}" />
              <ul>
                ${computed.top3Stories.map(s => `<li>${s.id} — ${s.count} responses, ${s.daysActive} days, avg index ${(s.sentimentAvg>=0?'+':'')+s.sentimentAvg.toFixed(2)}</li>`).join('')}
              </ul>
            </div>
            <div class="card">
              <h3>Top 3 Returning Clickers — Stories</h3>
              <div class="row3">
                ${computed.top3Stories.map((s, i) => {
                  const shortId = s.id && s.id.length > 12 ? s.id.slice(0,12)+'…' : (s.id || '—');
                  const first = s.first.toISOString().slice(0,19).replace('T',' ');
                  const last = s.last.toISOString().slice(0,19).replace('T',' ');
                  const mix = `🤯 ${s.mix.get('🤯')||0}  •  🤔 ${s.mix.get('🤔')||0}  •  😴 ${s.mix.get('😴')||0}`;
                  const avg = (s.sentimentAvg>=0?'+':'')+s.sentimentAvg.toFixed(2);
                  const img = storyImgs[i] ? `<img class=\"spark\" src=\"${storyImgs[i]}\" />` : '';
                  return `<div class=\"story\">`+
                           `<div class=\"title\">#${i+1} ${shortId} — ${s.count} responses</div>`+
                           `<div class=\"sub\">${first} → ${last} • ${s.daysActive} day(s) • Last ${s.lastEmoji || '—'}</div>`+
                           `<div class=\"mix\">${mix} • Avg index ${avg}</div>`+
                           img+
                         `</div>`;
                }).join('')}
              </div>
            </div>
          </div>

          <div class="footer">Generated ${new Date().toISOString().slice(0,19).replace('T',' ')} UTC</div>
          <script>window.addEventListener('load', ()=> setTimeout(()=> window.print(), 250));</script>
        </body>
        </html>`;
      w.document.open();
      w.document.write(doc);
      w.document.close();
      // Restore normal resolution after capture
      renderAllScaled(1);
    } catch (err) {
      console.error(err);
      alert('Export failed. Please try again or share console errors.');
    }
  });

  // Export: composite PNG sheet
  exportPngSheetBtn?.addEventListener('click', () => exportPngSheet(2));

  // Re-render on resize
  const resize = new ResizeObserver(() => renderAll());
  [cEmojiStacked, cSentimentLine, cFlipRateLine, cTopIDsBar, cReturningRateLine, ternaryCanvas, cDowHeatmap, cCalendarHeatmap, cTransMatrix, cRetentionBars, cCohortBars]
    .forEach(c => c && resize.observe(c));
})();
