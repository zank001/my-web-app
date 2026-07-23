import { useEffect, useMemo, useState } from 'react'
import { Check, ClipboardCopy, TableProperties } from 'lucide-react'
import type { Dataset, Variable } from './parse'
import {
  autoKind,
  buildTable1,
  defaultPositiveLevel,
  pText,
  type Table1VarSpec,
  type VarKind,
} from './table1'

/**
 * ส่วนสร้าง "ตารางที่ 1" — เลือกตัวแปรกลุ่ม แล้วได้ตารางเปรียบเทียบพร้อม p-value
 * รูปแบบผลลัพธ์เลียนแบบตารางในงานวิจัย คัดลอกไปวางใน Word ได้
 */

const ID_LIKE = /^(id|no\.?|seq|ลำดับ(ที่)?|รหัส|code|hn|an)$/i
const GROUPISH = /(group|กลุ่ม|esbl|case|control|arm|treatment|status|ผล|ประเภท)/i

function levelsOf(dataset: Dataset, name: string): string[] {
  const v = dataset.vars.find((x) => x.name === name)
  if (!v) return []
  const src = v.type === 'numeric' ? v.num.map((x) => (Number.isFinite(x) ? String(x) : null)) : v.raw
  const freq = new Map<string, number>()
  for (const s of src) if (s !== null) freq.set(s, (freq.get(s) ?? 0) + 1)
  return [...freq.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'th')).map((e) => e[0])
}

export default function Table1Section({ dataset }: { dataset: Dataset }) {
  const groupCandidates = useMemo(
    () => dataset.vars.filter((v) => v.nUnique >= 2 && v.nUnique <= 6),
    [dataset],
  )

  const [groupVar, setGroupVar] = useState('')
  const [included, setIncluded] = useState<Set<string>>(new Set())
  const [kinds, setKinds] = useState<Record<string, VarKind>>({})
  const [positives, setPositives] = useState<Record<string, string>>({})
  const [welch, setWelch] = useState(false)
  const [showTotal, setShowTotal] = useState(false)
  const [fisherAuto, setFisherAuto] = useState(true)
  const [swapGroups, setSwapGroups] = useState(false)
  const [title, setTitle] = useState('ตารางที่ 1 เปรียบเทียบลักษณะพื้นฐานระหว่างกลุ่ม')
  const [copied, setCopied] = useState(false)

  // ตั้งค่าเริ่มต้นเมื่อชุดข้อมูลเปลี่ยน — เลือกกลุ่มและตัวแปรที่เหมาะสมให้อัตโนมัติ
  useEffect(() => {
    const names = groupCandidates.map((v) => v.name)
    const preferred = names.find((n) => GROUPISH.test(n)) ?? names[0] ?? ''
    setGroupVar((prev) => (names.includes(prev) ? prev : preferred))
    const defIncluded = new Set(
      dataset.vars
        .filter((v) => !ID_LIKE.test(v.name) && v.nUnique >= 2)
        .map((v) => v.name),
    )
    setIncluded(defIncluded)
    setKinds(Object.fromEntries(dataset.vars.map((v) => [v.name, autoKind(v)])))
    setPositives({})
    setSwapGroups(false)
  }, [dataset, groupCandidates])

  const setKind = (name: string, kind: VarKind) => {
    setKinds((k) => ({ ...k, [name]: kind }))
    if (kind === 'binary' && !positives[name]) {
      const lv = levelsOf(dataset, name)
      setPositives((p) => ({ ...p, [name]: defaultPositiveLevel(lv) }))
    }
  }

  const toggle = (name: string) => {
    setIncluded((s) => {
      const next = new Set(s)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const specs: Table1VarSpec[] = dataset.vars
    .filter((v) => v.name !== groupVar && included.has(v.name))
    .map((v) => ({ name: v.name, kind: kinds[v.name] ?? autoKind(v), positiveLevel: positives[v.name] }))

  const groupLevelsRaw = useMemo(() => levelsOf(dataset, groupVar), [dataset, groupVar])
  const groupOrder =
    swapGroups && groupLevelsRaw.length === 2 ? [groupLevelsRaw[1], groupLevelsRaw[0]] : undefined

  const table = useMemo(
    () =>
      groupVar
        ? buildTable1(dataset, { groupVar, specs, welch, showTotal, fisherAuto, groupOrder })
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dataset, groupVar, JSON.stringify(specs), welch, showTotal, fisherAuto, JSON.stringify(groupOrder)],
  )

  const controllable = dataset.vars.filter((v) => v.name !== groupVar)

  const doCopy = async () => {
    if (!table || table.error) return
    const { html, tsv } = exportTable(table, title)
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([tsv], { type: 'text/plain' }),
        }),
      ])
    } catch {
      try {
        await navigator.clipboard.writeText(tsv)
      } catch {
        return
      }
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  const selectCls =
    'rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 focus:border-brand-500 focus:outline-none'

  if (groupCandidates.length === 0) return null

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <TableProperties size={16} className="text-brand-600" />
          ตารางที่ 1 — ตารางเปรียบเทียบระหว่างกลุ่ม (พร้อม p-value)
        </div>
        <button
          onClick={doCopy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
          title="คัดลอกตารางไปวางใน Word / Google Docs ได้ทันที (คงรูปแบบตาราง)"
        >
          {copied ? <Check size={13} className="text-emerald-600" /> : <ClipboardCopy size={13} />}
          {copied ? 'คัดลอกแล้ว' : 'คัดลอกตาราง (วางใน Word)'}
        </button>
      </div>

      <div className="space-y-3 p-4">
        {/* ตัวควบคุม */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600">
          <label className="inline-flex items-center gap-1.5">
            แบ่งกลุ่มตาม:
            <select value={groupVar} onChange={(e) => setGroupVar(e.target.value)} className={selectCls}>
              {groupCandidates.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name} ({v.nUnique} กลุ่ม)
                </option>
              ))}
            </select>
          </label>
          {groupLevelsRaw.length === 2 && (
            <button
              onClick={() => setSwapGroups((s) => !s)}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 hover:bg-slate-50"
            >
              สลับลำดับกลุ่ม
            </button>
          )}
          <label className="inline-flex cursor-pointer items-center gap-1.5">
            <input type="checkbox" checked={welch} onChange={(e) => setWelch(e.target.checked)} className="accent-brand-600" />
            t-test แบบความแปรปรวนไม่เท่ากัน (Welch)
          </label>
          <label className="inline-flex cursor-pointer items-center gap-1.5">
            <input type="checkbox" checked={fisherAuto} onChange={(e) => setFisherAuto(e.target.checked)} className="accent-brand-600" />
            ใช้ Fisher exact อัตโนมัติ (2×2, expected&lt;5)
          </label>
          <label className="inline-flex cursor-pointer items-center gap-1.5">
            <input type="checkbox" checked={showTotal} onChange={(e) => setShowTotal(e.target.checked)} className="accent-brand-600" />
            แสดงคอลัมน์รวม (Total)
          </label>
        </div>

        {/* เลือกตัวแปรและชนิด */}
        <details className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <summary className="cursor-pointer font-medium text-slate-700">
            เลือกตัวแปรและชนิด ({specs.length} ตัวแปรในตาราง)
          </summary>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {controllable.map((v) => (
              <div key={v.name} className="flex flex-wrap items-center gap-2 rounded-lg bg-white px-2 py-1.5">
                <label className="inline-flex flex-1 cursor-pointer items-center gap-1.5 font-mono text-[11px]">
                  <input type="checkbox" checked={included.has(v.name)} onChange={() => toggle(v.name)} className="accent-brand-600" />
                  {v.name}
                </label>
                <select
                  value={kinds[v.name] ?? autoKind(v)}
                  onChange={(e) => setKind(v.name, e.target.value as VarKind)}
                  disabled={!included.has(v.name)}
                  className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[11px] disabled:opacity-40"
                >
                  <option value="continuous">ต่อเนื่อง (Mean±SD)</option>
                  <option value="categorical">จัดกลุ่ม n (%)</option>
                  <option value="binary">ทวิภาค %(n/N)</option>
                </select>
                {(kinds[v.name] ?? autoKind(v)) === 'binary' && included.has(v.name) && (
                  <select
                    value={positives[v.name] ?? defaultPositiveLevel(levelsOf(dataset, v.name))}
                    onChange={(e) => setPositives((p) => ({ ...p, [v.name]: e.target.value }))}
                    className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[11px]"
                    title="ระดับที่นับเป็น 'บวก' (แสดงเป็น %)"
                  >
                    {levelsOf(dataset, v.name).map((l) => (
                      <option key={l} value={l}>
                        = {l}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ))}
          </div>
        </details>

        {/* ชื่อตาราง (แก้ไขได้) */}
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-800 focus:border-brand-500 focus:outline-none"
        />

        {/* ตารางผลลัพธ์ */}
        {table?.error ? (
          <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">{table.error}</div>
        ) : table ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm text-slate-800">
              <thead>
                <tr className="bg-slate-50">
                  <th className="border border-slate-300 px-3 py-2 text-left font-semibold">ลักษณะ</th>
                  {table.groupLevels.map((lv, j) => (
                    <th key={lv} className="border border-slate-300 px-3 py-2 text-center font-semibold">
                      {lv}
                      <div className="text-xs font-normal text-slate-500">(n={table.groupN[j]})</div>
                    </th>
                  ))}
                  {showTotal && (
                    <th className="border border-slate-300 px-3 py-2 text-center font-semibold">
                      รวม
                      <div className="text-xs font-normal text-slate-500">(n={table.totalN})</div>
                    </th>
                  )}
                  <th className="border border-slate-300 px-3 py-2 text-center font-semibold">p-value</th>
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, i) => {
                  const nCols = table.groupLevels.length + (showTotal ? 1 : 0) + 2
                  if (row.type === 'catHead') {
                    return (
                      <tr key={i} className="bg-slate-50/60">
                        <td className="border border-slate-300 px-3 py-1.5 font-medium">{row.label}</td>
                        <td className="border border-slate-300" colSpan={nCols - 2} />
                        <td className={`border border-slate-300 px-3 py-1.5 text-center ${sigCls(row.p)}`}>
                          {pText(row.p)}
                        </td>
                      </tr>
                    )
                  }
                  const isLevel = row.type === 'catRow'
                  return (
                    <tr key={i}>
                      <td className={`border border-slate-300 px-3 py-1.5 ${isLevel ? 'pl-6 text-slate-600' : ''}`}>
                        {row.label}
                      </td>
                      {row.cells.map((c, j) => (
                        <td key={j} className="border border-slate-300 px-3 py-1.5 text-center">
                          {c}
                        </td>
                      ))}
                      {showTotal && (
                        <td className="border border-slate-300 px-3 py-1.5 text-center">{row.total}</td>
                      )}
                      {row.type === 'catRow' ? (
                        <td className="border border-slate-300" />
                      ) : (
                        <td className={`border border-slate-300 px-3 py-1.5 text-center ${sigCls(row.p)}`}>
                          {pText(row.p)}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        {/* เชิงอรรถ */}
        {table && !table.error && (
          <div className="space-y-0.5 text-[11px] leading-relaxed text-slate-500">
            <div>* มีนัยสำคัญทางสถิติที่ระดับ p &lt; 0.05</div>
            {table.tests.length > 0 && <div>วิธีทดสอบ: {table.tests.join(', ')}</div>}
            <div>
              ตัวแปรต่อเนื่องแสดงเป็น Mean ± SD · ตัวแปรจัดกลุ่มแสดงเป็น n (ร้อยละภายในกลุ่ม) ·
              ตรวจทานความเหมาะสมของการแจกแจงก่อนนำไปใช้ (ข้อมูลเบ้มากควรใช้ค่ามัธยฐาน/สถิติไม่อิงพารามิเตอร์)
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

function sigCls(p: number | null): string {
  return p !== null && Number.isFinite(p) && p < 0.05 ? 'font-semibold' : ''
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** สร้าง HTML (สำหรับวางใน Word) และ TSV (ข้อความล้วน) จากตาราง */
function exportTable(
  table: NonNullable<ReturnType<typeof buildTable1>>,
  title: string,
): { html: string; tsv: string } {
  const showTotal = table.rows.some((r) => 'total' in r && r.total !== null)
  const head = ['ลักษณะ', ...table.groupLevels.map((lv, j) => `${lv} (n=${table.groupN[j]})`)]
  if (showTotal) head.push(`รวม (n=${table.totalN})`)
  head.push('p-value')

  const tsvRows: string[] = [title, head.join('\t')]
  const bd = 'border:1px solid #333;padding:4px 8px;'
  const htmlRows: string[] = []
  htmlRows.push(
    `<tr>${head
      .map((h, j) => `<th style="${bd}text-align:${j === 0 ? 'left' : 'center'};background:#f1f5f9;">${esc(h)}</th>`)
      .join('')}</tr>`,
  )

  for (const row of table.rows) {
    if (row.type === 'catHead') {
      const span = table.groupLevels.length + (showTotal ? 1 : 0)
      htmlRows.push(
        `<tr><td style="${bd}font-weight:600;">${esc(row.label)}</td>` +
          `<td style="${bd}" colspan="${span}"></td>` +
          `<td style="${bd}text-align:center;">${esc(pText(row.p))}</td></tr>`,
      )
      tsvRows.push([row.label, ...Array(span).fill(''), pText(row.p)].join('\t'))
      continue
    }
    const cells = [...row.cells]
    if (showTotal) cells.push(row.total ?? '')
    const pCell = row.type === 'catRow' ? '' : pText(row.p)
    const labelStyle = row.type === 'catRow' ? `${bd}padding-left:20px;` : bd
    htmlRows.push(
      `<tr><td style="${labelStyle}">${esc(row.label)}</td>` +
        cells.map((c) => `<td style="${bd}text-align:center;">${esc(c)}</td>`).join('') +
        `<td style="${bd}text-align:center;">${esc(pCell)}</td></tr>`,
    )
    tsvRows.push([row.label, ...cells, pCell].join('\t'))
  }

  const notes = [
    '* มีนัยสำคัญทางสถิติที่ระดับ p < 0.05',
    table.tests.length ? `วิธีทดสอบ: ${table.tests.join(', ')}` : '',
  ].filter(Boolean)

  const html =
    `<p style="font-weight:600;">${esc(title)}</p>` +
    `<table style="border-collapse:collapse;font-family:sans-serif;font-size:13px;">${htmlRows.join('')}</table>` +
    notes.map((n) => `<p style="font-size:11px;color:#555;margin:2px 0;">${esc(n)}</p>`).join('')
  const tsv = [...tsvRows, '', ...notes].join('\n')
  return { html, tsv }
}
