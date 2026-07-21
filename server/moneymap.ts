import { Router } from 'express'
import fs from 'node:fs/promises'
import path from 'node:path'

/**
 * MoneyMap — backend ของแอปบริหารการเงิน (/moneymap/)
 *
 * ให้บริการ:
 *  - GET /api/moneymap/state        สินทรัพย์ที่ผู้ใช้ถือครอง (moneymap-state.json)
 *  - PUT /api/moneymap/state        บันทึกรายการสินทรัพย์
 *  - GET /api/portfolio/history     มูลค่าพอร์ตรวมรายวันย้อนหลัง 6 เดือน (THB)
 *
 * แหล่งราคาย้อนหลังต่อสินทรัพย์ เรียงตามลำดับความน่าเชื่อถือ:
 *  1. ราคาจริง — Yahoo Finance (หุ้น/ETF ต่างประเทศ) หรือ Finnomena (กองทุนรวมไทย)
 *  2. Benchmark — ดัชนีอ้างอิงของกลุ่มสินทรัพย์ (GLD/IVV/BND/SET50) สเกลเข้ากับราคาปัจจุบัน
 *  3. Synthetic — สมการ sine wave + linear trend ตามประเภทสินทรัพย์ เพื่อให้กราฟแสดงผลได้เสมอ
 */

export type AssetClass = 'thai-equity' | 'foreign-equity' | 'gold' | 'bond' | 'cash'
export type PriceSource = 'yahoo' | 'finnomena'
export type ResolvedSource = PriceSource | 'benchmark' | 'synthetic'

export interface Holding {
  symbol: string
  name: string
  units: number
  source: PriceSource
  currency: 'THB' | 'USD'
  assetClass: AssetClass
  /** ต้นทุนต่อหน่วย (สกุลเดียวกับ currency) */
  costPerUnit?: number
  /** ราคาล่าสุดที่ผู้ใช้บันทึกไว้ — ใช้สเกล benchmark/synthetic เมื่อดึงราคาจริงไม่ได้ */
  currentPrice?: number
}

export interface MoneymapState {
  settings: { usdThbFallback: number }
  holdings: Holding[]
}

interface PricePoint {
  date: string // YYYY-MM-DD
  price: number
}

const STATE_FILE = path.resolve(process.cwd(), 'moneymap-state.json')

const DEFAULT_STATE: MoneymapState = {
  settings: { usdThbFallback: 36.5 },
  holdings: [
    { symbol: 'AAPL', name: 'Apple Inc.', units: 15, source: 'yahoo', currency: 'USD', assetClass: 'foreign-equity', costPerUnit: 185, currentPrice: 210 },
    { symbol: 'VOO', name: 'Vanguard S&P 500 ETF', units: 6, source: 'yahoo', currency: 'USD', assetClass: 'foreign-equity', costPerUnit: 470, currentPrice: 510 },
    { symbol: 'SCBGOLD', name: 'กองทุนเปิดไทยพาณิชย์โกลด์ (SCBGOLD)', units: 3500, source: 'finnomena', currency: 'THB', assetClass: 'gold', costPerUnit: 21.4, currentPrice: 24.9 },
    { symbol: 'KFAFIX-A', name: 'กองทุนเปิดกรุงศรีแอคทีฟตราสารหนี้-สะสมมูลค่า', units: 40000, source: 'finnomena', currency: 'THB', assetClass: 'bond', costPerUnit: 12.6, currentPrice: 13.1 },
    { symbol: 'K-STAR-A(A)', name: 'กองทุนเปิดเค สตาร์ หุ้นทุน-A ชนิดสะสมมูลค่า', units: 25000, source: 'finnomena', currency: 'THB', assetClass: 'thai-equity', costPerUnit: 4.4, currentPrice: 3.95 },
  ],
}

const ASSET_CLASSES: AssetClass[] = ['thai-equity', 'foreign-equity', 'gold', 'bond', 'cash']

/** ตรวจ/ทำความสะอาดรายการสินทรัพย์หนึ่งรายการ — คืน null ถ้าข้อมูลใช้ไม่ได้ */
function sanitizeHolding(raw: unknown): Holding | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const symbol = typeof r.symbol === 'string' ? r.symbol.trim() : ''
  const name = typeof r.name === 'string' && r.name.trim() ? r.name.trim() : symbol
  const units = Number(r.units)
  const source: PriceSource | null = r.source === 'finnomena' ? 'finnomena' : r.source === 'yahoo' ? 'yahoo' : null
  const currency = r.currency === 'USD' ? 'USD' : r.currency === 'THB' ? 'THB' : null
  const assetClass = ASSET_CLASSES.includes(r.assetClass as AssetClass) ? (r.assetClass as AssetClass) : null
  if (!symbol || !source || !currency || !assetClass || !Number.isFinite(units) || units < 0) return null
  const holding: Holding = { symbol, name, units, source, currency, assetClass }
  const cost = Number(r.costPerUnit)
  if (Number.isFinite(cost) && cost > 0) holding.costPerUnit = cost
  const current = Number(r.currentPrice)
  if (Number.isFinite(current) && current > 0) holding.currentPrice = current
  return holding
}

async function readState(): Promise<MoneymapState> {
  let raw: string
  try {
    raw = await fs.readFile(STATE_FILE, 'utf8')
  } catch {
    // ยังไม่มีไฟล์ — seed ค่าตั้งต้นเพื่อให้แอปใช้งานได้ทันที
    await writeState(DEFAULT_STATE).catch(() => {})
    return DEFAULT_STATE
  }
  try {
    const parsed = JSON.parse(raw) as Partial<MoneymapState>
    if (!Array.isArray(parsed.holdings)) throw new Error('holdings missing')
    return {
      settings: { usdThbFallback: Number(parsed.settings?.usdThbFallback) || DEFAULT_STATE.settings.usdThbFallback },
      holdings: parsed.holdings.map(sanitizeHolding).filter((h): h is Holding => h !== null),
    }
  } catch (err) {
    // ไฟล์พัง/parse ไม่ได้ — อย่าเขียนทับข้อมูลผู้ใช้ ใช้ค่าตั้งต้นเฉพาะใน memory
    console.warn('[moneymap] state file unreadable, using defaults in memory:', err)
    return DEFAULT_STATE
  }
}

/** เขียนแบบ atomic (tmp + rename) กันไฟล์พังจากการเขียนค้างครึ่งทาง */
async function writeState(state: MoneymapState): Promise<void> {
  const tmp = `${STATE_FILE}.tmp`
  await fs.writeFile(tmp, JSON.stringify(state, null, 2) + '\n', 'utf8')
  await fs.rename(tmp, STATE_FILE)
}

// ---------------------------------------------------------------------------
// แหล่งข้อมูลราคาย้อนหลัง
// ---------------------------------------------------------------------------

const FETCH_TIMEOUT_MS = 10_000
// Yahoo ปฏิเสธ request ที่ไม่มี User-Agent แบบเบราว์เซอร์
const YAHOO_HEADERS = { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36', Accept: 'application/json' }

/** เลือก range ของ Yahoo ที่ครอบคลุมจำนวนเดือนที่ขอ */
function yahooRange(months: number): string {
  if (months <= 2) return '3mo'
  if (months <= 5) return '6mo'
  if (months <= 11) return '1y'
  return '2y'
}

/** เลือก range ของ Finnomena ที่ครอบคลุมจำนวนเดือนที่ขอ */
function finnomenaRange(months: number): string {
  if (months <= 2) return '3M'
  if (months <= 5) return '6M'
  if (months <= 11) return '1Y'
  return '3Y'
}

/** ราคาปิดรายวันจาก Yahoo Finance (query1.finance.yahoo.com) */
async function fetchYahooDaily(symbol: string, range = '6mo'): Promise<PricePoint[] | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=1d`
    const res = await fetch(url, { headers: YAHOO_HEADERS, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
    if (!res.ok) return null
    const json = (await res.json()) as any
    const result = json?.chart?.result?.[0]
    const timestamps: unknown[] = result?.timestamp ?? []
    const closes: unknown[] = result?.indicators?.quote?.[0]?.close ?? []
    const points: PricePoint[] = []
    for (let i = 0; i < timestamps.length; i++) {
      const ts = Number(timestamps[i])
      const price = Number(closes[i])
      if (!Number.isFinite(ts) || !Number.isFinite(price) || price <= 0) continue
      points.push({ date: toISODate(new Date(ts * 1000)), price })
    }
    return points.length >= 5 ? points : null
  } catch {
    return null
  }
}

/** NAV ย้อนหลังของกองทุนรวมไทยจาก API สาธารณะของ Finnomena */
async function fetchFinnomenaNavs(symbol: string, range = '6M'): Promise<PricePoint[] | null> {
  try {
    const url = `https://www.finnomena.com/fn3/api/fund/v2/public/funds/${encodeURIComponent(symbol)}/navs?range=${encodeURIComponent(range)}`
    const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
    if (!res.ok) return null
    const json = (await res.json()) as any
    // โครงสร้าง response มีหลายเวอร์ชัน — รองรับทั้ง {data:{navs:[...]}}, {data:[...]}, {navs:[...]}
    const rows: unknown = json?.data?.navs ?? json?.navs ?? json?.data
    if (!Array.isArray(rows)) return null
    const points: PricePoint[] = []
    for (const row of rows as any[]) {
      const date = String(row?.nav_date ?? row?.date ?? '').slice(0, 10)
      const price = Number(row?.value ?? row?.nav ?? row?.amount)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(price) || price <= 0) continue
      points.push({ date, price })
    }
    points.sort((a, b) => a.date.localeCompare(b.date))
    return points.length >= 5 ? points : null
  } catch {
    return null
  }
}

/**
 * Benchmark ดัชนีอ้างอิงต่อกลุ่มสินทรัพย์ (เรียงตามลำดับที่ลอง) —
 * ทองคำ→GLD, หุ้นต่างประเทศ→IVV, ตราสารหนี้→BND, หุ้นไทย→SET50 (TDEX.BK)
 */
const BENCHMARKS: Record<AssetClass, string[]> = {
  gold: ['GLD'],
  'foreign-equity': ['IVV'],
  bond: ['BND'],
  'thai-equity': ['TDEX.BK', '^SET.BK'],
  cash: [],
}

/**
 * พารามิเตอร์จำลองราคาต่อประเภทสินทรัพย์ (สัดส่วนต่อราคา):
 * vol = แอมพลิจูดของคลื่น sine, trend = แนวโน้มเชิงเส้นตลอด 6 เดือน, period = คาบ (วัน)
 */
const SYNTH_PARAMS: Record<AssetClass, { vol: number; trend: number; period: number }> = {
  'thai-equity': { vol: 0.045, trend: -0.03, period: 55 },
  'foreign-equity': { vol: 0.055, trend: 0.08, period: 70 },
  gold: { vol: 0.04, trend: 0.1, period: 90 },
  bond: { vol: 0.006, trend: 0.015, period: 120 },
  cash: { vol: 0, trend: 0, period: 1 },
}

/** hash แบบง่ายเพื่อให้ phase ของคลื่นต่างกันต่อ symbol แต่คงที่ทุกครั้งที่เรียก */
function symbolPhase(symbol: string): number {
  let h = 0
  for (let i = 0; i < symbol.length; i++) h = (h * 31 + symbol.charCodeAt(i)) >>> 0
  return (h % 628) / 100 // 0..2π
}

/** ราคาจำลอง sine wave + linear trend — จบที่ราคาปัจจุบันของสินทรัพย์พอดี */
function syntheticSeries(holding: Holding, axis: string[]): PricePoint[] {
  const { vol, trend, period } = SYNTH_PARAMS[holding.assetClass] ?? SYNTH_PARAMS.bond
  const base = holding.currentPrice ?? holding.costPerUnit ?? 10
  const phase = symbolPhase(holding.symbol)
  const n = axis.length
  const factors = axis.map((_, i) => {
    const t = i / Math.max(1, n - 1)
    return 1 + trend * t + vol * Math.sin((2 * Math.PI * i) / period + phase)
  })
  const last = factors[n - 1] || 1
  return axis.map((date, i) => ({ date, price: (base * factors[i]) / last }))
}

// ---------------------------------------------------------------------------
// แกนเวลา + การจัดเรียงข้อมูล
// ---------------------------------------------------------------------------

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** วันที่รายวัน (รวมเสาร์-อาทิตย์) ย้อนหลัง N เดือนจนถึงวันนี้ */
function dateAxis(months: number): string[] {
  const out: string[] = []
  const end = new Date()
  end.setUTCHours(0, 0, 0, 0)
  // ลบเดือนโดยไม่ให้วันสิ้นเดือนล้น (31 ส.ค. − 6 เดือน ต้องได้ 28/29 ก.พ. ไม่ใช่ 2-3 มี.ค.)
  const day = end.getUTCDate()
  const start = new Date(end)
  start.setUTCDate(1)
  start.setUTCMonth(start.getUTCMonth() - months)
  const daysInMonth = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).getUTCDate()
  start.setUTCDate(Math.min(day, daysInMonth))
  for (const d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) out.push(toISODate(d))
  return out
}

/**
 * จัดราคาให้ตรงแกนวันที่: วันที่ไม่มีข้อมูล (วันหยุดตลาด) ใช้ราคาล่าสุดก่อนหน้า
 * จุดเริ่มแกนใช้ราคาล่าสุด "ก่อนหรือเท่ากับ" วันแรกของแกน (ถ้าไม่มีเลยจึงถมด้วยราคาแรกที่รู้)
 */
function alignToAxis(points: PricePoint[], axis: string[]): number[] {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date))
  const byDate = new Map(sorted.map((p) => [p.date, p.price]))
  let last = sorted[0]?.price ?? 0
  for (const p of sorted) {
    if (p.date > axis[0]) break
    last = p.price
  }
  return axis.map((date) => {
    const v = byDate.get(date)
    if (v !== undefined) last = v
    return last
  })
}

interface ResolvedSeries {
  holding: Holding
  source: ResolvedSource
  benchmark?: string
  prices: number[] // ตรงตำแหน่งกับ axis
  lastPrice: number
}

/** หา series ราคาของสินทรัพย์หนึ่งตัวตามลำดับ: ราคาจริง → benchmark → synthetic */
async function resolveSeries(holding: Holding, axis: string[], months: number): Promise<ResolvedSeries> {
  const real = holding.source === 'finnomena'
    ? await fetchFinnomenaNavs(holding.symbol, finnomenaRange(months))
    : await fetchYahooDaily(holding.symbol, yahooRange(months))
  if (real) {
    return { holding, source: holding.source, prices: alignToAxis(real, axis), lastPrice: real[real.length - 1].price }
  }

  // Fallback 1: อิงความเคลื่อนไหวของ benchmark แล้วสเกลให้จบที่ราคาปัจจุบันของสินทรัพย์
  const anchorPrice = holding.currentPrice ?? holding.costPerUnit
  if (anchorPrice) {
    for (const benchSymbol of BENCHMARKS[holding.assetClass] ?? []) {
      const bench = await fetchYahooDaily(benchSymbol, yahooRange(months))
      if (!bench) continue
      const benchLast = bench[bench.length - 1].price
      const scaled = bench.map((p) => ({ date: p.date, price: (p.price * anchorPrice) / benchLast }))
      return { holding, source: 'benchmark', benchmark: benchSymbol, prices: alignToAxis(scaled, axis), lastPrice: anchorPrice }
    }
  }

  // Fallback 2: จำลองด้วยสมการ sine + trend เพื่อให้กราฟแสดงผลได้เสมอ
  const synth = syntheticSeries(holding, axis)
  return { holding, source: 'synthetic', prices: synth.map((p) => p.price), lastPrice: synth[synth.length - 1].price }
}

/** อัตราแลกเปลี่ยน USD→THB รายวัน (THB=X) — ถ้าดึงไม่ได้ใช้ค่าคงที่จาก settings */
async function resolveFxSeries(axis: string[], fallbackRate: number, months: number): Promise<{ rates: number[]; latest: number; live: boolean }> {
  const real = await fetchYahooDaily('THB=X', yahooRange(months))
  if (real) {
    const rates = alignToAxis(real, axis)
    return { rates, latest: rates[rates.length - 1], live: true }
  }
  return { rates: axis.map(() => fallbackRate), latest: fallbackRate, live: false }
}

// ---------------------------------------------------------------------------
// Router + cache
// ---------------------------------------------------------------------------

const HISTORY_TTL_MS = 10 * 60 * 1000
let historyCache: { key: string; expires: number; payload: unknown } | null = null

export const moneymapRouter = Router()

moneymapRouter.get('/api/moneymap/state', async (_req, res) => {
  try {
    res.json(await readState())
  } catch (err) {
    console.error('[moneymap] read state failed:', err)
    res.status(500).json({ error: 'อ่านข้อมูลพอร์ตไม่สำเร็จ' })
  }
})

moneymapRouter.put('/api/moneymap/state', async (req, res) => {
  try {
    const body = req.body as Partial<MoneymapState>
    if (!Array.isArray(body?.holdings)) {
      return res.status(400).json({ error: 'holdings array required' })
    }
    // validate ทุกรายการก่อนบันทึก — ข้อมูลพังรายการเดียวต้องไม่ทำให้ /api/portfolio/history ล้มถาวร
    const holdings: Holding[] = []
    for (let i = 0; i < body.holdings.length; i++) {
      const clean = sanitizeHolding(body.holdings[i])
      if (!clean) {
        return res.status(400).json({
          error: `holdings[${i}] ไม่ถูกต้อง: ต้องมี symbol, units ≥ 0, source (yahoo|finnomena), currency (THB|USD), assetClass (${ASSET_CLASSES.join('|')})`,
        })
      }
      holdings.push(clean)
    }
    const current = await readState()
    const next: MoneymapState = {
      settings: { usdThbFallback: Number(body.settings?.usdThbFallback) || current.settings.usdThbFallback },
      holdings,
    }
    await writeState(next)
    historyCache = null
    res.json({ ok: true, holdings: holdings.length })
  } catch (err) {
    console.error('[moneymap] write state failed:', err)
    res.status(500).json({ error: 'บันทึกข้อมูลพอร์ตไม่สำเร็จ' })
  }
})

moneymapRouter.get('/api/portfolio/history', async (req, res) => {
  try {
    const months = Math.min(24, Math.max(1, Number(req.query.months) || 6))
    const state = await readState()
    const cacheKey = months + JSON.stringify(state.holdings)
    if (req.query.refresh !== '1' && historyCache && historyCache.key === cacheKey && historyCache.expires > Date.now()) {
      return res.json(historyCache.payload)
    }

    const axis = dateAxis(months)
    // ยิงทุก request พร้อมกัน: FX หนึ่งชุด + series ราคาของแต่ละสินทรัพย์
    const fxPromise = resolveFxSeries(axis, state.settings.usdThbFallback, months)
    const series = await Promise.all(state.holdings.map((h) => resolveSeries(h, axis, months)))
    const fx = await fxPromise

    // รวมมูลค่ารายวัน: ราคา × จำนวนหน่วย (× USD/THB สำหรับสินทรัพย์สกุล USD)
    const points = axis.map((date, i) => {
      let value = 0
      for (const s of series) {
        const fxRate = s.holding.currency === 'USD' ? fx.rates[i] : 1
        value += s.prices[i] * s.holding.units * fxRate
      }
      return { date, value: Math.round(value * 100) / 100 }
    })

    const payload = {
      currency: 'THB' as const,
      months,
      usdThb: Math.round(fx.latest * 10000) / 10000,
      fxLive: fx.live,
      points,
      assets: series.map((s) => ({
        symbol: s.holding.symbol,
        name: s.holding.name,
        units: s.holding.units,
        currency: s.holding.currency,
        assetClass: s.holding.assetClass,
        priceSource: s.source,
        benchmark: s.benchmark ?? null,
        lastPrice: Math.round(s.lastPrice * 10000) / 10000,
        valueThb: Math.round(s.lastPrice * s.holding.units * (s.holding.currency === 'USD' ? fx.latest : 1) * 100) / 100,
      })),
    }
    historyCache = { key: cacheKey, expires: Date.now() + HISTORY_TTL_MS, payload }
    res.json(payload)
  } catch (err) {
    console.error('[moneymap] portfolio history failed:', err)
    res.status(500).json({ error: 'ไม่สามารถคำนวณมูลค่าพอร์ตย้อนหลังได้' })
  }
})
