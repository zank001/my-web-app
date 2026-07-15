import { strFromU8, unzipSync } from 'fflate'
import { complete } from './ai'
import type { DocLevel } from '../types'

/**
 * นำเข้าเอกสารที่ผู้ใช้พิมพ์เองไว้แล้ว (ไฟล์ .docx / .txt / ข้อความวาง)
 * แล้วจัดเนื้อหาเข้าโครงหัวข้อมาตรฐาน 7 หัวข้อของเอกสารคุณภาพ (QM-QMR-001)
 * เพื่อส่งต่อให้ตัวสร้างไฟล์ Word จัดรูปแบบตามแม่แบบจริงทั้งเล่ม
 *
 * มี 2 ชั้น: ให้ AI จัดหมวดก่อน (แม่นกับเอกสารที่เขียนอิสระ) — ถ้า AI ใช้ไม่ได้
 * ถอยไปใช้ตัวแยกหัวข้อแบบ heuristic (จับชื่อหัวข้อภาษาไทยที่พบบ่อย)
 */

const WORD_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'

const textsOf = (el: Element) =>
  Array.from(el.getElementsByTagNameNS(WORD_NS, 't')).map((t) => t.textContent ?? '').join('')

/* ------------------------- เลขข้อ/bullet อัตโนมัติของ Word ------------------------- */

/**
 * เลขข้อใน Word (1. / 1.1 / ก. / ๑. / ○) ไม่ได้อยู่ในเนื้อความ แต่เก็บเป็นนิยาม
 * ใน word/numbering.xml แล้วให้โปรแกรมนับเอง — ต้องอ่านนิยามและไล่นับตามลำดับ
 * เอกสารจริง ไม่งั้นเลขหัวข้อจะหายทั้งหมดเมื่อนำเข้า
 */
interface NumLevel { fmt: string; text: string; start: number }
type NumberingDefs = Map<string, Map<number, NumLevel>> // numId → ilvl → นิยามระดับ

function parseNumbering(xmlBytes: Uint8Array | undefined): NumberingDefs {
  const defs: NumberingDefs = new Map()
  if (!xmlBytes) return defs
  const dom = new DOMParser().parseFromString(strFromU8(xmlBytes), 'application/xml')
  const val = (parent: Element, tag: string, attr = 'val') => {
    const el = parent.getElementsByTagNameNS(WORD_NS, tag)[0]
    return el?.getAttributeNS(WORD_NS, attr) ?? null
  }
  const abstract = new Map<string, Map<number, NumLevel>>()
  for (const an of Array.from(dom.getElementsByTagNameNS(WORD_NS, 'abstractNum'))) {
    const id = an.getAttributeNS(WORD_NS, 'abstractNumId')
    if (id == null) continue
    const lvls = new Map<number, NumLevel>()
    for (const lvl of Array.from(an.getElementsByTagNameNS(WORD_NS, 'lvl'))) {
      const ilvl = Number(lvl.getAttributeNS(WORD_NS, 'ilvl') ?? '0')
      lvls.set(ilvl, {
        fmt: val(lvl, 'numFmt') ?? 'decimal',
        text: val(lvl, 'lvlText') ?? '',
        start: Number(val(lvl, 'start') ?? '1'),
      })
    }
    abstract.set(id, lvls)
  }
  for (const num of Array.from(dom.getElementsByTagNameNS(WORD_NS, 'num'))) {
    const numId = num.getAttributeNS(WORD_NS, 'numId')
    const aid = val(num, 'abstractNumId')
    if (numId != null && aid != null && abstract.has(aid)) defs.set(numId, abstract.get(aid)!)
  }
  return defs
}

function fmtNumber(v: number, fmt: string): string {
  if (fmt === 'thaiNumbers') return String(v).replace(/\d/g, (d) => '๐๑๒๓๔๕๖๗๘๙'[Number(d)])
  if (fmt === 'lowerLetter') return String.fromCharCode(97 + ((v - 1) % 26))
  if (fmt === 'upperLetter') return String.fromCharCode(65 + ((v - 1) % 26))
  if (fmt === 'thaiLetters') {
    const th = 'กขฃคฅฆงจฉชซฌญฎฏฐฑฒณดตถทธนบปผฝพฟภมยรลวศษสหฬอฮ'
    return th[(v - 1) % th.length]
  }
  return String(v)
}

/** คืนเลขข้อ/bullet ของย่อหน้า (พร้อมช่องว่างท้าย) และเดินตัวนับไปข้างหน้า */
function numberLabel(p: Element, defs: NumberingDefs, counters: Map<string, number[]>): string {
  const pPr = Array.from(p.children).find((c) => c.localName === 'pPr')
  const numPr = pPr && Array.from(pPr.children).find((c) => c.localName === 'numPr')
  if (!numPr) return ''
  const get = (name: string) => {
    const el = Array.from(numPr.children).find((c) => c.localName === name)
    return el?.getAttributeNS(WORD_NS, 'val') ?? null
  }
  const numId = get('numId')
  if (!numId || numId === '0') return ''
  const ilvl = Number(get('ilvl') ?? '0')
  const lvls = defs.get(numId)
  const def = lvls?.get(ilvl)
  if (!lvls || !def) return ''

  let c = counters.get(numId)
  if (!c) { c = []; counters.set(numId, c) }
  c[ilvl] = (c[ilvl] ?? def.start - 1) + 1
  c.splice(ilvl + 1) // ขึ้นข้อใหม่ → รีเซ็ตเลขระดับที่ลึกกว่า

  if (def.fmt === 'bullet') {
    const ch = def.text.trim()
    // อักขระ bullet มักเป็นฟอนต์สัญลักษณ์ (Wingdings ฯลฯ) — ใช้ ○ แทนเมื่อไม่ใช่อักขระทั่วไป
    return (/^[-–•·○●▪□◦*]$/.test(ch) ? ch : '○') + ' '
  }
  if (def.fmt === 'none' || !def.text) return ''
  const label = def.text.replace(/%(\d)/g, (_, g: string) => {
    const li = Number(g) - 1
    return fmtNumber(c![li] ?? lvls.get(li)?.start ?? 1, lvls.get(li)?.fmt ?? 'decimal')
  })
  return label ? label + ' ' : ''
}

/* ----------------------------------- ดึงเนื้อหา ----------------------------------- */

/**
 * แปลงตารางเป็นบรรทัดรูปแบบ | เซลล์1 | เซลล์2 | (แถวละบรรทัด) เพื่อให้ตาราง
 * เนื้อหารอดผ่านขั้นจัดหมวด แล้วตัวสร้างไฟล์ Word แปลงกลับเป็นตารางจริง
 * ตารางแม่แบบ (ลงนาม/หัวกระดาษ/บันทึกการแก้ไข) ข้ามไป — ระบบสร้างใหม่ให้อยู่แล้ว
 */
function tableToLines(tbl: Element, label: (p: Element) => string): string[] {
  if (textsOf(tbl).includes('รหัสเอกสาร')) return [] // ตารางลงนามหน้าปก/หัวกระดาษ
  const rows: string[] = []
  for (const tr of Array.from(tbl.children).filter((c) => c.localName === 'tr')) {
    const cells = Array.from(tr.children)
      .filter((c) => c.localName === 'tc')
      .map((tc) =>
        Array.from(tc.getElementsByTagNameNS(WORD_NS, 'p'))
          .map((p) => {
            const t = textsOf(p).trim()
            return t ? label(p) + t : ''
          })
          .filter(Boolean)
          .join(' ¶ ') // ¶ = ขึ้นบรรทัดใหม่ภายในเซลล์ (แปลงกลับเป็นหลายบรรทัดตอนสร้างไฟล์ Word)
          .replace(/\|/g, '/').replace(/[ \t\r\n]+/g, ' '),
      )
    if (rows.length === 0) {
      const head = cells.join(' ')
      if (head.includes('บันทึกการแก้ไข') && head.includes('วันที่')) return [] // ตารางบันทึกการแก้ไข
    }
    rows.push(`| ${cells.join(' | ')} |`)
  }
  return rows
}

/**
 * ดึงข้อความทั้งหมดจากไฟล์ .docx รวมทุกตาราง (ไม่ข้ามตารางแม่แบบ) — ใช้ตรวจจับ
 * รหัสเอกสาร/ระดับ ที่มักอยู่ในตารางลงนาม/หัวกระดาษ ซึ่ง extractDocxText ตัดออก
 */
export function extractDocxAllText(buf: ArrayBuffer): string {
  let files: Record<string, Uint8Array>
  try {
    files = unzipSync(new Uint8Array(buf))
  } catch {
    return ''
  }
  const xml = files['word/document.xml']
  if (!xml) return ''
  const dom = new DOMParser().parseFromString(strFromU8(xml), 'application/xml')
  return textsOf(dom.documentElement).replace(/[ \t\r\n]+/g, ' ')
}

/** ดึงเนื้อหาจากไฟล์ .docx ตามลำดับจริง — ย่อหน้าเป็นบรรทัด (พร้อมเลขข้ออัตโนมัติ) ตารางเป็นบรรทัด | คั่นเซลล์ | */
export function extractDocxText(buf: ArrayBuffer): string {
  let files: Record<string, Uint8Array>
  try {
    files = unzipSync(new Uint8Array(buf))
  } catch {
    throw new Error('เปิดไฟล์ไม่ได้ — ไฟล์อาจเสียหรือไม่ใช่ .docx')
  }
  const xml = files['word/document.xml']
  if (!xml) throw new Error('ไม่พบเนื้อหาในไฟล์ (.docx ต้องมี word/document.xml)')
  const dom = new DOMParser().parseFromString(strFromU8(xml), 'application/xml')
  const body = dom.getElementsByTagNameNS(WORD_NS, 'body')[0]
  if (!body) throw new Error('ไม่พบเนื้อหาในไฟล์ (.docx ต้องมี word/document.xml)')

  const numDefs = parseNumbering(files['word/numbering.xml'])
  const counters = new Map<string, number[]>()
  const label = (p: Element) => numberLabel(p, numDefs, counters)

  const lines: string[] = []
  for (const node of Array.from(body.children)) {
    if (node.localName === 'p') {
      const t = textsOf(node).trim()
      lines.push(t ? label(node) + t : '')
    } else if (node.localName === 'tbl') {
      lines.push(...tableToLines(node, label))
    }
  }
  return lines.filter((l, i) => l || (lines[i - 1] ?? '')).join('\n')
}

export interface ImportedDoc {
  title: string
  /** เนื้อหาแยกตาม key หัวข้อมาตรฐาน (objective, scope, …) */
  sections: Record<string, string>
  /** รหัสเอกสารเดิมที่พบในเนื้อหา เช่น SOP-PTC-001-1 */
  code?: string
  level?: Exclude<DocLevel, 'EXT'>
  deptCode?: string
  /** วิธีที่ใช้จัดหมวด */
  method: 'ai' | 'heuristic'
}

/** หา รหัสเอกสาร AAA-BBB-XXX-YY และระดับเอกสารจากเนื้อหา */
export function detectCode(text: string): { code?: string; level?: Exclude<DocLevel, 'EXT'>; deptCode?: string } {
  const m = text.match(/\b(QM|SOP|WI|FM)\s*[-–]\s*([A-Z]{2,4})\s*[-–]\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,2}))?/)
  if (!m) return {}
  const code = `${m[1]}-${m[2]}-${m[3].padStart(3, '0')}${m[4] ? `-${m[4]}` : ''}`
  return { code, level: m[1] as Exclude<DocLevel, 'EXT'>, deptCode: m[2] }
}

const SECTION_KEYS = ['objective', 'scope', 'responsibility', 'definition', 'procedure', 'reference', 'appendix'] as const

const SECTION_RES: Record<(typeof SECTION_KEYS)[number], RegExp> = {
  objective: /วัตถุประสงค์/,
  scope: /ขอบเขต/,
  responsibility: /หน้าที่(?:และ|ความ)?รับผิดชอบ|ผู้รับผิดชอบ/,
  definition: /คำจำกัดความ|นิยาม(?:ศัพท์)?/,
  procedure: /ขั้นตอน|รายละเอียด(?:การ|\/)?|วิธี(?:การ)?ปฏิบัติ/,
  reference: /เอกสารอ้างอิง|แหล่งอ้างอิง/,
  appendix: /ภาคผนวก/,
}

/** บรรทัดนี้เป็น "หัวข้อ" หรือไม่ (สั้น อาจนำด้วยเลขข้อ และเข้ารูปแบบชื่อหัวข้อ) */
function matchHeader(line: string): (typeof SECTION_KEYS)[number] | null {
  const t = line.replace(/^[\d.)\s]+/, '').trim()
  if (!t || t.length > 60) return null
  for (const k of SECTION_KEYS) {
    if (SECTION_RES[k].test(t) && t.length <= 45) return k
  }
  return null
}

/** ตัวแยกหัวข้อพื้นฐาน — ใช้เมื่อ AI ไม่พร้อมใช้งาน */
export function heuristicSplit(text: string): ImportedDoc {
  const lines = text.split('\n')
  const sections: Record<string, string> = {}
  let cur: string | null = null
  let title = ''
  const pre: string[] = []

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue
    const k = matchHeader(line)
    if (k && !(k in sections)) { cur = k; sections[k] = ''; continue }
    if (cur) sections[cur] += (sections[cur] ? '\n' : '') + line
    else pre.push(line)
  }

  // ชื่อเรื่อง: บรรทัด "เรื่อง …" ก่อนถึงหัวข้อแรก หรือบรรทัดแรกที่ไม่ใช่รหัส/ชื่อหน่วยงาน
  for (const l of pre) {
    const m = l.match(/^เรื่อง\s+(.{3,120})$/)
    if (m) { title = m[1].trim(); break }
  }
  if (!title) title = pre.find((l) => l.length >= 8 && l.length <= 120 && !/รหัสเอกสาร|โรงพยาบาล|หน้า\s*\d/.test(l)) ?? ''

  return { title, sections, ...detectCode(text), method: 'heuristic' }
}

/** ให้ AI จัดเนื้อหาเข้าหัวข้อมาตรฐาน (คืน JSON) — โยน error เมื่อเรียกไม่สำเร็จ */
export async function aiRestructure(text: string): Promise<ImportedDoc> {
  const body = text.slice(0, 12000)
  const out = await complete(
    `นี่คือเนื้อหาเอกสารคุณภาพที่พิมพ์ไว้แล้ว ให้จัดเข้าโครงหัวข้อมาตรฐานของโรงพยาบาล

ตอบเป็น JSON เท่านั้น (ไม่มีข้อความอื่น) รูปแบบ:
{"title":"ชื่อเรื่องของเอกสาร (ไม่ต้องมีคำว่า เรื่อง นำหน้า)",
 "sections":{"objective":"…","scope":"…","responsibility":"…","definition":"…","procedure":"…","reference":"…","appendix":"…"}}
กติกา:
- แยกเนื้อหาเดิมเข้าหัวข้อ: objective=วัตถุประสงค์, scope=ขอบเขต, responsibility=หน้าที่และความรับผิดชอบ, definition=คำจำกัดความ, procedure=รายละเอียด/ขั้นตอนการปฏิบัติ, reference=เอกสารอ้างอิง, appendix=ภาคผนวก
- คงถ้อยคำเดิมให้มากที่สุด ปรับเป็นภาษาราชการที่สะอาดขึ้นได้เล็กน้อย รายการให้ขึ้นบรรทัดใหม่ทีละข้อ
- บรรทัดที่ขึ้นต้นและลงท้ายด้วย | คือแถวของตาราง ให้คงไว้ตามเดิมทุกแถวเรียงติดกัน (ห้ามแก้ ห้ามรวม ห้ามตัดเครื่องหมาย | ออก) วางในหัวข้อที่เหมาะสม
- หัวข้อที่ไม่มีเนื้อหาในต้นฉบับ ให้ใส่ค่าว่าง ""
- ไม่ต้องเอาส่วนหัวกระดาษ เลขหน้า รหัสเอกสาร ตารางลงนาม มาใส่ในเนื้อหา

เนื้อหาเอกสาร:
${body}`,
    4000,
  )
  const cleaned = out.replace(/```(?:json)?/gi, '')
  const s = cleaned.indexOf('{')
  const e = cleaned.lastIndexOf('}')
  if (s < 0 || e <= s) throw new Error('AI ไม่ได้ตอบกลับเป็นข้อมูลที่อ่านได้')
  const data = JSON.parse(cleaned.slice(s, e + 1)) as { title?: string; sections?: Record<string, string> }
  const sections: Record<string, string> = {}
  for (const k of SECTION_KEYS) {
    const v = data.sections?.[k]
    if (typeof v === 'string' && v.trim()) sections[k] = v.trim()
  }
  if (!Object.keys(sections).length) throw new Error('AI จัดหมวดไม่สำเร็จ')
  return { title: (data.title ?? '').trim(), sections, ...detectCode(text), method: 'ai' }
}

/** จัดรูปแบบเอกสารที่นำเข้า: ลอง AI ก่อน ถ้าไม่ได้ใช้ตัวแยกพื้นฐาน */
export async function restructureDocument(text: string): Promise<ImportedDoc> {
  const clean = text.trim()
  if (clean.length < 40) throw new Error('เนื้อหาสั้นเกินไป — แนบไฟล์หรือวางข้อความของเอกสารทั้งฉบับ')
  try {
    return await aiRestructure(clean)
  } catch {
    const h = heuristicSplit(clean)
    if (!Object.keys(h.sections).length && !h.title) {
      throw new Error('แยกหัวข้อไม่สำเร็จ — เอกสารไม่มีชื่อหัวข้อมาตรฐาน (วัตถุประสงค์ ขอบเขต ฯลฯ) และ AI ไม่พร้อมใช้งาน')
    }
    return h
  }
}
