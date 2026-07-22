/**
 * แยกวิเคราะห์ตารางที่ผู้ใช้วาง — รองรับ TSV (Excel/Google Sheets), CSV,
 * เซมิโคลอน และช่องว่าง ตรวจหัวตาราง/ชนิดตัวแปรอัตโนมัติ
 */

export interface Variable {
  name: string
  /** numeric = ทุกค่าที่ไม่ missing เป็นตัวเลข */
  type: 'numeric' | 'string'
  /** ค่าดิบเป็นข้อความ (null = missing) */
  raw: (string | null)[]
  /** ค่าตัวเลข (NaN = missing/ไม่ใช่ตัวเลข) */
  num: number[]
  nMissing: number
  nUnique: number
}

export interface Dataset {
  vars: Variable[]
  nRows: number
  delimiter: string
  hasHeader: boolean
}

const MISSING = new Set(['', '.', 'na', 'n/a', 'null', '#n/a', '#null!'])

export function isMissingToken(s: string): boolean {
  return MISSING.has(s.trim().toLowerCase())
}

const THOUSANDS = /^-?\d{1,3}(,\d{3})+(\.\d+)?$/

/**
 * แปลงข้อความเป็นตัวเลข — NaN ถ้าไม่ใช่ตัวเลข
 * รองรับคอมมาคั่นหลักพัน (1,234), ทศนิยมแบบคอมมา (1,5) และเปอร์เซ็นต์
 */
export function toNumber(s: string): number {
  let t = s.trim()
  if (t === '') return NaN
  if (THOUSANDS.test(t)) t = t.replace(/,/g, '')
  else if (/^-?\d+,\d+$/.test(t)) t = t.replace(',', '.')
  if (/^-?\d+([.,]\d+)?%$/.test(t)) return Number(t.replace(',', '.').slice(0, -1)) / 100
  const v = Number(t)
  return Number.isFinite(v) ? v : NaN
}

export function detectDelimiter(text: string): string {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '')
  // นับตัวคั่นนอกเครื่องหมายคำพูดเท่านั้น
  const firstLine = (lines[0] ?? '').replace(/"[^"]*"/g, '""')
  if (firstLine.includes('\t')) return '\t'
  const commas = (firstLine.match(/,/g) ?? []).length
  const semis = (firstLine.match(/;/g) ?? []).length
  // คอลัมน์เดียวที่เป็นตัวเลขคั่นหลักพันล้วน (เช่น 1,234) ไม่ใช่ CSV
  if (commas > 0 && semis === 0 && lines.every((l) => THOUSANDS.test(l.trim()))) return ' '
  if (semis > commas) return ';'
  if (commas > 0) return ','
  if (semis > 0) return ';'
  return ' ' // ช่องว่าง (split ด้วย /\s+/)
}

/** แยกข้อความทั้งก้อนเป็นตารางเซลล์ รองรับเครื่องหมายคำพูดแบบ RFC 4180 */
export function splitCells(text: string, delimiter: string): string[][] {
  const rows: string[][] = []
  if (delimiter === ' ') {
    for (const line of text.split(/\r?\n/)) {
      if (line.trim() === '') continue
      rows.push(line.trim().split(/\s+/))
    }
    return rows
  }
  let row: string[] = []
  let cell = ''
  let inQuotes = false
  let i = 0
  const push = () => {
    row.push(cell)
    cell = ''
  }
  const pushRow = () => {
    push()
    if (row.length > 1 || row[0].trim() !== '') rows.push(row)
    row = []
  }
  while (i < text.length) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"'
          i += 2
          continue
        }
        inQuotes = false
        i++
        continue
      }
      cell += ch
      i++
      continue
    }
    if (ch === '"' && cell === '') {
      inQuotes = true
      i++
      continue
    }
    if (ch === delimiter) {
      push()
      i++
      continue
    }
    if (ch === '\n') {
      pushRow()
      i++
      continue
    }
    if (ch === '\r') {
      if (text[i + 1] === '\n') i++
      pushRow()
      i++
      continue
    }
    cell += ch
    i++
  }
  if (cell !== '' || row.length > 0) pushRow()
  return rows
}

/** เดาว่าแถวแรกเป็นหัวตารางหรือไม่: ถ้ามีเซลล์ใดในแถวแรกไม่ใช่ตัวเลข → เป็นหัว */
export function guessHeader(cells: string[][]): boolean {
  if (cells.length === 0) return false
  const first = cells[0]
  const allNumeric = first.every(
    (c) => isMissingToken(c) || Number.isFinite(toNumber(c)),
  )
  return !allNumeric
}

export function parseTable(
  text: string,
  headerOverride: boolean | null = null,
): Dataset | null {
  const trimmed = text.trim()
  if (trimmed === '') return null
  const delimiter = detectDelimiter(trimmed)
  const cells = splitCells(trimmed, delimiter)
  if (cells.length === 0) return null
  let nCols = 0
  for (const r of cells) if (r.length > nCols) nCols = r.length
  if (nCols === 0) return null
  const hasHeader = headerOverride ?? guessHeader(cells)
  const headerRow = hasHeader ? cells[0] : null
  // ตัดแถวที่ว่างทุกเซลล์ทิ้ง (เช่นบรรทัด ",," ท้ายไฟล์จาก Excel)
  const body = (hasHeader ? cells.slice(1) : cells).filter((row) =>
    row.some((c) => c.trim() !== ''),
  )
  if (body.length === 0) return null

  // ตั้งชื่อตัวแปร (กันชื่อว่าง/ซ้ำ)
  const used = new Set<string>()
  const names: string[] = []
  for (let j = 0; j < nCols; j++) {
    let name = (headerRow?.[j] ?? '').trim() || `var${j + 1}`
    if (used.has(name)) {
      let k = 2
      while (used.has(`${name}_${k}`)) k++
      name = `${name}_${k}`
    }
    used.add(name)
    names.push(name)
  }

  const vars: Variable[] = names.map((name) => ({
    name,
    type: 'string',
    raw: [],
    num: [],
    nMissing: 0,
    nUnique: 0,
  }))

  for (const row of body) {
    for (let j = 0; j < nCols; j++) {
      const cellRaw = (row[j] ?? '').trim()
      const v = vars[j]
      if (isMissingToken(cellRaw)) {
        v.raw.push(null)
        v.num.push(NaN)
        v.nMissing++
      } else {
        v.raw.push(cellRaw)
        v.num.push(toNumber(cellRaw))
      }
    }
  }

  for (const v of vars) {
    const nonMissing = v.raw.filter((r) => r !== null)
    const numericOk =
      nonMissing.length > 0 && v.num.every((x, i) => v.raw[i] === null || Number.isFinite(x))
    v.type = numericOk ? 'numeric' : 'string'
    // ตัวแปรตัวเลขนับค่าไม่ซ้ำจากค่าที่แปลงแล้ว ("1" กับ "1.0" คือค่าเดียวกัน)
    v.nUnique = numericOk
      ? new Set(v.num.filter((x) => Number.isFinite(x))).size
      : new Set(nonMissing).size
  }

  return { vars, nRows: body.length, delimiter, hasHeader }
}

/** ค่าหมวดหมู่แบบ canonical สำหรับใช้เป็นตัวแปรกลุ่ม — ตัวเลขใช้ค่าที่แปลงแล้ว ("1" = "1.0") */
export function catValues(v: Variable): (string | null)[] {
  if (v.type !== 'numeric') return v.raw
  return v.num.map((x) => (Number.isFinite(x) ? String(x) : null))
}
