import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Check,
  ClipboardPaste,
  Copy,
  Eraser,
  FlaskConical,
  Grid3x3,
  ImagePlus,
  Info,
  Loader2,
  Settings2,
  Sigma,
  Table2,
  TrendingUp,
  Upload,
} from 'lucide-react'
import AiSettings from '../components/AiSettings'
import { getProvider, providerLabel } from '../lib/ai'
import { extractTableFromImage } from './imageTable'
import { catValues, parseTable, type Dataset, type Variable } from './parse'
import { pwcorr, regress, summarize, tab2, tabulate, ttest2 } from './stats'
import {
  renderDetail,
  renderPwcorr,
  renderRegress,
  renderSummarize,
  renderTab2,
  renderTabulate,
  renderTtest,
} from './render'

/**
 * สถิติทันใจ — วางตารางจาก Excel/Google Sheets/CSV แล้วได้ผลวิเคราะห์
 * แบบ Stata ทันที (summarize, tabulate, correlate, regress, t-test, chi2)
 */

const EXAMPLE = `id\tsex\tage\tweight\tsbp_before\tsbp_after\tgroup
1\tชาย\t52\t68.5\t152\t138\tยาใหม่
2\tหญิง\t61\t55.2\t148\t135\tยาใหม่
3\tชาย\t45\t72.0\t145\t133\tยาใหม่
4\tหญิง\t58\t60.3\t160\t147\tยาใหม่
5\tชาย\t66\t70.1\t155\t140\tยาใหม่
6\tหญิง\t49\t52.8\t142\t131\tยาใหม่
7\tชาย\t55\t80.4\t158\t143\tยาใหม่
8\tหญิง\t63\t58.7\t150\t139\tยาใหม่
9\tชาย\t47\t75.3\t146\t132\tยาใหม่
10\tหญิง\t70\t51.9\t165\t149\tยาใหม่
11\tชาย\t59\t66.8\t153\t141\tยาใหม่
12\tหญิง\t44\t57.5\t140\t128\tยาใหม่
13\tชาย\t62\t73.6\t157\t144\tยาใหม่
14\tหญิง\t53\t63.0\t149\t136\tยาใหม่
15\tชาย\t51\t69.2\t151\t145\tยาเดิม
16\tหญิง\t60\t54.6\t147\t141\tยาเดิม
17\tชาย\t46\t71.5\t144\t139\tยาเดิม
18\tหญิง\t57\t61.1\t159\t152\tยาเดิม
19\tชาย\t65\t.\t154\t150\tยาเดิม
20\tหญิง\t50\t53.4\t143\t137\tยาเดิม
21\tชาย\t56\t79.8\t157\t151\tยาเดิม
22\tหญิง\t64\t59.2\t149\t144\tยาเดิม
23\tชาย\t48\t74.7\t145\t140\tยาเดิม
24\tหญิง\t69\t52.3\t164\t158\tยาเดิม
25\tชาย\t58\t67.4\t152\t147\tยาเดิม
26\tหญิง\t43\t56.8\t141\t135\tยาเดิม
27\tชาย\t61\t72.9\t156\t150\tยาเดิม
28\tหญิง\t54\t62.4\t148\t143\tยาเดิม`

const ID_LIKE = /^(id|no\.?|seq|ลำดับ(ที่)?|รหัส|code)$/i

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        })
      }}
      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-500 hover:bg-slate-50"
      title="คัดลอกผลลัพธ์"
    >
      {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
      {copied ? 'คัดลอกแล้ว' : 'คัดลอก'}
    </button>
  )
}

function OutputBlock({
  icon,
  title,
  command,
  text,
  children,
}: {
  icon: React.ReactNode
  title: string
  command: string
  text?: string
  children?: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <span className="text-brand-600">{icon}</span>
          {title}
        </div>
        {text !== undefined && <CopyButton text={`. ${command}\n\n${text}`} />}
      </div>
      <div className="p-4">
        {children}
        {text !== undefined && (
          <div className="overflow-x-auto rounded-xl bg-slate-900 p-4">
            <pre className="font-mono text-[12.5px] leading-relaxed text-slate-100">
              <span className="text-emerald-400">. {command}</span>
              {'\n\n'}
              {text}
            </pre>
          </div>
        )}
      </div>
    </section>
  )
}

export default function App() {
  const [text, setText] = useState('')
  const [headerOverride, setHeaderOverride] = useState<boolean | null>(null)
  const [detail, setDetail] = useState(false)
  const [yVar, setYVar] = useState<string>('')
  const [xSel, setXSel] = useState<Set<string>>(new Set())
  const [tVar, setTVar] = useState<string>('')
  const [tGroup, setTGroup] = useState<string>('')
  const [tUnequal, setTUnequal] = useState(false)
  const [rVar, setRVar] = useState<string>('')
  const [cVar, setCVar] = useState<string>('')
  const [aiBusy, setAiBusy] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [showAi, setShowAi] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const imageRef = useRef<HTMLInputElement>(null)

  const readImage = (file: File) => {
    if (aiBusy) return
    setAiBusy(true)
    setAiError(null)
    extractTableFromImage(file)
      .then((tsv) => {
        setText(tsv)
        setHeaderOverride(null)
      })
      .catch((e: unknown) => setAiError(e instanceof Error ? e.message : 'อ่านรูปไม่สำเร็จ'))
      .finally(() => setAiBusy(false))
  }

  const dataset: Dataset | null = useMemo(
    () => parseTable(text, headerOverride),
    [text, headerOverride],
  )

  const numericVars = useMemo(
    () => dataset?.vars.filter((v) => v.type === 'numeric' && v.nUnique > 0) ?? [],
    [dataset],
  )
  const analysisVars = useMemo(
    () => numericVars.filter((v) => !ID_LIKE.test(v.name) && v.nUnique > 1),
    [numericVars],
  )
  const catVars = useMemo(
    () =>
      dataset?.vars.filter(
        (v) => v.nUnique >= 2 && (v.type === 'string' || v.nUnique <= 10),
      ) ?? [],
    [dataset],
  )
  const twoLevelVars = useMemo(() => dataset?.vars.filter((v) => v.nUnique === 2) ?? [], [dataset])

  // ตั้งค่าเริ่มต้นอัตโนมัติเมื่อข้อมูลเปลี่ยน — วางปุ๊บ วิเคราะห์ปั๊บ
  useEffect(() => {
    const names = new Set(analysisVars.map((v) => v.name))
    const defY = analysisVars.length >= 2 ? analysisVars[analysisVars.length - 1].name : ''
    setYVar((prev) => (names.has(prev) ? prev : defY))
    setXSel((prev) => {
      const stillValid = [...prev].every((n) => names.has(n))
      if (stillValid && prev.size > 0) return prev
      return new Set(analysisVars.slice(0, -1).map((v) => v.name))
    })
    setTVar((prev) => (names.has(prev) ? prev : (analysisVars[0]?.name ?? '')))
    const gNames = new Set(twoLevelVars.map((v) => v.name))
    setTGroup((prev) => (gNames.has(prev) ? prev : (twoLevelVars[0]?.name ?? '')))
  }, [analysisVars, twoLevelVars])

  // ตัวแปรแถว/คอลัมน์ของตารางไขว้ต้องมีอยู่จริงและต่างกันเสมอ
  useEffect(() => {
    const cNames = catVars.filter((v) => v.nUnique <= 20).map((v) => v.name)
    const nextR = cNames.includes(rVar) ? rVar : (cNames[0] ?? '')
    const nextC =
      cNames.includes(cVar) && cVar !== nextR
        ? cVar
        : (cNames.find((n) => n !== nextR) ?? '')
    if (nextR !== rVar) setRVar(nextR)
    if (nextC !== cVar) setCVar(nextC)
  }, [catVars, rVar, cVar])

  const byName = (name: string): Variable | undefined => dataset?.vars.find((v) => v.name === name)

  const summaries = numericVars.map((v) => ({ name: v.name, s: summarize(v.num) }))
  const stringTabs = (dataset?.vars.filter((v) => v.type === 'string') ?? []).filter(
    (v) => v.nUnique >= 1 && v.nUnique <= 30,
  )
  const corr = analysisVars.length >= 2 ? pwcorr(analysisVars.map((v) => ({ name: v.name, values: v.num }))) : null

  const xVars = analysisVars.filter((v) => xSel.has(v.name) && v.name !== yVar)
  const regResult =
    yVar && xVars.length > 0 && byName(yVar)
      ? regress(yVar, byName(yVar)!.num, xVars.map((v) => ({ name: v.name, values: v.num })))
      : null

  const tResult =
    tVar && tGroup && byName(tVar) && byName(tGroup)
      ? ttest2(tVar, tGroup, byName(tVar)!.num, catValues(byName(tGroup)!), tUnequal)
      : null

  const tab2Result =
    rVar && cVar && rVar !== cVar && byName(rVar) && byName(cVar)
      ? tab2(catValues(byName(rVar)!), catValues(byName(cVar)!))
      : null

  const selectCls =
    'rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 focus:border-brand-500 focus:outline-none'

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-6 py-4">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600 text-white shadow-sm">
            <Sigma size={22} />
          </div>
          <div>
            <div className="text-sm font-semibold leading-tight">สถิติทันใจ (Stata-style)</div>
            <div className="text-xs text-slate-500">
              วางตารางข้อมูล → ได้ผลวิเคราะห์สถิติทันที ไม่ต้องติดตั้งโปรแกรม
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 space-y-5 p-6">
        {/* กล่องวางข้อมูล */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <ClipboardPaste size={16} className="text-brand-600" />
              วางข้อมูล (คัดลอกตารางจาก Excel / Google Sheets แล้วกด Ctrl+V ที่นี่)
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setText(EXAMPLE)}
                className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
              >
                โหลดข้อมูลตัวอย่าง
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
              >
                <Upload size={13} /> เปิดไฟล์ CSV
              </button>
              <button
                onClick={() => imageRef.current?.click()}
                disabled={aiBusy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                title="แนบภาพถ่ายหรือสกรีนช็อตของตาราง แล้วให้ AI แปลงเป็นข้อมูล"
              >
                <ImagePlus size={13} /> แนบรูปตาราง (AI)
              </button>
              <button
                onClick={() => setShowAi((s) => !s)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                title="เลือกผู้ให้บริการ AI สำหรับอ่านรูป"
              >
                <Settings2 size={13} /> ตั้งค่า AI
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.tsv,.txt"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  file.text().then(setText)
                  e.target.value = ''
                }}
              />
              <input
                ref={imageRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) readImage(file)
                  e.target.value = ''
                }}
              />
              {text && (
                <button
                  onClick={() => {
                    setText('')
                    setHeaderOverride(null)
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                >
                  <Eraser size={13} /> ล้าง
                </button>
              )}
            </div>
          </div>
          {showAi && (
            <div className="mb-3">
              <div className="mb-1 text-xs text-slate-500">
                ผู้ให้บริการ AI ใช้เฉพาะตอน "แนบรูปตาราง" — แบบฟรีใช้ได้ทันทีไม่ต้องมี key
              </div>
              <AiSettings onSaved={() => setShowAi(false)} />
            </div>
          )}
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setHeaderOverride(null)
            }}
            onPaste={(e) => {
              const item = [...e.clipboardData.items].find((i) => i.type.startsWith('image/'))
              const file = item?.getAsFile()
              if (file) {
                e.preventDefault()
                readImage(file)
              }
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              const file = [...e.dataTransfer.files].find((f) => f.type.startsWith('image/'))
              if (file) {
                e.preventDefault()
                readImage(file)
              }
            }}
            placeholder={'ตัวอย่าง:\nsex\tage\tsbp\nชาย\t52\t152\nหญิง\t61\t148\n...\n\nวางรูปถ่าย/สกรีนช็อตของตารางที่นี่ก็ได้ (Ctrl+V หรือลากมาวาง — AI จะแปลงเป็นข้อมูลให้)\nหรือกดปุ่ม "โหลดข้อมูลตัวอย่าง" เพื่อลองใช้งานทันที'}
            spellCheck={false}
            className="h-44 w-full resize-y rounded-xl border border-slate-300 bg-slate-50 p-3 font-mono text-xs leading-relaxed text-slate-800 focus:border-brand-500 focus:outline-none"
          />
          {aiBusy && (
            <div className="mt-2 flex items-center gap-2 text-xs text-brand-700">
              <Loader2 size={14} className="animate-spin" />
              กำลังอ่านตารางจากรูปด้วย AI ({providerLabel[getProvider()]}) …
              รูปจะถูกส่งไปยังผู้ให้บริการนี้เพื่อแปลงเป็นข้อมูลเท่านั้น
            </div>
          )}
          {aiError && !aiBusy && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-rose-600">
              อ่านรูปไม่สำเร็จ: {aiError}
              <button onClick={() => setShowAi(true)} className="underline hover:text-rose-700">
                เปิดตั้งค่า AI
              </button>
            </div>
          )}
          {dataset && (
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600">
              <span className="font-medium text-slate-800">
                อ่านได้ {dataset.nRows.toLocaleString()} แถว × {dataset.vars.length} ตัวแปร
              </span>
              <label className="inline-flex cursor-pointer items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={dataset.hasHeader}
                  onChange={(e) => setHeaderOverride(e.target.checked)}
                  className="accent-brand-600"
                />
                แถวแรกเป็นชื่อตัวแปร
              </label>
              <span className="flex flex-wrap gap-1.5">
                {dataset.vars.map((v) => (
                  <span
                    key={v.name}
                    className={`rounded-full px-2 py-0.5 font-mono text-[11px] ${
                      v.type === 'numeric'
                        ? 'bg-brand-50 text-brand-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                    title={`${v.type === 'numeric' ? 'ตัวเลข' : 'ข้อความ'} · ${v.nUnique} ค่าไม่ซ้ำ · missing ${v.nMissing}`}
                  >
                    {v.name}
                  </span>
                ))}
              </span>
            </div>
          )}
        </section>

        {!dataset && (
          <section className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-6 text-sm leading-relaxed text-slate-600">
            <div className="mb-1 flex items-center gap-2 font-semibold text-slate-700">
              <Info size={15} className="text-brand-600" /> ใช้งาน 3 ขั้นตอน
            </div>
            1. คัดลอกตารางข้อมูล (มีหัวตาราง) จาก Excel, Google Sheets หรือไฟล์ CSV —
            หรือ<b>แนบรูปถ่าย/สกรีนช็อตของตาราง</b> (กดปุ่ม, Ctrl+V หรือลากมาวาง)
            แล้ว AI จะแปลงเป็นข้อมูลให้
            <br />
            2. วางลงในช่องด้านบน — ระบบตรวจชนิดตัวแปรให้อัตโนมัติ
            <br />
            3. อ่านผลได้ทันที: สถิติพรรณนา (summarize), ตารางความถี่ (tabulate),
            สหสัมพันธ์ (correlate), ถดถอย (regress), t-test และ chi-square
            — หน้าตาผลลัพธ์แบบเดียวกับโปรแกรม Stata คัดลอกไปใส่รายงานได้เลย
            <br />
            <span className="mt-1 inline-block text-xs text-slate-400">
              ข้อมูลที่วางเป็นข้อความคำนวณในเครื่องของคุณทั้งหมด ไม่ถูกส่งขึ้นเซิร์ฟเวอร์ ·
              เฉพาะการแนบรูป รูปจะถูกส่งไปยังผู้ให้บริการ AI ที่เลือกเพื่อแปลงเป็นตาราง ·
              ค่า missing ใช้จุด (.) หรือเว้นว่าง
            </span>
          </section>
        )}

        {/* summarize */}
        {dataset && numericVars.length > 0 && (
          <OutputBlock
            icon={<Table2 size={15} />}
            title="สถิติพรรณนา (summarize)"
            command={`summarize ${numericVars.map((v) => v.name).join(' ')}${detail ? ', detail' : ''}`}
            text={
              detail
                ? summaries
                    .filter((r) => r.s)
                    .map((r) => renderDetail(r.name, r.s!))
                    .join('\n\n')
                : renderSummarize(summaries)
            }
          >
            <label className="mb-3 inline-flex cursor-pointer items-center gap-1.5 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={detail}
                onChange={(e) => setDetail(e.target.checked)}
                className="accent-brand-600"
              />
              แบบละเอียด (เปอร์เซ็นไทล์ / skewness / kurtosis)
            </label>
          </OutputBlock>
        )}

        {/* tabulate ตัวแปรข้อความ */}
        {dataset && stringTabs.length > 0 && (
          <div className="grid gap-5 md:grid-cols-2">
            {stringTabs.map((v) => (
              <OutputBlock
                key={v.name}
                icon={<Grid3x3 size={15} />}
                title={`ตารางความถี่: ${v.name}`}
                command={`tabulate ${v.name}`}
                text={renderTabulate(v.name, tabulate(v.raw))}
              />
            ))}
          </div>
        )}

        {/* correlate */}
        {dataset && corr && (
          <OutputBlock
            icon={<TrendingUp size={15} />}
            title="สหสัมพันธ์ (pairwise correlation)"
            command={`pwcorr ${analysisVars.map((v) => v.name).join(' ')}`}
            text={renderPwcorr(corr)}
          />
        )}

        {/* regress */}
        {dataset && analysisVars.length >= 2 && (
          <OutputBlock
            icon={<TrendingUp size={15} />}
            title="ถดถอยเชิงเส้น (regress)"
            command={`regress ${yVar} ${xVars.map((v) => v.name).join(' ')}`}
            text={
              regResult
                ? 'error' in regResult
                  ? regResult.error
                  : renderRegress(regResult)
                : 'เลือกตัวแปรตามและตัวแปรอิสระอย่างน้อย 1 ตัว'
            }
          >
            <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600">
              <label className="inline-flex items-center gap-1.5">
                ตัวแปรตาม (Y):
                <select value={yVar} onChange={(e) => setYVar(e.target.value)} className={selectCls}>
                  {analysisVars.map((v) => (
                    <option key={v.name} value={v.name}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </label>
              <span className="inline-flex flex-wrap items-center gap-2">
                ตัวแปรอิสระ (X):
                {analysisVars
                  .filter((v) => v.name !== yVar)
                  .map((v) => (
                    <label
                      key={v.name}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[11px]"
                    >
                      <input
                        type="checkbox"
                        checked={xSel.has(v.name)}
                        onChange={(e) => {
                          const next = new Set(xSel)
                          if (e.target.checked) next.add(v.name)
                          else next.delete(v.name)
                          setXSel(next)
                        }}
                        className="accent-brand-600"
                      />
                      {v.name}
                    </label>
                  ))}
              </span>
            </div>
          </OutputBlock>
        )}

        {/* t-test */}
        {dataset && analysisVars.length >= 1 && twoLevelVars.length >= 1 && (
          <OutputBlock
            icon={<FlaskConical size={15} />}
            title="เปรียบเทียบค่าเฉลี่ย 2 กลุ่ม (t-test)"
            command={`ttest ${tVar}, by(${tGroup})${tUnequal ? ' unequal' : ''}`}
            text={
              tResult ? ('error' in tResult ? tResult.error : renderTtest(tResult)) : 'เลือกตัวแปร'
            }
          >
            <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600">
              <label className="inline-flex items-center gap-1.5">
                ตัวแปรที่ทดสอบ:
                <select value={tVar} onChange={(e) => setTVar(e.target.value)} className={selectCls}>
                  {analysisVars.map((v) => (
                    <option key={v.name} value={v.name}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="inline-flex items-center gap-1.5">
                ตัวแปรกลุ่ม (2 กลุ่ม):
                <select value={tGroup} onChange={(e) => setTGroup(e.target.value)} className={selectCls}>
                  {twoLevelVars.map((v) => (
                    <option key={v.name} value={v.name}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="inline-flex cursor-pointer items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={tUnequal}
                  onChange={(e) => setTUnequal(e.target.checked)}
                  className="accent-brand-600"
                />
                ความแปรปรวนไม่เท่ากัน (Welch/Satterthwaite)
              </label>
            </div>
          </OutputBlock>
        )}

        {/* chi-square */}
        {dataset && catVars.filter((v) => v.nUnique <= 20).length >= 2 && (
          <OutputBlock
            icon={<Grid3x3 size={15} />}
            title="ตารางไขว้ + ไคสแควร์ (tabulate, chi2)"
            command={`tabulate ${rVar} ${cVar}, chi2`}
            text={
              tab2Result && rVar !== cVar
                ? renderTab2(rVar, cVar, tab2Result)
                : 'เลือกตัวแปรแถวและคอลัมน์ให้ต่างกัน'
            }
          >
            <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600">
              <label className="inline-flex items-center gap-1.5">
                แถว:
                <select value={rVar} onChange={(e) => setRVar(e.target.value)} className={selectCls}>
                  {catVars
                    .filter((v) => v.nUnique <= 20)
                    .map((v) => (
                      <option key={v.name} value={v.name}>
                        {v.name}
                      </option>
                    ))}
                </select>
              </label>
              <label className="inline-flex items-center gap-1.5">
                คอลัมน์:
                <select value={cVar} onChange={(e) => setCVar(e.target.value)} className={selectCls}>
                  {catVars
                    .filter((v) => v.nUnique <= 20)
                    .map((v) => (
                      <option key={v.name} value={v.name}>
                        {v.name}
                      </option>
                    ))}
                </select>
              </label>
            </div>
          </OutputBlock>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto w-full max-w-5xl px-6 py-3 text-[11px] leading-relaxed text-slate-400">
          เครื่องมือช่วยวิเคราะห์เบื้องต้น ผลลัพธ์จัดรูปแบบตามโปรแกรม Stata —
          ข้อมูลข้อความคำนวณในเบราว์เซอร์ทั้งหมด ไม่ถูกส่งออกนอกเครื่อง
          (ยกเว้นการแนบรูป ซึ่งส่งรูปให้ผู้ให้บริการ AI ที่เลือกแปลงเป็นตาราง) ·
          ตารางที่ AI อ่านจากรูปควรตรวจทานกับต้นฉบับก่อนใช้ ·
          โปรดตรวจทานผลก่อนนำไปใช้ในงานวิจัยจริง
        </div>
      </footer>
    </div>
  )
}
