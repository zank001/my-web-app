import Anthropic from '@anthropic-ai/sdk'

/**
 * ผู้ช่วย AI แบบเลือกผู้ให้บริการได้ (ฟรีไม่ต้องมี key / Claude / OpenAI / Gemini)
 *
 * เว็บนี้เป็น static (GitHub Pages) จึงเรียก AI จากเบราว์เซอร์โดยตรง
 * - "ฟรี" ใช้บริการสาธารณะ Pollinations.ai ไม่ต้องสมัคร/ไม่ต้องมี key ใช้ได้ทันที
 *   (เหมาะกับงานทั่วไป ช่วงหนาแน่นอาจช้า)
 * - เจ้าอื่นใช้ API key ที่ผู้ใช้ใส่เอง เก็บแยกตามผู้ให้บริการใน localStorage —
 *   เหมาะกับการสาธิต หากนำไปใช้จริงควรย้ายการเรียกไปฝั่งเซิร์ฟเวอร์เพื่อไม่ให้ key รั่ว
 */

export type AiProvider = 'free' | 'claude' | 'openai' | 'gemini'

export const providers: AiProvider[] = ['free', 'claude', 'openai', 'gemini']

export const providerLabel: Record<AiProvider, string> = {
  free: 'ฟรี — Pollinations (ไม่ต้องมี key)',
  claude: 'Claude (Anthropic)',
  openai: 'OpenAI (ChatGPT)',
  gemini: 'Google Gemini (มี key ฟรี)',
}

export const providerKeyHint: Record<AiProvider, string> = {
  free: 'ไม่ต้องใช้ API key — ใช้ได้ทันที',
  claude: 'sk-ant-… (ขอที่ console.anthropic.com)',
  openai: 'sk-… (ขอที่ platform.openai.com)',
  gemini: 'AIza… (ขอฟรีที่ aistudio.google.com)',
}

export const defaultModel: Record<AiProvider, string> = {
  free: 'openai',
  claude: 'claude-opus-4-8',
  openai: 'gpt-4o',
  gemini: 'gemini-2.0-flash',
}

const PROVIDER_KEY = 'qmr_ai_provider'
const keyStore = (p: AiProvider) => `qmr_ai_key_${p}`
const modelStore = (p: AiProvider) => `qmr_ai_model_${p}`

const ls = {
  get(k: string) { try { return localStorage.getItem(k) ?? '' } catch { return '' } },
  set(k: string, v: string) { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k) } catch { /* ignore */ } },
}

export const getProvider = (): AiProvider => {
  const p = ls.get(PROVIDER_KEY)
  // ค่าเริ่มต้นคือแบบฟรี — ใช้ AI ได้ทันทีโดยไม่ต้องตั้งค่าอะไร
  return (providers as string[]).includes(p) ? (p as AiProvider) : 'free'
}
export const setProvider = (p: AiProvider) => ls.set(PROVIDER_KEY, p)

export const getApiKey = (p: AiProvider = getProvider()) => {
  const v = ls.get(keyStore(p))
  // ย้าย key เดิม (เวอร์ชันก่อนที่รองรับเฉพาะ Claude) มาให้อัตโนมัติ
  if (!v && p === 'claude') return ls.get('qmr_anthropic_key')
  return v
}
export const setApiKey = (p: AiProvider, key: string) => ls.set(keyStore(p), key.trim())

export const getModel = (p: AiProvider = getProvider()) => ls.get(modelStore(p)) || defaultModel[p]
export const setModel = (p: AiProvider, model: string) => {
  ls.set(modelStore(p), model.trim() === defaultModel[p] ? '' : model.trim())
}

export const hasApiKey = (p: AiProvider = getProvider()) =>
  p === 'free' || getApiKey(p).trim().length > 0

const SYSTEM = `คุณเป็นผู้เชี่ยวชาญด้านการจัดทำเอกสารคุณภาพโรงพยาบาลตามมาตรฐาน HA
และคู่มือ QM-QMR-001 "การจัดทำและควบคุมเอกสารคุณภาพ"
เขียนภาษาไทยราชการที่กระชับ ชัดเจน เป็นทางการ ใช้ถ้อยคำเชิงปฏิบัติ
ตอบเฉพาะเนื้อหาของหัวข้อที่ขอ ไม่ต้องใส่หัวข้อซ้ำ ไม่ต้องมีคำนำหรือคำลงท้าย
ถ้าเป็นรายการให้ขึ้นบรรทัดใหม่ทีละข้อ (ไม่ต้องใส่เลขหรือ bullet)`

/** เรียกโมเดลตามผู้ให้บริการที่เลือก แล้วคืนข้อความล้วน (กำหนด system prompt เองได้) */
export async function complete(user: string, maxTokens: number, system: string = SYSTEM): Promise<string> {
  const provider = getProvider()
  const model = getModel(provider)
  if (provider === 'free') return completeFree(model, user, maxTokens, system)

  const key = getApiKey(provider).trim()
  if (!key) throw new Error(`ยังไม่ได้ตั้งค่า API key ของ ${providerLabel[provider]}`)

  if (provider === 'claude') return completeClaude(key, model, user, maxTokens, system)
  if (provider === 'openai') return completeOpenAI(key, model, user, maxTokens, system)
  return completeGemini(key, model, user, maxTokens, system)
}

/**
 * แบบฟรี — Pollinations.ai (บริการสาธารณะ ไม่ต้องมี key)
 * ลองแบบ OpenAI-compatible ก่อน ถ้าไม่สำเร็จถอยไปใช้ endpoint ข้อความล้วน
 */
const FREE_REFERRER = 'qmr-paihospital'

async function completeFree(model: string, user: string, maxTokens: number, system: string): Promise<string> {
  try {
    const res = await fetch('https://text.pollinations.ai/openai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model, max_tokens: maxTokens, referrer: FREE_REFERRER,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      }),
    })
    if (res.ok) {
      const data = await res.json().catch(() => null)
      const txt = data?.choices?.[0]?.message?.content
      if (typeof txt === 'string' && txt.trim()) return txt.trim()
    }
  } catch { /* ลองช่องทางสำรองต่อ */ }

  const url = `https://text.pollinations.ai/${encodeURIComponent(user.slice(0, 6000))}` +
    `?model=${encodeURIComponent(model)}&system=${encodeURIComponent(system.slice(0, 1500))}&referrer=${FREE_REFERRER}`
  let res2: Response
  try {
    res2 = await fetch(url)
  } catch {
    throw new Error('เชื่อมต่อ AI ฟรีไม่ได้ — ตรวจสอบอินเทอร์เน็ต หรือสลับไปผู้ให้บริการอื่นในตั้งค่า AI')
  }
  if (!res2.ok) throw new Error(`AI ฟรีไม่ตอบสนอง (${res2.status}) — บริการสาธารณะอาจหนาแน่น ลองใหม่อีกครั้ง หรือสลับไป Gemini (ขอ key ฟรีที่ aistudio.google.com)`)
  const txt = (await res2.text()).trim()
  if (!txt) throw new Error('AI ฟรีตอบกลับว่าง ลองกดใหม่อีกครั้ง')
  return txt
}

async function completeClaude(key: string, model: string, user: string, maxTokens: number, system: string): Promise<string> {
  const client = new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true })
  try {
    const msg = await client.messages.create({
      model, max_tokens: maxTokens, system,
      messages: [{ role: 'user', content: user }],
    })
    return msg.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map((b) => b.text).join('\n').trim()
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) throw new Error('Claude API key ไม่ถูกต้อง')
    if (e instanceof Anthropic.RateLimitError) throw new Error('Claude: เรียกถี่เกินไป ลองใหม่อีกครั้ง')
    if (e instanceof Anthropic.APIError) throw new Error(`Claude ผิดพลาด (${e.status ?? ''}) — ${e.message}`)
    throw e instanceof Error ? e : new Error('Claude ผิดพลาด')
  }
}

async function completeOpenAI(key: string, model: string, user: string, maxTokens: number, system: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model, max_tokens: maxTokens,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`OpenAI ผิดพลาด (${res.status}) — ${data?.error?.message ?? 'ตรวจสอบ key/โมเดล'}`)
  return (data?.choices?.[0]?.message?.content ?? '').trim()
}

async function completeGemini(key: string, model: string, user: string, maxTokens: number, system: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: { maxOutputTokens: maxTokens },
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`Gemini ผิดพลาด (${res.status}) — ${data?.error?.message ?? 'ตรวจสอบ key/โมเดล'}`)
  const parts = data?.candidates?.[0]?.content?.parts ?? []
  return parts.map((p: { text?: string }) => p.text ?? '').join('').trim()
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
  const task = ctx.current?.trim()
    ? `ปรับปรุงข้อความหัวข้อ "${ctx.sectionLabel}" ต่อไปนี้ให้เป็นทางการ กระชับ และครบถ้วนขึ้น:\n\n${ctx.current}`
    : `ช่วยร่างเนื้อหาหัวข้อ "${ctx.sectionLabel}" ของเอกสารระดับ ${ctx.level} เรื่อง "${ctx.title}" ของหน่วยงาน ${ctx.deptName}`
  const text = await complete(`คำแนะนำของหัวข้อนี้: ${ctx.sectionHint}\n\n${task}`, 3000)
  if (!text) throw new Error('AI ไม่ได้ส่งข้อความกลับมา')
  return text
}

export interface AiFlowStep {
  text: string
  kind: 'start' | 'process' | 'decision' | 'end'
  /** ดัชนี (0-based) ของขั้นที่วนกลับไปเมื่อผลตัดสินใจไม่ผ่าน */
  loopToIndex?: number
}

/** เสนอแผนผัง flowchart แบบมีโครงสร้าง (ขั้นตอน/จุดตัดสินใจ/เส้นวนกลับ) */
export async function aiSuggestFlow(processTitle: string, procedureText?: string): Promise<AiFlowStep[]> {
  const ctx = procedureText?.trim()
    ? `\n\nรายละเอียดขั้นตอนที่ผู้ใช้ร่างไว้ (ใช้เป็นข้อมูลประกอบ):\n${procedureText.slice(0, 2000)}`
    : ''
  const text = await complete(
    `ออกแบบ Flow chart การดำเนินงานของกระบวนการ "${processTitle}" สำหรับเอกสารคุณภาพโรงพยาบาล${ctx}

ตอบเป็น JSON array เท่านั้น (ไม่มีข้อความอื่น) รูปแบบ:
[{"text":"...","kind":"start|process|decision|end","loopToIndex":0}]
กติกา:
- ขั้นแรก kind="start" ขั้นสุดท้าย kind="end" (ข้อความสั้นๆ เช่น ชื่อจุดเริ่ม/สิ้นสุดของงาน)
- รวม 6-10 ขั้น ข้อความแต่ละขั้นสั้น กระชับ (ไม่เกิน ~45 อักษร)
- จุดที่ต้องตรวจสอบ/อนุมัติ ให้ใช้ kind="decision" ข้อความสั้นมาก (เช่น "อนุมัติ", "ผ่านการตรวจสอบ")
- decision ใส่ "loopToIndex" เป็นดัชนีของขั้นก่อนหน้าที่ต้องวนกลับไปเมื่อไม่ผ่าน (0-based)`,
    1500,
  )

  // พยายามอ่าน JSON (ตัด code fence ถ้ามี) — ถ้าไม่ได้ ถอยไปอ่านเป็นบรรทัดละขั้น
  const jsonText = text.replace(/^```(?:json)?/m, '').replace(/```\s*$/m, '').trim()
  const start = jsonText.indexOf('[')
  const end = jsonText.lastIndexOf(']')
  if (start >= 0 && end > start) {
    try {
      const arr = JSON.parse(jsonText.slice(start, end + 1)) as Array<Record<string, unknown>>
      const kinds = ['start', 'process', 'decision', 'end']
      const steps = arr
        .filter((s) => typeof s?.text === 'string' && (s.text as string).trim())
        .map((s): AiFlowStep => ({
          text: (s.text as string).trim(),
          kind: kinds.includes(s.kind as string) ? (s.kind as AiFlowStep['kind']) : 'process',
          loopToIndex: typeof s.loopToIndex === 'number' && s.loopToIndex >= 0 ? s.loopToIndex : undefined,
        }))
        .slice(0, 12)
      if (steps.length >= 2) return steps
    } catch { /* ตกไปใช้แบบบรรทัด */ }
  }
  const lines = text.split('\n').map((l) => l.replace(/^[\d.\-*)\s]+/, '').trim()).filter(Boolean).slice(0, 10)
  if (!lines.length) throw new Error('AI ไม่ได้ส่งขั้นตอนกลับมา')
  return [
    { text: 'เริ่มต้น', kind: 'start' },
    ...lines.map((t): AiFlowStep => ({ text: t, kind: 'process' })),
    { text: 'สิ้นสุด', kind: 'end' },
  ]
}
