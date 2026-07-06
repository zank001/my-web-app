import { complete } from './ai'

/**
 * ผู้ช่วย AI ด้านข้อมูลยา (Drug Information Assistant)
 *
 * เรียกผ่านผู้ให้บริการ AI ที่ผู้ใช้ตั้งค่าไว้ (Claude / OpenAI / Gemini) เช่นเดียว
 * กับสตูดิโอร่างเอกสาร ผลลัพธ์ทุกอย่างเป็น "ข้อมูลอ้างอิงเบื้องต้น" เท่านั้น —
 * ต้องให้เภสัชกรตรวจทานกับเอกสารกำกับยาหรือแหล่งอ้างอิงมาตรฐาน
 * ก่อนนำไปใช้กับผู้ป่วยจริงเสมอ
 */

const DRUG_SYSTEM = `คุณเป็นเภสัชกรโรงพยาบาลที่ให้ข้อมูลยาเชิงวิชาการแก่บุคลากรทางการแพทย์
ตอบเป็นภาษาไทย (คงชื่อยา ชื่อสามัญ และศัพท์เทคนิคเป็นภาษาอังกฤษได้) กระชับ ถูกต้องตามหลักเภสัชวิทยา
ให้ข้อมูลอ้างอิงทั่วไปตามแนวปฏิบัติมาตรฐาน ไม่ใช่คำสั่งการรักษาเฉพาะราย
หากไม่รู้จักยา ไม่แน่ใจ หรือชื่อยากำกวม ให้ระบุตรงๆ ว่าไม่แน่ใจ ห้ามเดาหรือแต่งข้อมูลเด็ดขาด`

/* ---------- ตัวช่วยแปลงคำตอบ ---------- */

/** ดึง JSON ก้อนแรกออกจากข้อความ (เผื่อโมเดลใส่ code fence หรือคำอธิบายแทรกมา) */
function extractJson<T>(text: string): T {
  const cleaned = text.replace(/```(?:json)?/gi, '')
  const start = cleaned.search(/[[{]/)
  const end = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'))
  if (start === -1 || end <= start) throw new Error('AI ไม่ได้ตอบกลับเป็นข้อมูลที่อ่านได้ ลองกดใหม่อีกครั้ง')
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as T
  } catch {
    throw new Error('อ่านคำตอบของ AI ไม่สำเร็จ ลองกดใหม่อีกครั้ง')
  }
}

const asText = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')

const asList = (v: unknown): string[] => {
  if (Array.isArray(v)) return v.map((x) => asText(x) || asText((x as { text?: string })?.text)).filter(Boolean)
  const s = asText(v)
  return s ? s.split('\n').map((l) => l.replace(/^[-•*\s]+/, '').trim()).filter(Boolean) : []
}

/* ---------- 1) ข้อมูลยา (drug monograph) ---------- */

export interface DrugMonograph {
  genericName: string
  tradeNames: string[]
  drugClass: string
  indications: string[]
  dosage: string
  contraindications: string[]
  sideEffects: string[]
  precautions: string[]
  interactions: string[]
  pregnancy: string
  storage: string
  highAlert: boolean
  /** โมเดลไม่รู้จัก/ไม่แน่ใจว่าเป็นยาอะไร — ห้ามแสดงเป็นข้อมูลยา */
  unknown: boolean
  note: string
}

/** สรุปข้อมูลยาหนึ่งตัวแบบ monograph ย่อ */
export async function aiDrugMonograph(drugName: string): Promise<DrugMonograph> {
  const raw = await complete(
    `ให้ข้อมูลยา "${drugName}" ตอบเป็น JSON เพียงอย่างเดียว (ห้ามมีข้อความอื่นนอก JSON) ตามโครงนี้:
{
  "genericName": "ชื่อสามัญ (ภาษาอังกฤษ)",
  "tradeNames": ["ชื่อการค้าที่พบบ่อยในไทย 2-4 ชื่อ"],
  "drugClass": "กลุ่มยาและกลไกการออกฤทธิ์โดยย่อ",
  "indications": ["ข้อบ่งใช้หลัก"],
  "dosage": "ขนาดและวิธีใช้ทั่วไปในผู้ใหญ่ (และเด็กหากใช้บ่อย) แยกบรรทัดตามข้อบ่งใช้",
  "contraindications": ["ข้อห้ามใช้"],
  "sideEffects": ["อาการไม่พึงประสงค์ที่พบบ่อย และที่รุนแรงซึ่งต้องเฝ้าระวัง"],
  "precautions": ["ข้อควรระวัง เช่น การปรับขนาดในผู้ป่วยโรคตับ/ไต ผู้สูงอายุ"],
  "interactions": ["ยา/อาหารสำคัญที่เกิดปฏิกิริยาต่อกัน พร้อมผลโดยย่อ"],
  "pregnancy": "การใช้ในหญิงตั้งครรภ์และให้นมบุตรโดยย่อ",
  "storage": "การเก็บรักษา",
  "highAlert": true หรือ false (จัดเป็นยาความเสี่ยงสูง high-alert drug ในโรงพยาบาลหรือไม่),
  "unknown": ปกติเป็น false — ใส่ true เฉพาะเมื่อไม่รู้จักหรือไม่แน่ใจว่า "${drugName}" เป็นยาอะไร,
  "note": "หมายเหตุเพิ่มเติม หรือเหตุผลกรณี unknown เป็น true (ไม่มีให้ใส่ค่าว่าง)"
}`,
    3000,
    DRUG_SYSTEM,
  )
  const j = extractJson<Record<string, unknown>>(raw)
  return {
    genericName: asText(j.genericName) || drugName,
    tradeNames: asList(j.tradeNames),
    drugClass: asText(j.drugClass),
    indications: asList(j.indications),
    dosage: asText(j.dosage),
    contraindications: asList(j.contraindications),
    sideEffects: asList(j.sideEffects),
    precautions: asList(j.precautions),
    interactions: asList(j.interactions),
    pregnancy: asText(j.pregnancy),
    storage: asText(j.storage),
    highAlert: j.highAlert === true,
    unknown: j.unknown === true,
    note: asText(j.note),
  }
}

/* ---------- 2) ตรวจสอบปฏิกิริยาระหว่างยา (drug interactions) ---------- */

export type InteractionSeverity = 'major' | 'moderate' | 'minor'

export const severityLabel: Record<InteractionSeverity, string> = {
  major: 'รุนแรง',
  moderate: 'ปานกลาง',
  minor: 'เล็กน้อย',
}

export interface DrugInteraction {
  pair: [string, string]
  severity: InteractionSeverity
  effect: string
  advice: string
}

export interface InteractionReport {
  summary: string
  interactions: DrugInteraction[]
}

const asSeverity = (v: unknown): InteractionSeverity => {
  const s = asText(v).toLowerCase()
  if (s.includes('major') || s.includes('contraindicated') || s.includes('รุนแรง') || s.includes('ห้าม')) return 'major'
  if (s.includes('minor') || s.includes('เล็กน้อย')) return 'minor'
  return 'moderate'
}

/** วิเคราะห์ปฏิกิริยาระหว่างยาในรายการ (ตั้งแต่ 2 ตัวขึ้นไป) */
export async function aiDrugInteractions(drugs: string[]): Promise<InteractionReport> {
  const names = drugs.map((d) => d.trim()).filter(Boolean)
  if (names.length < 2) throw new Error('กรุณาระบุยาอย่างน้อย 2 รายการ')
  const raw = await complete(
    `ตรวจสอบปฏิกิริยาระหว่างยา (drug interaction) ของรายการยาต่อไปนี้ทุกคู่ที่มีนัยสำคัญทางคลินิก:
${names.map((n, i) => `${i + 1}. ${n}`).join('\n')}

ตอบเป็น JSON เพียงอย่างเดียว (ห้ามมีข้อความอื่นนอก JSON) ตามโครงนี้:
{
  "summary": "สรุปภาพรวมสั้นๆ 1-2 ประโยค",
  "interactions": [
    {
      "pair": ["ชื่อยา A", "ชื่อยา B"],
      "severity": "major" | "moderate" | "minor",
      "effect": "ผลที่เกิดขึ้นและกลไกโดยย่อ",
      "advice": "คำแนะนำการจัดการ เช่น หลีกเลี่ยง ปรับขนาด หรือเฝ้าระวังอะไร"
    }
  ]
}
คู่ที่ไม่มีปฏิกิริยาที่มีนัยสำคัญไม่ต้องใส่ ถ้าไม่พบเลยให้ interactions เป็น []
หากรายการใดไม่ใช่ชื่อยาที่รู้จัก ให้ระบุไว้ใน summary`,
    2500,
    DRUG_SYSTEM,
  )
  const j = extractJson<Record<string, unknown>>(raw)
  const items = Array.isArray(j.interactions) ? j.interactions : []
  return {
    summary: asText(j.summary),
    interactions: items.map((it) => {
      const o = (it ?? {}) as Record<string, unknown>
      const pair = asList(o.pair)
      return {
        pair: [pair[0] ?? '', pair[1] ?? ''] as [string, string],
        severity: asSeverity(o.severity),
        effect: asText(o.effect),
        advice: asText(o.advice),
      }
    }).filter((it) => it.pair[0] && it.effect),
  }
}

/* ---------- 3) ฉลากช่วย/คำแนะนำการใช้ยาสำหรับผู้ป่วย ---------- */

/** ร่างคำแนะนำการใช้ยาภาษาง่ายสำหรับพิมพ์แจกผู้ป่วย */
export async function aiPatientLeaflet(drugName: string, context?: string): Promise<string> {
  const extra = context?.trim() ? `\nข้อมูลเพิ่มเติมจากผู้สั่ง: ${context.trim()}` : ''
  const text = await complete(
    `ร่าง "คำแนะนำการใช้ยาสำหรับผู้ป่วย" ของยา "${drugName}" เป็นภาษาไทยที่ง่าย
อ่านเข้าใจได้ทันทีโดยประชาชนทั่วไป (หลีกเลี่ยงศัพท์แพทย์ หากจำเป็นให้อธิบายประกอบ)${extra}

ให้มีหัวข้อดังนี้ ขึ้นบรรทัดใหม่แต่ละหัวข้อ:
ยานี้คือยาอะไร ใช้ทำไม / วิธีใช้ยา / ถ้าลืมใช้ยาต้องทำอย่างไร /
ผลข้างเคียงที่พบบ่อย และอาการที่ต้องหยุดยาแล้วรีบพบแพทย์ /
ข้อควรระวัง อาหารหรือยาที่ควรหลีกเลี่ยง / การเก็บรักษา
ปิดท้ายด้วยข้อความให้ปรึกษาแพทย์หรือเภสัชกรเมื่อมีข้อสงสัย`,
    2000,
    DRUG_SYSTEM,
  )
  if (!text.trim()) throw new Error('AI ไม่ได้ส่งข้อความกลับมา')
  return text.trim()
}

/* ---------- 4) ถาม-ตอบเรื่องยา ---------- */

/** ตอบคำถามอิสระเกี่ยวกับยา เช่น การบริหารยา ความคงตัว การปรับขนาด */
export async function aiDrugQA(question: string): Promise<string> {
  const text = await complete(
    `คำถามเกี่ยวกับยาจากบุคลากรในโรงพยาบาล: ${question.trim()}

ตอบให้ตรงคำถาม กระชับ เป็นข้อๆ เมื่อเหมาะสม
หากคำถามเป็นการตัดสินใจรักษาเฉพาะราย ให้ตอบข้อมูลอ้างอิงทั่วไปและย้ำให้ปรึกษาแพทย์/เภสัชกรผู้ดูแล`,
    2000,
    DRUG_SYSTEM,
  )
  if (!text.trim()) throw new Error('AI ไม่ได้ส่งข้อความกลับมา')
  return text.trim()
}
