/**
 * อ่านตารางข้อมูลจากรูปภาพ (ภาพถ่าย/สกรีนช็อต) ด้วย AI vision
 * แปลงรูปเป็น JPEG ย่อขนาด → ส่งให้ผู้ให้บริการ AI ที่ตั้งค่าไว้ → ได้ TSV กลับมา
 */

import { completeVision, type VisionImage } from '../lib/ai'

const EXTRACT_SYSTEM = `You convert images of data tables into clean TSV (tab-separated values).
Rules:
- Output ONLY the table data. No explanations, no markdown, no code fences.
- First line = column headers exactly as shown in the image (keep Thai text as-is).
- One data row per line, columns separated by a single TAB character.
- Numbers: plain digits only — strip thousands separators and units (e.g. "1,234 บาท" → 1234).
- Unreadable or empty cells → a single dot "."
- If the image contains no data table, output exactly: NO_TABLE`

const EXTRACT_PROMPT =
  'Extract the data table from this image as TSV following the rules. Output the TSV only.'

/** ย่อรูปให้ด้านยาวสุดไม่เกิน maxSide แล้วเข้ารหัสเป็น JPEG base64 */
export async function fileToVisionImage(file: File, maxSide = 2000): Promise<VisionImage> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('เปิดไฟล์รูปไม่ได้ — รองรับ JPG, PNG, WebP'))
      el.src = url
    })
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
    const w = Math.max(1, Math.round(img.width * scale))
    const h = Math.max(1, Math.round(img.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('เบราว์เซอร์ไม่รองรับการแปลงรูป')
    // พื้นหลังขาวกัน PNG โปร่งใสกลายเป็นดำเมื่อแปลงเป็น JPEG
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(img, 0, 0, w, h)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
    return { mimeType: 'image/jpeg', base64: dataUrl.split(',')[1] }
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** ตัด code fence / คำอธิบายที่โมเดลอาจแถมมา ให้เหลือแต่ตาราง */
export function cleanTableText(raw: string): string {
  let t = raw.trim()
  const fence = t.match(/```[a-z]*\n([\s\S]*?)```/i)
  if (fence) t = fence[1]
  return t.trim()
}

/** อ่านตารางจากไฟล์รูป — คืนข้อความ TSV พร้อมวางในช่องข้อมูล */
export async function extractTableFromImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('ไฟล์ที่แนบไม่ใช่รูปภาพ')
  const image = await fileToVisionImage(file)
  const raw = await completeVision(EXTRACT_PROMPT, [image], 4000, EXTRACT_SYSTEM)
  const tsv = cleanTableText(raw)
  if (!tsv || /^NO_TABLE/i.test(tsv))
    throw new Error('AI ไม่พบตารางข้อมูลในรูป — ลองถ่าย/ครอบตัดให้เห็นตารางชัด ๆ ทั้งตาราง')
  return tsv
}
