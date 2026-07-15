'use strict';
/* Structural module: model editor, analysis orchestration (Demo/SkyCiv), SVG result viewer, design check */

const Struct = {
  model: null,        // working model (deep copy)
  sourceName: '',
  results: null,
  view: 'model',
  tab: 'nodes',
};

function structPalette() {
  const dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  return {
    member: dark ? '#c3c2b7' : '#52514e',
    node: dark ? '#3987e5' : '#2a78d6',
    bmd: dark ? '#3987e5' : '#2a78d6',
    sfd: dark ? '#199e70' : '#1baf7a',
    tension: dark ? '#3987e5' : '#2a78d6',
    compression: dark ? '#e66767' : '#e34948',
    load: dark ? '#c98500' : '#eda100',
    defl: dark ? '#9085e9' : '#4a3aa7',
    react: dark ? '#199e70' : '#1baf7a',
    ink: dark ? '#c3c2b7' : '#52514e',
    muted: '#898781',
    grid: dark ? '#2c2c2a' : '#e1e0d9',
  };
}

function deepCopy(o) { return JSON.parse(JSON.stringify(o)); }

function blankModel() {
  return {
    nodes: [{ id: 1, x: 0, y: 0 }, { id: 2, x: 6, y: 0 }],
    members: [{ id: 'M1', nodeA: 1, nodeB: 2, section: 'W16x40', type: 'frame' }],
    supports: [{ node: 1, type: 'pinned' }, { node: 2, type: 'roller' }],
    loads: { nodal: [], member: [{ member: 'M1', w: 10 }] },
  };
}

/* ---------- model select ---------- */
function populateModelSelect() {
  const sel = document.getElementById('modelSelect');
  sel.innerHTML = '';
  SAMPLES.forEach((s, i) => {
    const o = document.createElement('option');
    o.value = 'sample:' + i;
    o.textContent = `${t('sample')} ${i + 1} — ${ln(s)}`;
    sel.appendChild(o);
  });
  state.models.forEach(m => {
    const o = document.createElement('option');
    o.value = 'saved:' + m.id;
    o.textContent = `💾 ${m.name}`;
    sel.appendChild(o);
  });
  const oc = document.createElement('option');
  oc.value = 'custom';
  oc.textContent = t('custom');
  sel.appendChild(oc);
}

function loadModelFromSelect() {
  const v = document.getElementById('modelSelect').value;
  if (v.startsWith('sample:')) {
    const s = SAMPLES[+v.split(':')[1]];
    Struct.model = deepCopy(s.model);
    Struct.sourceName = ln(s);
  } else if (v.startsWith('saved:')) {
    const m = state.models.find(x => x.id === v.split(':')[1]);
    Struct.model = m ? deepCopy(m.model) : blankModel();
    Struct.sourceName = m ? m.name : '';
  } else {
    Struct.model = blankModel();
    Struct.sourceName = t('custom');
  }
  Struct.results = null;
  renderStructEditor();
  renderStructView();
  renderStructResults();
}

/* ---------- editor ---------- */
function renderStructEditor() {
  const body = document.getElementById('structEditorBody');
  const m = Struct.model;
  if (!m) { body.innerHTML = ''; return; }
  const secOpts = sel => Object.keys(SECTIONS).map(k => `<option ${k === sel ? 'selected' : ''}>${k}</option>`).join('');
  const nodeOpts = sel => m.nodes.map(n => `<option ${String(n.id) === String(sel) ? 'selected' : ''}>${n.id}</option>`).join('');
  const memOpts = sel => m.members.map(mm => `<option ${String(mm.id) === String(sel) ? 'selected' : ''}>${mm.id}</option>`).join('');

  let html = '';
  if (Struct.tab === 'nodes') {
    html = `<table class="table"><thead><tr><th>ID</th><th>X (m)</th><th>Y (m)</th><th></th></tr></thead><tbody>` +
      m.nodes.map((n, i) => `<tr>
        <td><input class="input" data-k="nodes.${i}.id" value="${n.id}"></td>
        <td><input class="input" type="number" step="0.5" data-k="nodes.${i}.x" value="${n.x}"></td>
        <td><input class="input" type="number" step="0.5" data-k="nodes.${i}.y" value="${n.y}"></td>
        <td><button class="btn icon" data-del="nodes.${i}">✕</button></td></tr>`).join('') +
      `</tbody></table><button class="btn add-row" data-add="nodes">${t('addRow')}</button>`;
  } else if (Struct.tab === 'members') {
    html = `<table class="table"><thead><tr><th>ID</th><th>A</th><th>B</th><th>${t('section')}</th><th>${t('type')}</th><th></th></tr></thead><tbody>` +
      m.members.map((mm, i) => `<tr>
        <td><input class="input" style="width:52px" data-k="members.${i}.id" value="${mm.id}"></td>
        <td><select class="input" data-k="members.${i}.nodeA">${nodeOpts(mm.nodeA)}</select></td>
        <td><select class="input" data-k="members.${i}.nodeB">${nodeOpts(mm.nodeB)}</select></td>
        <td><select class="input" data-k="members.${i}.section">${secOpts(mm.section)}</select></td>
        <td><select class="input" data-k="members.${i}.type">
          <option value="frame" ${mm.type !== 'truss' ? 'selected' : ''}>Frame</option>
          <option value="truss" ${mm.type === 'truss' ? 'selected' : ''}>Truss</option></select></td>
        <td><button class="btn icon" data-del="members.${i}">✕</button></td></tr>`).join('') +
      `</tbody></table><button class="btn add-row" data-add="members">${t('addRow')}</button>`;
  } else if (Struct.tab === 'supports') {
    html = `<table class="table"><thead><tr><th>${t('node')}</th><th>${t('type')}</th><th></th></tr></thead><tbody>` +
      m.supports.map((sp, i) => `<tr>
        <td><select class="input" data-k="supports.${i}.node">${nodeOpts(sp.node)}</select></td>
        <td><select class="input" data-k="supports.${i}.type">
          <option value="fixed" ${sp.type === 'fixed' ? 'selected' : ''}>${t('fixed')}</option>
          <option value="pinned" ${sp.type === 'pinned' ? 'selected' : ''}>${t('pinned')}</option>
          <option value="roller" ${sp.type === 'roller' ? 'selected' : ''}>${t('roller')}</option></select></td>
        <td><button class="btn icon" data-del="supports.${i}">✕</button></td></tr>`).join('') +
      `</tbody></table><button class="btn add-row" data-add="supports">${t('addRow')}</button>`;
  } else { // loads
    html = `<div class="editor-section-title">${t('nodalLoads')}</div>
      <table class="table"><thead><tr><th>${t('node')}</th><th>Fx</th><th>Fy</th><th>M</th><th></th></tr></thead><tbody>` +
      m.loads.nodal.map((L, i) => `<tr>
        <td><select class="input" data-k="loads.nodal.${i}.node">${nodeOpts(L.node)}</select></td>
        <td><input class="input" type="number" data-k="loads.nodal.${i}.fx" value="${L.fx || 0}"></td>
        <td><input class="input" type="number" data-k="loads.nodal.${i}.fy" value="${L.fy || 0}"></td>
        <td><input class="input" type="number" data-k="loads.nodal.${i}.m" value="${L.m || 0}"></td>
        <td><button class="btn icon" data-del="loads.nodal.${i}">✕</button></td></tr>`).join('') +
      `</tbody></table><button class="btn add-row" data-add="loads.nodal">${t('addRow')}</button>
      <div class="editor-section-title">${t('memberLoads')}</div>
      <table class="table"><thead><tr><th>${t('member')}</th><th>w↓ (kN/m)</th><th>w→ (kN/m)</th><th></th></tr></thead><tbody>` +
      m.loads.member.map((L, i) => `<tr>
        <td><select class="input" data-k="loads.member.${i}.member">${memOpts(L.member)}</select></td>
        <td><input class="input" type="number" data-k="loads.member.${i}.w" value="${L.w || 0}"></td>
        <td><input class="input" type="number" data-k="loads.member.${i}.wx" value="${L.wx || 0}"></td>
        <td><button class="btn icon" data-del="loads.member.${i}">✕</button></td></tr>`).join('') +
      `</tbody></table><button class="btn add-row" data-add="loads.member">${t('addRow')}</button>`;
  }
  body.innerHTML = html;

  body.querySelectorAll('[data-k]').forEach(inp => {
    inp.addEventListener('change', () => {
      const path = inp.dataset.k.split('.');
      let obj = Struct.model;
      for (let i = 0; i < path.length - 1; i++) obj = obj[path[i]];
      const key = path[path.length - 1];
      const raw = inp.value;
      obj[key] = (inp.type === 'number') ? (+raw || 0) : (/^-?\d+(\.\d+)?$/.test(raw) ? +raw : raw);
      Struct.results = null;
      renderStructView();
      renderStructResults();
    });
  });
  body.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', () => {
      const path = btn.dataset.del.split('.');
      let arr = Struct.model;
      for (let i = 0; i < path.length - 1; i++) arr = arr[path[i]];
      arr.splice(+path[path.length - 1], 1);
      Struct.results = null;
      renderStructEditor(); renderStructView(); renderStructResults();
    });
  });
  body.querySelectorAll('[data-add]').forEach(btn => {
    btn.addEventListener('click', () => {
      const m2 = Struct.model;
      const kind = btn.dataset.add;
      if (kind === 'nodes') m2.nodes.push({ id: m2.nodes.length + 1, x: 0, y: 0 });
      else if (kind === 'members') m2.members.push({ id: 'M' + (m2.members.length + 1), nodeA: m2.nodes[0]?.id ?? 1, nodeB: m2.nodes[1]?.id ?? 2, section: 'W16x40', type: 'frame' });
      else if (kind === 'supports') m2.supports.push({ node: m2.nodes[0]?.id ?? 1, type: 'pinned' });
      else if (kind === 'loads.nodal') m2.loads.nodal.push({ node: m2.nodes[0]?.id ?? 1, fx: 0, fy: -10, m: 0 });
      else if (kind === 'loads.member') m2.loads.member.push({ member: m2.members[0]?.id ?? 'M1', w: 10, wx: 0 });
      Struct.results = null;
      renderStructEditor(); renderStructView(); renderStructResults();
    });
  });
}

/* ---------- analysis ---------- */
async function runAnalysis() {
  const status = document.getElementById('analyzeStatus');
  status.textContent = t('analyzing');
  const res = analyzeFrame(Struct.model);
  if (!res.ok) {
    status.textContent = t('solveError') + ` [${res.error}]`;
    Struct.results = null;
    renderStructView(); renderStructResults();
    return;
  }
  Struct.results = res;
  const st = state.settings;
  if (st.apiMode === 'api') {
    if (!st.skyKey || !st.skyUser) status.textContent = t('needApiKey');
    else {
      try { await skycivSolve(Struct.model); status.textContent = t('apiDone'); }
      catch (e) { console.warn('SkyCiv:', e); status.textContent = t('apiError'); }
    }
  } else {
    status.textContent = t('demoDone');
  }
  if (Struct.view === 'model') Struct.view = 'bmd';
  syncViewTabs();
  renderStructView();
  renderStructResults();
}

/* SkyCiv Structural API v3 (Real API Mode) */
function buildS3DModel(model) {
  const nodes = {}, members = {}, sections = {}, materials = {}, supports = {}, point_loads = {}, distributed_loads = {};
  const nodeIdx = new Map();
  model.nodes.forEach((n, i) => { nodeIdx.set(String(n.id), i + 1); nodes[i + 1] = { x: +n.x, y: +n.y, z: 0 }; });
  materials[1] = { name: 'Structural Steel', density: 7850, elasticity_modulus: 200000, poissons_ratio: 0.3, class: 'steel' };
  materials[2] = { name: 'Concrete', density: 2400, elasticity_modulus: 25000, poissons_ratio: 0.2, class: 'concrete' };
  const secIds = new Map();
  model.members.forEach(m => {
    if (!secIds.has(m.section)) {
      const s = SECTIONS[m.section] || SECTIONS['W16x40'];
      const id = secIds.size + 1;
      secIds.set(m.section, id);
      sections[id] = {
        name: m.section, material_id: s.mat === 'concrete' ? 2 : 1,
        area: s.A, Iz: s.I, Iy: s.I, J: 2 * s.I, // m², m⁴ (custom section properties)
      };
    }
  });
  model.members.forEach((m, i) => {
    members[i + 1] = {
      node_A: nodeIdx.get(String(m.nodeA)), node_B: nodeIdx.get(String(m.nodeB)),
      section_id: secIds.get(m.section), type: 'normal',
      fixity_A: m.type === 'truss' ? 'FFFFFR' : 'FFFFFF',
      fixity_B: m.type === 'truss' ? 'FFFFFR' : 'FFFFFF',
    };
  });
  model.supports.forEach(sp => {
    const nid = nodeIdx.get(String(sp.node));
    const code = sp.type === 'fixed' ? 'FFFFFF' : sp.type === 'pinned' ? 'FFFFFR' : 'RFFFFR';
    supports[nid] = { node: nid, restraint: code };
  });
  (model.loads.nodal || []).forEach((L, i) => {
    point_loads[i + 1] = { type: 'N', node: nodeIdx.get(String(L.node)), x_mag: +L.fx || 0, y_mag: +L.fy || 0, z_mag: 0, load_group: 'LG' };
  });
  (model.loads.member || []).forEach((L, i) => {
    const mi = model.members.findIndex(m => String(m.id) === String(L.member)) + 1;
    distributed_loads[i + 1] = {
      member: mi, x_mag_A: +L.wx || 0, y_mag_A: -(+L.w || 0), z_mag_A: 0,
      x_mag_B: +L.wx || 0, y_mag_B: -(+L.w || 0), z_mag_B: 0,
      position_A: 0, position_B: 100, load_group: 'LG', axes: 'global',
    };
  });
  return {
    settings: { units: { length: 'm', section_length: 'mm', force: 'kn', moment: 'kn-m', pressure: 'kpa', mass: 'kg', translation: 'mm', stress: 'mpa' }, vertical_axis: 'Y' },
    nodes, members, plates: {}, meshed_plates: {}, materials, sections, supports,
    settlements: {}, point_loads, moments: {}, distributed_loads, pressures: {}, area_loads: {}, member_prestress_loads: {}, self_weight: {},
    load_combinations: {},
  };
}

async function skycivSolve(model) {
  const st = state.settings;
  const payload = {
    auth: { username: st.skyUser, key: st.skyKey },
    functions: [
      { function: 'S3D.session.start', arguments: { keep_open: false } },
      { function: 'S3D.model.set', arguments: { s3d_model: buildS3DModel(model) } },
      { function: 'S3D.model.solve', arguments: { analysis_type: 'linear' } },
    ],
  };
  const resp = await fetch('https://api.skyciv.com/v3', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  });
  if (!resp.ok) throw new Error('HTTP ' + resp.status);
  const data = await resp.json();
  if (data.response && data.response.status !== 0 && data.response.error) throw new Error(data.response.msg || 'API error');
  Struct.apiRaw = data;
  return data;
}

/* ---------- SVG view ---------- */
function renderStructView() {
  const box = document.getElementById('structSvg');
  const legend = document.getElementById('structLegend');
  box.innerHTML = ''; legend.textContent = '';
  const model = Struct.model;
  if (!model || model.nodes.length === 0) return;
  const P = structPalette();
  const res = Struct.results;
  const view = (res || Struct.view === 'model') ? Struct.view : 'model';

  const W = 800, H = 400, pad = 55;
  const xs = model.nodes.map(n => +n.x), ys = model.nodes.map(n => +n.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const spanX = Math.max(maxX - minX, 1), spanY = Math.max(maxY - minY, 1);
  const sc = Math.min((W - 2 * pad) / spanX, (H - 2 * pad) / spanY);
  const px = x => pad + (x - minX) * sc + (W - 2 * pad - spanX * sc) / 2;
  const py = y => H - pad - (y - minY) * sc - (H - 2 * pad - spanY * sc) / 2;
  const span = Math.max(spanX, spanY);

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const el = (tag, attrs, text) => {
    const e = document.createElementNS(svgNS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  };
  const nodeById = id => model.nodes.find(n => String(n.id) === String(id));

  /* diagram overlays (before members so members draw on top) */
  if (res && (view === 'bmd' || view === 'sfd' || view === 'axial')) {
    const field = view === 'bmd' ? 'M' : view === 'sfd' ? 'V' : 'N';
    const color = view === 'bmd' ? P.bmd : view === 'sfd' ? P.sfd : null;
    const maxVal = Math.max(1e-9, ...res.memberResults.map(mr => Math.max(...mr[field].map(Math.abs))));
    const dscale = 0.14 * span * sc / maxVal;
    for (const mr of res.memberResults) {
      const na = nodeById(model.members.find(m => String(m.id) === String(mr.id)).nodeA);
      const perp = [-mr.s, mr.c]; // local +y in model coords
      const pts = [];
      pts.push(`${px(+na.x)},${py(+na.y)}`);
      for (let i = 0; i < mr.x.length; i++) {
        const bx = +na.x + mr.c * mr.x[i], by = +na.y + mr.s * mr.x[i];
        const off = -mr[field][i] * dscale / sc; // model units
        pts.push(`${px(bx + perp[0] * off)},${py(by + perp[1] * off)}`);
      }
      const nb = nodeById(model.members.find(m => String(m.id) === String(mr.id)).nodeB);
      pts.push(`${px(+nb.x)},${py(+nb.y)}`);
      let col = color;
      if (view === 'axial') col = mr.maxN >= 0 ? P.tension : P.compression;
      svg.appendChild(el('polygon', { points: pts.join(' '), fill: col, opacity: 0.22, stroke: col, 'stroke-width': 1.2 }));
      // peak label
      const peakIdx = mr[field].reduce((bi, v, i, a) => Math.abs(v) > Math.abs(a[bi]) ? i : bi, 0);
      const bx = +na.x + mr.c * mr.x[peakIdx], by = +na.y + mr.s * mr.x[peakIdx];
      const off = -mr[field][peakIdx] * dscale / sc;
      svg.appendChild(el('text', {
        x: px(bx + perp[0] * off), y: py(by + perp[1] * off) - 4,
        'font-size': 10.5, fill: P.ink, 'text-anchor': 'middle', 'font-weight': 600,
      }, mr[field][peakIdx].toFixed(1)));
    }
  }

  /* members */
  for (const m of model.members) {
    const a = nodeById(m.nodeA), b = nodeById(m.nodeB);
    if (!a || !b) continue;
    let stroke = P.member, sw = 2.5;
    if (res && view === 'axial') {
      const mr = res.memberResults.find(r => String(r.id) === String(m.id));
      if (mr) { stroke = mr.maxN >= 0 ? P.tension : P.compression; sw = 3; }
    }
    svg.appendChild(el('line', { x1: px(+a.x), y1: py(+a.y), x2: px(+b.x), y2: py(+b.y), stroke, 'stroke-width': sw, 'stroke-linecap': 'round' }));
    // member label
    svg.appendChild(el('text', {
      x: (px(+a.x) + px(+b.x)) / 2 + 5, y: (py(+a.y) + py(+b.y)) / 2 - 5,
      'font-size': 10, fill: P.muted,
    }, m.id));
  }

  /* deflected shape */
  if (res && view === 'defl') {
    const maxD = Math.max(1e-12, ...res.memberResults.map(mr => mr.maxDefl));
    const dscale = 0.10 * span / maxD;
    for (const mr of res.memberResults) {
      const mdef = model.members.find(m => String(m.id) === String(mr.id));
      const na = nodeById(mdef.nodeA);
      const pts = [];
      for (let i = 0; i < mr.x.length; i++) {
        const bx = +na.x + mr.c * mr.x[i], by = +na.y + mr.s * mr.x[i];
        const du = (mr.c * mr.u[i] - mr.s * mr.v[i]) * dscale;
        const dv = (mr.s * mr.u[i] + mr.c * mr.v[i]) * dscale;
        pts.push(`${px(bx + du)},${py(by + dv)}`);
      }
      svg.appendChild(el('polyline', { points: pts.join(' '), fill: 'none', stroke: P.defl, 'stroke-width': 2, 'stroke-dasharray': '5 4' }));
    }
    legend.textContent = `${t('viewDefl')} ×${Math.round(dscale)} — δmax = ${(maxD * 1000).toFixed(2)} mm`;
  }

  /* supports */
  for (const sp of model.supports) {
    const n = nodeById(sp.node);
    if (!n) continue;
    const x = px(+n.x), y = py(+n.y);
    if (sp.type === 'fixed') {
      svg.appendChild(el('line', { x1: x - 12, y1: y + 4, x2: x + 12, y2: y + 4, stroke: P.ink, 'stroke-width': 3 }));
      for (let i = -10; i <= 10; i += 5)
        svg.appendChild(el('line', { x1: x + i, y1: y + 4, x2: x + i - 5, y2: y + 12, stroke: P.ink, 'stroke-width': 1.2 }));
    } else {
      svg.appendChild(el('path', { d: `M ${x} ${y} L ${x - 9} ${y + 14} L ${x + 9} ${y + 14} Z`, fill: 'none', stroke: P.ink, 'stroke-width': 2 }));
      if (sp.type === 'roller') {
        svg.appendChild(el('circle', { cx: x - 4, cy: y + 18, r: 3, fill: 'none', stroke: P.ink, 'stroke-width': 1.5 }));
        svg.appendChild(el('circle', { cx: x + 4, cy: y + 18, r: 3, fill: 'none', stroke: P.ink, 'stroke-width': 1.5 }));
      } else {
        svg.appendChild(el('line', { x1: x - 12, y1: y + 17, x2: x + 12, y2: y + 17, stroke: P.ink, 'stroke-width': 2 }));
      }
    }
  }

  /* loads (model view) */
  if (view === 'model') {
    for (const L of model.loads.nodal) {
      const n = nodeById(L.node); if (!n) continue;
      const x = px(+n.x), y = py(+n.y);
      if (L.fy) {
        const dir = L.fy < 0 ? 1 : -1; // arrow pointing toward node
        svg.appendChild(el('line', { x1: x, y1: y - dir * 34, x2: x, y2: y - dir * 8, stroke: P.load, 'stroke-width': 2.5 }));
        svg.appendChild(el('path', { d: `M ${x} ${y - dir * 4} l -5 ${-dir * 9} l 10 0 Z`, fill: P.load }));
        svg.appendChild(el('text', { x: x + 6, y: y - dir * 26, 'font-size': 10.5, fill: P.ink }, `${Math.abs(L.fy)} kN`));
      }
      if (L.fx) {
        const dir = L.fx > 0 ? 1 : -1;
        svg.appendChild(el('line', { x1: x - dir * 36, y1: y, x2: x - dir * 10, y2: y, stroke: P.load, 'stroke-width': 2.5 }));
        svg.appendChild(el('path', { d: `M ${x - dir * 5} ${y} l ${-dir * 9} -5 l 0 10 Z`, fill: P.load }));
        svg.appendChild(el('text', { x: x - dir * 36, y: y - 6, 'font-size': 10.5, fill: P.ink, 'text-anchor': dir > 0 ? 'end' : 'start' }, `${Math.abs(L.fx)} kN`));
      }
    }
    for (const L of model.loads.member) {
      if (!L.w) continue;
      const mm = model.members.find(x => String(x.id) === String(L.member)); if (!mm) continue;
      const a = nodeById(mm.nodeA), b = nodeById(mm.nodeB); if (!a || !b) continue;
      for (let f = 0.1; f <= 0.9; f += 0.2) {
        const x = px(+a.x + (+b.x - +a.x) * f), y = py(+a.y + (+b.y - +a.y) * f);
        svg.appendChild(el('line', { x1: x, y1: y - 22, x2: x, y2: y - 7, stroke: P.load, 'stroke-width': 1.6 }));
        svg.appendChild(el('path', { d: `M ${x} ${y - 3} l -3.5 -6 l 7 0 Z`, fill: P.load }));
      }
      const mx = px((+a.x + +b.x) / 2), my = py((+a.y + +b.y) / 2);
      svg.appendChild(el('text', { x: mx, y: my - 27, 'font-size': 10.5, fill: P.ink, 'text-anchor': 'middle' }, `${L.w} kN/m`));
    }
  }

  /* reactions view */
  if (res && view === 'react') {
    for (const r of res.reactions) {
      const n = nodeById(r.node); if (!n) continue;
      const x = px(+n.x), y = py(+n.y);
      let lbl = [];
      if (Math.abs(r.rx) > 1e-6) lbl.push(`Rx=${r.rx.toFixed(1)}`);
      if (Math.abs(r.ry) > 1e-6) lbl.push(`Ry=${r.ry.toFixed(1)}`);
      if (Math.abs(r.rm) > 1e-6) lbl.push(`M=${r.rm.toFixed(1)}`);
      if (Math.abs(r.ry) > 1e-6) {
        const dir = r.ry > 0 ? 1 : -1;
        svg.appendChild(el('line', { x1: x, y1: y + dir * 40, x2: x, y2: y + dir * 14, stroke: P.react, 'stroke-width': 2.5 }));
        svg.appendChild(el('path', { d: `M ${x} ${y + dir * 9} l -5 ${dir * 9} l 10 0 Z`, fill: P.react }));
      }
      svg.appendChild(el('text', { x: x + 8, y: y + 34, 'font-size': 10.5, fill: P.ink, 'font-weight': 600 }, lbl.join('  ')));
    }
    legend.textContent = `${t('reactions')} — kN, kN·m`;
  }

  /* nodes */
  for (const n of model.nodes) {
    svg.appendChild(el('circle', { cx: px(+n.x), cy: py(+n.y), r: 4, fill: P.node }));
    svg.appendChild(el('text', { x: px(+n.x) - 8, y: py(+n.y) - 8, 'font-size': 10, fill: P.muted }, n.id));
  }

  if (view === 'axial' && res) legend.innerHTML = `<span style="color:${P.tension}">■</span> ${t('tension')} &nbsp; <span style="color:${P.compression}">■</span> ${t('compression')} (kN)`;
  if (view === 'bmd' && res) legend.textContent = 'Bending Moment Diagram (kN·m)';
  if (view === 'sfd' && res) legend.textContent = 'Shear Force Diagram (kN)';

  box.appendChild(svg);
}

/* ---------- result tables ---------- */
function renderStructResults() {
  const cont = document.getElementById('resultTables');
  const dt = document.getElementById('designTable');
  const res = Struct.results;
  if (!res) {
    cont.innerHTML = `<p class="muted small">${t('analyze')} →</p>`;
    dt.querySelector('thead').innerHTML = ''; dt.querySelector('tbody').innerHTML = '';
    return;
  }
  const num = v => `<td class="num">${v}</td>`;
  let html = `<table class="table"><thead><tr>
    <th>${t('member')}</th><th>${t('section')}</th><th class="num">${t('lenM')}</th>
    <th class="num">${t('maxN')}</th><th class="num">${t('maxV')}</th><th class="num">${t('maxM')}</th><th class="num">${t('deflMax')}</th>
    </tr></thead><tbody>`;
  for (const mr of res.memberResults) {
    html += `<tr><td>${mr.id}</td><td>${mr.section}</td>` +
      num(mr.L.toFixed(2)) + num(mr.maxN.toFixed(1)) + num(mr.maxV.toFixed(1)) +
      num(mr.maxM.toFixed(1)) + num((mr.maxDefl * 1000).toFixed(2)) + `</tr>`;
  }
  html += `</tbody></table>`;

  html += `<div class="editor-section-title">${t('reactions')}</div>
    <table class="table"><thead><tr><th>${t('node')}</th><th class="num">Rx (kN)</th><th class="num">Ry (kN)</th><th class="num">M (kN·m)</th></tr></thead><tbody>`;
  for (const r of res.reactions)
    html += `<tr><td>${r.node}</td>${num(r.rx.toFixed(2))}${num(r.ry.toFixed(2))}${num(r.rm.toFixed(2))}</tr>`;
  html += `</tbody></table>`;

  html += `<div class="editor-section-title">${t('displacements')}</div>
    <table class="table"><thead><tr><th>${t('node')}</th><th class="num">ux (mm)</th><th class="num">uy (mm)</th></tr></thead><tbody>`;
  for (const d of res.nodeDisp)
    html += `<tr><td>${d.id}</td>${num((d.ux * 1000).toFixed(2))}${num((d.uy * 1000).toFixed(2))}</tr>`;
  html += `</tbody></table>`;
  cont.innerHTML = html;

  /* design check */
  const rows = designCheckAISC(res);
  dt.querySelector('thead').innerHTML = `<tr>
    <th>${t('member')}</th><th>${t('section')}</th>
    <th class="num">Pu (kN)</th><th class="num">Mu (kN·m)</th>
    <th class="num">φPn</th><th class="num">φMn</th>
    <th class="num">${t('dcr')}</th><th>${t('result')}</th></tr>`;
  dt.querySelector('tbody').innerHTML = rows.map(r => {
    if (r.na) return `<tr><td>${r.id}</td><td>${r.section}</td><td class="num">—</td><td class="num">—</td><td class="num">—</td><td class="num">—</td><td class="num">—</td><td><span class="pill planning">${t('na')}</span></td></tr>`;
    return `<tr><td>${r.id}</td><td>${r.section}</td>
      <td class="num">${r.Pu.toFixed(1)} ${r.mode}</td><td class="num">${r.Mu.toFixed(1)}</td>
      <td class="num">${r.phiPn.toFixed(0)}</td><td class="num">${r.phiMn.toFixed(1)}</td>
      <td class="num"><b>${r.dcr.toFixed(2)}</b></td>
      <td><span class="pill ${r.pass ? 'pass' : 'fail'}">${r.pass ? '✓ ' + t('pass') : '✗ ' + t('fail')}</span></td></tr>`;
  }).join('');
}

/* ---------- page wiring ---------- */
function syncViewTabs() {
  document.querySelectorAll('#viewToggle .tab').forEach(b => b.classList.toggle('active', b.dataset.view === Struct.view));
}

function initStructuralPage() {
  populateModelSelect();
  document.getElementById('modelSelect').addEventListener('change', loadModelFromSelect);
  document.getElementById('btnNewModel').addEventListener('click', () => {
    document.getElementById('modelSelect').value = 'custom';
    loadModelFromSelect();
  });
  document.getElementById('btnSaveModel').addEventListener('click', () => {
    const name = prompt(t('promptModelName'), Struct.sourceName || 'Model 1');
    if (!name) return;
    state.models.push({ id: uid('m'), name, model: deepCopy(Struct.model) });
    persist();
    populateModelSelect();
    document.getElementById('modelSelect').value = 'saved:' + state.models[state.models.length - 1].id;
    Struct.sourceName = name;
  });
  document.getElementById('btnAnalyze').addEventListener('click', runAnalysis);
  document.querySelectorAll('#structTabs .tab').forEach(b => b.addEventListener('click', () => {
    Struct.tab = b.dataset.tab;
    document.querySelectorAll('#structTabs .tab').forEach(x => x.classList.toggle('active', x === b));
    renderStructEditor();
  }));
  document.querySelectorAll('#viewToggle .tab').forEach(b => b.addEventListener('click', () => {
    Struct.view = b.dataset.view;
    syncViewTabs();
    renderStructView();
  }));
  loadModelFromSelect();
}

function renderStructuralPage() {
  // re-render (e.g. language change) — keep current selection
  const sel = document.getElementById('modelSelect');
  const cur = sel.value;
  populateModelSelect();
  if ([...sel.options].some(o => o.value === cur)) sel.value = cur;
  if (!Struct.model) loadModelFromSelect();
  else { renderStructEditor(); renderStructView(); renderStructResults(); }
}
