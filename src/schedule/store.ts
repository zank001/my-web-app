import type { AppSettings, Duty, Holiday, Staff } from './types'
import { defaultSettings, seedHolidays, seedStaff } from './seed'

// เก็บสถานะทั้งหมดของแอปจัดเวรไว้ใน localStorage (แยกจากระบบเอกสาร QMR)

const STORAGE_KEY = 'duty_roster_v1'

export interface RosterData {
  staff: Staff[]
  duties: Duty[]
  holidays: Holiday[]
  settings: AppSettings
}

export const initialData = (): RosterData => ({
  staff: seedStaff,
  duties: [],
  holidays: seedHolidays,
  settings: defaultSettings(),
})

/** เติมค่าที่ขาด (เช่น field ใหม่ในเวอร์ชันหลัง) ให้ settings เพื่อกันพัง */
const mergeSettings = (saved: Partial<AppSettings> | undefined): AppSettings => {
  const base = defaultSettings()
  if (!saved) return base
  return {
    hospitalInfo: { ...base.hospitalInfo, ...saved.hospitalInfo },
    appearance: { ...base.appearance, ...saved.appearance },
    signatures: { ...base.signatures, ...saved.signatures },
    shiftRates: { ...base.shiftRates, ...saved.shiftRates },
    shiftTimes: {
      morning: { ...base.shiftTimes.morning, ...saved.shiftTimes?.morning },
      afternoon: { ...base.shiftTimes.afternoon, ...saved.shiftTimes?.afternoon },
      oncall: { ...base.shiftTimes.oncall, ...saved.shiftTimes?.oncall },
      special: { ...base.shiftTimes.special, ...saved.shiftTimes?.special },
    },
    departments: saved.departments?.length ? saved.departments : base.departments,
  }
}

export const loadData = (): RosterData => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return initialData()
    const parsed = JSON.parse(raw) as Partial<RosterData>
    const base = initialData()
    return {
      staff: Array.isArray(parsed.staff) ? parsed.staff : base.staff,
      duties: Array.isArray(parsed.duties) ? parsed.duties : [],
      holidays: Array.isArray(parsed.holidays) ? parsed.holidays : base.holidays,
      settings: mergeSettings(parsed.settings),
    }
  } catch {
    return initialData()
  }
}

export const saveData = (data: RosterData) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    /* โควตาเต็ม/โหมดส่วนตัว — ข้ามการบันทึก */
  }
}

/** id ที่ไม่ซ้ำสำหรับ duty/staff ใหม่ (numeric-ish เพื่อให้ SummaryView เรียงได้) */
let counter = 0
export const genId = () => `${Date.now()}${String(counter++).padStart(3, '0')}`
