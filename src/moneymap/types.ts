/** โครงสร้างข้อมูลที่ backend MoneyMap (server/moneymap.ts) ส่งกลับมา */

export type AssetClass = 'thai-equity' | 'foreign-equity' | 'gold' | 'bond' | 'cash'
export type ResolvedSource = 'yahoo' | 'finnomena' | 'benchmark' | 'synthetic'

export interface HistoryPoint {
  date: string // YYYY-MM-DD
  value: number // มูลค่าพอร์ตรวม (THB)
}

export interface AssetSummary {
  symbol: string
  name: string
  units: number
  currency: 'THB' | 'USD'
  assetClass: AssetClass
  priceSource: ResolvedSource
  benchmark: string | null
  lastPrice: number
  valueThb: number
}

export interface PortfolioHistory {
  currency: 'THB'
  months: number
  usdThb: number
  fxLive: boolean
  points: HistoryPoint[]
  assets: AssetSummary[]
}
