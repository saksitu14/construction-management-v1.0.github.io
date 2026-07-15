# ConstructPro — Construction Management + SkyCiv Structural Analysis

ระบบบริหารจัดการงานก่อสร้างบนเว็บ พร้อมโมดูลวิเคราะห์และออกแบบโครงสร้าง
(Web-based construction management software with an integrated structural analysis & design module — civil engineering senior project.)

## Run

No build step. Open `index.html` in a browser (double-click, or serve with `python -m http.server`).
All data persists in the browser's Local Storage. Chart.js loads from CDN; if offline, every
feature still works except the dashboard charts.

## Scope (per project brief)

| Module | Detail |
|---|---|
| UI Language | Bilingual ไทย/English — toggle in the top bar, persisted in settings |
| Dashboard | KPI tiles (projects, budget, progress, SPI, CPI, EAC) + 4 charts |
| Projects | CRUD, client/location/budget/status |
| WBS | Task breakdown by WBS code with progress and cost |
| Gantt | SVG Gantt chart with **Critical Path Method** (forward/backward pass, float), today marker, milestones |
| Resources | Labor / material / equipment with unit costs |
| Budget | **Earned Value Management**: PV, EV, AC, SPI = EV/PV, CPI = EV/AC, EAC = BAC/CPI, VAC, weekly S-curve |
| Structural | Model builder (nodes/members/supports/loads), analysis, BMD/SFD/axial/deflection/reactions viewer, design check |
| Reports | Printable project report (info, EVM summary, schedule, resources, structural results) |
| Settings | Language, Demo/Real API mode, SkyCiv credentials, data reset |

## Structural analysis — Demo Mode + Real API Mode

- **Demo Mode** (default): built-in **2D direct-stiffness solver** (`js/solver.js`) — frame and truss
  elements, fixed/pinned/roller supports, nodal loads and member UDLs, exact within-element BMD/SFD
  and Hermite-interpolated deflections. No internet or API key required, so the project can be
  demonstrated even if the SkyCiv key has expired.
- **Real API Mode**: sends the model to **SkyCiv Structural API v3**
  (`S3D.session.start → S3D.model.set → S3D.model.solve`) using the username/key from Settings.

### Design check — Version 1: AISC 360-22 (LRFD)

φMn = 0.9 Fy Zx, φPn from flexural buckling (AISC E3), interaction per H1-1 → DCR + PASS/FAIL.
RC sections report N/A (ACI 318 = Phase 2, Eurocode = Phase 3, per the phased plan).

### Sample structures (4)

1. **Portal Frame** — 20 m span, 6 m columns, DL+LL 12 kN/m on rafters
2. **2-Story RC Building** — 3 bays × 2 floors, floor/roof UDLs + lateral wind loads (story drift readable from node displacements)
3. **Steel Warehouse** — 30 m span, 8 m eaves, gravity + wind; deliberately shows a FAIL member in the design check
4. **Howe Roof Truss** — 12 m span; axial view colors tension (blue) / compression (red) members

## Verification

```
node test/solver_test.js    # closed-form checks: wL²/8, 5wL⁴/384EI, PL³/3EI, wL²/12, truss statics
node test/samples_test.js   # all 4 samples solve; ΣRy equals total applied load (equilibrium)
node test/smoke_test.js     # jsdom: boots app, visits every page, runs analyses (needs `npm i jsdom --no-save`)
```

## Stack

HTML5 · CSS3 · JavaScript ES6 · Chart.js (CDN) · SVG · Local Storage · SkyCiv API v3 — no framework, no build.
