// ตัวช่วยจัดการวันที่ (โซนเวลาเครื่องผู้ใช้) สำหรับตารางเวรรายสัปดาห์

const pad = (n: number) => String(n).padStart(2, '0')

/** แปลง Date → ISO เฉพาะวัน (yyyy-mm-dd) แบบ local ไม่ใช่ UTC */
export const toISODate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** อ่าน yyyy-mm-dd กลับเป็น Date (เที่ยงคืน local) */
export const fromISODate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export const addDays = (iso: string, days: number) => {
  const d = fromISODate(iso)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

/** วันจันทร์ของสัปดาห์ที่ครอบวันนี้ (สัปดาห์เริ่มวันจันทร์) */
export const startOfWeek = (iso: string) => {
  const d = fromISODate(iso)
  const day = d.getDay()               // 0=อาทิตย์
  const diff = day === 0 ? -6 : 1 - day // เลื่อนไปวันจันทร์
  d.setDate(d.getDate() + diff)
  return toISODate(d)
}

/** 7 วันของสัปดาห์เริ่มจาก weekStart */
export const weekDates = (weekStart: string) =>
  Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

export const todayISO = () => toISODate(new Date())

/** ชื่อวันภาษาไทยเรียงตาม getDay() 0–6 */
export const weekdayNamesTh = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']
export const weekdayShortTh = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']

export const monthNamesTh = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
]

/** เช่น "จ. 7 ก.ค." */
export const formatDayLabel = (iso: string) => {
  const d = fromISODate(iso)
  return `${weekdayShortTh[d.getDay()]}. ${d.getDate()} ${monthNamesTh[d.getMonth()]}`
}

/** ช่วงสัปดาห์เป็นข้อความ เช่น "7 – 13 ก.ค. 2569" (พ.ศ.) */
export const formatWeekRange = (weekStart: string) => {
  const a = fromISODate(weekStart)
  const b = fromISODate(addDays(weekStart, 6))
  const be = a.getFullYear() + 543
  if (a.getMonth() === b.getMonth()) {
    return `${a.getDate()} – ${b.getDate()} ${monthNamesTh[b.getMonth()]} ${be}`
  }
  return `${a.getDate()} ${monthNamesTh[a.getMonth()]} – ${b.getDate()} ${monthNamesTh[b.getMonth()]} ${be}`
}

/** จำนวนชั่วโมงของช่วงเวร รองรับเวรข้ามเที่ยงคืน (เช่น 00:00–08:00, 16:00–24:00) */
export const shiftHours = (start: string, end: string) => {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  let mins = eh * 60 + em - (sh * 60 + sm)
  if (mins <= 0) mins += 24 * 60
  return Math.round((mins / 60) * 10) / 10
}

export const isWeekend = (iso: string) => {
  const day = fromISODate(iso).getDay()
  return day === 0 || day === 6
}
