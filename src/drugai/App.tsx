import { Pill } from 'lucide-react'
import DrugInfo from './DrugInfo'

/**
 * ผู้ช่วยข้อมูลยา (AI) — เว็บสแตนด์อโลน แยกจากระบบเอกสารคุณภาพ (QMR)
 * ใช้ได้ทันทีไม่ต้องเข้าสู่ระบบ เพียงตั้งค่า AI provider + API key ในหน้านี้
 */
export default function App() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-6 py-4">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600 text-white shadow-sm">
            <Pill size={22} />
          </div>
          <div>
            <div className="text-sm font-semibold leading-tight">ผู้ช่วยข้อมูลยา (AI)</div>
            <div className="text-xs text-slate-500">โรงพยาบาลปาย · สำหรับบุคลากรทางการแพทย์</div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 p-6">
        <DrugInfo />
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto w-full max-w-6xl px-6 py-3 text-[11px] leading-relaxed text-slate-400">
          เครื่องมือช่วยงานภายใน ไม่ใช่บริการให้คำปรึกษาทางการแพทย์ —
          ข้อมูลจาก AI ต้องผ่านการตรวจทานโดยเภสัชกรก่อนนำไปใช้กับผู้ป่วยจริง
        </div>
      </footer>
    </div>
  )
}
