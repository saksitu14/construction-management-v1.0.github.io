'use strict';
/* Solve all sample structures + run design check. Run: node test/samples_test.js */
const fs = require('fs');
const path = require('path');
const { analyzeFrame, designCheckAISC } = require('../js/solver.js');

const src = fs.readFileSync(path.join(__dirname, '../js/samples.js'), 'utf8');
const SAMPLES = new Function(src + '; return SAMPLES;')();

let bad = 0;
for (const s of SAMPLES) {
  const r = analyzeFrame(s.model);
  if (!r.ok) { console.log(`FAIL ${s.key}: ${r.error}`); bad++; continue; }
  const checks = designCheckAISC(r);
  const worst = checks.filter(c => !c.na).reduce((m, c) => Math.max(m, c.dcr), 0);
  const maxDefl = Math.max(...r.memberResults.map(m => m.maxDefl)) * 1000;
  const sumRy = r.reactions.reduce((a, x) => a + x.ry, 0);
  // equilibrium check: sum of vertical reactions = total applied vertical load
  let applied = 0;
  for (const L of s.model.loads.nodal) applied += -(+L.fy || 0);
  for (const ml of s.model.loads.member) {
    const m = s.model.members.find(x => String(x.id) === String(ml.member));
    const na = s.model.nodes.find(n => String(n.id) === String(m.nodeA));
    const nb = s.model.nodes.find(n => String(n.id) === String(m.nodeB));
    applied += (+ml.w || 0) * Math.hypot(nb.x - na.x, nb.y - na.y);
  }
  const eq = Math.abs(sumRy - applied) < 1e-6 * Math.max(1, applied);
  if (!eq) bad++;
  console.log(`${eq ? 'PASS' : 'FAIL'} ${s.key}: ΣRy=${sumRy.toFixed(2)} vs applied=${applied.toFixed(2)} kN, worst DCR=${worst.toFixed(2)}, δmax=${maxDefl.toFixed(1)} mm`);
  // truss sample: report tension/compression split
  if (s.key === 'howe') {
    const ten = r.memberResults.filter(m => m.maxN > 0.01).map(m => m.id);
    const com = r.memberResults.filter(m => m.maxN < -0.01).map(m => m.id);
    console.log(`      tension: ${ten.join(',')} | compression: ${com.join(',')}`);
  }
}
console.log(bad === 0 ? '\nAll sample models solve & satisfy equilibrium.' : `\n${bad} FAILURES`);
process.exit(bad ? 1 : 0);
