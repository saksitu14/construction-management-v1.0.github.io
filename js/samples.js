'use strict';
/* Sample structures per project brief: portal frame, 2-story RC building, steel warehouse, Howe roof truss */
const SAMPLES = [
  {
    key: 'portal',
    name: 'โครงข้อแข็ง Portal Frame (ช่วง 20 ม.)', nameEn: 'Portal Frame (20 m span)',
    model: {
      nodes: [
        { id: 1, x: 0, y: 0 }, { id: 2, x: 0, y: 6 }, { id: 3, x: 10, y: 7.5 },
        { id: 4, x: 20, y: 6 }, { id: 5, x: 20, y: 0 },
      ],
      members: [
        { id: 'C1', nodeA: 1, nodeB: 2, section: 'W14x38', type: 'frame' },
        { id: 'R1', nodeA: 2, nodeB: 3, section: 'W18x50', type: 'frame' },
        { id: 'R2', nodeA: 3, nodeB: 4, section: 'W18x50', type: 'frame' },
        { id: 'C2', nodeA: 5, nodeB: 4, section: 'W14x38', type: 'frame' },
      ],
      supports: [{ node: 1, type: 'pinned' }, { node: 5, type: 'pinned' }],
      loads: {
        nodal: [],
        member: [{ member: 'R1', w: 12 }, { member: 'R2', w: 12 }], // DL + LL
      },
    },
  },
  {
    key: 'rc2story',
    name: 'อาคาร คสล. 2 ชั้น 3 ช่วงเสา', nameEn: '2-Story RC Building (3 bays)',
    model: {
      nodes: [
        { id: 1, x: 0, y: 0 },  { id: 2, x: 6, y: 0 },  { id: 3, x: 12, y: 0 },  { id: 4, x: 18, y: 0 },
        { id: 5, x: 0, y: 3.5 },{ id: 6, x: 6, y: 3.5 },{ id: 7, x: 12, y: 3.5 },{ id: 8, x: 18, y: 3.5 },
        { id: 9, x: 0, y: 7 },  { id: 10, x: 6, y: 7 }, { id: 11, x: 12, y: 7 }, { id: 12, x: 18, y: 7 },
      ],
      members: [
        { id: 'C11', nodeA: 1, nodeB: 5, section: 'RC400x400', type: 'frame' },
        { id: 'C12', nodeA: 2, nodeB: 6, section: 'RC400x400', type: 'frame' },
        { id: 'C13', nodeA: 3, nodeB: 7, section: 'RC400x400', type: 'frame' },
        { id: 'C14', nodeA: 4, nodeB: 8, section: 'RC400x400', type: 'frame' },
        { id: 'C21', nodeA: 5, nodeB: 9, section: 'RC400x400', type: 'frame' },
        { id: 'C22', nodeA: 6, nodeB: 10, section: 'RC400x400', type: 'frame' },
        { id: 'C23', nodeA: 7, nodeB: 11, section: 'RC400x400', type: 'frame' },
        { id: 'C24', nodeA: 8, nodeB: 12, section: 'RC400x400', type: 'frame' },
        { id: 'B11', nodeA: 5, nodeB: 6, section: 'RC300x500', type: 'frame' },
        { id: 'B12', nodeA: 6, nodeB: 7, section: 'RC300x500', type: 'frame' },
        { id: 'B13', nodeA: 7, nodeB: 8, section: 'RC300x500', type: 'frame' },
        { id: 'B21', nodeA: 9, nodeB: 10, section: 'RC300x500', type: 'frame' },
        { id: 'B22', nodeA: 10, nodeB: 11, section: 'RC300x500', type: 'frame' },
        { id: 'B23', nodeA: 11, nodeB: 12, section: 'RC300x500', type: 'frame' },
      ],
      supports: [
        { node: 1, type: 'fixed' }, { node: 2, type: 'fixed' },
        { node: 3, type: 'fixed' }, { node: 4, type: 'fixed' },
      ],
      loads: {
        nodal: [{ node: 5, fx: 15, fy: 0, m: 0 }, { node: 9, fx: 25, fy: 0, m: 0 }], // lateral (wind)
        member: [
          { member: 'B11', w: 25 }, { member: 'B12', w: 25 }, { member: 'B13', w: 25 },
          { member: 'B21', w: 18 }, { member: 'B22', w: 18 }, { member: 'B23', w: 18 },
        ],
      },
    },
  },
  {
    key: 'warehouse',
    name: 'โกดังเหล็ก (ช่วง 30 ม. + แรงลม)', nameEn: 'Steel Warehouse (30 m span + wind)',
    model: {
      nodes: [
        { id: 1, x: 0, y: 0 }, { id: 2, x: 0, y: 8 }, { id: 3, x: 15, y: 9.5 },
        { id: 4, x: 30, y: 8 }, { id: 5, x: 30, y: 0 },
      ],
      members: [
        { id: 'C1', nodeA: 1, nodeB: 2, section: 'W16x40', type: 'frame' },
        { id: 'R1', nodeA: 2, nodeB: 3, section: 'W21x62', type: 'frame' },
        { id: 'R2', nodeA: 3, nodeB: 4, section: 'W21x62', type: 'frame' },
        { id: 'C2', nodeA: 5, nodeB: 4, section: 'W16x40', type: 'frame' },
      ],
      supports: [{ node: 1, type: 'fixed' }, { node: 5, type: 'fixed' }],
      loads: {
        nodal: [{ node: 2, fx: 35, fy: 0, m: 0 }, { node: 3, fx: 18, fy: 0, m: 0 }], // wind
        member: [{ member: 'R1', w: 10 }, { member: 'R2', w: 10 }],
      },
    },
  },
  {
    key: 'howe',
    name: 'โครงถักหลังคา Howe Truss (ช่วง 12 ม.)', nameEn: 'Howe Roof Truss (12 m span)',
    model: {
      nodes: [
        { id: 1, x: 0, y: 0 }, { id: 2, x: 3, y: 0 }, { id: 3, x: 6, y: 0 },
        { id: 4, x: 9, y: 0 }, { id: 5, x: 12, y: 0 },
        { id: 6, x: 3, y: 1 }, { id: 7, x: 6, y: 2 }, { id: 8, x: 9, y: 1 },
      ],
      members: [
        { id: 'BC1', nodeA: 1, nodeB: 2, section: 'L75x75x6', type: 'truss' },
        { id: 'BC2', nodeA: 2, nodeB: 3, section: 'L75x75x6', type: 'truss' },
        { id: 'BC3', nodeA: 3, nodeB: 4, section: 'L75x75x6', type: 'truss' },
        { id: 'BC4', nodeA: 4, nodeB: 5, section: 'L75x75x6', type: 'truss' },
        { id: 'TC1', nodeA: 1, nodeB: 6, section: 'HSS100x100x6', type: 'truss' },
        { id: 'TC2', nodeA: 6, nodeB: 7, section: 'HSS100x100x6', type: 'truss' },
        { id: 'TC3', nodeA: 7, nodeB: 8, section: 'HSS100x100x6', type: 'truss' },
        { id: 'TC4', nodeA: 8, nodeB: 5, section: 'HSS100x100x6', type: 'truss' },
        { id: 'V1', nodeA: 6, nodeB: 2, section: 'L75x75x6', type: 'truss' },
        { id: 'V2', nodeA: 7, nodeB: 3, section: 'L75x75x6', type: 'truss' },
        { id: 'V3', nodeA: 8, nodeB: 4, section: 'L75x75x6', type: 'truss' },
        { id: 'D1', nodeA: 2, nodeB: 7, section: 'L75x75x6', type: 'truss' },
        { id: 'D2', nodeA: 4, nodeB: 7, section: 'L75x75x6', type: 'truss' },
      ],
      supports: [{ node: 1, type: 'pinned' }, { node: 5, type: 'roller' }],
      loads: {
        nodal: [
          { node: 6, fx: 0, fy: -20, m: 0 },
          { node: 7, fx: 0, fy: -25, m: 0 },
          { node: 8, fx: 0, fy: -20, m: 0 },
        ],
        member: [],
      },
    },
  },
];
