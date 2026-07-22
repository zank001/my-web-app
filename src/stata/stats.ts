/**
 * เอนจินคำนวณสถิติแบบ Stata — pure TypeScript ไม่พึ่ง React
 * ครอบคลุม: summarize, tabulate (1/2 ทาง + chi2), pwcorr, regress (OLS), t-test
 * ฟังก์ชันแจกแจง (t, F, chi2, normal) คำนวณผ่าน incomplete beta/gamma
 */

// ---------- ฟังก์ชันพิเศษ (special functions) ----------

const LANCZOS = [
  676.5203681218851, -1259.1392167224028, 771.3234287776531,
  -176.6150291621406, 12.507343278686905, -0.13857109526572012,
  9.984369578019572e-6, 1.5056327351493116e-7,
]

export function lnGamma(z: number): number {
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lnGamma(1 - z)
  z -= 1
  let x = 0.99999999999980993
  for (let i = 0; i < LANCZOS.length; i++) x += LANCZOS[i] / (z + i + 1)
  const t = z + 7.5
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x)
}

function betacf(a: number, b: number, x: number): number {
  const MAXIT = 300
  const EPS = 3e-14
  const FPMIN = 1e-300
  const qab = a + b
  const qap = a + 1
  const qam = a - 1
  let c = 1
  let d = 1 - (qab * x) / qap
  if (Math.abs(d) < FPMIN) d = FPMIN
  d = 1 / d
  let h = d
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2))
    d = 1 + aa * d
    if (Math.abs(d) < FPMIN) d = FPMIN
    c = 1 + aa / c
    if (Math.abs(c) < FPMIN) c = FPMIN
    d = 1 / d
    h *= d * c
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2))
    d = 1 + aa * d
    if (Math.abs(d) < FPMIN) d = FPMIN
    c = 1 + aa / c
    if (Math.abs(c) < FPMIN) c = FPMIN
    d = 1 / d
    const del = d * c
    h *= del
    if (Math.abs(del - 1) < EPS) break
  }
  return h
}

/** regularized incomplete beta I_x(a,b) */
export function ibeta(a: number, b: number, x: number): number {
  if (!(a > 0) || !(b > 0)) return NaN
  if (x <= 0) return 0
  if (x >= 1) return 1
  const lnBt =
    lnGamma(a + b) - lnGamma(a) - lnGamma(b) + a * Math.log(x) + b * Math.log(1 - x)
  const bt = Math.exp(lnBt)
  if (x < (a + 1) / (a + b + 2)) return (bt * betacf(a, b, x)) / a
  return 1 - (bt * betacf(b, a, 1 - x)) / b
}

function gser(a: number, x: number): number {
  let ap = a
  let sum = 1 / a
  let del = sum
  for (let n = 1; n <= 800; n++) {
    ap++
    del *= x / ap
    sum += del
    if (Math.abs(del) < Math.abs(sum) * 3e-14) break
  }
  return sum * Math.exp(-x + a * Math.log(x) - lnGamma(a))
}

function gcf(a: number, x: number): number {
  const FPMIN = 1e-300
  let b = x + 1 - a
  let c = 1 / FPMIN
  let d = 1 / b
  let h = d
  for (let i = 1; i <= 800; i++) {
    const an = -i * (i - a)
    b += 2
    d = an * d + b
    if (Math.abs(d) < FPMIN) d = FPMIN
    c = b + an / c
    if (Math.abs(c) < FPMIN) c = FPMIN
    d = 1 / d
    const del = d * c
    h *= del
    if (Math.abs(del - 1) < 3e-14) break
  }
  return Math.exp(-x + a * Math.log(x) - lnGamma(a)) * h
}

/** regularized upper incomplete gamma Q(a,x) */
export function gammaQ(a: number, x: number): number {
  if (!(a > 0) || x < 0) return NaN
  if (x === 0) return 1
  if (x < a + 1) return 1 - gser(a, x)
  return gcf(a, x)
}

// ---------- การแจกแจง ----------

/** P(|T| > |t|) สองหาง, T ~ t(df) */
export function tTail2(t: number, df: number): number {
  if (Number.isNaN(t) || !(df > 0)) return NaN
  if (!Number.isFinite(t)) return 0
  if (t === 0) return 1
  return ibeta(df / 2, 0.5, df / (df + t * t))
}

/** CDF ของ t(df) */
export function tCdf(t: number, df: number): number {
  const half = tTail2(t, df) / 2
  return t >= 0 ? 1 - half : half
}

/** ค่า t ที่ CDF = p (เช่น p = 0.975 สำหรับ CI 95%) */
export function tInv(p: number, df: number): number {
  if (!(df > 0) || !(p > 0) || !(p < 1)) return NaN
  if (p === 0.5) return 0
  if (p < 0.5) return -tInv(1 - p, df)
  let lo = 0
  let hi = 1
  while (tCdf(hi, df) < p && hi < 1e12) hi *= 2
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2
    if (tCdf(mid, df) < p) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

/** P(F > f), F ~ F(df1, df2) */
export function fTail(f: number, df1: number, df2: number): number {
  if (!(df1 > 0) || !(df2 > 0) || Number.isNaN(f)) return NaN
  if (f <= 0) return 1
  if (!Number.isFinite(f)) return 0
  return ibeta(df2 / 2, df1 / 2, df2 / (df2 + df1 * f))
}

/** P(X > x), X ~ chi2(df) */
export function chi2Tail(x: number, df: number): number {
  if (!(df > 0)) return NaN
  if (x <= 0) return 1
  return gammaQ(df / 2, x / 2)
}

/** CDF ของแจกแจงปกติมาตรฐาน */
export function normCdf(z: number): number {
  if (!Number.isFinite(z)) return z > 0 ? 1 : 0
  const q = gammaQ(0.5, (z * z) / 2) / 2
  return z >= 0 ? 1 - q : q
}

// ---------- สถิติพรรณนา ----------

export interface Summary {
  n: number
  mean: number
  sd: number
  variance: number
  min: number
  max: number
  sum: number
  skewness: number
  kurtosis: number
  p: Record<1 | 5 | 10 | 25 | 50 | 75 | 90 | 95 | 99, number>
  smallest: number[]
  largest: number[]
}

/** เปอร์เซ็นไทล์ตามนิยามของ Stata (summarize, detail) */
export function pctile(sorted: number[], p: number): number {
  const n = sorted.length
  if (n === 0) return NaN
  const np = (n * p) / 100
  const nearInt = Math.abs(np - Math.round(np)) < 1e-9
  if (nearInt) {
    const i = Math.round(np)
    if (i <= 0) return sorted[0]
    if (i >= n) return sorted[n - 1]
    return (sorted[i - 1] + sorted[i]) / 2
  }
  const i = Math.min(n - 1, Math.max(0, Math.ceil(np) - 1))
  return sorted[i]
}

export function summarize(values: number[]): Summary | null {
  const x = values.filter((v) => Number.isFinite(v))
  const n = x.length
  if (n === 0) return null
  let sum = 0
  for (const v of x) sum += v
  const mean = sum / n
  let s2 = 0
  let s3 = 0
  let s4 = 0
  for (const v of x) {
    const d = v - mean
    s2 += d * d
    s3 += d * d * d
    s4 += d * d * d * d
  }
  const variance = n > 1 ? s2 / (n - 1) : 0
  const m2 = s2 / n
  const m3 = s3 / n
  const m4 = s4 / n
  const sorted = [...x].sort((a, b) => a - b)
  const P = (p: number) => pctile(sorted, p)
  return {
    n,
    mean,
    sd: Math.sqrt(variance),
    variance,
    min: sorted[0],
    max: sorted[n - 1],
    sum,
    skewness: m2 > 0 ? m3 / Math.pow(m2, 1.5) : NaN,
    kurtosis: m2 > 0 ? m4 / (m2 * m2) : NaN,
    p: {
      1: P(1), 5: P(5), 10: P(10), 25: P(25), 50: P(50),
      75: P(75), 90: P(90), 95: P(95), 99: P(99),
    },
    smallest: sorted.slice(0, 4),
    largest: sorted.slice(Math.max(0, n - 4)),
  }
}

// ---------- ตารางแจกแจงความถี่ ----------

export interface TabLevel {
  value: string
  freq: number
  pct: number
  cum: number
}

export interface TabResult {
  levels: TabLevel[]
  total: number
}

export function tabulate(values: (string | null)[]): TabResult {
  const counts = new Map<string, number>()
  let total = 0
  for (const v of values) {
    if (v === null || v === '') continue
    counts.set(v, (counts.get(v) ?? 0) + 1)
    total++
  }
  const keys = [...counts.keys()].sort((a, b) => {
    const na = Number(a)
    const nb = Number(b)
    if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb
    return a.localeCompare(b, 'th')
  })
  let cum = 0
  const levels = keys.map((k) => {
    const freq = counts.get(k)!
    cum += freq
    return { value: k, freq, pct: (freq / total) * 100, cum: (cum / total) * 100 }
  })
  return { levels, total }
}

export interface Tab2Result {
  rowLevels: string[]
  colLevels: string[]
  counts: number[][]
  rowTotals: number[]
  colTotals: number[]
  total: number
  chi2: number
  df: number
  p: number
}

export function tab2(
  rows: (string | null)[],
  cols: (string | null)[],
): Tab2Result | null {
  const pairs: [string, string][] = []
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const c = cols[i]
    if (r === null || r === '' || c === null || c === '' || c === undefined) continue
    pairs.push([r, c])
  }
  if (pairs.length === 0) return null
  const sortKeys = (keys: string[]) =>
    keys.sort((a, b) => {
      const na = Number(a)
      const nb = Number(b)
      if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb
      return a.localeCompare(b, 'th')
    })
  const rowLevels = sortKeys([...new Set(pairs.map((p) => p[0]))])
  const colLevels = sortKeys([...new Set(pairs.map((p) => p[1]))])
  const ri = new Map(rowLevels.map((v, i) => [v, i]))
  const ci = new Map(colLevels.map((v, i) => [v, i]))
  const counts = rowLevels.map(() => colLevels.map(() => 0))
  for (const [r, c] of pairs) counts[ri.get(r)!][ci.get(c)!]++
  const rowTotals = counts.map((row) => row.reduce((s, v) => s + v, 0))
  const colTotals = colLevels.map((_, j) => counts.reduce((s, row) => s + row[j], 0))
  const total = pairs.length
  let chi2 = 0
  for (let i = 0; i < rowLevels.length; i++) {
    for (let j = 0; j < colLevels.length; j++) {
      const e = (rowTotals[i] * colTotals[j]) / total
      if (e > 0) chi2 += ((counts[i][j] - e) * (counts[i][j] - e)) / e
    }
  }
  const df = (rowLevels.length - 1) * (colLevels.length - 1)
  const p = df > 0 ? chi2Tail(chi2, df) : NaN
  return { rowLevels, colLevels, counts, rowTotals, colTotals, total, chi2, df, p }
}

// ---------- สหสัมพันธ์ (pairwise, แบบ pwcorr) ----------

export interface CorrResult {
  names: string[]
  r: number[][]
  nobs: number[][]
}

export function pwcorr(cols: { name: string; values: number[] }[]): CorrResult {
  const k = cols.length
  const r: number[][] = Array.from({ length: k }, () => Array(k).fill(NaN))
  const nobs: number[][] = Array.from({ length: k }, () => Array(k).fill(0))
  for (let i = 0; i < k; i++) {
    for (let j = 0; j <= i; j++) {
      const xi = cols[i].values
      const xj = cols[j].values
      let n = 0
      let sx = 0
      let sy = 0
      for (let t = 0; t < xi.length; t++) {
        if (Number.isFinite(xi[t]) && Number.isFinite(xj[t])) {
          n++
          sx += xi[t]
          sy += xj[t]
        }
      }
      if (n < 2) {
        nobs[i][j] = nobs[j][i] = n
        continue
      }
      const mx = sx / n
      const my = sy / n
      let sxy = 0
      let sxx = 0
      let syy = 0
      for (let t = 0; t < xi.length; t++) {
        if (Number.isFinite(xi[t]) && Number.isFinite(xj[t])) {
          const dx = xi[t] - mx
          const dy = xj[t] - my
          sxy += dx * dy
          sxx += dx * dx
          syy += dy * dy
        }
      }
      const denom = Math.sqrt(sxx * syy)
      const v = denom > 0 ? sxy / denom : NaN
      r[i][j] = r[j][i] = v
      nobs[i][j] = nobs[j][i] = n
    }
  }
  return { names: cols.map((c) => c.name), r, nobs }
}

// ---------- ถดถอยเชิงเส้น (OLS) ----------

export interface Coef {
  name: string
  b: number
  se: number
  t: number
  p: number
  lo: number
  hi: number
  omitted: boolean
}

export interface RegResult {
  depvar: string
  n: number
  dfModel: number
  dfResid: number
  ssModel: number
  ssResid: number
  ssTotal: number
  r2: number
  adjR2: number
  F: number
  pF: number
  rootMSE: number
  coefs: Coef[]
}

/**
 * OLS พร้อมค่าคงที่ (_cons) — คำนวณบนข้อมูล centered ด้วย sweep operator
 * เพื่อความเสถียรเชิงตัวเลข ตัวแปรที่ collinear จะถูก omit แบบเดียวกับ Stata
 */
export function regress(
  depName: string,
  y0: number[],
  xs: { name: string; values: number[] }[],
): RegResult | { error: string } {
  const k = xs.length
  if (k === 0) return { error: 'ต้องเลือกตัวแปรอิสระอย่างน้อย 1 ตัว' }
  const rows: number[] = []
  for (let i = 0; i < y0.length; i++) {
    if (!Number.isFinite(y0[i])) continue
    if (xs.every((x) => Number.isFinite(x.values[i]))) rows.push(i)
  }
  const n = rows.length
  if (n < 3) return { error: 'จำนวนตัวอย่างที่ใช้ได้ (casewise) น้อยเกินไป' }

  // ค่าเฉลี่ยของแต่ละตัวแปรบนแถวที่ใช้จริง
  const xMean = xs.map((x) => rows.reduce((s, i) => s + x.values[i], 0) / n)
  const yMean = rows.reduce((s, i) => s + y0[i], 0) / n

  // เมทริกซ์ผลคูณไขว้ centered ขนาด (k+1)x(k+1): [x1..xk, y]
  const m = k + 1
  const S: number[][] = Array.from({ length: m }, () => Array(m).fill(0))
  for (const i of rows) {
    const d: number[] = []
    for (let a = 0; a < k; a++) d.push(xs[a].values[i] - xMean[a])
    d.push(y0[i] - yMean)
    for (let a = 0; a < m; a++) {
      for (let b = a; b < m; b++) S[a][b] += d[a] * d[b]
    }
  }
  for (let a = 0; a < m; a++) for (let b = 0; b < a; b++) S[a][b] = S[b][a]

  const ssTotal = S[k][k]
  const d0 = xs.map((_, j) => S[j][j])
  const omitted: boolean[] = Array(k).fill(false)
  const TOL = 1e-10

  // sweep ทีละตัวแปรอิสระ — pivot เล็กเกินไปเทียบกับ SS เดิม = collinear
  for (let kk = 0; kk < k; kk++) {
    const dPiv = S[kk][kk]
    if (!(d0[kk] > 0) || !(dPiv > TOL * d0[kk])) {
      omitted[kk] = true
      continue
    }
    for (let j = 0; j < m; j++) S[kk][j] /= dPiv
    for (let i = 0; i < m; i++) {
      if (i === kk) continue
      const B = S[i][kk]
      if (B === 0) continue
      for (let j = 0; j < m; j++) S[i][j] -= B * S[kk][j]
      S[i][kk] = -B / dPiv
    }
    S[kk][kk] = 1 / dPiv
  }

  const kept = omitted.map((o, i) => (o ? -1 : i)).filter((i) => i >= 0)
  const dfModel = kept.length
  const dfResid = n - dfModel - 1
  if (dfResid < 1) return { error: 'องศาเสรีไม่พอ (ตัวแปรมากกว่าจำนวนตัวอย่าง)' }

  const ssResid = Math.max(0, S[k][k])
  const ssModel = Math.max(0, ssTotal - ssResid)
  const mse = ssResid / dfResid
  const r2 = ssTotal > 0 ? ssModel / ssTotal : NaN
  const adjR2 = ssTotal > 0 ? 1 - ((1 - r2) * (n - 1)) / dfResid : NaN
  const F = dfModel > 0 && mse > 0 ? ssModel / dfModel / mse : NaN
  const pF = dfModel > 0 ? fTail(F, dfModel, dfResid) : NaN
  const tcrit = tInv(0.975, dfResid)

  const coefs: Coef[] = []
  for (let j = 0; j < k; j++) {
    if (omitted[j]) {
      coefs.push({ name: xs[j].name, b: 0, se: NaN, t: NaN, p: NaN, lo: NaN, hi: NaN, omitted: true })
      continue
    }
    const b = S[j][k]
    const se = Math.sqrt(mse * S[j][j])
    const t = b / se
    coefs.push({
      name: xs[j].name,
      b,
      se,
      t,
      p: tTail2(t, dfResid),
      lo: b - tcrit * se,
      hi: b + tcrit * se,
      omitted: false,
    })
  }

  // ค่าคงที่: b0 = ȳ − Σ bj x̄j และ var(b0) = MSE·(1/n + x̄' C x̄)
  let b0 = yMean
  for (const j of kept) b0 -= S[j][k] * xMean[j]
  let quad = 0
  for (const a of kept) {
    for (const b of kept) quad += xMean[a] * S[a][b] * xMean[b]
  }
  const seCons = Math.sqrt(mse * (1 / n + quad))
  const tCons = b0 / seCons
  coefs.push({
    name: '_cons',
    b: b0,
    se: seCons,
    t: tCons,
    p: tTail2(tCons, dfResid),
    lo: b0 - tcrit * seCons,
    hi: b0 + tcrit * seCons,
    omitted: false,
  })

  return {
    depvar: depName,
    n,
    dfModel,
    dfResid,
    ssModel,
    ssResid,
    ssTotal,
    r2,
    adjR2,
    F,
    pF,
    rootMSE: Math.sqrt(mse),
    coefs,
  }
}

// ---------- t-test สองกลุ่ม ----------

export interface TGroup {
  name: string
  n: number
  mean: number
  se: number
  sd: number
  lo: number
  hi: number
}

export interface TTestResult {
  varName: string
  groupName: string
  g1: TGroup
  g2: TGroup
  combined: TGroup
  diff: { mean: number; se: number; lo: number; hi: number }
  t: number
  df: number
  pLeft: number
  p2: number
  pRight: number
  unequal: boolean
}

function groupStats(name: string, x: number[]): TGroup {
  const n = x.length
  let sum = 0
  for (const v of x) sum += v
  const mean = sum / n
  let s2 = 0
  for (const v of x) s2 += (v - mean) * (v - mean)
  const sd = n > 1 ? Math.sqrt(s2 / (n - 1)) : 0
  const se = sd / Math.sqrt(n)
  const tcrit = n > 1 ? tInv(0.975, n - 1) : NaN
  return { name, n, mean, se, sd, lo: mean - tcrit * se, hi: mean + tcrit * se }
}

export function ttest2(
  varName: string,
  groupName: string,
  values: number[],
  groups: (string | null)[],
  unequal: boolean,
): TTestResult | { error: string } {
  const byGroup = new Map<string, number[]>()
  const all: number[] = []
  for (let i = 0; i < values.length; i++) {
    const g = groups[i]
    if (g === null || g === '' || g === undefined || !Number.isFinite(values[i])) continue
    if (!byGroup.has(g)) byGroup.set(g, [])
    byGroup.get(g)!.push(values[i])
    all.push(values[i])
  }
  const levels = [...byGroup.keys()].sort((a, b) => {
    const na = Number(a)
    const nb = Number(b)
    if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb
    return a.localeCompare(b, 'th')
  })
  if (levels.length !== 2)
    return { error: `ตัวแปรกลุ่มต้องมี 2 ค่าพอดี (พบ ${levels.length} ค่า)` }
  const x1 = byGroup.get(levels[0])!
  const x2 = byGroup.get(levels[1])!
  if (x1.length < 2 || x2.length < 2)
    return { error: 'แต่ละกลุ่มต้องมีข้อมูลอย่างน้อย 2 ค่า' }
  const g1 = groupStats(levels[0], x1)
  const g2 = groupStats(levels[1], x2)
  if (g1.sd === 0 && g2.sd === 0)
    return { error: 'ค่าในแต่ละกลุ่มคงที่ (ความแปรปรวนเป็นศูนย์) จึงทดสอบ t ไม่ได้' }
  const combined = groupStats('combined', all)
  const dm = g1.mean - g2.mean
  let se: number
  let df: number
  if (unequal) {
    const a = (g1.sd * g1.sd) / g1.n
    const b = (g2.sd * g2.sd) / g2.n
    se = Math.sqrt(a + b)
    df = ((a + b) * (a + b)) / ((a * a) / (g1.n - 1) + (b * b) / (g2.n - 1))
  } else {
    const sp2 =
      ((g1.n - 1) * g1.sd * g1.sd + (g2.n - 1) * g2.sd * g2.sd) / (g1.n + g2.n - 2)
    se = Math.sqrt(sp2 * (1 / g1.n + 1 / g2.n))
    df = g1.n + g2.n - 2
  }
  const t = dm / se
  const tcrit = tInv(0.975, df)
  const p2 = tTail2(t, df)
  const pRight = t >= 0 ? p2 / 2 : 1 - p2 / 2
  return {
    varName,
    groupName,
    g1,
    g2,
    combined,
    diff: { mean: dm, se, lo: dm - tcrit * se, hi: dm + tcrit * se },
    t,
    df,
    pLeft: 1 - pRight,
    p2,
    pRight,
    unequal,
  }
}
