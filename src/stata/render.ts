/**
 * แปลงผลคำนวณเป็นข้อความตารางสไตล์คอนโซล Stata (monospace)
 * จัดคอลัมน์ด้วย "ความกว้างแสดงผล" — สระบน/ล่างและวรรณยุกต์ไทยนับเป็น 0
 */

import type {
  CorrResult,
  RegResult,
  Summary,
  Tab2Result,
  TabResult,
  TTestResult,
} from './stats'

// ---------- ตัวช่วยจัดรูปแบบ ----------

/** ความกว้างแสดงผล: ตัดอักขระผสม (combining marks) เช่นสระบน/วรรณยุกต์ไทยออก */
export function dw(s: string): number {
  return [...s.replace(/\p{M}/gu, '')].length
}

export function padL(s: string, w: number): string {
  const d = w - dw(s)
  return d > 0 ? ' '.repeat(d) + s : s
}

export function padR(s: string, w: number): string {
  const d = w - dw(s)
  return d > 0 ? s + ' '.repeat(d) : s
}

/** ย่อชื่อตัวแปรให้พอดีคอลัมน์ (คงท้ายชื่อไว้แบบ Stata ~abbrev) */
export function abbrev(s: string, w: number): string {
  if (dw(s) <= w) return s
  const chars = [...s]
  let out = ''
  for (let i = chars.length - 1; i >= 0; i--) {
    const candidate = chars[i] + out
    if (dw('~' + candidate) > w) break
    out = candidate
  }
  return '~' + out
}

/** จัดรูปแบบตัวเลขแบบ %#.0g ของ Stata (เลขนัยสำคัญ ~7 หลัก) */
export function g(x: number, sig = 7): string {
  if (x === null || x === undefined || !Number.isFinite(x)) return '.'
  if (x === 0) return '0'
  const ax = Math.abs(x)
  if (ax >= 1e9 || ax < 1e-4) {
    return x.toExponential(2).replace('e+', 'e+').replace('e-', 'e-')
  }
  let s = x.toPrecision(sig)
  if (s.includes('e')) s = Number(s).toString()
  if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '')
  return s
}

export function f(x: number, dec: number): string {
  return Number.isFinite(x) ? x.toFixed(dec) : '.'
}

// ---------- summarize ----------

export function renderSummarize(rows: { name: string; s: Summary | null }[]): string {
  const out: string[] = []
  out.push('    Variable |        Obs        Mean    Std. dev.       Min        Max')
  out.push('-------------+---------------------------------------------------------')
  for (const { name, s } of rows) {
    const v = padL(abbrev(name, 12), 12)
    if (!s) {
      out.push(`${v} |          0`)
      continue
    }
    out.push(
      `${v} |${padL(String(s.n), 11)}${padL(g(s.mean), 12)}${padL(g(s.sd), 13)}${padL(
        g(s.min), 11,
      )}${padL(g(s.max), 11)}`,
    )
  }
  return out.join('\n')
}

export function renderDetail(name: string, s: Summary): string {
  const out: string[] = []
  const title = name
  const W = 61
  const pad = Math.max(0, Math.floor((W - dw(title)) / 2))
  out.push(' '.repeat(pad) + title)
  out.push('-'.repeat(W))
  out.push('      Percentiles      Smallest')
  const pc = (label: string, v: number, extra = '') =>
    `${padL(label, 3)}${padL(g(v), 13)}${extra}`
  const sm = (i: number) => (i < s.smallest.length ? padL(g(s.smallest[i]), 15) : padL('', 15))
  const lg = (i: number) =>
    i < s.largest.length ? padL(g(s.largest[i]), 15) : padL('', 15)
  const right = (label: string, v: string) => `       ${padR(label, 12)}${padL(v, 10)}`
  out.push(pc('1%', s.p[1]) + sm(0))
  out.push(pc('5%', s.p[5]) + sm(1))
  out.push(pc('10%', s.p[10]) + sm(2) + right('Obs', String(s.n)))
  out.push(pc('25%', s.p[25]) + sm(3) + right('Sum of wgt.', String(s.n)))
  out.push(pc('50%', s.p[50]) + padL('', 15) + right('Mean', g(s.mean)))
  out.push(padL('', 16) + padL('Largest', 15) + right('Std. dev.', g(s.sd)))
  out.push(pc('75%', s.p[75]) + lg(0))
  out.push(pc('90%', s.p[90]) + lg(1) + right('Variance', g(s.variance)))
  out.push(pc('95%', s.p[95]) + lg(2) + right('Skewness', g(s.skewness)))
  out.push(pc('99%', s.p[99]) + lg(3) + right('Kurtosis', g(s.kurtosis)))
  return out.join('\n')
}

// ---------- tabulate ----------

export function renderTabulate(name: string, tab: TabResult): string {
  const labelW = Math.max(11, Math.min(24, Math.max(...tab.levels.map((l) => dw(l.value)), dw(name))))
  const out: string[] = []
  out.push(`${padL(abbrev(name, labelW), labelW)} |      Freq.     Percent        Cum.`)
  out.push('-'.repeat(labelW + 1) + '+-----------------------------------')
  for (const l of tab.levels) {
    out.push(
      `${padL(abbrev(l.value, labelW), labelW)} |${padL(String(l.freq), 11)}${padL(
        f(l.pct, 2), 12,
      )}${padL(f(l.cum, 2), 12)}`,
    )
  }
  out.push('-'.repeat(labelW + 1) + '+-----------------------------------')
  out.push(`${padL('Total', labelW)} |${padL(String(tab.total), 11)}${padL('100.00', 12)}`)
  return out.join('\n')
}

export function renderTab2(rowName: string, colName: string, r: Tab2Result): string {
  const labelW = Math.max(10, Math.min(20, Math.max(...r.rowLevels.map(dw), dw(rowName))))
  const colW = Math.max(9, Math.min(14, Math.max(...r.colLevels.map(dw), 5) + 2))
  const out: string[] = []
  const header = r.colLevels.map((c) => padL(abbrev(c, colW - 1), colW)).join('')
  out.push(`${padL('', labelW)} | ${colName}`)
  out.push(`${padL(abbrev(rowName, labelW), labelW)} |${header} |${padL('Total', 10)}`)
  const sep = '-'.repeat(labelW) + '-+' + '-'.repeat(colW * r.colLevels.length + 1) + '+' + '-'.repeat(10)
  out.push(sep)
  for (let i = 0; i < r.rowLevels.length; i++) {
    const cells = r.counts[i].map((v) => padL(String(v), colW)).join('')
    out.push(
      `${padL(abbrev(r.rowLevels[i], labelW), labelW)} |${cells} |${padL(String(r.rowTotals[i]), 10)}`,
    )
  }
  out.push(sep)
  const totals = r.colTotals.map((v) => padL(String(v), colW)).join('')
  out.push(`${padL('Total', labelW)} |${totals} |${padL(String(r.total), 10)}`)
  out.push('')
  out.push(`Pearson chi2(${r.df}) = ${f(r.chi2, 4)}   Pr = ${f(r.p, 3)}`)
  return out.join('\n')
}

// ---------- correlate ----------

export function renderPwcorr(c: CorrResult): string {
  const k = c.names.length
  const labelW = 13
  const colW = 9
  const out: string[] = []
  out.push(
    `${padL('', labelW)} |` + c.names.map((n) => padL(abbrev(n, colW - 1), colW)).join(''),
  )
  out.push('-'.repeat(labelW) + '-+' + '-'.repeat(colW * k))
  for (let i = 0; i < k; i++) {
    const cells: string[] = []
    for (let j = 0; j <= i; j++) {
      cells.push(padL(Number.isFinite(c.r[i][j]) ? f(c.r[i][j], 4) : '.', colW))
    }
    out.push(`${padL(abbrev(c.names[i], labelW - 1), labelW)} |` + cells.join(''))
  }
  return out.join('\n')
}

// ---------- regress ----------

export function renderRegress(r: RegResult): string {
  const out: string[] = []
  const L = (label: string, value: string) => `${padR(label, 15)} = ${padL(value, 9)}`
  out.push('      Source |       SS           df       MS      ' + L('Number of obs', String(r.n)))
  out.push('-------------+----------------------------------   ' + L(`F(${r.dfModel}, ${r.dfResid})`, f(r.F, 2)))
  out.push(
    `       Model |${padL(g(r.ssModel), 11)}${padL(String(r.dfModel), 10)}${padL(
      g(r.dfModel > 0 ? r.ssModel / r.dfModel : NaN), 12,
    )}   ` + L('Prob > F', f(r.pF, 4)),
  )
  out.push(
    `    Residual |${padL(g(r.ssResid), 11)}${padL(String(r.dfResid), 10)}${padL(
      g(r.ssResid / r.dfResid), 12,
    )}   ` + L('R-squared', f(r.r2, 4)),
  )
  out.push('-------------+----------------------------------   ' + L('Adj R-squared', f(r.adjR2, 4)))
  out.push(
    `       Total |${padL(g(r.ssTotal), 11)}${padL(String(r.n - 1), 10)}${padL(
      g(r.ssTotal / (r.n - 1)), 12,
    )}   ` + L('Root MSE', g(r.rootMSE, 5)),
  )
  out.push('')
  out.push('------------------------------------------------------------------------------')
  out.push(
    `${padL(abbrev(r.depvar, 12), 12)} | Coefficient  Std. err.      t    P>|t|     [95% conf. interval]`,
  )
  out.push('-------------+----------------------------------------------------------------')
  for (const c of r.coefs) {
    const name = padL(abbrev(c.name, 12), 12)
    if (c.omitted) {
      out.push(`${name} |          0  (omitted)`)
      continue
    }
    out.push(
      `${name} |${padL(g(c.b), 11)}${padL(g(c.se), 11)}${padL(f(c.t, 2), 9)}${padL(
        f(c.p, 3), 8,
      )}${padL(g(c.lo), 12)}${padL(g(c.hi), 12)}`,
    )
  }
  out.push('------------------------------------------------------------------------------')
  return out.join('\n')
}

// ---------- ttest ----------

export function renderTtest(r: TTestResult): string {
  const out: string[] = []
  out.push(
    r.unequal
      ? 'Two-sample t test with unequal variances'
      : 'Two-sample t test with equal variances',
  )
  out.push('------------------------------------------------------------------------------')
  out.push('   Group |     Obs        Mean    Std. err.   Std. dev.   [95% conf. interval]')
  out.push('---------+--------------------------------------------------------------------')
  const row = (label: string, n: number | null, mean: number, se: number, sd: number, lo: number, hi: number) =>
    `${padL(abbrev(label, 8), 8)} |${padL(n === null ? '' : String(n), 8)}${padL(g(mean), 12)}${padL(
      g(se), 13,
    )}${padL(g(sd), 12)}${padL(g(lo), 12)}${padL(g(hi), 11)}`
  out.push(row(r.g1.name, r.g1.n, r.g1.mean, r.g1.se, r.g1.sd, r.g1.lo, r.g1.hi))
  out.push(row(r.g2.name, r.g2.n, r.g2.mean, r.g2.se, r.g2.sd, r.g2.lo, r.g2.hi))
  out.push('---------+--------------------------------------------------------------------')
  out.push(row('Combined', r.combined.n, r.combined.mean, r.combined.se, r.combined.sd, r.combined.lo, r.combined.hi))
  out.push('---------+--------------------------------------------------------------------')
  out.push(row('diff', null, r.diff.mean, r.diff.se, NaN, r.diff.lo, r.diff.hi))
  out.push('------------------------------------------------------------------------------')
  out.push(
    `    diff = mean(${abbrev(r.g1.name, 12)}) - mean(${abbrev(r.g2.name, 12)})` +
      padL(`t = ${padL(f(r.t, 4), 8)}`, 78 - dw(`    diff = mean(${abbrev(r.g1.name, 12)}) - mean(${abbrev(r.g2.name, 12)})`)),
  )
  out.push(
    `H0: diff = 0` +
      padL(
        r.unequal
          ? `Satterthwaite's degrees of freedom = ${f(r.df, 4)}`
          : `Degrees of freedom = ${String(r.df)}`,
        66,
      ),
  )
  out.push('')
  out.push('    Ha: diff < 0                 Ha: diff != 0                 Ha: diff > 0')
  out.push(
    ` Pr(T < t) = ${f(r.pLeft, 4)}         Pr(|T| > |t|) = ${f(r.p2, 4)}          Pr(T > t) = ${f(r.pRight, 4)}`,
  )
  return out.join('\n')
}
