'use strict';
/* CPM (Critical Path Method) + SVG Gantt chart */

/* Forward/backward pass. Returns Map taskId -> {es, ef, ls, lf, slack, critical} (days from project start). */
function cpm(tasks) {
  const byId = new Map(tasks.map(tk => [tk.id, tk]));
  const res = new Map();
  const visiting = new Set();

  function es(id) {
    if (res.has(id)) return res.get(id).es;
    if (visiting.has(id)) return 0; // circular dep guard
    visiting.add(id);
    const tk = byId.get(id);
    let start = 0;
    for (const d of (tk.deps || [])) {
      if (!byId.has(d)) continue;
      const dep = byId.get(d);
      start = Math.max(start, es(d) + (+dep.duration || 0));
    }
    visiting.delete(id);
    res.set(id, { es: start, ef: start + (+tk.duration || 0) });
    return start;
  }
  tasks.forEach(tk => es(tk.id));

  const projEnd = Math.max(0, ...tasks.map(tk => res.get(tk.id).ef));
  // backward pass
  const succs = new Map(tasks.map(tk => [tk.id, []]));
  tasks.forEach(tk => (tk.deps || []).forEach(d => { if (succs.has(d)) succs.get(d).push(tk.id); }));
  const lfCache = new Map();
  function lf(id) {
    if (lfCache.has(id)) return lfCache.get(id);
    const ss = succs.get(id) || [];
    let v;
    if (ss.length === 0) v = projEnd;
    else v = Math.min(...ss.map(sid => lf(sid) - (+byId.get(sid).duration || 0)));
    lfCache.set(id, v);
    return v;
  }
  tasks.forEach(tk => {
    const r = res.get(tk.id);
    r.lf = lf(tk.id);
    r.ls = r.lf - (+tk.duration || 0);
    r.slack = r.ls - r.es;
    r.critical = r.slack <= 0.001;
  });
  return { map: res, projEnd };
}

function renderGantt(container, project, tasks, highlightCritical) {
  container.innerHTML = '';
  if (!project || tasks.length === 0) {
    container.innerHTML = `<p class="muted">${t('addTask')}…</p>`;
    return;
  }
  const { map, projEnd } = cpm(tasks);
  const dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const C = {
    bar: dark ? '#3987e5' : '#2a78d6', barDone: dark ? '#104281' : '#0d366b',
    crit: dark ? '#e66767' : '#e34948', critDone: '#8f1f1f',
    grid: dark ? '#2c2c2a' : '#e1e0d9', ink: dark ? '#c3c2b7' : '#52514e',
    muted: '#898781', today: dark ? '#c98500' : '#eda100',
  };

  const nameW = 210, rowH = 30, headH = 34, padR = 20;
  const dayW = Math.max(3.2, Math.min(10, 760 / Math.max(1, projEnd)));
  const chartW = nameW + projEnd * dayW + padR;
  const chartH = headH + tasks.length * rowH + 10;

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('class', 'gantt-svg');
  svg.setAttribute('width', chartW);
  svg.setAttribute('height', chartH);
  svg.setAttribute('viewBox', `0 0 ${chartW} ${chartH}`);
  const el = (tag, attrs, text) => {
    const e = document.createElementNS(svgNS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  };

  // weekly grid + date labels
  for (let d = 0; d <= projEnd; d += 7) {
    const x = nameW + d * dayW;
    svg.appendChild(el('line', { x1: x, y1: headH - 6, x2: x, y2: chartH - 8, stroke: C.grid, 'stroke-width': 1 }));
    const lbl = fmtDate(addDays(project.startDate, d)).replace(/\s*\d{4}|\s*25\d\d/, '');
    svg.appendChild(el('text', { x: x + 2, y: 14, 'font-size': 10, fill: C.muted }, lbl));
    svg.appendChild(el('text', { x: x + 2, y: 26, 'font-size': 9, fill: C.muted }, LANG === 'th' ? `วันที่ ${d}` : `d${d}`));
  }

  // today marker
  const today = (new Date() - new Date(project.startDate + 'T00:00:00')) / 86400000;
  if (today > 0 && today < projEnd) {
    const x = nameW + today * dayW;
    svg.appendChild(el('line', { x1: x, y1: headH - 6, x2: x, y2: chartH - 8, stroke: C.today, 'stroke-width': 2, 'stroke-dasharray': '4 3' }));
  }

  tasks.forEach((tk, i) => {
    const r = map.get(tk.id);
    const y = headH + i * rowH;
    const isCrit = highlightCritical && r.critical;
    // row baseline
    svg.appendChild(el('line', { x1: 0, y1: y + rowH - 2, x2: chartW - padR, y2: y + rowH - 2, stroke: C.grid, 'stroke-width': 0.5 }));
    // name (WBS + localized)
    const nm = `${tk.wbs}  ${ln(tk)}`;
    svg.appendChild(el('text', { x: 4, y: y + rowH / 2 + 3, 'font-size': 11.5, fill: C.ink }, nm.length > 34 ? nm.slice(0, 33) + '…' : nm));

    const bx = nameW + r.es * dayW, bw = Math.max(2, (+tk.duration || 0) * dayW);
    if ((+tk.duration || 0) === 0) {
      // milestone diamond
      const cx = bx, cy = y + rowH / 2 - 2;
      svg.appendChild(el('path', { d: `M ${cx} ${cy - 6} L ${cx + 6} ${cy} L ${cx} ${cy + 6} L ${cx - 6} ${cy} Z`, fill: C.today }));
    } else {
      const color = isCrit ? C.crit : C.bar;
      svg.appendChild(el('rect', { x: bx, y: y + 6, width: bw, height: rowH - 16, rx: 4, fill: color, opacity: 0.35 }));
      const pw = bw * Math.min(100, +tk.progress || 0) / 100;
      if (pw > 0) svg.appendChild(el('rect', { x: bx, y: y + 6, width: pw, height: rowH - 16, rx: 4, fill: color }));
      svg.appendChild(el('text', { x: bx + bw + 5, y: y + rowH / 2 + 3, 'font-size': 10, fill: C.muted }, `${tk.progress || 0}%`));
      const title = el('title', {});
      title.textContent = `${ln(tk)} — ${tk.duration} ${t('days')}, ${t('progress')} ${tk.progress}%` + (r.critical ? ` [${t('critical')}]` : ` (${t('floatDays')} ${r.slack}d)`);
      const hit = el('rect', { x: bx, y: y + 2, width: Math.max(bw, 12), height: rowH - 6, fill: 'transparent' });
      hit.appendChild(title);
      svg.appendChild(hit);
    }
  });

  container.appendChild(svg);
}
