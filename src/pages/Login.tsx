import { ShieldCheck } from 'lucide-react'
import { useState } from 'react'

export default function Login({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('qmr@hospital.go.th')
  const [password, setPassword] = useState('demo')

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-brand-50 via-white to-emerald-50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-600 text-white shadow-md">
            <ShieldCheck size={26} />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">QMR Document Delivery</h1>
            <p className="text-xs text-slate-500">ระบบส่งเอกสารคุณภาพ — โรงพยาบาล</p>
          </div>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); onLogin() }}
          className="space-y-4"
        >
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">อีเมล</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">รหัสผ่าน</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            เข้าสู่ระบบ
          </button>
          <p className="text-center text-[11px] text-slate-400">
            โหมดสาธิต · ข้อมูลในระบบเป็นข้อมูลตัวอย่าง
          </p>
        </form>
      </div>
    </div>
  )
}
