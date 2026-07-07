import type { Assignments, Shift, Staff } from '../types'
import { cellKey } from '../types'
import { fromISODate } from './date'

/**
 * จัดเวรอัตโนมัติแบบกำหนดผลได้ (deterministic) และกระจายงานให้เป็นธรรม
 * ไม่ต้องใช้ AI/อินเทอร์เน็ต — ใช้เป็นค่าตั้งต้นที่ผู้ใช้ปรับต่อได้
 *
 * เงื่อนไขที่เคารพ:
 *  - ข้ามบุคลากรที่ปิดใช้งาน (active=false)
 *  - ไม่จัดในวันที่บุคลากรลา (unavailableWeekdays)
 *  - 1 คนได้ไม่เกิน 1 เวรต่อวัน
 *  - ไม่เกินจำนวนเวรสูงสุดต่อสัปดาห์ (maxPerWeek)
 *  - เลือกคนที่ถือเวรน้อยที่สุดก่อน (least-loaded) เพื่อความเป็นธรรม
 *
 * options.keepExisting=true : เก็บคนที่จัดไว้แล้วในช่วงสัปดาห์ แล้วเติมที่ว่างเท่านั้น
 */
export function autoSchedule(
  dates: string[],
  shifts: Shift[],
  staff: Staff[],
  existing: Assignments = {},
  options: { keepExisting?: boolean } = {},
): { assignments: Assignments; unfilled: number } {
  const active = staff.filter((s) => s.active)
  const orderedShifts = [...shifts].sort((a, b) => a.order - b.order)

  // นับจำนวนเวรที่แต่ละคนถืออยู่ (นับเฉพาะที่จะเก็บไว้)
  const load = new Map<string, number>()
  active.forEach((s) => load.set(s.id, 0))
  const usedOnDay = new Map<string, Set<string>>() // date → set(staffId) กันซ้ำวันเดียว
  dates.forEach((d) => usedOnDay.set(d, new Set()))

  const result: Assignments = {}

  if (options.keepExisting) {
    for (const date of dates) {
      for (const sh of orderedShifts) {
        const key = cellKey(date, sh.id)
        const kept = (existing[key] ?? []).filter((id) => load.has(id))
        if (kept.length) {
          result[key] = [...kept]
          kept.forEach((id) => {
            load.set(id, (load.get(id) ?? 0) + 1)
            usedOnDay.get(date)!.add(id)
          })
        }
      }
    }
  }

  let unfilled = 0

  for (const date of dates) {
    const weekday = fromISODate(date).getDay()
    for (const sh of orderedShifts) {
      const key = cellKey(date, sh.id)
      const current = result[key] ?? []
      const need = sh.required - current.length
      if (need <= 0) continue

      // ผู้สมัครที่มีสิทธิ์: ว่างวันนั้น ยังไม่ถูกใช้ในวันนี้ และยังไม่เต็มโควตา
      const candidates = active
        .filter((s) => !s.unavailableWeekdays.includes(weekday))
        .filter((s) => !usedOnDay.get(date)!.has(s.id))
        .filter((s) => (load.get(s.id) ?? 0) < s.maxPerWeek)
        // เรียงตามภาระน้อย→มาก, เสมอกันใช้ maxPerWeek มากก่อน แล้วชื่อ เพื่อให้ผลคงที่
        .sort((a, b) => {
          const la = load.get(a.id) ?? 0
          const lb = load.get(b.id) ?? 0
          if (la !== lb) return la - lb
          if (a.maxPerWeek !== b.maxPerWeek) return b.maxPerWeek - a.maxPerWeek
          return a.name.localeCompare(b.name, 'th')
        })

      const pick = candidates.slice(0, need)
      if (pick.length < need) unfilled += need - pick.length

      if (pick.length) {
        result[key] = [...current, ...pick.map((s) => s.id)]
        pick.forEach((s) => {
          load.set(s.id, (load.get(s.id) ?? 0) + 1)
          usedOnDay.get(date)!.add(s.id)
        })
      } else if (current.length === 0) {
        // ปล่อยว่างไว้ (ไม่ต้องสร้างคีย์ว่าง)
      }
    }
  }

  return { assignments: result, unfilled }
}
