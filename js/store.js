'use strict';
/* localStorage data layer + demo seed data */
const Store = {
  load(k, d) { try { const v = JSON.parse(localStorage.getItem('cms_' + k)); return v == null ? d : v; } catch (e) { return d; } },
  save(k, v) { localStorage.setItem('cms_' + k, JSON.stringify(v)); },
  clear() { Object.keys(localStorage).filter(k => k.startsWith('cms_')).forEach(k => localStorage.removeItem(k)); }
};

const state = { projects: [], tasks: [], resources: [], models: [], settings: {} };

function persist() {
  Store.save('projects', state.projects);
  Store.save('tasks', state.tasks);
  Store.save('resources', state.resources);
  Store.save('models', state.models);
  Store.save('settings', state.settings);
}

function initStore() {
  state.settings = Store.load('settings', { lang: 'th', apiMode: 'demo', skyUser: '', skyKey: '' });
  const projects = Store.load('projects', null);
  if (projects === null) { seedData(); persist(); }
  else {
    state.projects = projects;
    state.tasks = Store.load('tasks', []);
    state.resources = Store.load('resources', []);
    state.models = Store.load('models', []);
  }
  LANG = state.settings.lang || 'th';
}

function uid(prefix) { return prefix + '_' + Math.random().toString(36).slice(2, 8); }

function seedData() {
  state.projects = [
    {
      id: 'p1', name: 'อาคารสำนักงาน 2 ชั้น', nameEn: '2-Story Office Building',
      client: 'บจก. สยามเอ็นจิเนียริ่ง', clientEn: 'Siam Engineering Co., Ltd.',
      location: 'กรุงเทพมหานคร', locationEn: 'Bangkok',
      startDate: '2026-03-02', endDate: '2026-11-06', budget: 25000000, status: 'active'
    },
    {
      id: 'p2', name: 'โกดังเหล็กสำเร็จรูป', nameEn: 'Steel Warehouse',
      client: 'บจก. โลจิสติกส์ไทย', clientEn: 'Thai Logistics Co., Ltd.',
      location: 'ชลบุรี', locationEn: 'Chonburi',
      startDate: '2026-05-04', endDate: '2026-09-25', budget: 18000000, status: 'active'
    }
  ];
  state.tasks = [
    { id: 't1', projectId: 'p1', wbs: '1.0', name: 'งานเตรียมพื้นที่', nameEn: 'Site Preparation', duration: 14, deps: [], progress: 100, plannedCost: 800000, actualCost: 780000 },
    { id: 't2', projectId: 'p1', wbs: '2.0', name: 'งานฐานรากและตอม่อ', nameEn: 'Foundation Works', duration: 30, deps: ['t1'], progress: 100, plannedCost: 3500000, actualCost: 3650000 },
    { id: 't3', projectId: 'p1', wbs: '3.1', name: 'โครงสร้าง คสล. ชั้น 1', nameEn: 'RC Structure — Floor 1', duration: 35, deps: ['t2'], progress: 80, plannedCost: 4500000, actualCost: 3900000 },
    { id: 't4', projectId: 'p1', wbs: '3.2', name: 'โครงสร้าง คสล. ชั้น 2', nameEn: 'RC Structure — Floor 2', duration: 35, deps: ['t3'], progress: 40, plannedCost: 4200000, actualCost: 1900000 },
    { id: 't5', projectId: 'p1', wbs: '4.0', name: 'งานโครงหลังคา', nameEn: 'Roof Works', duration: 21, deps: ['t4'], progress: 0, plannedCost: 2000000, actualCost: 0 },
    { id: 't6', projectId: 'p1', wbs: '5.0', name: 'งานสถาปัตยกรรม', nameEn: 'Architectural Works', duration: 45, deps: ['t4'], progress: 10, plannedCost: 5500000, actualCost: 700000 },
    { id: 't7', projectId: 'p1', wbs: '6.0', name: 'งานระบบประกอบอาคาร (MEP)', nameEn: 'MEP Systems', duration: 40, deps: ['t3'], progress: 25, plannedCost: 3000000, actualCost: 850000 },
    { id: 't8', projectId: 'p1', wbs: '7.0', name: 'งานตกแต่งและส่งมอบ', nameEn: 'Finishing & Handover', duration: 20, deps: ['t5', 't6', 't7'], progress: 0, plannedCost: 1500000, actualCost: 0 },

    { id: 't9',  projectId: 'p2', wbs: '1.0', name: 'งานเตรียมพื้นที่', nameEn: 'Site Preparation', duration: 10, deps: [], progress: 100, plannedCost: 600000, actualCost: 580000 },
    { id: 't10', projectId: 'p2', wbs: '2.0', name: 'งานฐานรากและ Anchor Bolt', nameEn: 'Foundation & Anchor Bolts', duration: 25, deps: ['t9'], progress: 90, plannedCost: 2800000, actualCost: 2600000 },
    { id: 't11', projectId: 'p2', wbs: '3.0', name: 'ประกอบโครงเหล็ก (โรงงาน)', nameEn: 'Steel Fabrication', duration: 30, deps: ['t9'], progress: 70, plannedCost: 6500000, actualCost: 4800000 },
    { id: 't12', projectId: 'p2', wbs: '4.0', name: 'ติดตั้งโครงเหล็ก', nameEn: 'Steel Erection', duration: 20, deps: ['t10', 't11'], progress: 0, plannedCost: 3200000, actualCost: 0 },
    { id: 't13', projectId: 'p2', wbs: '5.0', name: 'งานหลังคาและผนัง Metal Sheet', nameEn: 'Roof & Wall Cladding', duration: 18, deps: ['t12'], progress: 0, plannedCost: 2400000, actualCost: 0 },
    { id: 't14', projectId: 'p2', wbs: '6.0', name: 'พื้นคอนกรีตและงานเก็บ', nameEn: 'Floor Slab & Finishing', duration: 15, deps: ['t12'], progress: 0, plannedCost: 1800000, actualCost: 0 },
    { id: 't15', projectId: 'p2', wbs: '7.0', name: 'ทดสอบและส่งมอบ', nameEn: 'Testing & Handover', duration: 7, deps: ['t13', 't14'], progress: 0, plannedCost: 700000, actualCost: 0 },
  ];
  state.resources = [
    { id: 'r1', name: 'หัวหน้าคนงาน', nameEn: 'Foreman', type: 'labor', unit: 'คน-วัน', unitEn: 'man-day', unitCost: 800, qty: 120 },
    { id: 'r2', name: 'คนงานก่อสร้าง', nameEn: 'Construction Worker', type: 'labor', unit: 'คน-วัน', unitEn: 'man-day', unitCost: 450, qty: 1500 },
    { id: 'r3', name: 'คอนกรีตผสมเสร็จ fc′ 28 MPa', nameEn: 'Ready-mix Concrete fc′ 28 MPa', type: 'material', unit: 'ลบ.ม.', unitEn: 'm³', unitCost: 2450, qty: 850 },
    { id: 'r4', name: 'เหล็กเส้น SD40', nameEn: 'Rebar SD40', type: 'material', unit: 'ตัน', unitEn: 'ton', unitCost: 23500, qty: 95 },
    { id: 'r5', name: 'เหล็กรูปพรรณ', nameEn: 'Structural Steel', type: 'material', unit: 'ตัน', unitEn: 'ton', unitCost: 38000, qty: 120 },
    { id: 'r6', name: 'รถเครน 25 ตัน', nameEn: 'Mobile Crane 25 t', type: 'equipment', unit: 'วัน', unitEn: 'day', unitCost: 12000, qty: 30 },
    { id: 'r7', name: 'รถขุดตีนตะขาบ', nameEn: 'Excavator', type: 'equipment', unit: 'วัน', unitEn: 'day', unitCost: 8500, qty: 25 },
  ];
  state.models = [];
}

/* ---- date helpers ---- */
function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d;
}
function fmtDate(d) {
  if (typeof d === 'string') d = new Date(d + 'T00:00:00');
  return d.toLocaleDateString(LANG === 'th' ? 'th-TH' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtMoney(v) {
  return '฿' + Math.round(v).toLocaleString(LANG === 'th' ? 'th-TH' : 'en-US');
}
function fmtMoneyShort(v) {
  if (Math.abs(v) >= 1e6) return '฿' + (v / 1e6).toFixed(1) + 'M';
  if (Math.abs(v) >= 1e3) return '฿' + (v / 1e3).toFixed(0) + 'k';
  return '฿' + Math.round(v);
}
function todayStr() { return new Date().toISOString().slice(0, 10); }
