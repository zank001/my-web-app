import { useState } from 'react'
import { LineChart as LineChartIcon, PiggyBank, Wallet } from 'lucide-react'
import InvestmentsTab from './InvestmentsTab'

type TabKey = 'investments'

/** แท็บที่เปิดใช้แล้ว + แท็บตามแผน (ยังไม่เปิด) ของแอปบริหารการเงินครบวงจร */
const TABS: Array<{ key: TabKey | 'overview' | 'budget'; label: string; icon: typeof Wallet; ready: boolean }> = [
  { key: 'investments', label: 'การลงทุน', icon: LineChartIcon, ready: true },
  { key: 'overview', label: 'ภาพรวม', icon: Wallet, ready: false },
  { key: 'budget', label: 'รายรับรายจ่าย', icon: PiggyBank, ready: false },
]

export default function App() {
  const [tab] = useState<TabKey>('investments')

  return (
    <div className="min-h-full">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">MoneyMap</h1>
            <p className="text-xs text-slate-500">แอปบริหารการเงินแบบครบวงจร</p>
          </div>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 px-4">
          {TABS.map(({ key, label, icon: Icon, ready }) => (
            <button
              key={key}
              disabled={!ready}
              className={`flex items-center gap-1.5 rounded-t-lg border-b-2 px-3 py-2 text-sm transition ${
                ready && key === tab
                  ? 'border-brand-600 font-medium text-brand-700'
                  : 'border-transparent text-slate-400'
              } ${ready ? 'hover:text-brand-700' : 'cursor-not-allowed'}`}
            >
              <Icon className="h-4 w-4" />
              {label}
              {!ready && <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-400">เร็วๆ นี้</span>}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {tab === 'investments' && <InvestmentsTab />}
      </main>
    </div>
  )
}
