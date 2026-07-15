'use strict';
/* DOM smoke test with jsdom: boot the app, visit every page, run an analysis. Run: node test/smoke_test.js */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const root = path.join(__dirname, '..');
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8')
  .replace(/<script src="https:[^"]*"><\/script>/, '')        // drop Chart.js CDN (guarded in app)
  .replace(/<script src="js\/[^"]*"><\/script>/g, '');        // scripts evaluated manually below

const dom = new JSDOM(html, { url: 'http://localhost/', runScripts: 'outside-only', pretendToBeVisual: true });
const { window } = dom;

const errors = [];
window.addEventListener('error', e => errors.push('window error: ' + e.message));
window.confirm = () => true;
window.prompt = () => 'TestModel';

for (const f of ['i18n.js', 'store.js', 'solver.js', 'samples.js', 'gantt.js', 'evm.js', 'structural.js', 'app.js']) {
  // strict-mode indirect eval scopes declarations locally, and top-level const/let are eval-scoped
  // even in sloppy mode — real <script> tags share the global lexical scope, so rewrite for the harness
  const src = fs.readFileSync(path.join(root, 'js', f), 'utf8')
    .replace(/^'use strict';/, '')
    .replace(/^const /gm, 'var ')
    .replace(/^let /gm, 'var ');
  try { window.eval(src); }
  catch (e) { errors.push(`eval ${f}: ${e.message}`); }
}

let failures = 0;
function check(name, cond) {
  if (!cond) failures++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
}

const $ = sel => window.document.querySelector(sel);
const $$ = sel => window.document.querySelectorAll(sel);

async function waitForInit() {
  // jsdom fires its own DOMContentLoaded asynchronously — wait for it (manual dispatch would double-run init)
  for (let i = 0; i < 100; i++) {
    if ($('#pageTitle').textContent.length > 0) return;
    await new Promise(r => setTimeout(r, 10));
  }
  throw new Error('app did not initialize');
}

(async () => {
await waitForInit();

check('init without errors', errors.length === 0);
if (errors.length) console.log(errors.join('\n'));

check('page title set (TH)', $('#pageTitle').textContent.length > 0);
check('mode badge = DEMO', $('#modeBadge').textContent.includes('DEMO'));
check('dashboard KPIs rendered', $$('#dashKpis .kpi').length >= 5);

function go(page) {
  window.location.hash = '#' + page;
  try { window.dispatchEvent(new window.Event('hashchange')); return true; }
  catch (e) { errors.push(`${page}: ${e.stack || e.message}`); return false; }
}

check('navigate projects', go('projects') && $$('#projectsTable tbody tr').length === 2);
check('navigate wbs', go('wbs') && $$('#wbsTree .wbs-item').length >= 8);
check('navigate gantt: svg + task rows', go('gantt') && $('#ganttChart svg') !== null && $$('#taskTable tbody tr').length === 8);
check('gantt has critical bars', $$('#ganttChart svg rect').length > 5);
check('navigate resources', go('resources') && $$('#resourceTable tbody tr').length === 7);
check('navigate budget: EVM KPIs', go('budget') && $$('#evmKpis .kpi').length === 7);
check('navigate reports', go('reports') && $('#reportBody').textContent.includes('EVM'));
check('navigate settings', go('settings') && $('#setLang').value === 'th');

/* structural page */
check('navigate structural', go('structural'));
check('model select has 4 samples + custom', $$('#modelSelect option').length === 5);
check('structure SVG drawn', $$('#structSvg svg line').length >= 4);

/* run demo analysis on sample 1 (portal frame) */
  try { await window.runAnalysis(); } catch (e) { errors.push('analysis: ' + (e.stack || e.message)); }
  check('analysis ran without errors', errors.length === 0);
  if (errors.length) console.log(errors.join('\n'));
  check('analysis produced results', window.Struct.results && window.Struct.results.ok);
  check('status shows demo done', $('#analyzeStatus').textContent.length > 0);
  check('BMD view active after analyze', window.Struct.view === 'bmd');
  check('diagram polygons drawn', $$('#structSvg svg polygon').length >= 4);
  check('result tables rendered', $$('#resultTables table').length === 3);
  check('design check rows', $$('#designTable tbody tr').length === 4);
  check('design check has PASS pill', $('#designTable tbody').innerHTML.includes('pill pass'));

  /* switch views */
  for (const v of ['sfd', 'axial', 'defl', 'react', 'model']) {
    window.Struct.view = v;
    try { window.renderStructView(); check(`view ${v} renders`, true); }
    catch (e) { check(`view ${v} renders`, false); console.log(e.message); }
  }

  /* language toggle EN */
  try {
    $('#langToggle').click();
    check('language switched to EN', window.LANG === 'en' && $('#pageTitle').textContent === 'Structural Analysis');
  } catch (e) { check('language switched to EN', false); console.log(e.stack); }

  /* howe truss sample: axial signs */
  $('#modelSelect').value = 'sample:3';
  $('#modelSelect').dispatchEvent(new window.Event('change'));
  await window.runAnalysis();
  const howeRes = window.Struct.results;
  check('howe truss solved', howeRes && howeRes.ok);
  const bc1 = howeRes.memberResults.find(m => m.id === 'BC1');
  const tc1 = howeRes.memberResults.find(m => m.id === 'TC1');
  check('howe bottom chord in tension', bc1.maxN > 0);
  check('howe top chord in compression', tc1.maxN < 0);

  console.log(failures === 0 ? '\nSmoke test: ALL PASS' : `\nSmoke test: ${failures} FAILURES`);
  process.exit(failures ? 1 : 0);
})();
