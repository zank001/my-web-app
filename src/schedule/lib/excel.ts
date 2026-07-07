import type { Assignments, Shift, Staff } from '../types'
import { cellKey } from '../types'
import { formatDayLabel, formatWeekRange, shiftHours, weekdayNamesTh } from './date'
import { fromISODate } from './date'

// โหลด SheetJS แบบ dynamic import — ใช้เฉพาะตอนส่งออก/นำเข้า ไม่ถ่วงก้อนหลัก

/** ส่งออกตารางเวรของสัปดาห์เป็นไฟล์ Excel (.xlsx) — 2 ชีต: ตารางเวร + สรุปชั่วโมง */
export async function exportRosterXlsx(
  weekStart: string,
  dates: string[],
  shifts: Shift[],
  staff: Staff[],
  assignments: Assignments,
) {
  const XLSX = await import('xlsx')
  const nameOf = (id: string) => staff.find((s) => s.id === id)?.name ?? '—'
  const ordered = [...shifts].sort((a, b) => a.order - b.order)

  // ชีต 1: ตารางเวร (แถว = วัน, คอลัมน์ = เวร)
  const header = ['วันที่', ...ordered.map((sh) => `${sh.name} (${sh.start}-${sh.end})`)]
  const rows = dates.map((d) => {
    const day = fromISODate(d)
    const label = `${weekdayNamesTh[day.getDay()]} ${formatDayLabel(d)}`
    const cells = ordered.map((sh) => {
      const ids = assignments[cellKey(d, sh.id)] ?? []
      return ids.map(nameOf).join(', ')
    })
    return [label, ...cells]
  })
  const grid = XLSX.utils.aoa_to_sheet([[`ตารางเวร ${formatWeekRange(weekStart)}`], [], header, ...rows])
  grid['!cols'] = [{ wch: 22 }, ...ordered.map(() => ({ wch: 26 }))]

  // ชีต 2: สรุปจำนวนเวร/ชั่วโมงต่อคน
  const summaryHeader = ['บุคลากร', 'ตำแหน่ง', 'จำนวนเวร', 'ชั่วโมงรวม']
  const summaryRows = staff.map((s) => {
    let count = 0
    let hours = 0
    for (const d of dates) {
      for (const sh of ordered) {
        if ((assignments[cellKey(d, sh.id)] ?? []).includes(s.id)) {
          count += 1
          hours += shiftHours(sh.start, sh.end)
        }
      }
    }
    return [s.name, s.role, count, Math.round(hours * 10) / 10]
  })
  const summary = XLSX.utils.aoa_to_sheet([summaryHeader, ...summaryRows])
  summary['!cols'] = [{ wch: 22 }, { wch: 20 }, { wch: 10 }, { wch: 12 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, grid, 'ตารางเวร')
  XLSX.utils.book_append_sheet(wb, summary, 'สรุปชั่วโมง')
  XLSX.writeFile(wb, `ตารางเวร-${weekStart}.xlsx`)
}

const PALETTE = ['#2f8fff', '#16a34a', '#f59e0b', '#db2777', '#7c3aed', '#0891b2', '#dc2626', '#0d9488', '#9333ea', '#ea580c']

/**
 * นำเข้ารายชื่อบุคลากรจากไฟล์ Excel/CSV
 * รองรับหัวคอลัมน์ (ไทย/อังกฤษ): ชื่อ/name, ตำแหน่ง/role, เวรสูงสุด/max
 */
export async function importStaffXlsx(file: File): Promise<Omit<Staff, 'id'>[]> {
  const XLSX = await import('xlsx')
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })

  const pick = (row: Record<string, unknown>, keys: string[]) => {
    for (const k of Object.keys(row)) {
      const norm = k.trim().toLowerCase()
      if (keys.some((want) => norm === want || norm.includes(want))) return String(row[k]).trim()
    }
    return ''
  }

  const out: Omit<Staff, 'id'>[] = []
  json.forEach((row, i) => {
    const name = pick(row, ['ชื่อ', 'name', 'บุคลากร'])
    if (!name) return
    const role = pick(row, ['ตำแหน่ง', 'role', 'position']) || 'บุคลากร'
    const maxRaw = pick(row, ['สูงสุด', 'max', 'เวร'])
    const maxPerWeek = Math.max(1, Math.min(14, Number(maxRaw) || 5))
    out.push({
      name,
      role,
      color: PALETTE[i % PALETTE.length],
      maxPerWeek,
      unavailableWeekdays: [],
      active: true,
    })
  })
  return out
}
