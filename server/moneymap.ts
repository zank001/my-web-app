import { Router } from 'express'
import {
  ASSET_CLASSES,
  clampMonths,
  computePortfolioHistory,
  readState,
  sanitizeHolding,
  writeState,
  type Holding,
  type MoneymapState,
  type PortfolioHistory,
} from './portfolioHistory'

/**
 * MoneyMap — Express router ของแอปบริหารการเงิน (/moneymap/)
 *
 *  - GET /api/moneymap/state        สินทรัพย์ที่ผู้ใช้ถือครอง (moneymap-state.json)
 *  - PUT /api/moneymap/state        บันทึกรายการสินทรัพย์ (validate ก่อนบันทึก)
 *  - GET /api/portfolio/history     มูลค่าพอร์ตรวมรายวันย้อนหลัง N เดือน (THB)
 *
 * logic คำนวณอยู่ใน ./portfolioHistory เพื่อให้ build script (scripts/genHistory.ts)
 * สร้างไฟล์ static ชุดเดียวกันให้ GitHub Pages ใช้ได้โดยไม่ต้องรัน server
 */

const HISTORY_TTL_MS = 10 * 60 * 1000
let historyCache: { key: string; expires: number; payload: PortfolioHistory } | null = null

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
    const months = clampMonths(req.query.months)
    const state = await readState()
    const cacheKey = months + JSON.stringify(state.holdings)
    if (req.query.refresh !== '1' && historyCache && historyCache.key === cacheKey && historyCache.expires > Date.now()) {
      return res.json(historyCache.payload)
    }

    const payload = await computePortfolioHistory(state, months)
    historyCache = { key: cacheKey, expires: Date.now() + HISTORY_TTL_MS, payload }
    res.json(payload)
  } catch (err) {
    console.error('[moneymap] portfolio history failed:', err)
    res.status(500).json({ error: 'ไม่สามารถคำนวณมูลค่าพอร์ตย้อนหลังได้' })
  }
})
