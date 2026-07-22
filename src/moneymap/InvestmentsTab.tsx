import { useCallback, useEffect, useRef, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { AlertCircle, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react'
import type { AssetSummary, PortfolioHistory, ResolvedSource } from './types'

/** สีเส้นกราฟ = brand blue ของระบบ (ผ่านเกณฑ์ contrast ≥3:1 บนพื้นขาว) */
const LINE_COLOR = '#1670e6'
const GRID_COLOR = '#e1e0d9'
const AXIS_INK = '#898781'
const BASELINE_COLOR = '#c3c2b7'
const DELTA_UP = '#006300'
const DELTA_DOWN = '#d03b3b'

// ---------------------------------------------------------------------------
// ตัวช่วยจัดรูปแบบ
// ---------------------------------------------------------------------------

/** "2026-01-12" → "12 ม.ค." สำหรับป้ายแกน X */
const thaiShortDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })

/** "2026-01-12" → "12 มกราคม 2569" สำหรับ tooltip */
const thaiFullDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })

/** ย่อตัวเลขแกน Y: 12,500 → "12.5k", 2,400,000 → "2.4M" (ค่าที่ปัดแล้วถึงล้านขึ้นไปใช้ M) */
const compactValue = (v: number) => {
  const abs = Math.abs(v)
  if (abs >= 999_500) return `${(v / 1_000_000).toLocaleString('en-US', { maximumFractionDigits: 1 })}M`
  if (abs >= 1_000) return `${(v / 1_000).toLocaleString('en-US', { maximumFractionDigits: 1 })}k`
  return v.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

const baht = (v: number) => `฿${v.toLocaleString('th-TH', { maximumFractionDigits: 0 })}`

/** ISO timestamp → "22 ก.ค. 2569 14:30" สำหรับหมายเหตุวันที่ของสแนปช็อต */
const thaiTimestamp = (iso: string) =>
  new Date(iso).toLocaleString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

const sourceLabel: Record<ResolvedSource, string> = {
  yahoo: 'Yahoo Finance',
  finnomena: 'Finnomena',
  benchmark: 'Benchmark',
  synthetic: 'ประมาณการ',
}

/** URL ของสแนปช็อต static (สร้างตอน build) — เคารพ base path ของ Vite (/my-web-app/ บน Pages) */
const SNAPSHOT_URL = `${import.meta.env.BASE_URL}moneymap-history.json`

interface LoadResult {
  data: PortfolioHistory
  /** true = มาจาก live API, false = สแนปช็อต static (ไม่มี backend เช่นบน GitHub Pages) */
  live: boolean
}

const isValidHistory = (data: unknown): data is PortfolioHistory =>
  !!data && Array.isArray((data as PortfolioHistory).points) && (data as PortfolioHistory).points.length > 0

/** ลอง live API — คืน null ถ้าไม่มี backend (จะได้ fallback ไปสแนปช็อต) */
async function tryLiveApi(refresh: boolean): Promise<PortfolioHistory | null> {
  try {
    const res = await fetch(`/api/portfolio/history${refresh ? '?refresh=1' : ''}`)
    if (!res.ok) return null
    const data = (await res.json()) as PortfolioHistory
    return isValidHistory(data) ? data : null
  } catch {
    return null
  }
}

/** อ่านสแนปช็อต static ที่สร้างตอน build — คืน null ถ้าไม่มีไฟล์ */
async function trySnapshot(refresh: boolean): Promise<PortfolioHistory | null> {
  try {
    const res = await fetch(SNAPSHOT_URL, refresh ? { cache: 'no-store' } : undefined)
    if (!res.ok) return null
    const data = (await res.json()) as PortfolioHistory
    return isValidHistory(data) ? data : null
  } catch {
    return null
  }
}

/**
 * โหลดข้อมูลพอร์ต โดยเลือกลำดับตามสภาพแวดล้อม:
 *  - dev: ลอง live API ก่อน (มี server รันอยู่) แล้ว fallback สแนปช็อต
 *  - production (static hosting เช่น GitHub Pages): ใช้สแนปช็อตก่อน — ไม่มี
 *    backend อยู่แล้ว จึงไม่ต้อง probe /api ให้เกิด 404 รก console ทุกครั้งที่โหลด
 */
async function loadHistory(refresh: boolean): Promise<LoadResult> {
  if (import.meta.env.DEV) {
    const live = await tryLiveApi(refresh)
    if (live) return { data: live, live: true }
    const snap = await trySnapshot(refresh)
    if (snap) return { data: snap, live: false }
  } else {
    const snap = await trySnapshot(refresh)
    if (snap) return { data: snap, live: false }
    const live = await tryLiveApi(refresh)
    if (live) return { data: live, live: true }
  }
  throw new Error('no data source available')
}

// ---------------------------------------------------------------------------
// Custom tooltip — วันที่ไทยแบบเต็ม + มูลค่าพอร์ตเป็นเงินบาท
// ---------------------------------------------------------------------------

interface TooltipProps {
  active?: boolean
  label?: string
  payload?: Array<{ value: number }>
}

function PortfolioTooltip({ active, label, payload }: TooltipProps) {
  if (!active || !payload?.length || !label) return null
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-lg">
      <div className="text-xs text-slate-500">{thaiFullDate(label)}</div>
      <div className="mt-1 flex items-center gap-2">
        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: LINE_COLOR }} />
        <span className="text-sm font-semibold tabular-nums text-slate-900">{baht(payload[0].value)}</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// แถวสินทรัพย์ในตาราง
// ---------------------------------------------------------------------------

function AssetRow({ asset }: { asset: AssetSummary }) {
  const estimated = asset.priceSource === 'benchmark' || asset.priceSource === 'synthetic'
  return (
    <tr className="border-t border-slate-100">
      <td className="px-4 py-3">
        <div className="font-medium text-slate-900">{asset.symbol}</div>
        <div className="max-w-[16rem] truncate text-xs text-slate-500" title={asset.name}>{asset.name}</div>
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${
            estimated ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'
          }`}
          title={asset.priceSource === 'benchmark' && asset.benchmark ? `อิงดัชนี ${asset.benchmark}` : undefined}
        >
          {sourceLabel[asset.priceSource]}
          {asset.priceSource === 'benchmark' && asset.benchmark ? ` · ${asset.benchmark}` : ''}
        </span>
      </td>
      <td className="px-4 py-3 text-right tabular-nums text-slate-700">
        {asset.units.toLocaleString('th-TH', { maximumFractionDigits: 4 })}
      </td>
      <td className="px-4 py-3 text-right tabular-nums text-slate-700">
        {asset.lastPrice.toLocaleString(asset.currency === 'USD' ? 'en-US' : 'th-TH', { maximumFractionDigits: 2 })}
        <span className="ml-1 text-xs text-slate-400">{asset.currency}</span>
      </td>
      <td className="px-4 py-3 text-right font-medium tabular-nums text-slate-900">{baht(asset.valueThb)}</td>
    </tr>
  )
}

// ---------------------------------------------------------------------------
// หน้า "การลงทุน"
// ---------------------------------------------------------------------------

export default function InvestmentsTab() {
  const [history, setHistory] = useState<PortfolioHistory | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // true = ข้อมูลมาจากสแนปช็อต static (ไม่มี backend) — ใช้แสดงหมายเหตุ "ข้อมูล ณ วันที่..."
  const [snapshot, setSnapshot] = useState(false)
  // ลำดับ request ล่าสุด — กัน response ที่มาช้ากว่าเขียนทับข้อมูลใหม่ (กดรีเฟรชรัวๆ)
  const requestSeq = useRef(0)

  const fetchHistory = useCallback(async (refresh = false) => {
    const seq = ++requestSeq.current
    setLoading(true)
    setError(null)
    try {
      const { data, live } = await loadHistory(refresh)
      if (seq !== requestSeq.current) return
      setHistory(data)
      setSnapshot(!live)
    } catch {
      if (seq !== requestSeq.current) return
      // ข้อความต่างกันตามบริบท: dev แนะนำให้รัน server, production (static) ให้ลองรีเฟรช
      setError(
        import.meta.env.DEV
          ? 'โหลดข้อมูลประวัติพอร์ตไม่สำเร็จ — ตรวจสอบว่า API server ทำงานอยู่ (npm run server) หรือรีเฟรชอีกครั้ง'
          : 'โหลดข้อมูลประวัติพอร์ตไม่สำเร็จ — กรุณารีเฟรชอีกครั้ง',
      )
    } finally {
      if (seq === requestSeq.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchHistory()
  }, [fetchHistory])

  const points = history?.points ?? []
  const first = points[0]?.value ?? 0
  const latest = points[points.length - 1]?.value ?? 0
  const changeAbs = latest - first
  const changePct = first > 0 ? (changeAbs / first) * 100 : 0
  const isUp = changeAbs >= 0

  return (
    <div className="space-y-6">
      {/* กราฟแนวโน้มมูลค่าพอร์ตรวม */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-medium text-slate-500">มูลค่าพอร์ตรวมย้อนหลัง {history?.months ?? 6} เดือน</h2>
            {history && (
              <>
                <div className="mt-1 text-3xl font-semibold text-slate-900">{baht(latest)}</div>
                <div className="mt-1 flex items-center gap-1.5 text-sm font-medium" style={{ color: isUp ? DELTA_UP : DELTA_DOWN }}>
                  {isUp ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  <span className="tabular-nums">
                    {isUp ? '+' : '−'}{baht(Math.abs(changeAbs))} ({isUp ? '+' : '−'}{Math.abs(changePct).toFixed(1)}%)
                  </span>
                  <span className="font-normal text-slate-400">จาก {history.months} เดือนก่อน</span>
                </div>
                {snapshot && history.generatedAt && (
                  <div className="mt-1 text-xs text-slate-400">
                    ข้อมูล ณ {thaiTimestamp(history.generatedAt)} (สแนปช็อตตอน deploy — ไม่มีเซิร์ฟเวอร์เรียลไทม์)
                  </div>
                )}
              </>
            )}
          </div>
          <button
            onClick={() => void fetchHistory(true)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            รีเฟรช
          </button>
        </div>

        {/* รีเฟรชล้มเหลวแต่มีข้อมูลชุดเก่าอยู่ — แจ้งเตือนโดยไม่ซ่อนกราฟ/ตาราง */}
        {!loading && error && history && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            รีเฟรชข้อมูลไม่สำเร็จ — กำลังแสดงข้อมูลชุดล่าสุดที่โหลดไว้
          </div>
        )}

        <div className="mt-4 h-80">
          {loading && (
            <div className="shimmer h-full w-full rounded-xl" />
          )}
          {!loading && error && !history && (
            <div className="flex h-full flex-col items-center justify-center gap-3 rounded-xl bg-slate-50 text-center">
              <AlertCircle className="h-8 w-8 text-slate-400" />
              <p className="max-w-sm text-sm text-slate-600">{error}</p>
              <button
                onClick={() => void fetchHistory()}
                className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-brand-700"
              >
                ลองอีกครั้ง
              </button>
            </div>
          )}
          {!loading && history && (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} stroke={GRID_COLOR} />
                <XAxis
                  dataKey="date"
                  tickFormatter={thaiShortDate}
                  tick={{ fill: AXIS_INK, fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: BASELINE_COLOR }}
                  minTickGap={48}
                  tickMargin={8}
                />
                <YAxis
                  tickFormatter={compactValue}
                  tick={{ fill: AXIS_INK, fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  content={<PortfolioTooltip />}
                  cursor={{ stroke: BASELINE_COLOR, strokeDasharray: '4 4' }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={LINE_COLOR}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4.5, fill: LINE_COLOR, stroke: '#ffffff', strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* ตารางสินทรัพย์ที่ถือครอง */}
      {history && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between px-5 pt-4">
            <h2 className="text-sm font-semibold text-slate-900">สินทรัพย์ในพอร์ต ({history.assets.length})</h2>
            <div className="text-xs text-slate-400">
              USD/THB {history.usdThb.toLocaleString('th-TH', { maximumFractionDigits: 2 })}
              {history.fxLive ? '' : ' (ค่าสำรอง)'}
            </div>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[40rem] text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400">
                  <th className="px-4 pb-2 font-medium">สินทรัพย์</th>
                  <th className="px-4 pb-2 font-medium">แหล่งราคา</th>
                  <th className="px-4 pb-2 text-right font-medium">จำนวนหน่วย</th>
                  <th className="px-4 pb-2 text-right font-medium">ราคาล่าสุด</th>
                  <th className="px-4 pb-2 text-right font-medium">มูลค่า (บาท)</th>
                </tr>
              </thead>
              <tbody>
                {history.assets.map((a) => (
                  <AssetRow key={a.symbol} asset={a} />
                ))}
              </tbody>
            </table>
          </div>
          {history.assets.some((a) => a.priceSource === 'benchmark' || a.priceSource === 'synthetic') && (
            <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">
              สินทรัพย์ที่ติดป้าย “Benchmark” อิงความเคลื่อนไหวของดัชนีอ้างอิงสเกลเข้ากับราคาปัจจุบัน
              ส่วน “ประมาณการ” เป็นข้อมูลจำลองเมื่อดึงราคาจริงไม่ได้ ใช้เพื่อแสดงแนวโน้มเท่านั้น
            </p>
          )}
        </section>
      )}
    </div>
  )
}
