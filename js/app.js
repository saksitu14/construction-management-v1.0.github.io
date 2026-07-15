'use strict';
/* App shell: routing, dashboard, projects, WBS, gantt page, resources, budget, reports, settings */

const chartsReg = {};
function makeChart(id, cfg) {
  if (typeof Chart === 'undefined') return; // offline: CDN unavailable — app still works, charts skipped
  if (chartsReg[id]) chartsReg[id].destroy();
  const ctx = document.getElementById(id);
  if (!ctx) return;
  chartsReg[id] = new Chart(ctx, cfg);
}
function chartInk() {
  const dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  return {
    s1: dark ? '#3987e5' : '#2a78d6',
    s2: dark ? '#199e70' : '#1baf7a',
    s3: dark ? '#c98500' : '#eda100',
    ink: dark ? '#c3c2b7' : '#52514e',
    muted: '#898781',
    grid: dark ? '#2c2c2a' : '#e1e0d9',
  };
}
function setChartDefaults() {
  if (typeof Chart === 'undefined') return;
  const C = chartInk();
  Chart.defaults.font.family = 'system-ui, -apple-system, "Segoe UI", "Leelawadee UI", sans-serif';
  Chart.defaults.font.size = 11.5;
  Chart.defaults.color = C.muted;
  Chart.defaults.borderColor = C.grid;
  Chart.defaults.plugins.legend.labels.boxWidth = 10;
  Chart.defaults.plugins.legend.labels.boxHeight = 10;
}

const tasksOf = pid => state.tasks.filter(tk => tk.projectId === pid);
const projProgress = p => {
  const ts = tasksOf(p.id);
  const bac = ts.reduce((s, tk) => s + (+tk.plannedCost || 0), 0);
  if (!bac) return 0;
  return ts.reduce((s, tk) => s + (+tk.plannedCost || 0) * (+tk.progress || 0) / 100, 0) / bac * 100;
};

/* ================= DASHBOARD ================= */
function renderDashboard() {
  const parts = state.projects.map(p => ({ p, evm: computeEVM(p, tasksOf(p.id)) }));
  const sum = f => parts.reduce((s, x) => s + f(x.evm), 0);
  const PV = sum(e => e.pv), EV = sum(e => e.ev), AC = sum(e => e.ac), BAC = sum(e => e.bac);
  const spi = PV > 0 ? EV / PV : 1, cpi = AC > 0 ? EV / AC : 1;
  const eac = cpi > 0 ? BAC / cpi : BAC;
  const avgProg = state.projects.length ? state.projects.reduce((s, p) => s + projProgress(p), 0) / state.projects.length : 0;

  const kpi = (label, value, sub, cls) => `
    <div class="kpi"><div class="k-label">${label}</div><div class="k-value">${value}</div>
    ${sub ? `<div class="k-sub ${cls || ''}">${sub}</div>` : ''}</div>`;
  document.getElementById('dashKpis').innerHTML =
    kpi(t('kpiProjects'), state.projects.filter(p => p.status === 'active').length, `${state.projects.length} ${t('navProjects').toLowerCase()}`) +
    kpi(t('kpiBudget'), fmtMoneyShort(BAC), fmtMoney(BAC)) +
    kpi(t('kpiProgress'), avgProg.toFixed(0) + '%') +
    kpi(t('kpiSPI'), spi.toFixed(2), (spi >= 1 ? '▲ ' : '▼ ') + t(spi >= 1 ? 'onSchedule' : 'behindSchedule'), spi >= 1 ? 'up' : 'down') +
    kpi(t('kpiCPI'), cpi.toFixed(2), (cpi >= 1 ? '▲ ' : '▼ ') + t(cpi >= 1 ? 'underBudget' : 'overBudget'), cpi >= 1 ? 'up' : 'down') +
    kpi(t('kpiEAC'), fmtMoneyShort(eac), `VAC ${fmtMoneyShort(BAC - eac)}`, BAC - eac >= 0 ? 'up' : 'down');

  const C = chartInk();
  setChartDefaults();

  makeChart('chBudget', {
    type: 'bar',
    data: {
      labels: state.projects.map(p => ln(p)),
      datasets: [
        { label: t('bac'), data: parts.map(x => x.evm.bac), backgroundColor: C.s1, borderRadius: 4, maxBarThickness: 42 },
        { label: t('ac'), data: parts.map(x => x.evm.ac), backgroundColor: C.s2, borderRadius: 4, maxBarThickness: 42 },
      ],
    },
    options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { y: { ticks: { callback: v => fmtMoneyShort(v) } } } },
  });

  makeChart('chProgress', {
    type: 'bar',
    data: {
      labels: state.projects.map(p => ln(p)),
      datasets: [{ data: state.projects.map(p => +projProgress(p).toFixed(1)), backgroundColor: C.s1, borderRadius: 4, maxBarThickness: 26 }],
    },
    options: {
      indexAxis: 'y', maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => c.parsed.x + '%' } } },
      scales: { x: { min: 0, max: 100, ticks: { callback: v => v + '%' } } },
    },
  });

  /* combined weekly S-curve across projects (calendar-aligned) */
  const starts = state.projects.map(p => new Date(p.startDate + 'T00:00:00').getTime());
  const ends = parts.map(x => addDays(x.p.startDate, x.evm.projEnd).getTime());
  if (starts.length) {
    const t0 = Math.min(...starts), t1 = Math.max(...ends);
    const weeks = Math.ceil((t1 - t0) / 86400000 / 7);
    const labels = [], pvC = [], evC = [], acC = [];
    const now = Date.now();
    for (let wk = 0; wk <= weeks; wk++) {
      const tms = t0 + wk * 7 * 86400000;
      labels.push(fmtDate(new Date(tms).toISOString().slice(0, 10)));
      let pv = 0, ev = 0, ac = 0;
      for (const x of parts) {
        const d = (tms - new Date(x.p.startDate + 'T00:00:00').getTime()) / 86400000;
        pv += x.evm.fns.pvAt(Math.max(0, Math.min(d, x.evm.projEnd)));
        if (tms <= now) {
          ev += x.evm.fns.accrAt(Math.max(0, d), 'ev');
          ac += x.evm.fns.accrAt(Math.max(0, d), 'ac');
        }
      }
      pvC.push(pv); evC.push(tms <= now ? ev : null); acC.push(tms <= now ? ac : null);
    }
    makeChart('chSCurve', sCurveConfig(labels, pvC, evC, acC));
  }

  const types = ['labor', 'material', 'equipment'];
  makeChart('chResource', {
    type: 'doughnut',
    data: {
      labels: [t('typeLabor'), t('typeMaterial'), t('typeEquipment')],
      datasets: [{
        data: types.map(ty => state.resources.filter(r => r.type === ty).reduce((s, r) => s + r.unitCost * r.qty, 0)),
        backgroundColor: [C.s1, C.s2, C.s3], borderWidth: 2,
      }],
    },
    options: {
      maintainAspectRatio: false, cutout: '58%',
      plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: c => `${c.label}: ${fmtMoney(c.parsed)}` } } },
    },
  });
}

function sCurveConfig(labels, pv, ev, ac) {
  const C = chartInk();
  const line = (label, data, color, dash) => ({
    label, data, borderColor: color, backgroundColor: color, borderWidth: 2,
    pointRadius: 0, pointHoverRadius: 4, borderDash: dash || [], spanGaps: false,
  });
  return {
    type: 'line',
    data: { labels, datasets: [line(t('pv'), pv, C.s1, [6, 4]), line(t('ev'), ev, C.s2), line(t('ac'), ac, C.s3)] },
    options: {
      maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
      plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: c => `${c.dataset.label}: ${fmtMoneyShort(c.parsed.y)}` } } },
      scales: { y: { ticks: { callback: v => fmtMoneyShort(v) } }, x: { ticks: { maxTicksLimit: 10 } } },
    },
  };
}

/* ================= PROJECTS ================= */
function renderProjects() {
  const q = (document.getElementById('projSearch').value || '').toLowerCase();
  const thead = document.querySelector('#projectsTable thead');
  const tbody = document.querySelector('#projectsTable tbody');
  thead.innerHTML = `<tr><th>${t('projName')}</th><th>${t('client')}</th><th>${t('startDate')}</th><th>${t('endDate')}</th>
    <th class="num">${t('budget')}</th><th>${t('progress')}</th><th>${t('status')}</th><th>${t('actions')}</th></tr>`;
  const pills = { active: 'statusActive', planning: 'statusPlanning', complete: 'statusComplete', onhold: 'statusOnhold' };
  tbody.innerHTML = state.projects
    .filter(p => !q || ln(p).toLowerCase().includes(q) || (p.name || '').toLowerCase().includes(q) || (p.nameEn || '').toLowerCase().includes(q))
    .map(p => {
      const prog = projProgress(p);
      return `<tr>
      <td><b>${ln(p)}</b><br><span class="muted small">${LANG === 'en' ? (p.locationEn || p.location) : p.location}</span></td>
      <td>${LANG === 'en' ? (p.clientEn || p.client) : p.client}</td>
      <td>${fmtDate(p.startDate)}</td><td>${fmtDate(p.endDate)}</td>
      <td class="num">${fmtMoney(p.budget)}</td>
      <td><div class="progress-track"><div class="progress-fill" style="width:${prog}%"></div></div><span class="muted small">${prog.toFixed(0)}%</span></td>
      <td><span class="pill ${p.status}">${t(pills[p.status] || 'statusPlanning')}</span></td>
      <td><button class="btn icon" data-edit="${p.id}">✏️</button> <button class="btn icon" data-del="${p.id}">🗑</button></td>
      </tr>`;
    }).join('');
  tbody.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => projectForm(b.dataset.edit)));
  tbody.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
    if (!confirm(t('delConfirm'))) return;
    state.projects = state.projects.filter(p => p.id !== b.dataset.del);
    state.tasks = state.tasks.filter(tk => tk.projectId !== b.dataset.del);
    persist(); renderProjects();
  }));
}

function projectForm(id) {
  const p = state.projects.find(x => x.id === id) || {
    id: null, name: '', nameEn: '', client: '', location: '',
    startDate: todayStr(), endDate: todayStr(), budget: 10000000, status: 'planning',
  };
  const f = (label, html) => `<label class="fld">${label}</label>${html}`;
  openModal(id ? t('editTitle') : t('addProject'), `
    ${f(t('projName') + ' (ไทย)', `<input class="input" id="f_name" value="${p.name || ''}">`)}
    ${f(t('projName') + ' (EN)', `<input class="input" id="f_nameEn" value="${p.nameEn || ''}">`)}
    ${f(t('client'), `<input class="input" id="f_client" value="${p.client || ''}">`)}
    ${f(t('location'), `<input class="input" id="f_location" value="${p.location || ''}">`)}
    <div class="form-grid-2">
      <div>${f(t('startDate'), `<input class="input" type="date" id="f_start" value="${p.startDate}">`)}</div>
      <div>${f(t('endDate'), `<input class="input" type="date" id="f_end" value="${p.endDate}">`)}</div>
    </div>
    ${f(t('budget') + ' (฿)', `<input class="input" type="number" id="f_budget" value="${p.budget}">`)}
    ${f(t('status'), `<select class="input" id="f_status">
      <option value="planning" ${p.status === 'planning' ? 'selected' : ''}>${t('statusPlanning')}</option>
      <option value="active" ${p.status === 'active' ? 'selected' : ''}>${t('statusActive')}</option>
      <option value="complete" ${p.status === 'complete' ? 'selected' : ''}>${t('statusComplete')}</option>
      <option value="onhold" ${p.status === 'onhold' ? 'selected' : ''}>${t('statusOnhold')}</option></select>`)}
  `, () => {
    const v = k => document.getElementById(k).value;
    const data = {
      name: v('f_name'), nameEn: v('f_nameEn'), client: v('f_client'), location: v('f_location'),
      startDate: v('f_start'), endDate: v('f_end'), budget: +v('f_budget') || 0, status: v('f_status'),
    };
    if (id) Object.assign(state.projects.find(x => x.id === id), data);
    else state.projects.push({ id: uid('p'), clientEn: data.client, locationEn: data.location, ...data });
    persist(); renderProjects(); refreshProjectSelects();
  });
}

/* ================= WBS ================= */
function renderWbs() {
  const pid = document.getElementById('wbsProject').value || state.projects[0]?.id;
  const cont = document.getElementById('wbsTree');
  const ts = tasksOf(pid).slice().sort((a, b) => String(a.wbs).localeCompare(String(b.wbs), undefined, { numeric: true }));
  cont.innerHTML = ts.map(tk => {
    const isChild = String(tk.wbs).includes('.') && !String(tk.wbs).endsWith('.0');
    return `<div class="wbs-item" style="padding-left:${isChild ? 34 : 6}px">
      <span class="wbs-code">${tk.wbs}</span>
      <span class="wbs-name">${ln(tk)}</span>
      <div class="progress-track" style="width:110px"><div class="progress-fill" style="width:${tk.progress}%"></div></div>
      <span class="muted small mono">${tk.progress}%</span>
      <span class="wbs-cost">${fmtMoneyShort(tk.plannedCost)}</span>
    </div>`;
  }).join('') || `<p class="muted">${t('addTask')}…</p>`;
}

/* ================= GANTT page ================= */
function renderGanttPage() {
  const pid = document.getElementById('ganttProject').value || state.projects[0]?.id;
  const p = state.projects.find(x => x.id === pid);
  const ts = tasksOf(pid);
  renderGantt(document.getElementById('ganttChart'), p, ts, document.getElementById('chkCritical').checked);

  const { map } = cpm(ts);
  const thead = document.querySelector('#taskTable thead');
  const tbody = document.querySelector('#taskTable tbody');
  thead.innerHTML = `<tr><th>${t('wbsCode')}</th><th>${t('taskName')}</th><th class="num">${t('duration')}</th>
    <th>${t('startDate')}</th><th>${t('endDate')}</th><th class="num">${t('floatDays')}</th>
    <th>${t('progress')}</th><th class="num">${t('plannedCost')}</th><th class="num">${t('actualCost')}</th><th>${t('actions')}</th></tr>`;
  tbody.innerHTML = ts.map(tk => {
    const r = map.get(tk.id);
    return `<tr>
      <td class="mono">${tk.wbs}</td>
      <td>${ln(tk)} ${r.critical ? `<span class="pill fail">${t('critical')}</span>` : ''}</td>
      <td class="num">${tk.duration} ${t('days')}</td>
      <td>${fmtDate(addDays(p.startDate, r.es))}</td>
      <td>${fmtDate(addDays(p.startDate, r.ef))}</td>
      <td class="num">${r.slack.toFixed(0)}</td>
      <td><div class="progress-track"><div class="progress-fill" style="width:${tk.progress}%"></div></div></td>
      <td class="num">${fmtMoney(tk.plannedCost)}</td>
      <td class="num">${fmtMoney(tk.actualCost)}</td>
      <td><button class="btn icon" data-edit="${tk.id}">✏️</button> <button class="btn icon" data-del="${tk.id}">🗑</button></td>
    </tr>`;
  }).join('');
  tbody.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => taskForm(pid, b.dataset.edit)));
  tbody.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
    if (!confirm(t('delConfirm'))) return;
    state.tasks = state.tasks.filter(tk => tk.id !== b.dataset.del);
    state.tasks.forEach(tk => { tk.deps = (tk.deps || []).filter(d => d !== b.dataset.del); });
    persist(); renderGanttPage();
  }));
}

function taskForm(pid, id) {
  const tk = state.tasks.find(x => x.id === id) || {
    id: null, projectId: pid, wbs: '', name: '', nameEn: '', duration: 10, deps: [],
    progress: 0, plannedCost: 500000, actualCost: 0,
  };
  const others = tasksOf(pid).filter(x => x.id !== id);
  const f = (label, html) => `<label class="fld">${label}</label>${html}`;
  openModal(id ? t('editTitle') : t('addTask'), `
    <div class="form-grid-2">
      <div>${f(t('wbsCode'), `<input class="input" id="f_wbs" value="${tk.wbs}">`)}</div>
      <div>${f(t('duration') + ` (${t('days')})`, `<input class="input" type="number" id="f_dur" value="${tk.duration}">`)}</div>
    </div>
    ${f(t('taskName') + ' (ไทย)', `<input class="input" id="f_tname" value="${tk.name || ''}">`)}
    ${f(t('taskName') + ' (EN)', `<input class="input" id="f_tnameEn" value="${tk.nameEn || ''}">`)}
    ${f(t('deps'), `<select class="input" id="f_deps" multiple size="4">${others.map(o =>
      `<option value="${o.id}" ${(tk.deps || []).includes(o.id) ? 'selected' : ''}>${o.wbs} ${ln(o)}</option>`).join('')}</select>`)}
    <div class="form-grid-2">
      <div>${f(t('progress') + ' (%)', `<input class="input" type="number" min="0" max="100" id="f_prog" value="${tk.progress}">`)}</div>
      <div></div>
      <div>${f(t('plannedCost'), `<input class="input" type="number" id="f_pc" value="${tk.plannedCost}">`)}</div>
      <div>${f(t('actualCost'), `<input class="input" type="number" id="f_ac" value="${tk.actualCost}">`)}</div>
    </div>
  `, () => {
    const v = k => document.getElementById(k).value;
    const deps = [...document.getElementById('f_deps').selectedOptions].map(o => o.value);
    const data = {
      wbs: v('f_wbs'), name: v('f_tname'), nameEn: v('f_tnameEn'), duration: +v('f_dur') || 0,
      deps, progress: Math.min(100, Math.max(0, +v('f_prog') || 0)),
      plannedCost: +v('f_pc') || 0, actualCost: +v('f_ac') || 0,
    };
    if (id) Object.assign(state.tasks.find(x => x.id === id), data);
    else state.tasks.push({ id: uid('t'), projectId: pid, ...data });
    persist(); renderGanttPage();
  });
}

/* ================= RESOURCES ================= */
function renderResources() {
  const thead = document.querySelector('#resourceTable thead');
  const tbody = document.querySelector('#resourceTable tbody');
  thead.innerHTML = `<tr><th>${t('resourceName')}</th><th>${t('resourceType')}</th><th>${t('unit')}</th>
    <th class="num">${t('unitCost')}</th><th class="num">${t('qty')}</th><th class="num">${t('totalCost')}</th><th>${t('actions')}</th></tr>`;
  const tyLabel = { labor: 'typeLabor', material: 'typeMaterial', equipment: 'typeEquipment' };
  tbody.innerHTML = state.resources.map(r => `<tr>
    <td>${ln(r)}</td><td>${t(tyLabel[r.type])}</td><td>${LANG === 'en' ? (r.unitEn || r.unit) : r.unit}</td>
    <td class="num">${fmtMoney(r.unitCost)}</td><td class="num">${r.qty.toLocaleString()}</td>
    <td class="num"><b>${fmtMoney(r.unitCost * r.qty)}</b></td>
    <td><button class="btn icon" data-edit="${r.id}">✏️</button> <button class="btn icon" data-del="${r.id}">🗑</button></td>
  </tr>`).join('');
  tbody.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => resourceForm(b.dataset.edit)));
  tbody.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
    if (!confirm(t('delConfirm'))) return;
    state.resources = state.resources.filter(r => r.id !== b.dataset.del);
    persist(); renderResources();
  }));
}

function resourceForm(id) {
  const r = state.resources.find(x => x.id === id) || { name: '', nameEn: '', type: 'labor', unit: '', unitEn: '', unitCost: 0, qty: 1 };
  const f = (label, html) => `<label class="fld">${label}</label>${html}`;
  openModal(id ? t('editTitle') : t('addResource'), `
    ${f(t('resourceName') + ' (ไทย)', `<input class="input" id="f_rname" value="${r.name}">`)}
    ${f(t('resourceName') + ' (EN)', `<input class="input" id="f_rnameEn" value="${r.nameEn}">`)}
    ${f(t('resourceType'), `<select class="input" id="f_rtype">
      <option value="labor" ${r.type === 'labor' ? 'selected' : ''}>${t('typeLabor')}</option>
      <option value="material" ${r.type === 'material' ? 'selected' : ''}>${t('typeMaterial')}</option>
      <option value="equipment" ${r.type === 'equipment' ? 'selected' : ''}>${t('typeEquipment')}</option></select>`)}
    <div class="form-grid-2">
      <div>${f(t('unit'), `<input class="input" id="f_runit" value="${r.unit}">`)}</div>
      <div>${f(t('unitCost'), `<input class="input" type="number" id="f_rcost" value="${r.unitCost}">`)}</div>
    </div>
    ${f(t('qty'), `<input class="input" type="number" id="f_rqty" value="${r.qty}">`)}
  `, () => {
    const v = k => document.getElementById(k).value;
    const data = { name: v('f_rname'), nameEn: v('f_rnameEn'), type: v('f_rtype'), unit: v('f_runit'), unitEn: v('f_runit'), unitCost: +v('f_rcost') || 0, qty: +v('f_rqty') || 0 };
    if (id) Object.assign(state.resources.find(x => x.id === id), data);
    else state.resources.push({ id: uid('r'), ...data });
    persist(); renderResources();
  });
}

/* ================= BUDGET / EVM ================= */
function renderBudget() {
  const pid = document.getElementById('evmProject').value || state.projects[0]?.id;
  const p = state.projects.find(x => x.id === pid);
  if (!p) return;
  const ts = tasksOf(pid);
  const e = computeEVM(p, ts);

  const kpi = (label, value, sub, cls) => `
    <div class="kpi"><div class="k-label">${label}</div><div class="k-value">${value}</div>
    ${sub ? `<div class="k-sub ${cls || ''}">${sub}</div>` : ''}</div>`;
  document.getElementById('evmKpis').innerHTML =
    kpi(t('bac'), fmtMoneyShort(e.bac)) +
    kpi(t('pv'), fmtMoneyShort(e.pv), `${t('plannedPct')} ${e.plannedPct.toFixed(1)}%`) +
    kpi(t('ev'), fmtMoneyShort(e.ev), `${t('actualPct')} ${e.actualPct.toFixed(1)}%`) +
    kpi(t('ac'), fmtMoneyShort(e.ac)) +
    kpi('SPI', e.spi.toFixed(2), 'SPI = EV / PV', e.spi >= 1 ? 'up' : 'down') +
    kpi('CPI', e.cpi.toFixed(2), 'CPI = EV / AC', e.cpi >= 1 ? 'up' : 'down') +
    kpi(t('eac'), fmtMoneyShort(e.eac), `${t('vac')} ${fmtMoneyShort(e.vac)}`, e.vac >= 0 ? 'up' : 'down');

  setChartDefaults();
  makeChart('chEvm', sCurveConfig(e.curve.labels, e.curve.pv, e.curve.ev, e.curve.ac));

  const thead = document.querySelector('#evmTaskTable thead');
  const tbody = document.querySelector('#evmTaskTable tbody');
  thead.innerHTML = `<tr><th>${t('wbsCode')}</th><th>${t('taskName')}</th>
    <th class="num">${t('plannedCost')}</th><th class="num">EV</th><th class="num">${t('actualCost')}</th><th class="num">CV</th></tr>`;
  tbody.innerHTML = ts.map(tk => {
    const ev = (+tk.plannedCost || 0) * (+tk.progress || 0) / 100;
    const cv = ev - (+tk.actualCost || 0);
    return `<tr><td class="mono">${tk.wbs}</td><td>${ln(tk)}</td>
      <td class="num">${fmtMoney(tk.plannedCost)}</td><td class="num">${fmtMoney(ev)}</td>
      <td class="num">${fmtMoney(tk.actualCost)}</td>
      <td class="num" style="color:${cv >= 0 ? 'var(--good)' : 'var(--critical)'}">${fmtMoney(cv)}</td></tr>`;
  }).join('');
}

/* ================= REPORTS ================= */
function renderReports() {
  const pid = document.getElementById('reportProject').value || state.projects[0]?.id;
  const p = state.projects.find(x => x.id === pid);
  const body = document.getElementById('reportBody');
  if (!p) { body.innerHTML = ''; return; }
  const ts = tasksOf(pid);
  const e = computeEVM(p, ts);
  const { map } = cpm(ts);
  const pills = { active: 'statusActive', planning: 'statusPlanning', complete: 'statusComplete', onhold: 'statusOnhold' };

  let html = `<h2>${t('reportFor')} — ${ln(p)}</h2>
  <div class="rep-sub">${t('generated')}: ${fmtDate(todayStr())}</div>
  <div class="rep-grid">
    <div><dt>${t('client')}:</dt><dd>${LANG === 'en' ? (p.clientEn || p.client) : p.client}</dd></div>
    <div><dt>${t('location')}:</dt><dd>${LANG === 'en' ? (p.locationEn || p.location) : p.location}</dd></div>
    <div><dt>${t('startDate')}:</dt><dd>${fmtDate(p.startDate)}</dd></div>
    <div><dt>${t('endDate')}:</dt><dd>${fmtDate(p.endDate)}</dd></div>
    <div><dt>${t('budget')}:</dt><dd>${fmtMoney(p.budget)}</dd></div>
    <div><dt>${t('status')}:</dt><dd>${t(pills[p.status])}</dd></div>
  </div>

  <h4>${t('evmSummary')}</h4>
  <div class="rep-kpis">
    <div class="kpi"><div class="k-label">${t('pv')}</div><div class="k-value">${fmtMoneyShort(e.pv)}</div></div>
    <div class="kpi"><div class="k-label">${t('ev')}</div><div class="k-value">${fmtMoneyShort(e.ev)}</div></div>
    <div class="kpi"><div class="k-label">SPI</div><div class="k-value">${e.spi.toFixed(2)}</div></div>
    <div class="kpi"><div class="k-label">CPI</div><div class="k-value">${e.cpi.toFixed(2)}</div></div>
  </div>
  <p class="small">${t('bac')}: <b>${fmtMoney(e.bac)}</b> · ${t('ac')}: <b>${fmtMoney(e.ac)}</b> · ${t('eac')}: <b>${fmtMoney(e.eac)}</b> · ${t('vac')}: <b>${fmtMoney(e.vac)}</b></p>

  <h4>${t('taskSchedule')}</h4>
  <table class="table"><thead><tr><th>${t('wbsCode')}</th><th>${t('taskName')}</th>
  <th>${t('startDate')}</th><th>${t('endDate')}</th><th class="num">${t('progress')}</th>
  <th class="num">${t('plannedCost')}</th><th class="num">${t('actualCost')}</th></tr></thead><tbody>` +
    ts.map(tk => {
      const r = map.get(tk.id);
      return `<tr><td class="mono">${tk.wbs}</td><td>${ln(tk)}${r.critical ? ' ★' : ''}</td>
      <td>${fmtDate(addDays(p.startDate, r.es))}</td><td>${fmtDate(addDays(p.startDate, r.ef))}</td>
      <td class="num">${tk.progress}%</td><td class="num">${fmtMoney(tk.plannedCost)}</td><td class="num">${fmtMoney(tk.actualCost)}</td></tr>`;
    }).join('') + `</tbody></table>
  <p class="muted small">★ = ${t('critical')} (Critical Path Method)</p>

  <h4>${t('resourceSummary')}</h4>
  <table class="table"><thead><tr><th>${t('resourceName')}</th><th>${t('resourceType')}</th>
  <th class="num">${t('unitCost')}</th><th class="num">${t('qty')}</th><th class="num">${t('totalCost')}</th></tr></thead><tbody>` +
    state.resources.map(r => `<tr><td>${ln(r)}</td><td>${t({ labor: 'typeLabor', material: 'typeMaterial', equipment: 'typeEquipment' }[r.type])}</td>
    <td class="num">${fmtMoney(r.unitCost)}</td><td class="num">${r.qty.toLocaleString()}</td><td class="num">${fmtMoney(r.unitCost * r.qty)}</td></tr>`).join('') +
    `</tbody></table>

  <h4>${t('structuralSummary')}</h4>`;

  if (Struct.results) {
    const rows = designCheckAISC(Struct.results);
    html += `<p class="small"><b>${Struct.sourceName}</b> — ${state.settings.apiMode === 'api' ? 'SkyCiv API' : 'Demo Mode'}</p>
    <table class="table"><thead><tr><th>${t('member')}</th><th>${t('section')}</th>
    <th class="num">${t('maxN')}</th><th class="num">${t('maxM')}</th><th class="num">${t('dcr')}</th><th>${t('result')}</th></tr></thead><tbody>` +
      Struct.results.memberResults.map((mr, i) => {
        const r = rows[i];
        return `<tr><td>${mr.id}</td><td>${mr.section}</td>
        <td class="num">${mr.maxN.toFixed(1)}</td><td class="num">${mr.maxM.toFixed(1)}</td>
        <td class="num">${r.na ? '—' : r.dcr.toFixed(2)}</td>
        <td>${r.na ? t('na') : (r.pass ? '✓ ' + t('pass') : '✗ ' + t('fail'))}</td></tr>`;
      }).join('') + `</tbody></table>`;
  } else {
    html += `<p class="muted small">${t('noStructResults')}</p>`;
  }
  body.innerHTML = html;
}

/* ================= SETTINGS ================= */
function renderSettings() {
  const st = state.settings;
  document.getElementById('setLang').value = st.lang || 'th';
  document.querySelectorAll('input[name="apiMode"]').forEach(r => { r.checked = r.value === (st.apiMode || 'demo'); });
  document.getElementById('setSkyUser').value = st.skyUser || '';
  document.getElementById('setSkyKey').value = st.skyKey || '';
}

function updateModeBadge() {
  const b = document.getElementById('modeBadge');
  const api = state.settings.apiMode === 'api';
  b.textContent = api ? 'SkyCiv API MODE' : 'DEMO MODE';
  b.classList.toggle('api', api);
}

/* ================= MODAL ================= */
function openModal(title, bodyHtml, onOk) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHtml;
  const modal = document.getElementById('modal');
  modal.hidden = false;
  applyI18n(modal);
  const close = () => { modal.hidden = true; };
  document.getElementById('modalOk').onclick = () => { if (onOk() !== false) close(); };
  document.getElementById('modalCancel').onclick = close;
  document.getElementById('modalClose').onclick = close;
}

/* ================= ROUTER ================= */
const PAGES = {
  dashboard: { title: 'navDashboard', render: renderDashboard },
  projects: { title: 'navProjects', render: renderProjects },
  wbs: { title: 'navWbs', render: renderWbs },
  gantt: { title: 'navGantt', render: renderGanttPage },
  resources: { title: 'navResources', render: renderResources },
  budget: { title: 'navBudget', render: renderBudget },
  structural: { title: 'navStructural', render: renderStructuralPage },
  reports: { title: 'navReports', render: renderReports },
  settings: { title: 'navSettings', render: renderSettings },
};

function navigate() {
  const page = (location.hash || '#dashboard').slice(1);
  const cfg = PAGES[page] || PAGES.dashboard;
  document.querySelectorAll('.page').forEach(s => s.classList.toggle('active', s.id === 'page-' + (PAGES[page] ? page : 'dashboard')));
  document.querySelectorAll('.nav-link').forEach(a => a.classList.toggle('active', a.dataset.page === (PAGES[page] ? page : 'dashboard')));
  document.getElementById('pageTitle').textContent = t(cfg.title);
  cfg.render();
}

function refreshProjectSelects() {
  for (const id of ['wbsProject', 'ganttProject', 'evmProject', 'reportProject']) {
    const sel = document.getElementById(id);
    const cur = sel.value;
    sel.innerHTML = state.projects.map(p => `<option value="${p.id}">${ln(p)}</option>`).join('');
    if (state.projects.some(p => p.id === cur)) sel.value = cur;
  }
}

function rerenderAll() {
  applyI18n();
  document.getElementById('langToggle').textContent = LANG === 'th' ? 'EN' : 'ไทย';
  refreshProjectSelects();
  updateModeBadge();
  navigate();
}

/* ================= INIT ================= */
document.addEventListener('DOMContentLoaded', () => {
  initStore();
  setChartDefaults();
  initStructuralPage();

  document.getElementById('langToggle').addEventListener('click', () => {
    LANG = LANG === 'th' ? 'en' : 'th';
    state.settings.lang = LANG;
    persist();
    rerenderAll();
  });

  document.getElementById('projSearch').addEventListener('input', renderProjects);
  document.getElementById('btnAddProject').addEventListener('click', () => projectForm(null));
  document.getElementById('btnAddResource').addEventListener('click', () => resourceForm(null));
  document.getElementById('btnAddTask').addEventListener('click', () => taskForm(document.getElementById('ganttProject').value || state.projects[0]?.id, null));
  document.getElementById('chkCritical').addEventListener('change', renderGanttPage);
  for (const [id, fn] of [['wbsProject', renderWbs], ['ganttProject', renderGanttPage], ['evmProject', renderBudget], ['reportProject', renderReports]])
    document.getElementById(id).addEventListener('change', fn);
  document.getElementById('btnPrint').addEventListener('click', () => window.print());

  document.getElementById('btnSaveSettings').addEventListener('click', () => {
    state.settings.lang = document.getElementById('setLang').value;
    state.settings.apiMode = document.querySelector('input[name="apiMode"]:checked')?.value || 'demo';
    state.settings.skyUser = document.getElementById('setSkyUser').value.trim();
    state.settings.skyKey = document.getElementById('setSkyKey').value.trim();
    LANG = state.settings.lang;
    persist();
    rerenderAll();
  });
  document.getElementById('btnResetData').addEventListener('click', () => {
    if (!confirm(t('resetConfirm'))) return;
    Store.clear();
    location.reload();
  });

  window.addEventListener('hashchange', navigate);
  if (window.matchMedia) window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => rerenderAll());

  rerenderAll();
});
