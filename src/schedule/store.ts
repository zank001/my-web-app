import { useSyncExternalStore } from 'react'
import type { Assignments, ScheduleState, Shift, Staff } from './types'
import { cellKey } from './types'
import { seedShifts, seedStaff } from './seed'
import { startOfWeek, todayISO } from './lib/date'

// สโตร์แบบเบา ใช้ useSyncExternalStore + บันทึกลง localStorage อัตโนมัติ
// (แนวทางเดียวกับสโตร์ของระบบเอกสาร QMR แต่แยกข้อมูลของแอปจัดเวรออกต่างหาก)

const STORAGE_KEY = 'schedule_state_v1'

const uid = (p: string) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`

const defaultState = (): ScheduleState => ({
  staff: seedStaff,
  shifts: seedShifts,
  assignments: {},
  weekStart: startOfWeek(todayISO()),
})

const load = (): ScheduleState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultState()
    const parsed = JSON.parse(raw) as Partial<ScheduleState>
    const base = defaultState()
    return {
      staff: Array.isArray(parsed.staff) && parsed.staff.length ? parsed.staff : base.staff,
      shifts: Array.isArray(parsed.shifts) && parsed.shifts.length ? parsed.shifts : base.shifts,
      assignments: parsed.assignments && typeof parsed.assignments === 'object' ? parsed.assignments : {},
      // เปิดแอปครั้งใหม่ให้เด้งมาสัปดาห์ปัจจุบันเสมอ
      weekStart: startOfWeek(todayISO()),
    }
  } catch {
    return defaultState()
  }
}

let state: ScheduleState = load()

const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

const persist = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* โควตาเต็ม/โหมดส่วนตัว — ข้ามการบันทึก */
  }
}

const update = (mut: (s: ScheduleState) => ScheduleState) => {
  state = mut(state)
  persist()
  emit()
}

// selector ต้องคืน reference เดิมเมื่อ state ไม่เปลี่ยน — ห้าม .map/.filter ในนี้
export const useSchedule = <T,>(selector: (s: ScheduleState) => T): T =>
  useSyncExternalStore(subscribe, () => selector(state))

export const getState = () => state

export const actions = {
  setWeekStart(weekStart: string) {
    update((s) => ({ ...s, weekStart }))
  },

  /** สลับการมอบหมายบุคลากรลงช่อง (วัน+เวร): มีอยู่แล้ว→เอาออก, ไม่มี→เพิ่ม */
  toggleAssign(dateISO: string, shiftId: string, staffId: string) {
    const key = cellKey(dateISO, shiftId)
    update((s) => {
      const cur = s.assignments[key] ?? []
      const next = cur.includes(staffId) ? cur.filter((id) => id !== staffId) : [...cur, staffId]
      const assignments = { ...s.assignments }
      if (next.length) assignments[key] = next
      else delete assignments[key]
      return { ...s, assignments }
    })
  },

  /** กำหนดรายชื่อทั้งช่องพร้อมกัน (ใช้ตอนจัดเวรอัตโนมัติ/นำเข้า) */
  setCell(dateISO: string, shiftId: string, staffIds: string[]) {
    const key = cellKey(dateISO, shiftId)
    update((s) => {
      const assignments = { ...s.assignments }
      if (staffIds.length) assignments[key] = [...new Set(staffIds)]
      else delete assignments[key]
      return { ...s, assignments }
    })
  },

  /** รวมชุดตารางใหม่ (จากจัดอัตโนมัติ/AI) เข้ากับของเดิม โดยแทนที่เฉพาะคีย์ที่ส่งมา */
  mergeAssignments(patch: Assignments) {
    update((s) => {
      const assignments = { ...s.assignments }
      for (const [key, ids] of Object.entries(patch)) {
        if (ids && ids.length) assignments[key] = [...new Set(ids)]
        else delete assignments[key]
      }
      return { ...s, assignments }
    })
  },

  /** ล้างเวรของช่วงวันที่กำหนด (เช่น ทั้งสัปดาห์ที่กำลังดู) */
  clearDates(dates: string[]) {
    const set = new Set(dates)
    update((s) => {
      const assignments: Assignments = {}
      for (const [key, ids] of Object.entries(s.assignments)) {
        if (!set.has(key.slice(0, key.indexOf('__')))) assignments[key] = ids
      }
      return { ...s, assignments }
    })
  },

  addStaff(input: Omit<Staff, 'id'>) {
    const staff: Staff = { ...input, id: uid('st') }
    update((s) => ({ ...s, staff: [...s.staff, staff] }))
    return staff.id
  },

  updateStaff(id: string, patch: Partial<Staff>) {
    update((s) => ({ ...s, staff: s.staff.map((p) => (p.id === id ? { ...p, ...patch } : p)) }))
  },

  removeStaff(id: string) {
    update((s) => {
      // เอารายชื่อออกจากทุกช่องด้วย เพื่อไม่ให้เหลือ id ค้าง
      const assignments: Assignments = {}
      for (const [key, ids] of Object.entries(s.assignments)) {
        const next = ids.filter((x) => x !== id)
        if (next.length) assignments[key] = next
      }
      return { ...s, staff: s.staff.filter((p) => p.id !== id), assignments }
    })
  },

  addShift(input: Omit<Shift, 'id' | 'order'>) {
    update((s) => {
      const order = s.shifts.reduce((m, sh) => Math.max(m, sh.order), 0) + 1
      return { ...s, shifts: [...s.shifts, { ...input, id: uid('sh'), order }] }
    })
  },

  updateShift(id: string, patch: Partial<Shift>) {
    update((s) => ({ ...s, shifts: s.shifts.map((sh) => (sh.id === id ? { ...sh, ...patch } : sh)) }))
  },

  removeShift(id: string) {
    update((s) => {
      const assignments: Assignments = {}
      for (const [key, ids] of Object.entries(s.assignments)) {
        if (key.slice(key.indexOf('__') + 2) !== id) assignments[key] = ids
      }
      return { ...s, shifts: s.shifts.filter((sh) => sh.id !== id), assignments }
    })
  },

  replaceStaffList(list: Staff[]) {
    update((s) => ({ ...s, staff: list }))
  },

  resetAll() {
    update(() => defaultState())
  },
}
