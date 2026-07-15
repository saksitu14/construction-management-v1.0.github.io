'use strict';
/* Earned Value Management: PV/EV/AC, SPI, CPI, EAC + weekly S-curve */

function computeEVM(project, tasks) {
  const { map, projEnd } = cpm(tasks);
  const start = new Date(project.startDate + 'T00:00:00');
  const now = new Date();
  const todayD = Math.max(0, (now - start) / 86400000);

  const bac = tasks.reduce((s, tk) => s + (+tk.plannedCost || 0), 0);

  function pvAt(d) {
    let pv = 0;
    for (const tk of tasks) {
      const r = map.get(tk.id);
      const dur = Math.max(+tk.duration || 0, 0.001);
      pv += (+tk.plannedCost || 0) * Math.min(1, Math.max(0, (d - r.es) / dur));
    }
    return pv;
  }
  /* EV/AC to date: assume each started task accrued linearly from its ES until today */
  function accrAt(d, field, frac) {
    let v = 0;
    for (const tk of tasks) {
      const r = map.get(tk.id);
      const span = Math.max(0.001, Math.min(todayD, r.ef) - r.es);
      const started = todayD > r.es;
      if (!started) continue;
      const amount = field === 'ev' ? (+tk.plannedCost || 0) * (+tk.progress || 0) / 100 : (+tk.actualCost || 0);
      v += amount * Math.min(1, Math.max(0, (d - r.es) / span));
    }
    return v;
  }

  const pv = pvAt(Math.min(todayD, projEnd));
  const ev = accrAt(todayD, 'ev');
  const ac = accrAt(todayD, 'ac');
  const spi = pv > 0 ? ev / pv : 1;
  const cpi = ac > 0 ? ev / ac : 1;
  const eac = cpi > 0 ? bac / cpi : bac;
  const vac = bac - eac;

  // weekly curve
  const labels = [], pvC = [], evC = [], acC = [];
  for (let d = 0; d <= projEnd + 6; d += 7) {
    const dd = Math.min(d, projEnd);
    labels.push(fmtDate(addDays(project.startDate, dd)));
    pvC.push(pvAt(dd));
    // EV/AC exist only up to the status date (today)
    evC.push(dd <= todayD ? accrAt(dd, 'ev') : null);
    acC.push(dd <= todayD ? accrAt(dd, 'ac') : null);
  }

  return {
    bac, pv, ev, ac, spi, cpi, eac, vac, projEnd, todayD,
    plannedPct: bac > 0 ? pv / bac * 100 : 0,
    actualPct: bac > 0 ? ev / bac * 100 : 0,
    curve: { labels, pv: pvC, ev: evC, ac: acC },
    fns: { pvAt, accrAt },   // exposed for cross-project aggregation
  };
}
