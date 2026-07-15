'use strict';
/* Bilingual dictionary (TH default, EN secondary) */
const I18N = {
  en: {
    brandSub: 'Construction + SkyCiv',
    navDashboard: 'Dashboard', navProjects: 'Projects', navWbs: 'WBS',
    navGantt: 'Schedule (Gantt)', navResources: 'Resources', navBudget: 'Budget (EVM)',
    navStructural: 'Structural Analysis', navReports: 'Reports', navSettings: 'Settings',

    kpiProjects: 'Active Projects', kpiBudget: 'Total Budget', kpiProgress: 'Avg. Progress',
    kpiSPI: 'SPI (Schedule)', kpiCPI: 'CPI (Cost)', kpiEAC: 'Forecast Cost (EAC)',
    chartBudgetVsActual: 'Budget vs Actual Cost', chartProgress: 'Project Progress',
    chartSCurve: 'S-Curve (all projects)', chartResource: 'Resource Cost by Type',
    onSchedule: 'on schedule', behindSchedule: 'behind schedule',
    underBudget: 'under budget', overBudget: 'over budget',

    searchProjects: 'Search projects…', addProject: 'Add Project', editTitle: 'Edit', delete: 'Delete',
    projName: 'Project Name', client: 'Client', location: 'Location',
    startDate: 'Start', endDate: 'Finish', budget: 'Budget', status: 'Status', actions: 'Actions',
    statusActive: 'In Progress', statusPlanning: 'Planning', statusComplete: 'Completed', statusOnhold: 'On Hold',

    addTask: 'Add Task', taskName: 'Task Name', wbsCode: 'WBS', duration: 'Duration', days: 'days',
    deps: 'Predecessors', progress: 'Progress', plannedCost: 'Planned Cost', actualCost: 'Actual Cost',
    showCritical: 'Highlight critical path', critical: 'Critical', floatDays: 'Float',

    addResource: 'Add Resource', resourceName: 'Resource', resourceType: 'Type',
    unit: 'Unit', unitCost: 'Unit Cost', qty: 'Qty', totalCost: 'Total',
    typeLabor: 'Labor', typeMaterial: 'Material', typeEquipment: 'Equipment',

    evmCurve: 'Earned Value S-Curve', evmByTask: 'Cost by Task',
    pv: 'Planned Value (PV)', ev: 'Earned Value (EV)', ac: 'Actual Cost (AC)',
    bac: 'Budget (BAC)', eac: 'Forecast (EAC)', vac: 'Variance (VAC)',
    plannedPct: 'Planned %', actualPct: 'Actual %',

    newModel: 'New Model', saveModel: 'Save Model', analyze: 'Analyze',
    nodes: 'Nodes', members: 'Members', supports: 'Supports', loads: 'Loads',
    node: 'Node', member: 'Member', section: 'Section', type: 'Type',
    fixed: 'Fixed', pinned: 'Pinned', roller: 'Roller',
    nodalLoads: 'Nodal loads (kN, kN·m)', memberLoads: 'Member UDL (kN/m, ↓ = +)',
    addRow: '+ Add row',
    viewModel: 'Model', viewBMD: 'BMD', viewSFD: 'SFD', viewAxial: 'Axial',
    viewDefl: 'Deflection', viewReactions: 'Reactions',
    resultsTitle: 'Analysis Results', designCheck: 'Design Check', designCode: 'Design code:',
    maxM: 'Mmax (kN·m)', maxV: 'Vmax (kN)', maxN: 'Nmax (kN)', deflMax: 'δmax (mm)',
    reactions: 'Support Reactions', displacements: 'Node Displacements',
    dcr: 'DCR', result: 'Result', pass: 'PASS', fail: 'FAIL', na: 'N/A (RC)',
    tension: 'Tension', compression: 'Compression',
    analyzing: 'Analyzing…', demoDone: 'Solved with built-in solver (Demo Mode)',
    apiDone: 'Solved via SkyCiv API', apiError: 'SkyCiv API error — showing Demo Mode results',
    needApiKey: 'API mode selected but no key set — using Demo Mode',
    solveError: 'Model could not be solved — check supports/members',
    modelName: 'Model name', lenM: 'L (m)', promptModelName: 'Save model as:',
    sample: 'Sample', custom: 'Custom',

    print: 'Print Report', reportFor: 'Project Report', generated: 'Generated',
    taskSchedule: 'Task Schedule & Cost', evmSummary: 'Earned Value Summary (EVM)',
    resourceSummary: 'Resource Summary', structuralSummary: 'Structural Analysis',
    noStructResults: 'No structural analysis has been run for this session.',

    settingsGeneral: 'General', language: 'Language',
    settingsSkyciv: 'SkyCiv Structural API', apiMode: 'Analysis mode',
    demoMode: 'Demo Mode (built-in solver)', realApiMode: 'Real API Mode (SkyCiv)',
    apiHint: 'Demo Mode uses a built-in 2D direct-stiffness solver — no internet or API key required. Real API Mode sends the model to SkyCiv Structural API v3 (S3D.model.set → S3D.model.solve).',
    save: 'Save', cancel: 'Cancel', resetData: 'Reset demo data',
    resetConfirm: 'Reset all data back to the demo dataset?',
    delConfirm: 'Delete this item?', saved: 'Saved',
    close: 'Close',
  },
  th: {
    brandSub: 'บริหารงานก่อสร้าง + SkyCiv',
    navDashboard: 'แดชบอร์ด', navProjects: 'โครงการ', navWbs: 'โครงสร้างงาน (WBS)',
    navGantt: 'แผนงาน (Gantt)', navResources: 'ทรัพยากร', navBudget: 'งบประมาณ (EVM)',
    navStructural: 'วิเคราะห์โครงสร้าง', navReports: 'รายงาน', navSettings: 'ตั้งค่า',

    kpiProjects: 'โครงการที่ดำเนินการ', kpiBudget: 'งบประมาณรวม', kpiProgress: 'ความก้าวหน้าเฉลี่ย',
    kpiSPI: 'SPI (ด้านเวลา)', kpiCPI: 'CPI (ด้านต้นทุน)', kpiEAC: 'พยากรณ์ต้นทุน (EAC)',
    chartBudgetVsActual: 'งบประมาณ เทียบ ค่าใช้จ่ายจริง', chartProgress: 'ความก้าวหน้าโครงการ',
    chartSCurve: 'S-Curve (ทุกโครงการ)', chartResource: 'ต้นทุนทรัพยากรตามประเภท',
    onSchedule: 'เร็วกว่าแผน', behindSchedule: 'ช้ากว่าแผน',
    underBudget: 'ต่ำกว่างบ', overBudget: 'เกินงบ',

    searchProjects: 'ค้นหาโครงการ…', addProject: 'เพิ่มโครงการ', editTitle: 'แก้ไข', delete: 'ลบ',
    projName: 'ชื่อโครงการ', client: 'ลูกค้า', location: 'สถานที่',
    startDate: 'เริ่มต้น', endDate: 'สิ้นสุด', budget: 'งบประมาณ', status: 'สถานะ', actions: 'จัดการ',
    statusActive: 'กำลังดำเนินการ', statusPlanning: 'วางแผน', statusComplete: 'แล้วเสร็จ', statusOnhold: 'ชะลอ',

    addTask: 'เพิ่มกิจกรรม', taskName: 'ชื่อกิจกรรม', wbsCode: 'WBS', duration: 'ระยะเวลา', days: 'วัน',
    deps: 'งานก่อนหน้า', progress: 'ความก้าวหน้า', plannedCost: 'ต้นทุนตามแผน', actualCost: 'ต้นทุนจริง',
    showCritical: 'เน้นสายงานวิกฤต (Critical Path)', critical: 'วิกฤต', floatDays: 'Float',

    addResource: 'เพิ่มทรัพยากร', resourceName: 'ทรัพยากร', resourceType: 'ประเภท',
    unit: 'หน่วย', unitCost: 'ราคาต่อหน่วย', qty: 'จำนวน', totalCost: 'รวม',
    typeLabor: 'แรงงาน', typeMaterial: 'วัสดุ', typeEquipment: 'เครื่องจักร',

    evmCurve: 'กราฟ S-Curve มูลค่างาน (EVM)', evmByTask: 'ต้นทุนรายกิจกรรม',
    pv: 'มูลค่างานตามแผน (PV)', ev: 'มูลค่างานที่ทำได้ (EV)', ac: 'ค่าใช้จ่ายจริง (AC)',
    bac: 'งบประมาณ (BAC)', eac: 'พยากรณ์ (EAC)', vac: 'ผลต่าง (VAC)',
    plannedPct: 'แผน %', actualPct: 'ผลงาน %',

    newModel: 'โมเดลใหม่', saveModel: 'บันทึกโมเดล', analyze: 'วิเคราะห์',
    nodes: 'จุดต่อ (Nodes)', members: 'ชิ้นส่วน (Members)', supports: 'จุดรองรับ', loads: 'แรงกระทำ',
    node: 'จุดต่อ', member: 'ชิ้นส่วน', section: 'หน้าตัด', type: 'ชนิด',
    fixed: 'ยึดแน่น (Fixed)', pinned: 'หมุนได้ (Pinned)', roller: 'ล้อเลื่อน (Roller)',
    nodalLoads: 'แรงที่จุดต่อ (kN, kN·m)', memberLoads: 'แรงแผ่บนชิ้นส่วน (kN/m, ↓ = +)',
    addRow: '+ เพิ่มแถว',
    viewModel: 'โมเดล', viewBMD: 'BMD', viewSFD: 'SFD', viewAxial: 'แรงตามแกน',
    viewDefl: 'การโก่งตัว', viewReactions: 'แรงปฏิกิริยา',
    resultsTitle: 'ผลการวิเคราะห์', designCheck: 'ตรวจสอบการออกแบบ', designCode: 'มาตรฐาน:',
    maxM: 'Mmax (kN·m)', maxV: 'Vmax (kN)', maxN: 'Nmax (kN)', deflMax: 'δmax (มม.)',
    reactions: 'แรงปฏิกิริยาที่จุดรองรับ', displacements: 'การเคลื่อนที่ของจุดต่อ',
    dcr: 'DCR', result: 'ผล', pass: 'ผ่าน', fail: 'ไม่ผ่าน', na: 'N/A (คสล.)',
    tension: 'แรงดึง', compression: 'แรงอัด',
    analyzing: 'กำลังวิเคราะห์…', demoDone: 'วิเคราะห์ด้วยตัวแก้สมการภายใน (Demo Mode)',
    apiDone: 'วิเคราะห์ผ่าน SkyCiv API สำเร็จ', apiError: 'SkyCiv API ผิดพลาด — แสดงผลจาก Demo Mode',
    needApiKey: 'เลือก API Mode แต่ยังไม่ได้ตั้งค่า API Key — ใช้ Demo Mode แทน',
    solveError: 'ไม่สามารถวิเคราะห์โมเดลได้ — ตรวจสอบจุดรองรับ/ชิ้นส่วน',
    modelName: 'ชื่อโมเดล', lenM: 'L (ม.)', promptModelName: 'บันทึกโมเดลชื่อ:',
    sample: 'ตัวอย่าง', custom: 'กำหนดเอง',

    print: 'พิมพ์รายงาน', reportFor: 'รายงานโครงการ', generated: 'จัดทำเมื่อ',
    taskSchedule: 'แผนงานและต้นทุนรายกิจกรรม', evmSummary: 'สรุปมูลค่างาน (EVM)',
    resourceSummary: 'สรุปทรัพยากร', structuralSummary: 'ผลวิเคราะห์โครงสร้าง',
    noStructResults: 'ยังไม่มีการวิเคราะห์โครงสร้างในเซสชันนี้',

    settingsGeneral: 'ทั่วไป', language: 'ภาษา',
    settingsSkyciv: 'SkyCiv Structural API', apiMode: 'โหมดการวิเคราะห์',
    demoMode: 'Demo Mode (ตัวแก้สมการภายใน)', realApiMode: 'Real API Mode (SkyCiv)',
    apiHint: 'Demo Mode ใช้ตัวแก้สมการ Direct Stiffness 2D ภายในโปรแกรม ไม่ต้องใช้อินเทอร์เน็ตหรือ API Key ส่วน Real API Mode จะส่งโมเดลไปยัง SkyCiv Structural API v3 (S3D.model.set → S3D.model.solve)',
    save: 'บันทึก', cancel: 'ยกเลิก', resetData: 'ล้างข้อมูลกลับเป็นชุดสาธิต',
    resetConfirm: 'ล้างข้อมูลทั้งหมดกลับเป็นชุดข้อมูลสาธิต?',
    delConfirm: 'ต้องการลบรายการนี้?', saved: 'บันทึกแล้ว',
    close: 'ปิด',
  }
};

let LANG = 'th';
function t(key) {
  return (I18N[LANG] && I18N[LANG][key]) ?? I18N.en[key] ?? key;
}
function applyI18n(root = document) {
  root.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
}
/* localized name helper: objects carry name (th) + nameEn */
function ln(obj) {
  if (!obj) return '';
  return LANG === 'en' ? (obj.nameEn || obj.name) : (obj.name || obj.nameEn);
}
