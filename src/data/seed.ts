import type {
  Activity, Department, Distribution, DocRequest, QualityDocument, User,
} from '../types'

/** ตารางอักษรย่อของคณะกรรมการ/สาขาวิชา/หน่วยงาน — QM-QMR-001-1 หน้า 7 */
export const departments: Department[] = [
  { code: 'QMR', nameTh: 'ศูนย์คุณภาพ', group: 'ศูนย์คุณภาพ' },
  { code: 'HRD', nameTh: 'คณะกรรมการบริหารพัฒนาทรัพยากรบุคคล', group: 'คณะกรรมการ' },
  { code: 'RMC', nameTh: 'คณะกรรมการบริหารความเสี่ยง', group: 'คณะกรรมการ' },
  { code: 'ICC', nameTh: 'คณะกรรมการป้องกันและควบคุมการติดเชื้อในโรงพยาบาล', group: 'คณะกรรมการ' },
  { code: 'PCT', nameTh: 'คณะกรรมการดูแลผู้ป่วย', group: 'คณะกรรมการ' },
  { code: 'PTC', nameTh: 'คณะกรรมการเภสัชบำบัด', group: 'คณะกรรมการ' },
  { code: 'ENV', nameTh: 'คณะกรรมการบริหารสิ่งแวดล้อมและความปลอดภัย', group: 'คณะกรรมการ' },
  { code: 'IM',  nameTh: 'คณะกรรมการสารสนเทศ', group: 'คณะกรรมการ' },
  { code: 'CHC', nameTh: 'คณะกรรมการสุขภาพชุมชน', group: 'คณะกรรมการ' },
  { code: 'DEN', nameTh: 'กลุ่มงานทันตกรรม', group: 'กลุ่มงาน' },
  { code: 'PHA', nameTh: 'กลุ่มงานเภสัชกรรมและคุ้มครองผู้บริโภค', group: 'กลุ่มงาน' },
  { code: 'LAB', nameTh: 'กลุ่มงานเทคนิคการแพทย์', group: 'กลุ่มงาน' },
  { code: 'RAD', nameTh: 'กลุ่มงานรังสีวิทยา', group: 'กลุ่มงาน' },
  { code: 'REH', nameTh: 'กลุ่มงานเวชกรรมฟื้นฟู', group: 'กลุ่มงาน' },
  { code: 'NUT', nameTh: 'กลุ่มงานโภชนศาสตร์', group: 'กลุ่มงาน' },
  { code: 'HIS', nameTh: 'กลุ่มงานประกันสุขภาพและสารสนเทศทางการแพทย์', group: 'กลุ่มงาน' },
  { code: 'ADM', nameTh: 'กลุ่มงานบริหารทั่วไป', group: 'กลุ่มงาน' },
  { code: 'PHC', nameTh: 'กลุ่มงานบริการด้านปฐมภูมิและองค์รวม', group: 'กลุ่มงาน' },
  { code: 'TCM', nameTh: 'กลุ่มงานแพทย์แผนไทยและแพทย์ทางเลือก', group: 'กลุ่มงาน' },
  { code: 'PSY', nameTh: 'กลุ่มงานจิตเวชและยาเสพติด', group: 'กลุ่มงาน' },
  { code: 'MSO', nameTh: 'องค์กรแพทย์', group: 'องค์กร' },
  { code: 'NSO', nameTh: 'องค์กรพยาบาล', group: 'องค์กร' },
  { code: 'OPD', nameTh: 'งานการพยาบาลผู้ป่วยนอก', group: 'งานการพยาบาล' },
  { code: 'IPD', nameTh: 'งานการพยาบาลผู้ป่วยในและผู้ป่วยหนัก', group: 'งานการพยาบาล' },
  { code: 'ER',  nameTh: 'งานการพยาบาลผู้ป่วยอุบัติเหตุฉุกเฉินและนิติเวช', group: 'งานการพยาบาล' },
  { code: 'OR',  nameTh: 'งานการพยาบาลผ่าตัดและวิสัญญีพยาบาล', group: 'งานการพยาบาล' },
  { code: 'IC',  nameTh: 'งานการพยาบาลหน่วยควบคุมการติดเชื้อและงานจ่ายกลาง', group: 'งานการพยาบาล' },
  { code: 'LR',  nameTh: 'งานการพยาบาลผู้คลอด', group: 'งานการพยาบาล' },
  { code: 'HD',  nameTh: 'งานการพยาบาลไตเทียม', group: 'งานการพยาบาล' },
]

/**
 * ผู้ใช้ตัวอย่าง 4 ระดับ (ผู้เกี่ยวข้องจริงตามหน้าปก QM-QMR-001-1)
 * ใช้อีเมลเหล่านี้ล็อกอินในโหมดสาธิต
 */
export const users: User[] = [
  { id: 'u-admin',       name: 'ผู้ดูแลระบบ',            position: 'ผู้ดูแลระบบสารสนเทศ',              email: 'admin@paihospital.go.th',    role: 'admin',    deptCode: 'IM' },
  { id: 'u-wattanachai', name: 'นพ.วัฒนชัย วิเศษสมิต',  position: 'ผู้อำนวยการโรงพยาบาล',            email: 'director@paihospital.go.th', role: 'director', deptCode: 'ADM' },
  { id: 'u-patiphan',    name: 'ภก.ปฏิภาณ คำมาเร็ว',   position: 'เภสัชกร · เลขานุการศูนย์คุณภาพ',   email: 'qmr@paihospital.go.th',      role: 'qmr',      deptCode: 'QMR' },
  { id: 'u-uraiporn',    name: 'นางอุไรพร วิเศษสมิต',   position: 'พยาบาลวิชาชีพชำนาญการ · ศูนย์คุณภาพ', email: 'review@paihospital.go.th', role: 'qmr',      deptCode: 'QMR' },
  { id: 'u-chair-pha',   name: 'ภญ.หัวหน้ากลุ่มงานเภสัชกรรม', position: 'เภสัชกรชำนาญการ · หัวหน้ากลุ่มงาน', email: 'chair@paihospital.go.th', role: 'chair',    deptCode: 'PHA' },
  { id: 'u-staff-ipd',   name: 'พว.วรรณา สดใส',        position: 'พยาบาลวิชาชีพ · งานผู้ป่วยใน',      email: 'staff@paihospital.go.th',    role: 'staff',    deptCode: 'IPD' },
]

const iso = (offsetDays: number, from = new Date()) => {
  const d = new Date(from)
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString()
}

// วันที่อนุมัติใช้จริงของ QM-QMR-001-1 ตามบันทึกการแก้ไข: 25 พ.ย. 2568
const QM_EFFECTIVE = new Date('2025-11-25T00:00:00+07:00').toISOString()

export const documents: QualityDocument[] = [
  {
    id: 'doc-qm-qmr-001',
    level: 'QM', deptCode: 'QMR', seq: 1, revision: 1,
    title: 'การจัดทำและควบคุมเอกสารคุณภาพ',
    status: 'controlled',
    effectiveDate: QM_EFFECTIVE,
    preparedBy: 'ภก.ปฏิภาณ คำมาเร็ว (เภสัชกร)',
    reviewedBy: 'นางอุไรพร วิเศษสมิต (พยาบาลวิชาชีพชำนาญการ)',
    approvedBy: 'นพ.วัฒนชัย วิเศษสมิต (ผู้อำนวยการโรงพยาบาล)',
    fileName: 'QM-QMR-001-1.pdf', pageCount: 16,
    summary:
      'คู่มือคุณภาพแม่บทกำหนดมาตรฐานการจัดทำ ทบทวน อนุมัติ แจกจ่าย แก้ไข จัดเก็บ และควบคุมเอกสารคุณภาพทุกประเภท ครอบคลุมระดับเอกสาร 4 ระดับ (QM/SOP/WI/FM) ระบบรหัสเอกสาร และผู้รับผิดชอบแต่ละขั้นตอน',
    revisionLog: [{ date: QM_EFFECTIVE, revision: 1, note: 'อนุมัติใช้เอกสาร' }],
    isMaster: true,
  },
  {
    id: 'doc-fm-qmr-001',
    level: 'FM', deptCode: 'QMR', seq: 1, revision: 1,
    title: 'ใบขอขึ้นทะเบียนใหม่ / ปรับปรุงแก้ไข / ยกเลิก เอกสารคุณภาพ',
    status: 'controlled',
    effectiveDate: new Date('2025-11-14T00:00:00+07:00').toISOString(),
    preparedBy: 'ภก.ปฏิภาณ คำมาเร็ว (เภสัชกร)',
    reviewedBy: 'นางอุไรพร วิเศษสมิต',
    approvedBy: 'นพ.วัฒนชัย วิเศษสมิต (ผู้อำนวยการโรงพยาบาล)',
    fileName: 'FM-QMR-001-1.pdf', pageCount: 1,
    summary: 'แบบฟอร์มยื่นคำขอออกเอกสารใหม่ ปรับปรุงแก้ไข หรือยกเลิกเอกสารคุณภาพ (ภาคผนวก 7.2)',
    revisionLog: [{ date: new Date('2025-11-14T00:00:00+07:00').toISOString(), revision: 1, note: 'อนุมัติใช้เอกสาร' }],
  },
  {
    id: 'doc-fm-qmr-002',
    level: 'FM', deptCode: 'QMR', seq: 2, revision: 1,
    title: 'บัญชีรายการเอกสารคุณภาพ',
    status: 'controlled',
    effectiveDate: new Date('2025-11-14T00:00:00+07:00').toISOString(),
    preparedBy: 'ภก.ปฏิภาณ คำมาเร็ว (เภสัชกร)',
    reviewedBy: 'นางอุไรพร วิเศษสมิต',
    approvedBy: 'นพ.วัฒนชัย วิเศษสมิต (ผู้อำนวยการโรงพยาบาล)',
    fileName: 'FM-QMR-002-1.pdf', pageCount: 1,
    summary: 'ทะเบียนกลางบันทึกรายการเอกสารคุณภาพทุกฉบับ แยกตามกลุ่มผู้จัดทำ (ภาคผนวก 7.3)',
    revisionLog: [{ date: new Date('2025-11-14T00:00:00+07:00').toISOString(), revision: 1, note: 'อนุมัติใช้เอกสาร' }],
  },
  {
    id: 'doc-sop-icc-001',
    level: 'SOP', deptCode: 'ICC', seq: 1, revision: 1,
    title: 'แนวทางการป้องกันและควบคุมการติดเชื้อในโรงพยาบาล',
    status: 'controlled',
    effectiveDate: iso(-20),
    preparedBy: 'คณะกรรมการ ICC',
    reviewedBy: 'QMR/PCT',
    approvedBy: 'นพ.วัฒนชัย วิเศษสมิต (ผู้อำนวยการโรงพยาบาล)',
    fileName: 'SOP-ICC-001-1.pdf', pageCount: 22,
    summary: 'ขั้นตอนการล้างมือ การใช้ PPE ตามระดับความเสี่ยง และการแยกผู้ป่วยแพร่เชื้อ',
    revisionLog: [{ date: iso(-20), revision: 1, note: 'อนุมัติใช้เอกสาร' }],
  },
  {
    id: 'doc-wi-opd-001',
    level: 'WI', deptCode: 'OPD', seq: 1, revision: 2,
    title: 'วิธีปฏิบัติงานคัดกรองผู้ป่วยที่จุดคัดกรอง',
    status: 'controlled',
    effectiveDate: iso(-7),
    preparedBy: 'งานการพยาบาลผู้ป่วยนอก',
    reviewedBy: 'QMR/PCT/หัวหน้ากลุ่มงาน',
    approvedBy: 'หัวหน้ากลุ่มงานการพยาบาล',
    fileName: 'WI-OPD-001-2.pdf', pageCount: 6,
    summary: 'ปรับปรุงเกณฑ์คัดแยกผู้ป่วยระบบทางเดินหายใจตามแนวทางกระทรวง',
    revisionLog: [
      { date: iso(-90), revision: 1, note: 'อนุมัติใช้เอกสาร' },
      { date: iso(-7), revision: 2, note: 'ปรับเกณฑ์คัดแยกผู้ป่วยตามประกาศใหม่' },
    ],
  },
  {
    id: 'doc-sop-ptc-001',
    level: 'SOP', deptCode: 'PTC', seq: 1, revision: 1,
    title: 'แนวทางการจัดการยาความเสี่ยงสูง (High Alert Drugs)',
    status: 'pending_approval',
    effectiveDate: iso(0),
    preparedBy: 'คณะกรรมการเภสัชบำบัด',
    reviewedBy: 'QMR/PCT',
    approvedBy: '—',
    fileName: 'SOP-PTC-001-1_draft.pdf', pageCount: 14,
    summary: 'บัญชียา HAD การติดฉลากเตือน การ double-check และการเฝ้าระวังอาการไม่พึงประสงค์',
    revisionLog: [],
  },
  {
    id: 'doc-wi-lab-001',
    level: 'WI', deptCode: 'LAB', seq: 1, revision: 1,
    title: 'วิธีปฏิบัติงานการเก็บและนำส่งสิ่งส่งตรวจ',
    status: 'pending_review',
    effectiveDate: iso(0),
    preparedBy: 'กลุ่มงานเทคนิคการแพทย์',
    reviewedBy: '—',
    approvedBy: '—',
    fileName: 'WI-LAB-001-1_draft.pdf', pageCount: 9,
    summary: 'ชนิดหลอด อุณหภูมิการเก็บรักษา และเวลานำส่งสิ่งส่งตรวจแต่ละประเภท',
    revisionLog: [],
  },
  {
    id: 'doc-wi-er-001',
    level: 'WI', deptCode: 'ER', seq: 1, revision: 1,
    title: 'วิธีปฏิบัติงานรับแจ้งเหตุและออกปฏิบัติการ EMS (ฉบับเดิม)',
    status: 'cancelled',
    effectiveDate: iso(-400),
    preparedBy: 'งานการพยาบาลผู้ป่วยอุบัติเหตุฉุกเฉิน',
    reviewedBy: 'QMR/PCT/หัวหน้ากลุ่มงาน',
    approvedBy: 'หัวหน้ากลุ่มงานการพยาบาล',
    fileName: 'WI-ER-001-1.pdf', pageCount: 5,
    summary: 'ถูกแทนที่ด้วยแนวทาง EMS ฉบับใหม่ของจังหวัด',
    revisionLog: [
      { date: iso(-400), revision: 1, note: 'อนุมัติใช้เอกสาร' },
      { date: iso(-30), revision: 1, note: 'ยกเลิกเอกสาร — ใช้แนวทางจังหวัดแทน' },
    ],
    cancelledAt: iso(-30),
    destroyAfter: iso(335), // เก็บ 1 ปีนับจากวันยกเลิก
  },
  {
    id: 'doc-ext-moph-001',
    level: 'EXT', deptCode: 'QMR', seq: 1, revision: 1,
    title: 'มาตรฐานโรงพยาบาลและบริการสุขภาพ (HA) ฉบับที่ 5',
    status: 'controlled',
    effectiveDate: iso(-200),
    preparedBy: 'สรพ. (หน่วยงานภายนอก)',
    reviewedBy: 'ศูนย์คุณภาพ',
    approvedBy: 'นพ.วัฒนชัย วิเศษสมิต (ผู้อำนวยการโรงพยาบาล)',
    fileName: 'HA-Standard-5th.pdf', pageCount: 148,
    summary: 'เอกสารภายนอกใช้อ้างอิงการพัฒนาคุณภาพตามมาตรฐาน HA',
    revisionLog: [{ date: iso(-200), revision: 1, note: 'ขึ้นทะเบียนเอกสารภายนอก' }],
  },
]

export const requests: DocRequest[] = [
  {
    id: 'req-001', kind: 'new', level: 'SOP', deptCode: 'PTC',
    title: 'แนวทางการจัดการยาความเสี่ยงสูง (High Alert Drugs)',
    reason: 'ยังไม่มีแนวทางกลางของโรงพยาบาล และเป็นข้อกำหนดตามมาตรฐาน HA ตอนที่ II-6',
    proposer: 'ภก.ประธาน คณะกรรมการเภสัชบำบัด', proposerPosition: 'ประธาน PTC',
    submittedAt: iso(-6), status: 'reviewed',
    qcComment: 'ตรวจสอบแล้ว ไม่ซ้ำซ้อนกับเอกสารเดิม รหัสที่จะออก: SOP-PTC-001-1',
    qcBy: 'ภก.ปฏิภาณ คำมาเร็ว',
  },
  {
    id: 'req-002', kind: 'new', level: 'WI', deptCode: 'LAB',
    title: 'วิธีปฏิบัติงานการเก็บและนำส่งสิ่งส่งตรวจ',
    reason: 'ลดอัตราสิ่งส่งตรวจถูกปฏิเสธ (specimen rejection) ซึ่งไตรมาสล่าสุดสูงถึง 4.2%',
    proposer: 'ทนพ.หัวหน้ากลุ่มงานเทคนิคการแพทย์', proposerPosition: 'นักเทคนิคการแพทย์ชำนาญการ',
    submittedAt: iso(-2), status: 'submitted',
  },
  {
    id: 'req-003', kind: 'revise', level: 'WI', deptCode: 'OPD',
    title: 'วิธีปฏิบัติงานคัดกรองผู้ป่วยที่จุดคัดกรอง',
    targetDocId: 'doc-wi-opd-001',
    reason: 'ประกาศกระทรวงฉบับใหม่เปลี่ยนเกณฑ์คัดแยกผู้ป่วยระบบทางเดินหายใจ',
    proposer: 'หัวหน้างานการพยาบาลผู้ป่วยนอก', proposerPosition: 'พยาบาลวิชาชีพชำนาญการ',
    submittedAt: iso(-10), status: 'approved',
    qcComment: 'ออกรหัสแก้ไขครั้งที่ 2: WI-OPD-001-2 และเรียกคืนฉบับเดิมแล้ว',
    qcBy: 'ภก.ปฏิภาณ คำมาเร็ว', decidedAt: iso(-7), decidedBy: 'หัวหน้ากลุ่มงานการพยาบาล',
  },
  {
    id: 'req-004', kind: 'cancel', level: 'WI', deptCode: 'ER',
    title: 'วิธีปฏิบัติงานรับแจ้งเหตุและออกปฏิบัติการ EMS (ฉบับเดิม)',
    targetDocId: 'doc-wi-er-001',
    reason: 'จังหวัดออกแนวทาง EMS กลางฉบับใหม่ ใช้แทนเอกสารเดิมทั้งฉบับ',
    proposer: 'หัวหน้างาน ER', proposerPosition: 'พยาบาลวิชาชีพชำนาญการ',
    submittedAt: iso(-32), status: 'approved',
    qcComment: 'ประทับตรา "ยกเลิก" ทุกหน้า เก็บต้นฉบับ 1 ปีก่อนทำลาย',
    qcBy: 'ภก.ปฏิภาณ คำมาเร็ว', decidedAt: iso(-30), decidedBy: 'หัวหน้ากลุ่มงานการพยาบาล',
  },
]

export const distributions: Distribution[] = [
  {
    id: 'dist-001', documentId: 'doc-qm-qmr-001',
    sentBy: 'ภก.ปฏิภาณ คำมาเร็ว', sentAt: iso(-5), dueAt: iso(2),
    message:
      'ขอแจกจ่ายคู่มือคุณภาพแม่บทว่าด้วยการจัดทำและควบคุมเอกสารคุณภาพ ขอให้ทุกหน่วยงาน/คณะกรรมการศึกษาและถือปฏิบัติ โดยเฉพาะระบบรหัสเอกสารและขั้นตอนการขอขึ้นทะเบียน',
    channels: ['email', 'in_app'],
    recipients: [
      { deptCode: 'PCT', status: 'acknowledged', openedAt: iso(-4), acknowledgedAt: iso(-4), signature: 'ประธาน PCT' },
      { deptCode: 'ICC', status: 'acknowledged', openedAt: iso(-4), acknowledgedAt: iso(-3), signature: 'ประธาน ICC' },
      { deptCode: 'PTC', status: 'acknowledged', openedAt: iso(-5), acknowledgedAt: iso(-4), signature: 'ประธาน PTC' },
      { deptCode: 'OPD', status: 'acknowledged', openedAt: iso(-3), acknowledgedAt: iso(-2), signature: 'หัวหน้างาน OPD' },
      { deptCode: 'IPD', status: 'opened', openedAt: iso(-2) },
      { deptCode: 'ER',  status: 'opened', openedAt: iso(-1) },
      { deptCode: 'LAB', status: 'pending' },
      { deptCode: 'PHA', status: 'acknowledged', openedAt: iso(-4), acknowledgedAt: iso(-3), signature: 'หัวหน้ากลุ่มงานเภสัชกรรม' },
      { deptCode: 'OR',  status: 'overdue' },
      { deptCode: 'LR',  status: 'pending' },
    ],
  },
  {
    id: 'dist-002', documentId: 'doc-wi-opd-001',
    sentBy: 'ภก.ปฏิภาณ คำมาเร็ว', sentAt: iso(-7), dueAt: iso(0),
    message: 'แจกจ่าย WI-OPD-001-2 (แก้ไขครั้งที่ 2) และเรียกคืนฉบับเดิมทุกจุดปฏิบัติงาน',
    channels: ['email', 'in_app'],
    recipients: [
      { deptCode: 'OPD', status: 'acknowledged', openedAt: iso(-6), acknowledgedAt: iso(-6), signature: 'หัวหน้างาน OPD' },
      { deptCode: 'ER',  status: 'acknowledged', openedAt: iso(-5), acknowledgedAt: iso(-5), signature: 'หัวหน้างาน ER' },
      { deptCode: 'PHC', status: 'opened', openedAt: iso(-3) },
    ],
  },
]

export const activities: Activity[] = [
  { id: 'a1', at: iso(0),  actorName: 'ทนพ.หัวหน้า LAB', action: 'ยื่นคำขอขึ้นทะเบียน', target: 'WI การเก็บและนำส่งสิ่งส่งตรวจ' },
  { id: 'a2', at: iso(-1), actorName: 'ภก.ปฏิภาณ', action: 'ตรวจสอบคำขอผ่าน', target: 'SOP-PTC-001 (รอเสนอ ผอ.ลงนาม)' },
  { id: 'a3', at: iso(-2), actorName: 'หัวหน้างาน OPD', action: 'ลงนามรับทราบ', target: 'QM-QMR-001-1' },
  { id: 'a4', at: iso(-7), actorName: 'หัวหน้ากลุ่มงานการพยาบาล', action: 'อนุมัติแก้ไขเอกสาร', target: 'WI-OPD-001-2' },
  { id: 'a5', at: iso(-30), actorName: 'ภก.ปฏิภาณ', action: 'ประทับตรายกเลิก', target: 'WI-ER-001-1 (เก็บ 1 ปีก่อนทำลาย)' },
]
