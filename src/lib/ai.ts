import Anthropic from '@anthropic-ai/sdk'

/**
 * ผู้ช่วย AI แบบเลือกผู้ให้บริการได้ (Claude / OpenAI / Google Gemini)
 *
 * เว็บนี้เป็น static (GitHub Pages) จึงเรียก AI จากเบราว์เซอร์โดยตรง ด้วย
 * API key ที่ผู้ใช้ใส่เอง เก็บแยกตามผู้ให้บริการใน localStorage — เหมาะกับ
 * การสาธิต หากนำไปใช้จริงควรย้ายการเรียกไปฝั่งเซิร์ฟเวอร์เพื่อไม่ให้ key รั่ว
 */

export type AiProvider = 'claude' | 'openai' | 'gemini'

export const providers: AiProvider[] = ['claude', 'openai', 'gemini']

export const providerLabel: Record<AiProvider, string> = {
  claude: 'Claude (Anthropic)',
  openai: 'OpenAI (ChatGPT)',
  gemini: 'Google Gemini',
}

export const providerKeyHint: Record<AiProvider, string> = {
  claude: 'sk-ant-… (ขอที่ console.anthropic.com)',
  openai: 'sk-… (ขอที่ platform.openai.com)',
  gemini: 'AIza… (ขอที่ aistudio.google.com)',
}

export const defaultModel: Record<AiProvider, string> = {
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
  return (providers as string[]).includes(p) ? (p as AiProvider) : 'claude'
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

export const hasApiKey = (p: AiProvider = getProvider()) => getApiKey(p).trim().length > 0

const SYSTEM = `คุณเป็นผู้เชี่ยวชาญด้านการจัดทำเอกสารคุณภาพโรงพยาบาลตามมาตรฐาน HA
และคู่มือ QM-QMR-001 "การจัดทำและควบคุมเอกสารคุณภาพ"
เขียนภาษาไทยราชการที่กระชับ ชัดเจน เป็นทางการ ใช้ถ้อยคำเชิงปฏิบัติ
ตอบเฉพาะเนื้อหาของหัวข้อที่ขอ ไม่ต้องใส่หัวข้อซ้ำ ไม่ต้องมีคำนำหรือคำลงท้าย
ถ้าเป็นรายการให้ขึ้นบรรทัดใหม่ทีละข้อ (ไม่ต้องใส่เลขหรือ bullet)`

/** เรียกโมเดลตามผู้ให้บริการที่เลือก แล้วคืนข้อความล้วน */
async function complete(user: string, maxTokens: number): Promise<string> {
  const provider = getProvider()
  const key = getApiKey(provider).trim()
  if (!key) throw new Error(`ยังไม่ได้ตั้งค่า API key ของ ${providerLabel[provider]}`)
  const model = getModel(provider)

  if (provider === 'claude') return completeClaude(key, model, user, maxTokens)
  if (provider === 'openai') return completeOpenAI(key, model, user, maxTokens)
  return completeGemini(key, model, user, maxTokens)
}

async function completeClaude(key: string, model: string, user: string, maxTokens: number): Promise<string> {
  const client = new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true })
  try {
    const msg = await client.messages.create({
      model, max_tokens: maxTokens, system: SYSTEM,
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

async function completeOpenAI(key: string, model: string, user: string, maxTokens: number): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model, max_tokens: maxTokens,
      messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: user }],
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`OpenAI ผิดพลาด (${res.status}) — ${data?.error?.message ?? 'ตรวจสอบ key/โมเดล'}`)
  return (data?.choices?.[0]?.message?.content ?? '').trim()
}

async function completeGemini(key: string, model: string, user: string, maxTokens: number): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
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

/** เสนอขั้นตอนสำหรับสร้างแผนผัง flowchart จากชื่อกระบวนการ */
export async function aiSuggestFlow(processTitle: string): Promise<string[]> {
  const text = await complete(
    `เสนอขั้นตอนการปฏิบัติงานของกระบวนการ "${processTitle}" เป็นลำดับขั้น
ตอบเป็นรายการขั้นตอนสั้นๆ บรรทัดละ 1 ขั้น (5-8 ขั้น) ไม่ต้องใส่เลขลำดับ`,
    1000,
  )
  return text
    .split('\n')
    .map((l) => l.replace(/^[\d.\-*)\s]+/, '').trim())
    .filter(Boolean)
    .slice(0, 10)
}
