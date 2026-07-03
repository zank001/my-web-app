import {
  AlignmentType, BorderStyle, Document, ImageRun, Packer, Paragraph,
  Table, TableCell, TableRow, TextRun, WidthType,
} from 'docx'

/**
 * สร้างไฟล์ Word (.docx) ตามรูปแบบเอกสารคุณภาพ (อ้างอิงแม่แบบ SOP จริง)
 * A4 · TH Sarabun New · ขอบบน-ล่าง 1.91 ซม. ซ้าย-ขวา 2.54 ซม. (ภาคผนวก 7.5)
 */

const FONT = 'TH Sarabun New'
const cm = (v: number) => Math.round(v * 566.9291) // ซม. → twips
const PT = (v: number) => v * 2                    // pt → half-points

export interface SopSectionContent { label: string; body: string }

export interface SopDocData {
  levelTitleTh: string   // เช่น แนวทางปฏิบัติ
  levelTitleEn: string   // เช่น Standard Operating Procedure
  code: string
  title: string
  orgName: string
  revision: number
  preparedBy: string
  reviewedBy: string
  approvedBy: string
  effectiveDate: string
  sections: SopSectionContent[]
  flowPng?: { data: Uint8Array; width: number; height: number }
}

const run = (text: string, opts: { size?: number; bold?: boolean } = {}) =>
  new TextRun({ text, font: FONT, size: PT(opts.size ?? 16), bold: opts.bold })

const para = (text: string, opts: { size?: number; bold?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; spacing?: number } = {}) =>
  new Paragraph({
    alignment: opts.align,
    spacing: { after: opts.spacing ?? 60, line: 276 },
    children: text ? [run(text, opts)] : [],
  })

const thinBorder = { style: BorderStyle.SINGLE, size: 4, color: '999999' }
const cellBorders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder }

const cell = (text: string, opts: { bold?: boolean; width?: number } = {}) =>
  new TableCell({
    borders: cellBorders,
    width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    children: [para(text, { bold: opts.bold, spacing: 20 })],
  })

function coverTable(d: SopDocData): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [
        cell(`รหัสเอกสาร ${d.code}`, { bold: true, width: 40 }),
        cell('ทบทวน/แก้ไขครั้งที่', { bold: true, width: 20 }),
        cell('ลงลายมือชื่อ', { bold: true, width: 22 }),
        cell('วัน/เดือน/ปี', { bold: true, width: 18 }),
      ] }),
      new TableRow({ children: [ cell('ผู้จัดทำ'), cell(d.preparedBy), cell(''), cell('') ] }),
      new TableRow({ children: [ cell('ผู้ทบทวน'), cell(d.reviewedBy), cell(''), cell('') ] }),
      new TableRow({ children: [ cell('ผู้อนุมัติ'), cell(d.approvedBy), cell(''), cell('') ] }),
    ],
  })
}

function revisionTable(d: SopDocData): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [
        cell('วันที่', { bold: true, width: 30 }),
        cell('ทบทวน/แก้ไขครั้งที่', { bold: true, width: 25 }),
        cell('บันทึกการแก้ไข', { bold: true, width: 45 }),
      ] }),
      new TableRow({ children: [ cell(d.effectiveDate), cell(String(d.revision)), cell('อนุมัติใช้เอกสาร') ] }),
      new TableRow({ children: [ cell(''), cell(''), cell('') ] }),
    ],
  })
}

export async function buildSopDocx(d: SopDocData): Promise<Blob> {
  const children: (Paragraph | Table)[] = []

  // --- หน้าปก ---
  children.push(para(d.levelTitleTh, { size: 36, bold: true, align: AlignmentType.CENTER, spacing: 40 }))
  children.push(para(d.levelTitleEn, { size: 36, bold: true, align: AlignmentType.CENTER, spacing: 120 }))
  children.push(para(`เรื่อง ${d.title}`, { size: 24, bold: true, align: AlignmentType.CENTER, spacing: 200 }))
  children.push(para(d.orgName, { size: 28, bold: true, align: AlignmentType.CENTER, spacing: 300 }))
  children.push(coverTable(d))
  children.push(para('', { spacing: 200 }))

  // --- บันทึกการแก้ไขเอกสาร ---
  children.push(para('บันทึกการแก้ไขเอกสาร', { bold: true, spacing: 80 }))
  children.push(revisionTable(d))
  children.push(para('', { spacing: 160 }))

  // --- หัวข้อเนื้อหา ---
  d.sections.forEach((s, i) => {
    children.push(para(`${i + 1}. ${s.label}`, { bold: true, spacing: 60 }))
    const lines = s.body.split('\n').map((l) => l.trim()).filter(Boolean)
    if (lines.length === 0) {
      children.push(para('(ยังไม่ได้ระบุ)', { spacing: 60 }))
    } else {
      lines.forEach((l) => children.push(para(l)))
    }
    children.push(para('', { spacing: 60 }))
  })

  // --- แผนผังขั้นตอน (ถ้ามี) ---
  if (d.flowPng) {
    children.push(para('ภาคผนวก: แผนผังขั้นตอนการปฏิบัติงาน (Flow chart)', { bold: true, spacing: 80 }))
    const maxW = 420
    const scale = Math.min(1, maxW / d.flowPng.width)
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new ImageRun({
        data: d.flowPng.data,
        transformation: { width: Math.round(d.flowPng.width * scale), height: Math.round(d.flowPng.height * scale) },
        type: 'png',
      })],
    }))
  }

  const doc = new Document({
    styles: { default: { document: { run: { font: FONT, size: PT(16) } } } },
    sections: [{
      properties: {
        page: {
          size: { width: cm(21), height: cm(29.7) },
          margin: { top: cm(1.91), bottom: cm(1.91), left: cm(2.54), right: cm(2.54) },
        },
      },
      children,
    }],
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
