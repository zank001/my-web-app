import Anthropic from '@anthropic-ai/sdk'

/**
 * ผู้ช่วย AI (Claude) สำหรับร่าง/ปรับข้อความเอกสารคุณภาพ
 *
 * เว็บนี้เป็น static (GitHub Pages) จึงเรียก Claude จากเบราว์เซอร์โดยตรง
 * ด้วย API key ที่ผู้ใช้ใส่เอง (เก็บใน localStorage) — เหมาะกับการสาธิต
 * หากนำไปใช้จริงควรย้ายการเรียกไปไว้ที่เซิร์ฟเวอร์ (เช่น Express /api/ai)
 * เพื่อไม่ให้ key รั่ว
 */
const KEY = 'qmr_anthropic_key'
const MODEL = 'claude-opus-4-8'

export const getApiKey = () => {
  try { return localStorage.getItem(KEY) ?? '' } catch { return '' }
}
export const setApiKey = (k: string) => {
  try { k ? localStorage.setItem(KEY, k) : localStorage.removeItem(KEY) } catch { /* ignore */ }
}
export const hasApiKey = () => getApiKey().trim().length > 0

const client = (apiKey: string) =>
  new Anthropic({ apiKey, dangerouslyAllowBrowser: true })

const SYSTEM = `คุณเป็นผู้เชี่ยวชาญด้านการจัดทำเอกสารคุณภาพโรงพยาบาลตามมาตรฐาน HA
และคู่มือ QM-QMR-001 "การจัดทำและควบคุมเอกสารคุณภาพ"
เขียนภาษาไทยราชการที่กระชับ ชัดเจน เป็นทางการ ใช้ถ้อยคำเชิงปฏิบัติ
ตอบเฉพาะเนื้อหาของหัวข้อที่ขอ ไม่ต้องใส่หัวข้อซ้ำ ไม่ต้องมีคำนำหรือคำลงท้าย
ถ้าเป็นรายการให้ขึ้นบรรทัดใหม่ทีละข้อ (ไม่ต้องใส่เลขหรือ bullet)`

/** ดึงเฉพาะข้อความจากบล็อกคำตอบของ Claude */
const textOf = (msg: Anthropic.Message) =>
  msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim()

/** แปลง error ของ SDK เป็นข้อความภาษาไทยที่อ่านง่าย */
const friendlyError = (e: unknown): Error => {
  if (e instanceof Anthropic.AuthenticationError) return new Error('API key ไม่ถูกต้อง กรุณาตรวจสอบใน "ตั้งค่า AI"')
  if (e instanceof Anthropic.RateLimitError) return new Error('เรียกใช้ถี่เกินไป กรุณาลองใหม่อีกครั้ง')
  if (e instanceof Anthropic.APIError) return new Error(`AI ผิดพลาด (${e.status ?? ''}) — ${e.message}`)
  return e instanceof Error ? e : new Error('AI ผิดพลาด')
}

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
  if (!apiKey) throw new Error('ยังไม่ได้ตั้งค่า Claude API key')

  const task = ctx.current?.trim()
    ? `ปรับปรุงข้อความหัวข้อ "${ctx.sectionLabel}" ต่อไปนี้ให้เป็นทางการ กระชับ และครบถ้วนขึ้น:\n\n${ctx.current}`
    : `ช่วยร่างเนื้อหาหัวข้อ "${ctx.sectionLabel}" ของเอกสารระดับ ${ctx.level} เรื่อง "${ctx.title}" ของหน่วยงาน ${ctx.deptName}`

  const prompt = `คำแนะนำของหัวข้อนี้: ${ctx.sectionHint}\n\n${task}`

  try {
    const msg = await client(apiKey).messages.create({
      model: MODEL,
      max_tokens: 3000,
      system: SYSTEM,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = textOf(msg)
    if (!text) throw new Error('AI ไม่ได้ส่งข้อความกลับมา')
    return text
  } catch (e) {
    throw friendlyError(e)
  }
}

/** เสนอขั้นตอนสำหรับสร้างแผนผัง flowchart จากชื่อกระบวนการ */
export async function aiSuggestFlow(processTitle: string): Promise<string[]> {
  const apiKey = getApiKey().trim()
  if (!apiKey) throw new Error('ยังไม่ได้ตั้งค่า Claude API key')

  const prompt = `เสนอขั้นตอนการปฏิบัติงานของกระบวนการ "${processTitle}" เป็นลำดับขั้น
ตอบเป็นรายการขั้นตอนสั้นๆ บรรทัดละ 1 ขั้น (5-8 ขั้น) ไม่ต้องใส่เลขลำดับ`

  try {
    const msg = await client(apiKey).messages.create({
      model: MODEL,
      max_tokens: 1000,
      system: SYSTEM,
      messages: [{ role: 'user', content: prompt }],
    })
    return textOf(msg)
      .split('\n')
      .map((l) => l.replace(/^[\d.\-*)\s]+/, '').trim())
      .filter(Boolean)
      .slice(0, 10)
  } catch (e) {
    throw friendlyError(e)
  }
}
