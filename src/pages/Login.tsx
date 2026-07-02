import { ArrowLeft, KeyRound, Mail, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { actions, useStore } from '../data/store'
import { roleColor, roleLabel } from '../lib/permissions'

export default function Login() {
  const users = useStore((s) => s.users)
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [demoCode, setDemoCode] = useState('')
  const [error, setError] = useState('')

  const sendCode = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const res = actions.requestOtp(email)
    if (!res.ok) { setError(res.error ?? 'เกิดข้อผิดพลาด'); return }
    setDemoCode(res.code ?? '')
    setStep('otp')
  }

  const verify = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const res = actions.verifyOtp(email, otp)
    if (!res.ok) setError(res.error ?? 'เกิดข้อผิดพลาด')
    // สำเร็จ → currentUserId ถูกตั้งค่า App จะ re-render ออกจากหน้านี้เอง
  }

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-brand-50 via-white to-emerald-50 p-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
          <div className="mb-6 flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-600 text-white shadow-md">
              <ShieldCheck size={26} />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">ศูนย์คุณภาพ โรงพยาบาลปาย</h1>
              <p className="text-xs text-slate-500">ระบบจัดทำและควบคุมเอกสารคุณภาพ (QM-QMR-001)</p>
            </div>
          </div>

          {step === 'email' ? (
            <form onSubmit={sendCode} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">อีเมลผู้ใช้งาน</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    required
                    placeholder="name@paihospital.go.th"
                    className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                  />
                </div>
              </div>
              {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
              <button type="submit" className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700">
                ส่งรหัส OTP ทางอีเมล
              </button>
            </form>
          ) : (
            <form onSubmit={verify} className="space-y-4">
              <button type="button" onClick={() => { setStep('email'); setOtp(''); setError('') }} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700">
                <ArrowLeft size={14} /> เปลี่ยนอีเมล
              </button>
              <p className="text-sm text-slate-600">
                ส่งรหัสยืนยัน 6 หลักไปที่ <span className="font-semibold">{email}</span> แล้ว
              </p>
              <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <span className="font-semibold">โหมดสาธิต:</span> ระบบยังไม่ได้ส่งอีเมลจริง — รหัสของคุณคือ
                <span className="ml-1 font-mono text-base font-bold tracking-widest text-amber-900">{demoCode}</span>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">รหัส OTP</label>
                <div className="relative">
                  <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    inputMode="numeric"
                    required
                    placeholder="______"
                    className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-center font-mono text-lg tracking-[0.4em] outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                  />
                </div>
              </div>
              {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
              <button type="submit" className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700">
                เข้าสู่ระบบ
              </button>
            </form>
          )}
        </div>

        {/* บัญชีสาธิตแยกตามระดับผู้ใช้ */}
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white/70 p-4 backdrop-blur">
          <div className="mb-2 text-xs font-semibold text-slate-500">บัญชีสาธิต (คลิกเพื่อกรอกอีเมล)</div>
          <div className="grid gap-2">
            {users
              .filter((u, i, arr) => arr.findIndex((x) => x.role === u.role) === i)
              .map((u) => (
                <button
                  key={u.role}
                  onClick={() => { setEmail(u.email); setStep('email'); setError('') }}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-white px-3 py-2 text-left text-sm transition hover:border-brand-200 hover:bg-brand-50/40"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium text-slate-700">{u.email}</div>
                    <div className="truncate text-[11px] text-slate-500">{u.name}</div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${roleColor[u.role]}`}>
                    {roleLabel[u.role]}
                  </span>
                </button>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}
