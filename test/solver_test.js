'use strict';
/* Verification against closed-form solutions. Run: node test/solver_test.js */
const { analyzeFrame, SECTIONS } = require('../js/solver.js');

let failures = 0;
function check(name, got, want, tol) {
  const ok = Math.abs(got - want) <= tol * Math.max(1, Math.abs(want));
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}: got ${got.toPrecision(6)}, want ${want.toPrecision(6)}`);
}

// --- Test 1: simply supported beam, L=6 m, w=10 kN/m, W16x40 ---
{
  const L = 6, w = 10;
  const sec = SECTIONS['W16x40'];
  const model = {
    nodes: [{ id: 1, x: 0, y: 0 }, { id: 2, x: L, y: 0 }],
    members: [{ id: 'B1', nodeA: 1, nodeB: 2, section: 'W16x40', type: 'frame' }],
    supports: [{ node: 1, type: 'pinned' }, { node: 2, type: 'roller' }],
    loads: { nodal: [], member: [{ member: 'B1', w }] },
  };
  const r = analyzeFrame(model);
  if (!r.ok) { console.log('FAIL solve:', r.error); process.exit(1); }
  const mr = r.memberResults[0];
  const midM = mr.M[10];              // x = L/2
  const V0 = mr.V[0];
  const midDefl = mr.v[10];
  check('SS beam Mmax = wL²/8', midM, w * L * L / 8, 1e-6);
  check('SS beam V(0) = wL/2', V0, w * L / 2, 1e-6);
  check('SS beam δmid = -5wL⁴/384EI', midDefl, -5 * w * L ** 4 / (384 * sec.E * sec.I), 1e-6);
  check('SS beam Ry left = wL/2', r.reactions[0].ry, w * L / 2, 1e-6);
  check('SS beam Ry right = wL/2', r.reactions[1].ry, w * L / 2, 1e-6);
}

// --- Test 2: cantilever, L=4 m, point load P=20 kN at tip ---
{
  const L = 4, P = 20;
  const sec = SECTIONS['W12x26'];
  const model = {
    nodes: [{ id: 1, x: 0, y: 0 }, { id: 2, x: L, y: 0 }],
    members: [{ id: 'B1', nodeA: 1, nodeB: 2, section: 'W12x26', type: 'frame' }],
    supports: [{ node: 1, type: 'fixed' }],
    loads: { nodal: [{ node: 2, fx: 0, fy: -P, m: 0 }], member: [] },
  };
  const r = analyzeFrame(model);
  const mr = r.memberResults[0];
  check('Cantilever M(0) = -PL', mr.M[0], -P * L, 1e-6);
  check('Cantilever tip δ = -PL³/3EI', mr.v[20], -P * L ** 3 / (3 * sec.E * sec.I), 1e-6);
  check('Cantilever Ry = P', r.reactions[0].ry, P, 1e-6);
  check('Cantilever RM = PL', r.reactions[0].rm, P * L, 1e-6);
}

// --- Test 3: statically determinate truss (2-bar), P=10 kN down at apex ---
{
  // nodes: (0,0) pinned, (4,0) pinned, apex (2,3); each bar force = -P/2 * len/h (compression)
  const model = {
    nodes: [{ id: 1, x: 0, y: 0 }, { id: 2, x: 4, y: 0 }, { id: 3, x: 2, y: 3 }],
    members: [
      { id: 'M1', nodeA: 1, nodeB: 3, section: 'L75x75x6', type: 'truss' },
      { id: 'M2', nodeA: 2, nodeB: 3, section: 'L75x75x6', type: 'truss' },
    ],
    supports: [{ node: 1, type: 'pinned' }, { node: 2, type: 'pinned' }],
    loads: { nodal: [{ node: 3, fx: 0, fy: -10, m: 0 }], member: [] },
  };
  const r = analyzeFrame(model);
  const len = Math.hypot(2, 3);
  const want = -(10 / 2) * (len / 3); // compression
  check('2-bar truss N (compression)', r.memberResults[0].N[0], want, 1e-6);
  check('2-bar truss symmetric', r.memberResults[1].N[0], want, 1e-6);
}

// --- Test 4: fixed-fixed beam under UDL — end moment wL²/12 ---
{
  const L = 8, w = 5;
  const model = {
    nodes: [{ id: 1, x: 0, y: 0 }, { id: 2, x: L, y: 0 }],
    members: [{ id: 'B1', nodeA: 1, nodeB: 2, section: 'W18x50', type: 'frame' }],
    supports: [{ node: 1, type: 'fixed' }, { node: 2, type: 'fixed' }],
    loads: { nodal: [], member: [{ member: 'B1', w }] },
  };
  const r = analyzeFrame(model);
  const mr = r.memberResults[0];
  check('FF beam M(0) = -wL²/12', mr.M[0], -w * L * L / 12, 1e-6);
  check('FF beam Mmid = wL²/24', mr.M[10], w * L * L / 24, 1e-6);
}

console.log(failures === 0 ? '\nAll solver tests passed.' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
