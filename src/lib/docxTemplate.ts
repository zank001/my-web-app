import {
  AlignmentType, BorderStyle, Document, Header, ImageRun, NumberFormat, PageBreak,
  Packer, PageNumber, Paragraph, Table, TableCell, TableRow, TextRun, VerticalAlign,
  WidthType,
} from 'docx'

/**
 * สร้างไฟล์ Word (.docx) ตามรูปแบบเอกสารคุณภาพจริงของโรงพยาบาลปาย
 * (แกะโครงจากไฟล์ QM-QMR-001-1 "การจัดทำและควบคุมเอกสารคุณภาพ" ฉบับจริง)
 *
 * A4 · TH Sarabun New · ขอบบน-ล่าง 1.91 ซม. ซ้าย-ขวา 2.54 ซม. หัว/ท้าย 1.25 ซม.
 *
 * โครงเอกสาร 2 ส่วน (section):
 *  1) หน้าปก — หัวเรื่องไทย/อังกฤษ 36pt → เรื่อง 24pt → ตรา (8.17 ซม.)
 *     → ชื่อคณะกรรมการ/หน่วยงาน (+โรงพยาบาล) 28pt → ตารางลงนาม 5 คอลัมน์
 *  2) เนื้อหา — หัวกระดาษ (Word header) เป็นตาราง 4x3 มีตราเล็ก, ชื่อหน่วยงาน,
 *     รหัสเอกสาร, เรื่อง, จัดทำครั้งที่ และ "หน้า X/Y" อัตโนมัติทุกหน้า
 *     ตามด้วยบันทึกการแก้ไขเอกสาร → หัวข้อ 1-7 → หน้าคั่น "ภาคผนวก" → Flow chart
 */

const FONT = 'TH Sarabun New'
const cm = (v: number) => Math.round(v * 566.9291)  // ซม. → twips
const PT = (v: number) => v * 2                      // pt → half-points
const px = (v: number) => Math.round((v / 2.54) * 96) // ซม. → px (96dpi) สำหรับรูปภาพ

export interface SopSectionContent { label: string; body: string }
export interface SopSignatory { role: string; name: string; position: string }
export interface DocxImage { data: Uint8Array; type: 'png' | 'jpg' }

export interface SopDocData {
  levelTitleTh: string   // เช่น แนวทางปฏิบัติ
  levelTitleEn: string   // เช่น Standard Operating Procedure (SOP)
  headerLevelLine: string // บรรทัดระดับเอกสารในหัวกระดาษ เช่น คู่มือคุณภาพ (Quality Manual)
  code: string
  title: string          // ชื่อเรื่อง (จะเติมคำว่า "เรื่อง " ให้)
  ownerLine: string      // บรรทัดใต้ตรา เช่น ศูนย์คุณภาพ / คณะกรรมการเภสัชกรรมบำบัด
  orgLine?: string       // เช่น โรงพยาบาลปาย (เว้นว่างได้เมื่อตรามีชื่ออยู่แล้ว)
  revision: number
  preparedNo: number     // จัดทำครั้งที่
  effectiveDate: string
  signatories: SopSignatory[]  // ผู้จัดทำ/ผู้ทบทวน/ผู้อนุมัติ
  logo?: DocxImage       // ตราหน้าปก
  logoCm?: number        // ขนาดตราหน้าปกด้านละ (ค่าเริ่มต้น 8.17 ซม. ตามเอกสารจริง)
  headerLogo?: DocxImage // ตราเล็กในหัวกระดาษ (2.93 ซม. ตามเอกสารจริง)
  sections: SopSectionContent[]
  flowPng?: { data: Uint8Array; width: number; height: number }
}

const run = (text: string, o: { size?: number; bold?: boolean } = {}) =>
  new TextRun({ text, font: FONT, size: PT(o.size ?? 16), bold: o.bold })

const centered = (text: string, o: { size?: number; bold?: boolean; before?: number; after?: number } = {}) =>
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: o.before ?? 0, after: o.after ?? 60, line: 300 },
    children: text ? [run(text, o)] : [],
  })

const thin = { style: BorderStyle.SINGLE, size: 4, color: '000000' } // ~0.5pt
const cellBorders = { top: thin, bottom: thin, left: thin, right: thin }

/* ---------------------------------------------------------------- หน้าปก */

/** ความกว้างคอลัมน์ตารางลงนาม 5 คอลัมน์ (ซม.) รวม 15.92 ซม. = พื้นที่พิมพ์ */
const COL_CM = [2.92, 1.95, 5.86, 2.68, 2.51]
const COL = COL_CM.map(cm)
const TABLE_W = COL.reduce((a, b) => a + b, 0)

function tcell(children: Paragraph[], opts: { span?: number; rowSpan?: number; width: number }) {
  return new TableCell({
    borders: cellBorders,
    columnSpan: opts.span,
    rowSpan: opts.rowSpan,
    width: { size: opts.width, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    children,
  })
}

const line = (text: string, bold = false, size = 16) =>
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 0, line: 264 }, children: [run(text, { bold, size })] })

/** ตารางลงนามหน้าปก — หัวตาราง merge คอลัมน์ 1-2, แถวลงนาม merge คอลัมน์ 2-3 */
function signatureTable(d: SopDocData): Table {
  const header = new TableRow({
    tableHeader: true,
    children: [
      tcell([line(`รหัสเอกสาร ${d.code}`, true)], { span: 2, width: COL[0] + COL[1] }),
      tcell([line(`ทบทวน/แก้ไขครั้งที่ ${d.revision}`, true)], { width: COL[2] }),
      tcell([line('ลงลายมือชื่อ', true)], { width: COL[3] }),
      tcell([line('วัน/เดือน/ปี', true)], { width: COL[4] }),
    ],
  })

  const bodyRows = d.signatories.map((s) => new TableRow({
    children: [
      tcell([line(s.role)], { width: COL[0] }),
      tcell(s.position ? [line(s.name), line(s.position)] : [line(s.name)], { span: 2, width: COL[1] + COL[2] }),
      tcell([line('')], { width: COL[3] }),
      tcell([line('')], { width: COL[4] }),
    ],
  }))

  return new Table({
    width: { size: TABLE_W, type: WidthType.DXA },
    columnWidths: COL,
    rows: [header, ...bodyRows],
  })
}

function coverChildren(d: SopDocData): (Paragraph | Table)[] {
  const cover: (Paragraph | Table)[] = []

  // หัวเรื่องไทย/อังกฤษ 36pt
  cover.push(centered(d.levelTitleTh, { size: 36, bold: true, before: 600, after: 40 }))
  cover.push(centered(d.levelTitleEn, { size: 36, bold: true, after: 160 }))
  // เรื่อง 24pt
  cover.push(centered(`เรื่อง ${d.title}`, { size: 24, bold: true, before: 120, after: 280 }))

  // ตรา (โลโก้) กลางหน้า — เอกสารจริงใช้ 8.17 ซม.
  if (d.logo) {
    const side = px(d.logoCm ?? 8.17)
    cover.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 160, line: 240 },
      children: [new ImageRun({ data: d.logo.data, type: d.logo.type, transformation: { width: side, height: side } })],
    }))
  }

  // ชื่อคณะกรรมการ/หน่วยงาน (+ โรงพยาบาล) 28pt
  cover.push(centered(d.ownerLine, { size: 28, bold: true, before: 100, after: 40 }))
  if (d.orgLine?.trim()) cover.push(centered(d.orgLine, { size: 28, bold: true, after: 240 }))
  else cover.push(new Paragraph({ spacing: { after: 200 }, children: [] }))

  cover.push(signatureTable(d))
  return cover
}

/* -------------------------------------------------- หัวกระดาษหน้าเนื้อหา */

/** ความกว้างคอลัมน์หัวกระดาษ 4x3 (ซม.) ตามเอกสารจริง */
const HDR_CM = [3.31, 7.66, 5.35]
const HDR = HDR_CM.map(cm)
const HDR_W = HDR.reduce((a, b) => a + b, 0)

/** ตารางหัวกระดาษ: ตราเล็ก (รวม 4 แถว) | หน่วยงาน/ระดับ/เรื่อง/จัดทำครั้งที่ | รหัส/หน้า X/Y */
function pageHeader(d: SopDocData): Header {
  const logoPara = d.headerLogo
    ? new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 0 },
        children: [new ImageRun({ data: d.headerLogo.data, type: d.headerLogo.type, transformation: { width: px(2.93), height: px(2.93) } })],
      })
    : line('')

  const pageNo = new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 0, line: 264 },
    children: [new TextRun({ font: FONT, size: PT(16), children: ['หน้า ', PageNumber.CURRENT, '/', PageNumber.TOTAL_PAGES_IN_SECTION] })],
  })

  const table = new Table({
    width: { size: HDR_W, type: WidthType.DXA },
    columnWidths: HDR,
    rows: [
      new TableRow({
        children: [
          tcell([logoPara], { rowSpan: 4, width: HDR[0] }),
          tcell([line(d.ownerLine)], { width: HDR[1] }),
          tcell([line(`รหัสเอกสาร ${d.code}`)], { width: HDR[2] }),
        ],
      }),
      new TableRow({ children: [tcell([line(d.headerLevelLine)], { span: 2, width: HDR[1] + HDR[2] })] }),
      new TableRow({ children: [tcell([line(`เรื่อง ${d.title}`)], { span: 2, width: HDR[1] + HDR[2] })] }),
      new TableRow({
        children: [
          tcell([line(`จัดทำครั้งที่ ${d.preparedNo}`)], { width: HDR[1] }),
          tcell([pageNo], { width: HDR[2] }),
        ],
      }),
    ],
  })

  return new Header({ children: [table, new Paragraph({ spacing: { before: 0, after: 40 }, children: [] })] })
}

/* ------------------------------------------------------------- เนื้อหา */

/** ตารางบันทึกการแก้ไขเอกสาร — ความกว้างคอลัมน์ตามเอกสารจริง + แถวว่างให้กรอกต่อ */
function revisionTable(d: SopDocData, blankRows = 14): Table {
  const w = [cm(4.25), cm(4.59), cm(8.25)]
  const c = (text: string, i: number, bold = false) =>
    new TableCell({
      borders: cellBorders, width: { size: w[i], type: WidthType.DXA },
      margins: { top: 30, bottom: 30, left: 80, right: 80 },
      children: [new Paragraph({ alignment: bold ? AlignmentType.CENTER : undefined, children: [run(text, { bold })] })],
    })
  const blank = () => new TableRow({ children: [c('', 0), c('', 1), c('', 2)] })
  return new Table({
    width: { size: w[0] + w[1] + w[2], type: WidthType.DXA },
    columnWidths: w,
    rows: [
      new TableRow({ tableHeader: true, children: [c('วันที่', 0, true), c('ทบทวน/แก้ไขครั้งที่', 1, true), c('บันทึกการแก้ไข', 2, true)] }),
      new TableRow({ children: [c(d.effectiveDate, 0), c(String(d.revision), 1), c('อนุมัติใช้เอกสาร', 2)] }),
      ...Array.from({ length: blankRows }, blank),
    ],
  })
}

function contentChildren(d: SopDocData): (Paragraph | Table)[] {
  const body: (Paragraph | Table)[] = []

  // หน้าบันทึกการแก้ไขเอกสาร
  body.push(centered('บันทึกการแก้ไขเอกสาร', { size: 18, bold: true, after: 120 }))
  body.push(revisionTable(d))
  body.push(new Paragraph({ children: [new PageBreak()] }))

  // หัวข้อ 1-7 — หัวข้อ 16pt หนา เนื้อความ 16pt จัดชิดขอบแบบไทย
  d.sections.forEach((s, i) => {
    body.push(new Paragraph({
      spacing: { before: i === 0 ? 0 : 120, after: 60, line: 300 },
      children: [run(`${i + 1}. ${s.label}`, { bold: true })],
    }))
    const lines = s.body.split('\n').map((l) => l.trim()).filter(Boolean)
    if (lines.length === 0) {
      body.push(new Paragraph({ spacing: { after: 60, line: 300 }, children: [run('(ยังไม่ได้ระบุ)')] }))
    } else {
      lines.forEach((l) => body.push(new Paragraph({
        alignment: AlignmentType.THAI_DISTRIBUTE,
        indent: { firstLine: cm(1.0) },
        spacing: { after: 40, line: 300 },
        children: [run(l)],
      })))
    }
  })

  // ภาคผนวก: หน้าคั่น 72pt แล้วตามด้วยหน้าแผนผัง (ตามเอกสารจริง)
  if (d.flowPng) {
    body.push(new Paragraph({ children: [new PageBreak()] }))
    body.push(centered('ภาคผนวก', { size: 72, bold: true, before: 4800 }))
    body.push(new Paragraph({ children: [new PageBreak()] }))

    body.push(centered('Flow chart การดำเนินงาน', { size: 18, bold: true, after: 160 }))
    // เอกสารจริงวางรูปได้กว้างสุด ~13.65 ซม. สูงสุด ~24.5 ซม.
    const maxW = px(13.65)
    const maxH = px(23.5)
    const scale = Math.min(1, maxW / d.flowPng.width, maxH / d.flowPng.height)
    body.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new ImageRun({ data: d.flowPng.data, type: 'png', transformation: { width: Math.round(d.flowPng.width * scale), height: Math.round(d.flowPng.height * scale) } })],
    }))
  }

  return body
}

/* --------------------------------------------------------------- ประกอบ */

const PAGE = {
  size: { width: cm(21), height: cm(29.7) },
  margin: { top: cm(1.91), bottom: cm(1.91), left: cm(2.54), right: cm(2.54), header: cm(1.25), footer: cm(1.25) },
}

export async function buildSopDocx(d: SopDocData): Promise<Blob> {
  const doc = new Document({
    styles: { default: { document: { run: { font: FONT, size: PT(16) } } } },
    sections: [
      // ส่วนที่ 1: หน้าปก (ไม่มีหัวกระดาษ)
      { properties: { page: PAGE }, children: coverChildren(d) },
      // ส่วนที่ 2: เนื้อหา — หัวกระดาษทุกหน้า, เริ่มนับหน้า 1 ใหม่
      {
        properties: { page: { ...PAGE, pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL } } },
        headers: { default: pageHeader(d) },
        children: contentChildren(d),
      },
    ],
  })

  return Packer.toBlob(doc)
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
