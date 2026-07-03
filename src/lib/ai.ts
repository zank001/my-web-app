import { GoogleGenAI } from '@google/genai'

/**
 * ผู้ช่วย AI สำหรับร่าง/ปรับข้อความเอกสารคุณภาพ
 *
 * เว็บนี้เป็น static (GitHub Pages) จึงเรียก Gemini จากเบราว์เซอร์โดยตรง
 * ด้วย API key ที่ผู้ใช้ใส่เอง (เก็บใน localStorage) — เหมาะกับการสาธิต
 * หากนำไปใช้จริงควรย้ายการเรียกไปไว้ที่เซิร์ฟเวอร์ (เช่น Express /api/ai)
 * เพื่อไม่ให้ key รั่ว
 */
const KEY = 'qmr_gemini_key'
const MODEL = 'gemini-2.5-flash'

export const getApiKey = () => {
  try { return localStorage.getItem(KEY) ?? '' } catch { return '' }
}
export const setApiKey = (k: string) => {
  try { k ? localStorage.setItem(KEY, k) : localStorage.removeItem(KEY) } catch { /* ignore */ }
}
export const hasApiKey = () => getApiKey().trim().length > 0

const SYSTEM = `คุณเป็นผู้เชี่ยวชาญด้านการจัดทำเอกสารคุณภาพโรงพยาบาลตามมาตรฐาน HA
และคู่มือ QM-QMR-001 "การจัดทำและควบคุมเอกสารคุณภาพ"
เขียนภาษาไทยราชการที่กระชับ ชัดเจน เป็นทางการ ใช้ถ้อยคำเชิงปฏิบัติ
ตอบเฉพาะเนื้อหาของหัวข้อที่ขอ ไม่ต้องใส่หัวข้อซ้ำ ไม่ต้องมีคำนำหรือคำลงท้าย
ถ้าเป็นรายการให้ขึ้นบรรทัดใหม่ทีละข้อ (ไม่ต้องใส่เลขหรือ bullet)`

export interface SectionCtx {
  level: string
  title: string
  deptName: string
  sectionLabel: string
  sectionHint: string
  current?: string
}

/** ร่างหรือปรับเนื้อหาของหัวข้อหนึ่งในเอกสาร */
export async function aiDraftSection(ctx: SectionCtx): Promise<string> {
  const apiKey = getApiKey().trim()
  if (!apiKey) throw new Error('ยังไม่ได้ตั้งค่า Gemini API key')

  const ai = new GoogleGenAI({ apiKey })
  const task = ctx.current?.trim()
    ? `ปรับปรุงข้อความหัวข้อ "${ctx.sectionLabel}" ต่อไปนี้ให้เป็นทางการ กระชับ และครบถ้วนขึ้น:\n\n${ctx.current}`
    : `ช่วยร่างเนื้อหาหัวข้อ "${ctx.sectionLabel}" ของเอกสารระดับ ${ctx.level} เรื่อง "${ctx.title}" ของหน่วยงาน ${ctx.deptName}`

  const prompt = `${SYSTEM}

คำแนะนำของหัวข้อนี้: ${ctx.sectionHint}

${task}`

  const res = await ai.models.generateContent({ model: MODEL, contents: prompt })
  const text = (res.text ?? '').trim()
  if (!text) throw new Error('AI ไม่ได้ส่งข้อความกลับมา')
  return text
}

/** เสนอขั้นตอนสำหรับสร้างแผนผัง flowchart จากชื่อกระบวนการ */
export async function aiSuggestFlow(processTitle: string): Promise<string[]> {
  const apiKey = getApiKey().trim()
  if (!apiKey) throw new Error('ยังไม่ได้ตั้งค่า Gemini API key')
  const ai = new GoogleGenAI({ apiKey })
  const prompt = `${SYSTEM}

เสนอขั้นตอนการปฏิบัติงานของกระบวนการ "${processTitle}" เป็นลำดับขั้น
ตอบเป็นรายการขั้นตอนสั้นๆ บรรทัดละ 1 ขั้น (5-8 ขั้น) ไม่ต้องใส่เลขลำดับ`
  const res = await ai.models.generateContent({ model: MODEL, contents: prompt })
  return (res.text ?? '')
    .split('\n')
    .map((l) => l.replace(/^[\d.\-*)\s]+/, '').trim())
    .filter(Boolean)
    .slice(0, 10)
}
