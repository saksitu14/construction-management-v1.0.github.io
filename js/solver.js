'use strict';
/*
 * 2D frame/truss solver — direct stiffness method.
 * Units: kN, m, kPa (kN/m²).  E steel = 200e6 kPa, concrete ≈ 25e6 kPa.
 * Sign conventions: axial N > 0 = tension; M sagging positive; V = dM/dx.
 */

const SECTIONS = {
  'W8x24':   { mat: 'steel', E: 200e6, Fy: 345000, A: 4.57e-3, I: 3.44e-5, Zx: 3.79e-4 },
  'W10x33':  { mat: 'steel', E: 200e6, Fy: 345000, A: 6.26e-3, I: 7.12e-5, Zx: 6.36e-4 },
  'W12x26':  { mat: 'steel', E: 200e6, Fy: 345000, A: 4.94e-3, I: 8.49e-5, Zx: 6.10e-4 },
  'W14x38':  { mat: 'steel', E: 200e6, Fy: 345000, A: 7.23e-3, I: 1.60e-4, Zx: 1.01e-3 },
  'W16x40':  { mat: 'steel', E: 200e6, Fy: 345000, A: 7.61e-3, I: 2.16e-4, Zx: 1.20e-3 },
  'W18x50':  { mat: 'steel', E: 200e6, Fy: 345000, A: 9.48e-3, I: 3.33e-4, Zx: 1.66e-3 },
  'W21x62':  { mat: 'steel', E: 200e6, Fy: 345000, A: 1.18e-2, I: 5.54e-4, Zx: 2.36e-3 },
  'HSS100x100x6': { mat: 'steel', E: 200e6, Fy: 350000, A: 2.16e-3, I: 3.28e-6, Zx: 7.80e-5 },
  'L75x75x6':     { mat: 'steel', E: 200e6, Fy: 250000, A: 8.73e-4, I: 4.59e-7, Zx: 1.07e-5 },
  'RC300x500': { mat: 'concrete', E: 25e6, A: 0.150, I: 3.125e-3 },
  'RC400x400': { mat: 'concrete', E: 25e6, A: 0.160, I: 2.133e-3 },
};

function _zeros(n) { return Array.from({ length: n }, () => new Float64Array(n)); }

function _solveGauss(A, b) {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    if (Math.abs(M[piv][col]) < 1e-10) return null;
    [M[col], M[piv]] = [M[piv], M[col]];
    for (let r = col + 1; r < n; r++) {
      const f = M[r][col] / M[col][col];
      if (f === 0) continue;
      for (let c = col; c <= n; c++) M[r][c] -= f * M[col][c];
    }
  }
  const x = new Float64Array(n);
  for (let r = n - 1; r >= 0; r--) {
    let s = M[r][n];
    for (let c = r + 1; c < n; c++) s -= M[r][c] * x[c];
    x[r] = s / M[r][r];
  }
  return x;
}

function _matVec6(T, v) {
  const out = new Float64Array(6);
  for (let i = 0; i < 6; i++) { let s = 0; for (let j = 0; j < 6; j++) s += T[i][j] * v[j]; out[i] = s; }
  return out;
}

function analyzeFrame(model) {
  const nodes = model.nodes || [];
  const members = model.members || [];
  const supports = model.supports || [];
  const nodal = (model.loads && model.loads.nodal) || [];
  const mloads = (model.loads && model.loads.member) || [];
  if (nodes.length < 2 || members.length < 1) return { ok: false, error: 'empty' };

  const idx = new Map(nodes.map((n, i) => [String(n.id), i]));
  const ndof = nodes.length * 3;
  const K = _zeros(ndof);
  const F = new Float64Array(ndof);

  for (const L of nodal) {
    const i = idx.get(String(L.node));
    if (i == null) continue;
    F[3 * i] += (+L.fx || 0); F[3 * i + 1] += (+L.fy || 0); F[3 * i + 2] += (+L.m || 0);
  }

  const mdata = [];
  for (const m of members) {
    const a = idx.get(String(m.nodeA)), b = idx.get(String(m.nodeB));
    if (a == null || b == null) return { ok: false, error: 'badMember' };
    const na = nodes[a], nb = nodes[b];
    const dx = (+nb.x) - (+na.x), dy = (+nb.y) - (+na.y);
    const L = Math.hypot(dx, dy);
    if (L < 1e-9) return { ok: false, error: 'zeroLength' };
    const c = dx / L, s = dy / L;
    const sec = SECTIONS[m.section] || SECTIONS['W12x26'];
    const E = sec.E, A = sec.A, I = sec.I;
    const truss = m.type === 'truss';

    const k = _zeros(6);
    const ax = E * A / L;
    k[0][0] = ax; k[0][3] = -ax; k[3][0] = -ax; k[3][3] = ax;
    if (!truss) {
      const b1 = 12 * E * I / L ** 3, b2 = 6 * E * I / L ** 2, b3 = 4 * E * I / L, b4 = 2 * E * I / L;
      k[1][1] = b1;  k[1][2] = b2;  k[1][4] = -b1; k[1][5] = b2;
      k[2][1] = b2;  k[2][2] = b3;  k[2][4] = -b2; k[2][5] = b4;
      k[4][1] = -b1; k[4][2] = -b2; k[4][4] = b1;  k[4][5] = -b2;
      k[5][1] = b2;  k[5][2] = b4;  k[5][4] = -b2; k[5][5] = b3;
    }

    const T = _zeros(6);
    T[0][0] = c;  T[0][1] = s; T[1][0] = -s; T[1][1] = c; T[2][2] = 1;
    T[3][3] = c;  T[3][4] = s; T[4][3] = -s; T[4][4] = c; T[5][5] = 1;

    // member distributed load: w = global vertical (down +), wx = global horizontal
    let w = 0, wx = 0;
    for (const ml of mloads) if (String(ml.member) === String(m.id)) { w += (+ml.w || 0); wx += (+ml.wx || 0); }
    const px = c * wx + s * (-w);        // local axial per length
    const py = -s * wx + c * (-w);       // local transverse per length
    const fef = [-px * L / 2, -py * L / 2, -py * L * L / 12, -px * L / 2, -py * L / 2, +py * L * L / 12];
    if (truss) { fef[2] = 0; fef[5] = 0; }

    // K_global = Tᵀ k T
    const kT = _zeros(6), kG = _zeros(6);
    for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) { let sum = 0; for (let p = 0; p < 6; p++) sum += k[i][p] * T[p][j]; kT[i][j] = sum; }
    for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) { let sum = 0; for (let p = 0; p < 6; p++) sum += T[p][i] * kT[p][j]; kG[i][j] = sum; }

    const dofs = [3 * a, 3 * a + 1, 3 * a + 2, 3 * b, 3 * b + 1, 3 * b + 2];
    for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) K[dofs[i]][dofs[j]] += kG[i][j];
    // equivalent nodal loads = −Tᵀ·fef
    for (let i = 0; i < 6; i++) { let sum = 0; for (let p = 0; p < 6; p++) sum += T[p][i] * fef[p]; F[dofs[i]] -= sum; }

    mdata.push({ id: m.id, section: m.section, sec, a, b, L, c, s, E, A, I, k, T, fef, px, py, truss, dofs });
  }

  const fixedDof = new Set();
  for (const sp of supports) {
    const i = idx.get(String(sp.node));
    if (i == null) continue;
    if (sp.type === 'fixed') { fixedDof.add(3 * i); fixedDof.add(3 * i + 1); fixedDof.add(3 * i + 2); }
    else if (sp.type === 'pinned') { fixedDof.add(3 * i); fixedDof.add(3 * i + 1); }
    else if (sp.type === 'roller') { fixedDof.add(3 * i + 1); }
  }
  if (fixedDof.size === 0) return { ok: false, error: 'noSupports' };
  // auto-constrain zero-stiffness DOFs (e.g. rotations at pure truss joints)
  for (let d = 0; d < ndof; d++) if (!fixedDof.has(d) && Math.abs(K[d][d]) < 1e-6) fixedDof.add(d);

  const free = [];
  for (let d = 0; d < ndof; d++) if (!fixedDof.has(d)) free.push(d);

  const U = new Float64Array(ndof);
  if (free.length > 0) {
    const Kr = free.map(i => free.map(j => K[i][j]));
    const Fr = free.map(i => F[i]);
    const Ur = _solveGauss(Kr, Fr);
    if (!Ur) return { ok: false, error: 'singular' };
    free.forEach((d, i) => { U[d] = Ur[i]; });
  }

  // reactions R = K·U − F at constrained dofs
  const reactions = [];
  for (const sp of supports) {
    const i = idx.get(String(sp.node));
    if (i == null) continue;
    const r = { node: sp.node, type: sp.type, rx: 0, ry: 0, rm: 0 };
    for (const [key, d] of [['rx', 3 * i], ['ry', 3 * i + 1], ['rm', 3 * i + 2]]) {
      if (!fixedDof.has(d)) continue;
      let s = 0; for (let j = 0; j < ndof; j++) s += K[d][j] * U[j];
      r[key] = s - F[d];
    }
    reactions.push(r);
  }

  const NP = 21;
  const memberResults = mdata.map(md => {
    const { L, E, A, I, px, py, truss } = md;
    const ug = md.dofs.map(d => U[d]);
    const ul = _matVec6(md.T, ug);
    const fl = _matVec6(md.k, ul).map((v, i) => v + md.fef[i]); // local end forces on member
    const xs = [], Ns = [], Vs = [], Ms = [], us = [], vs = [];
    for (let i = 0; i < NP; i++) {
      const x = L * i / (NP - 1), xi = x / L;
      xs.push(x);
      Ns.push(-(fl[0] + px * x));
      Vs.push(fl[1] + py * x);
      Ms.push(truss ? 0 : (x * fl[1] + py * x * x / 2 - fl[2]));
      // local deflections
      let v;
      if (truss) v = (1 - xi) * ul[1] + xi * ul[4];
      else {
        const H1 = 1 - 3 * xi ** 2 + 2 * xi ** 3, H2 = x * (1 - xi) ** 2;
        const H3 = 3 * xi ** 2 - 2 * xi ** 3, H4 = L * xi * xi * (xi - 1);
        v = H1 * ul[1] + H2 * ul[2] + H3 * ul[4] + H4 * ul[5] + py * x * x * (L - x) ** 2 / (24 * E * I);
      }
      const u = (1 - xi) * ul[0] + xi * ul[3] + (truss ? 0 : px * x * (L - x) / (2 * E * A));
      us.push(u); vs.push(v);
    }
    const absMax = arr => arr.reduce((m, v) => Math.abs(v) > Math.abs(m) ? v : m, 0);
    return {
      id: md.id, section: md.section, sec: md.sec, L, c: md.c, s: md.s,
      a: md.a, b: md.b, truss,
      x: xs, N: Ns, V: Vs, M: Ms, u: us, v: vs,
      maxN: absMax(Ns), maxV: absMax(Vs), maxM: absMax(Ms),
      maxDefl: Math.max(...vs.map(Math.abs), ...us.map(Math.abs)),
    };
  });

  const nodeDisp = nodes.map((n, i) => ({ id: n.id, ux: U[3 * i], uy: U[3 * i + 1], rz: U[3 * i + 2] }));
  return { ok: true, U, reactions, memberResults, nodeDisp };
}

/* AISC 360 (LRFD) simplified member check: flexure + axial interaction (H1-1). */
function designCheckAISC(results) {
  const rows = [];
  for (const mr of results.memberResults) {
    const sec = mr.sec;
    if (sec.mat !== 'steel') { rows.push({ id: mr.id, section: mr.section, na: true }); continue; }
    const { A, I, Fy, E } = sec;
    const Zx = sec.Zx || 0;
    const Nmin = Math.min(...mr.N), Nmax = Math.max(...mr.N);
    const comp = Math.max(0, -Nmin), tens = Math.max(0, Nmax);
    const Mu = Math.abs(mr.maxM);

    const phiMn = Zx > 0 ? 0.9 * Fy * Zx : 0;                       // kN·m
    // compression capacity with flexural buckling (K = 1, in-plane r)
    const r = Math.sqrt(I / A);
    const slend = mr.L / r;
    const Fe = Math.PI ** 2 * E / slend ** 2;
    const ratio = Fy / Fe;
    const Fcr = ratio <= 2.25 ? Math.pow(0.658, ratio) * Fy : 0.877 * Fe;
    const phiPnC = 0.9 * Fcr * A;                                   // kN
    const phiPnT = 0.9 * Fy * A;

    // governing axial demand/capacity
    let Pu, phiPn, mode;
    if (comp >= tens) { Pu = comp; phiPn = phiPnC; mode = 'C'; }
    else { Pu = tens; phiPn = phiPnT; mode = 'T'; }

    const pr = phiPn > 0 ? Pu / phiPn : 0;
    const mrr = phiMn > 0 ? Mu / phiMn : (Mu > 1e-6 ? 99 : 0);
    const dcr = pr >= 0.2 ? pr + (8 / 9) * mrr : pr / 2 + mrr;
    rows.push({
      id: mr.id, section: mr.section, Pu, Mu, phiPn, phiMn, mode,
      dcr, pass: dcr <= 1.0, slend
    });
  }
  return rows;
}

if (typeof module !== 'undefined') module.exports = { SECTIONS, analyzeFrame, designCheckAISC };
