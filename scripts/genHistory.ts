import fs from 'node:fs/promises'
import path from 'node:path'
import { clampMonths, computePortfolioHistory, DEFAULT_STATE, readState } from '../server/portfolioHistory'

/**
 * Build-time generator — สร้างสแนปช็อตมูลค่าพอร์ตย้อนหลังเป็นไฟล์ static
 * (`public/moneymap-history.json`) เพื่อให้ GitHub Pages ซึ่งเป็น static hosting
 * ไม่มี backend ยังแสดงกราฟด้วยข้อมูลจริงได้ frontend จะลอง live API ก่อน แล้ว
 * fallback มาที่ไฟล์นี้เมื่อไม่มี server (ดู src/moneymap/InvestmentsTab.tsx)
 *
 * รันอัตโนมัติผ่าน npm `prebuild` GitHub Actions runner ต่อเน็ตได้จึงดึงราคาจริง
 * จาก Yahoo/Finnomena; ถ้าดึงไม่ได้ computePortfolioHistory จะ fallback เป็น
 * benchmark/synthetic เอง ทำให้ได้ไฟล์ที่ใช้งานได้เสมอ สคริปต์นี้จะไม่ throw
 * เพื่อไม่ให้ build ล้มจากปัญหาเครือข่ายชั่วคราว
 */

const OUT_FILE = path.resolve(process.cwd(), 'public', 'moneymap-history.json')
const MONTHS = clampMonths(process.env.MONEYMAP_MONTHS)

async function main() {
  let state = DEFAULT_STATE
  try {
    state = await readState()
  } catch (err) {
    console.warn('[genHistory] readState failed, using defaults:', err)
  }

  const history = await computePortfolioHistory(state, MONTHS)
  await fs.mkdir(path.dirname(OUT_FILE), { recursive: true })
  await fs.writeFile(OUT_FILE, JSON.stringify(history) + '\n', 'utf8')

  const sources = new Set(history.assets.map((a) => a.priceSource))
  console.log(
    `[genHistory] wrote ${path.relative(process.cwd(), OUT_FILE)} — ` +
      `${history.points.length} points, ${history.assets.length} assets, ` +
      `sources: ${[...sources].join(', ')}, fxLive: ${history.fxLive}`,
  )
}

main().catch((err) => {
  // อย่าให้ build ล้มเพราะ generator — log ไว้แล้วปล่อยผ่าน (frontend มี error state อยู่แล้ว)
  console.error('[genHistory] failed to generate snapshot (build continues):', err)
})
