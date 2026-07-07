import type { Assignments, Shift, Staff } from '../types'
import { cellKey } from '../types'
import { fromISODate, weekdayNamesTh } from './date'

/**
 * ผู้ช่วย AI จัดเวร ด้วย Google Gemini (@google/genai)
 *
 * เว็บนี้เป็น static จึงเรียก AI จากเบราว์เซอร์โดยตรงด้วย API key ที่ผู้ใช้ใส่เอง
 * (เก็บใน localStorage) — เหมาะกับการสาธิต หากใช้จริงควรพร็อกซีผ่านเซิร์ฟเวอร์
 * โหลด SDK แบบ dynamic import เพื่อไม่ให้ก้อนหลักใหญ่เกินจำเป็น
 */

const KEY_STORE = 'schedule_gemini_key'
const MODEL = 'gemini-2.0-flash'

export const getGeminiKey = () => {
  try { return localStorage.getItem(KEY_STORE) ?? '' } catch { return '' }
}
export const setGeminiKey = (k: string) => {
  try { k ? localStorage.setItem(KEY_STORE, k.trim()) : localStorage.removeItem(KEY_STORE) } catch { /* ignore */ }
}
export const geminiReady = () => Boolean(getGeminiKey())

export interface AiRosterResult {
  assignments: Assignments
  notes: string
}

function buildPrompt(params: {
  dates: string[]
  shifts: Shift[]
  staff: Staff[]
  existing: Assignments
  instruction: string
}): string {
  const { dates, shifts, staff, existing, instruction } = params
  const staffLines = staff.map((s) =>
    `- id=${s.id} | ${s.name} (${s.role}) | เวรสูงสุด/สัปดาห์=${s.maxPerWeek} | ${s.active ? 'พร้อมทำงาน' : 'ปิดใช้งาน(ห้ามจัด)'} | วันที่ลา=${s.unavailableWeekdays.map((d) => weekdayNamesTh[d]).join(',') || 'ไม่มี'}`,
  ).join('\n')
  const shiftLines = shifts.map((s) => `- id=${s.id} | ${s.name} ${s.start}-${s.end} | ต้องการ ${s.required} คน`).join('\n')
  const dateLines = dates.map((d) => `- ${d} (${weekdayNamesTh[fromISODate(d).getDay()]})`).join('\n')
  const existingLines = Object.entries(existing)
    .filter(([k]) => dates.some((d) => k.startsWith(d + '__')))
    .map(([k, ids]) => `- ${k}: ${ids.join(',')}`)
    .join('\n') || '(ยังไม่มี)'

  return [
    'คุณเป็นหัวหน้าเวรที่จัดตารางเวรบุคลากรโรงพยาบาลให้เป็นธรรมและครบตามต้องการ',
    '',
    'บุคลากร:', staffLines,
    '', 'ช่วงเวร:', shiftLines,
    '', 'วันที่ต้องจัด:', dateLines,
    '', 'เวรที่จัดไว้แล้ว (คงไว้ได้ถ้าเหมาะสม):', existingLines,
    '', 'คำสั่งเพิ่มเติมจากผู้ใช้:', instruction || '(ไม่มี — จัดให้ครบและเป็นธรรม)',
    '',
    'กติกาที่ต้องเคารพ:',
    '1) ห้ามจัดคนที่ปิดใช้งาน  2) ห้ามจัดคนในวันที่เขาลา  3) 1 คนได้ไม่เกิน 1 เวรต่อวัน',
    '4) ห้ามเกินเวรสูงสุดต่อสัปดาห์ของแต่ละคน  5) กระจายจำนวนเวรให้ใกล้เคียงกัน',
    '6) พยายามให้ครบตามจำนวนที่ต้องการของแต่ละเวร',
    '',
    'ตอบกลับเป็น JSON เท่านั้น รูปแบบ:',
    '{ "assignments": { "<date>__<shiftId>": ["<staffId>", ...] }, "notes": "สรุปสั้น ๆ ภาษาไทย" }',
    'ใช้ค่า date และ shiftId ตามที่ให้ไว้เท่านั้น และใช้ staffId จริงเท่านั้น',
  ].join('\n')
}

/** ดึง JSON ออกจากข้อความ (เผื่อโมเดลใส่ ```json หรือข้อความห่อ) */
function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const body = fenced ? fenced[1] : text
  const start = body.indexOf('{')
  const end = body.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('ไม่พบ JSON ในคำตอบของ AI')
  return JSON.parse(body.slice(start, end + 1))
}

export async function aiGenerateRoster(params: {
  dates: string[]
  shifts: Shift[]
  staff: Staff[]
  existing: Assignments
  instruction: string
}): Promise<AiRosterResult> {
  const apiKey = getGeminiKey()
  if (!apiKey) throw new Error('ยังไม่ได้ตั้งค่า Gemini API key')

  const { GoogleGenAI } = await import('@google/genai')
  const ai = new GoogleGenAI({ apiKey })
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: buildPrompt(params),
    config: { responseMimeType: 'application/json', temperature: 0.4 },
  })

  const text = response.text ?? ''
  const raw = extractJson(text) as { assignments?: Record<string, unknown>; notes?: unknown }

  // ตรวจสอบความถูกต้องก่อนนำไปใช้: date/shift/staff ต้องมีจริง
  const validDates = new Set(params.dates)
  const validShifts = new Set(params.shifts.map((s) => s.id))
  const validStaff = new Set(params.staff.map((s) => s.id))
  const clean: Assignments = {}

  for (const [key, value] of Object.entries(raw.assignments ?? {})) {
    const sep = key.indexOf('__')
    if (sep === -1) continue
    const date = key.slice(0, sep)
    const shiftId = key.slice(sep + 2)
    if (!validDates.has(date) || !validShifts.has(shiftId)) continue
    const ids = (Array.isArray(value) ? value : [])
      .map(String)
      .filter((id) => validStaff.has(id))
    if (ids.length) clean[cellKey(date, shiftId)] = [...new Set(ids)]
  }

  return { assignments: clean, notes: typeof raw.notes === 'string' ? raw.notes : '' }
}
