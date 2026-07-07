import type { Assignments, Shift, Staff } from '../types'
import { cellKey } from '../types'
import { shiftHours } from './date'

export interface StaffLoad {
  staff: Staff
  count: number   // จำนวนเวรในสัปดาห์
  hours: number   // ชั่วโมงรวม
}

/** สรุปภาระเวรของบุคลากรแต่ละคนในช่วงวันที่กำหนด */
export function computeStaffLoads(
  dates: string[],
  shifts: Shift[],
  staff: Staff[],
  assignments: Assignments,
): StaffLoad[] {
  const hoursOf = new Map(shifts.map((s) => [s.id, shiftHours(s.start, s.end)]))
  return staff.map((s) => {
    let count = 0
    let hours = 0
    for (const d of dates) {
      for (const sh of shifts) {
        if ((assignments[cellKey(d, sh.id)] ?? []).includes(s.id)) {
          count += 1
          hours += hoursOf.get(sh.id) ?? 0
        }
      }
    }
    return { staff: s, count, hours: Math.round(hours * 10) / 10 }
  })
}

export interface Coverage {
  filled: number     // ช่องที่มีคนครบ
  understaffed: number // ช่องที่คนไม่ครบ (รวมว่างเปล่า)
  totalRequired: number
  totalAssigned: number
}

/** ความครบถ้วนของตารางในช่วงวันที่กำหนด */
export function computeCoverage(
  dates: string[],
  shifts: Shift[],
  assignments: Assignments,
): Coverage {
  let filled = 0
  let understaffed = 0
  let totalRequired = 0
  let totalAssigned = 0
  for (const d of dates) {
    for (const sh of shifts) {
      const have = (assignments[cellKey(d, sh.id)] ?? []).length
      totalRequired += sh.required
      totalAssigned += Math.min(have, sh.required)
      if (have >= sh.required) filled += 1
      else understaffed += 1
    }
  }
  return { filled, understaffed, totalRequired, totalAssigned }
}
