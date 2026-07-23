/**
 * ตัวสร้าง "ตารางที่ 1" (comparison / baseline characteristics table)
 * จัดกลุ่มข้อมูลตามตัวแปรกลุ่ม แล้วสรุปแต่ละตัวแปร:
 *  - ต่อเนื่อง → Mean ± SD ต่อกลุ่ม + p-value (t-test 2 กลุ่ม / ANOVA >2 กลุ่ม)
 *  - จัดกลุ่ม → n (%) รายระดับ + p-value (chi-square / Fisher exact 2×2)
 *  - ทวิภาค (binary) → แสดงระดับ "บวก" เป็น %(n/N) แถวเดียว (แบบตารางฤทธิ์ยา)
 */

import { catValues, type Dataset, type Variable } from './parse'
import {
  chiSquareFromMatrix,
  fisher2x2,
  oneway,
  tTestFromStats,
} from './stats'

export type VarKind = 'continuous' | 'categorical' | 'binary'

export interface Table1VarSpec {
  name: string
  kind: VarKind
  /** ระดับที่ถือเป็น "บวก" เมื่อ kind = binary (เช่น ไว/S/ใช่) */
  positiveLevel?: string
}

export interface Table1Options {
  groupVar: string
  specs: Table1VarSpec[]
  /** ใช้ Welch (ความแปรปรวนไม่เท่ากัน) สำหรับ t-test */
  welch: boolean
  /** แสดงคอลัมน์รวม (Total) */
  showTotal: boolean
  /** ใช้ Fisher exact อัตโนมัติเมื่อตาราง 2×2 มี expected < 5 */
  fisherAuto: boolean
  /** ลำดับกลุ่ม (ชื่อระดับของตัวแปรกลุ่ม) — ไม่ระบุ = ตามลำดับที่พบในข้อมูล */
  groupOrder?: string[]
  /** จำนวนทศนิยมของ Mean ± SD (ค่าเริ่มต้น 2) */
  decimals?: number
}

export type Table1Row =
  | {
      type: 'cont'
      label: string
      cells: string[]
      total: string | null
      p: number | null
      test: string
    }
  | { type: 'catHead'; label: string; p: number | null; test: string }
  | { type: 'catRow'; label: string; cells: string[]; total: string | null }
  | {
      type: 'bin'
      label: string
      cells: string[]
      total: string | null
      p: number | null
      test: string
    }

export interface Table1 {
  groupVar: string
  groupLevels: string[]
  groupN: number[]
  totalN: number
  rows: Table1Row[]
  tests: string[]
  error?: string
}

const POSITIVE_TOKEN =
  /^(s|susceptible|sensitive|ไว|yes|y|ใช่|pos|positive|\+|1|true|present|มี|abnormal|ผิดปกติ)$/i

export function defaultPositiveLevel(levels: string[]): string {
  return levels.find((l) => POSITIVE_TOKEN.test(l.trim())) ?? levels[levels.length - 1] ?? ''
}

// จำแนกผลทดสอบความไวต่อยา (antimicrobial susceptibility): S / I / R
const SUS_S = /^(s|susceptible|sensitive|ไว|ไวต่อยา)$/i
const SUS_I = /^(i|intermediate|ปานกลาง|มัธยะ|กึ่ง)$/i
const SUS_R = /^(r|resistant|ดื้อ|ดื้อยา)$/i

function classifyAst(level: string): 'S' | 'I' | 'R' | null {
  const t = level.trim()
  if (SUS_S.test(t)) return 'S'
  if (SUS_I.test(t)) return 'I'
  if (SUS_R.test(t)) return 'R'
  return null
}

/**
 * ตรวจว่าตัวแปรเป็นผลความไวต่อยา (ทุกระดับเป็น S/I/R และมีระดับ "ไว")
 * คืนชื่อระดับ "ไว" เพื่อใช้เป็นระดับบวก (%susceptible) — ไม่ใช่ → null
 */
export function detectSusceptible(levels: string[]): string | null {
  if (levels.length < 2 || levels.length > 3) return null
  const cls = levels.map(classifyAst)
  if (cls.some((c) => c === null)) return null
  const si = cls.indexOf('S')
  return si >= 0 ? levels[si] : null
}

/** ทดสอบความแตกต่างของสัดส่วนจากเมทริกซ์ (R×G): chi-square หรือ Fisher (2×2) */
function testForMatrix(
  counts: number[][],
  fisherAuto: boolean,
): { p: number | null; test: string } {
  const R = counts.length
  const G = R > 0 ? counts[0].length : 0
  if (R < 2 || G < 2 || !counts.some((r) => r.some((v) => v > 0)))
    return { p: null, test: '' }
  const cs = chiSquareFromMatrix(counts)
  if (R === 2 && G === 2 && fisherAuto && cs.minExpected < 5)
    return {
      p: fisher2x2(counts[0][0], counts[0][1], counts[1][0], counts[1][1]).p,
      test: 'Fisher exact test',
    }
  if (cs.df > 0 && Number.isFinite(cs.p)) return { p: cs.p, test: 'Pearson chi-square' }
  return { p: null, test: '' }
}

export function autoKind(v: Variable): VarKind {
  return v.type === 'numeric' && v.nUnique > 10 ? 'continuous' : 'categorical'
}

function msd(xs: number[]): { n: number; mean: number; sd: number } {
  const a = xs.filter(Number.isFinite)
  const n = a.length
  if (n === 0) return { n: 0, mean: NaN, sd: NaN }
  const mean = a.reduce((s, x) => s + x, 0) / n
  const v = n > 1 ? a.reduce((s, x) => s + (x - mean) * (x - mean), 0) / (n - 1) : 0
  return { n, mean, sd: Math.sqrt(v) }
}

export function buildTable1(dataset: Dataset, opts: Table1Options): Table1 {
  const gv = dataset.vars.find((v) => v.name === opts.groupVar)
  if (!gv) return empty(opts.groupVar, 'ไม่พบตัวแปรกลุ่ม')
  const gcat = catValues(gv)

  // ลำดับกลุ่ม: ตาม groupOrder ถ้าระบุ ไม่งั้นตามลำดับที่พบในข้อมูล
  let groupLevels: string[] = []
  for (const g of gcat) if (g !== null && !groupLevels.includes(g)) groupLevels.push(g)
  if (opts.groupOrder && opts.groupOrder.length) {
    const set = new Set(groupLevels)
    const ordered = opts.groupOrder.filter((g) => set.has(g))
    groupLevels = [...ordered, ...groupLevels.filter((g) => !ordered.includes(g))]
  }
  if (groupLevels.length < 2)
    return empty(opts.groupVar, 'ตัวแปรกลุ่มต้องมีอย่างน้อย 2 กลุ่ม')

  const rowsByGroup: number[][] = groupLevels.map(() => [])
  gcat.forEach((g, i) => {
    if (g === null) return
    const j = groupLevels.indexOf(g)
    if (j >= 0) rowsByGroup[j].push(i)
  })
  const allRows = rowsByGroup.flat()
  const groupN = rowsByGroup.map((idx) => idx.length)
  const totalN = allRows.length

  const dec = opts.decimals ?? 2
  const welch = opts.welch
  const rows: Table1Row[] = []
  const tests = new Set<string>()

  for (const spec of opts.specs) {
    const v = dataset.vars.find((x) => x.name === spec.name)
    if (!v || v.name === opts.groupVar) continue

    if (spec.kind === 'continuous') {
      // n=0 → '-', n=1 → ค่าเดียว (ไม่มี SD), n≥2 → Mean ± SD
      const contCell = (s: { n: number; mean: number; sd: number }) =>
        s.n === 0
          ? '-'
          : s.n === 1
            ? `${s.mean.toFixed(dec)} (n=1)`
            : `${s.mean.toFixed(dec)} ± ${s.sd.toFixed(dec)}`
      const perGroup = rowsByGroup.map((idx) => msd(idx.map((i) => v.num[i])))
      const cells = perGroup.map(contCell)
      const totalStat = msd(allRows.map((i) => v.num[i]))
      const total = opts.showTotal ? contCell(totalStat) : null

      let p: number | null = null
      let test = ''
      const enough = perGroup.every((s) => s.n >= 2)
      if (enough && groupLevels.length === 2) {
        const r = tTestFromStats(
          perGroup[0].n, perGroup[0].mean, perGroup[0].sd,
          perGroup[1].n, perGroup[1].mean, perGroup[1].sd, welch,
        )
        p = Number.isFinite(r.p) ? r.p : null
        test = welch ? 'Welch t-test' : "Student's t-test"
      } else if (enough && groupLevels.length > 2) {
        const r = oneway(rowsByGroup.map((idx) => idx.map((i) => v.num[i])))
        p = Number.isFinite(r.p) ? r.p : null
        test = 'One-way ANOVA'
      }
      if (test) tests.add(test)
      rows.push({ type: 'cont', label: `${v.name}, Mean ± SD`, cells, total, p, test })
      continue
    }

    // จัดกลุ่ม / ทวิภาค — ใช้ค่า canonical ("1" = "1.0")
    const vcat = catValues(v)
    const freq = new Map<string, number>()
    for (const idx of rowsByGroup)
      for (const i of idx) {
        const val = vcat[i]
        if (val !== null) freq.set(val, (freq.get(val) ?? 0) + 1)
      }
    const varLevels = [...freq.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'th'))
      .map((e) => e[0])
    if (varLevels.length === 0) continue

    const counts = varLevels.map(() => groupLevels.map(() => 0))
    rowsByGroup.forEach((idx, gj) => {
      for (const i of idx) {
        const val = vcat[i]
        if (val === null) continue
        counts[varLevels.indexOf(val)][gj]++
      }
    })
    const colTot = groupLevels.map((_, gj) => counts.reduce((s, r) => s + r[gj], 0))
    const grandTot = colTot.reduce((s, v2) => s + v2, 0)
    // จำนวนที่ไม่มีข้อมูล (missing) ต่อกลุ่ม — ทำให้ผลรวมกระทบกับ n ของหัวคอลัมน์
    const missingByGroup = rowsByGroup.map((idx) =>
      idx.reduce((s, i) => s + (vcat[i] === null ? 1 : 0), 0),
    )
    const totalMissing = missingByGroup.reduce((s, m) => s + m, 0)

    if (spec.kind === 'binary') {
      // แสดงระดับ "บวก" (เช่น ไว/S) เป็น %(n/N); ทดสอบสัดส่วนบนตาราง 2×G (บวก vs ไม่บวก)
      const pos = spec.positiveLevel ?? defaultPositiveLevel(varLevels)
      const posIdx = varLevels.indexOf(pos)
      const posRow = groupLevels.map((_, gj) => (posIdx >= 0 ? counts[posIdx][gj] : 0))
      const negRow = groupLevels.map((_, gj) => colTot[gj] - posRow[gj])
      const { p, test } = testForMatrix([posRow, negRow], opts.fisherAuto)
      if (test) tests.add(test)
      const cells = groupLevels.map((_, gj) => {
        const n = posRow[gj]
        const N = colTot[gj]
        return N > 0 ? `${((n / N) * 100).toFixed(1)}% (${n}/${N})` : '-'
      })
      const total = opts.showTotal
        ? (() => {
            const n = posRow.reduce((s, v2) => s + v2, 0)
            return grandTot > 0 ? `${((n / grandTot) * 100).toFixed(1)}% (${n}/${grandTot})` : '-'
          })()
        : null
      rows.push({ type: 'bin', label: `${v.name} (${pos})`, cells, total, p, test })
      continue
    }

    // จัดกลุ่ม: ทดสอบไคสแควร์บนทั้งตาราง (ทุกระดับ × กลุ่ม)
    const { p, test } = testForMatrix(counts, opts.fisherAuto)
    if (test) tests.add(test)
    rows.push({ type: 'catHead', label: `${v.name}, n (%)`, p, test })
    varLevels.forEach((lvl, li) => {
      const cells = groupLevels.map((_, gj) => {
        const n = counts[li][gj]
        const N = colTot[gj]
        return `${n} (${N > 0 ? ((n / N) * 100).toFixed(1) : '0.0'})`
      })
      const total = opts.showTotal
        ? (() => {
            const n = counts[li].reduce((s, v2) => s + v2, 0)
            return `${n} (${grandTot > 0 ? ((n / grandTot) * 100).toFixed(1) : '0.0'})`
          })()
        : null
      rows.push({ type: 'catRow', label: `- ${lvl}`, cells, total })
    })
    // แถวผู้ไม่มีข้อมูล เพื่อให้จำนวนรวมกันได้เท่ากับ n ของกลุ่ม (ร้อยละคิดจากผู้มีข้อมูล)
    if (totalMissing > 0) {
      rows.push({
        type: 'catRow',
        label: '- ไม่ระบุ (missing)',
        cells: missingByGroup.map(String),
        total: opts.showTotal ? String(totalMissing) : null,
      })
    }
  }

  return {
    groupVar: opts.groupVar,
    groupLevels,
    groupN,
    totalN,
    rows,
    tests: [...tests],
  }
}

function empty(groupVar: string, error: string): Table1 {
  return { groupVar, groupLevels: [], groupN: [], totalN: 0, rows: [], tests: [], error }
}

// ---------- จัดรูปแบบ p-value ----------

export function fmtP(p: number | null): string {
  if (p === null || !Number.isFinite(p)) return '-'
  if (p < 0.001) return '< 0.001'
  return p.toFixed(3)
}

export function isSig(p: number | null): boolean {
  return p !== null && Number.isFinite(p) && p < 0.05
}

export function pText(p: number | null): string {
  const base = fmtP(p)
  return isSig(p) ? `${base}*` : base
}
