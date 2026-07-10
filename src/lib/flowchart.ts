/**
 * ตัวสร้างแผนผัง flowchart สไตล์เอกสารคุณภาพราชการ — ไม่พึ่ง library ภายนอก
 *
 * รูปแบบแกะจาก Flow chart ในเอกสาร QM-QMR-001-1 ฉบับจริง:
 *  - ขาวดำล้วน เส้นบาง ตัวอักษรดำ พื้นขาว
 *  - เริ่มต้น/สิ้นสุด = วงรี · ขั้นตอน = สี่เหลี่ยม · ตัดสินใจ = สี่เหลี่ยมข้าวหลามตัด
 *  - เรียงกลางหน้าจากบนลงล่าง ลูกศรหัวทึบ
 *  - เส้นวนกลับ (เช่น ไม่อนุมัติ → กลับไปแก้ไข) เดินเส้นฉากอ้อมซ้าย/ขวาอัตโนมัติ
 */

export type NodeKind = 'start' | 'process' | 'decision' | 'end'

export interface FlowNode {
  id: string
  kind: NodeKind
  text: string
  /** id ของโหนดปลายทางของเส้นวนกลับ (ใช้กับ decision เช่น กรณี "ไม่ผ่าน") */
  loopTo?: string
}

export const kindLabel: Record<NodeKind, string> = {
  start: 'เริ่มต้น',
  process: 'ขั้นตอน',
  decision: 'ตัดสินใจ',
  end: 'สิ้นสุด',
}

const STROKE = '#000000'
const FONT_PX = 16
const LINE_H = 22
const VGAP = 42     // ระยะห่างแนวตั้งระหว่างโหนด (มีลูกศร)
const PAD = 18
const CH = 7.2      // ความกว้างเฉลี่ยต่ออักษรโดยประมาณ (สำรองเมื่อวัดจริงไม่ได้)
const CHAN_GAP = 30 // ระยะช่องเดินเส้นวนกลับข้างลำตัวผัง

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** วัดความกว้างข้อความด้วย canvas ให้ตรงกับฟอนต์ที่เบราว์เซอร์ใช้วาดจริง */
let measureCtx: CanvasRenderingContext2D | null = null
function textWidth(s: string): number {
  if (typeof document !== 'undefined') {
    if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d')
    if (measureCtx) {
      measureCtx.font = `${FONT_PX}px "TH Sarabun New", Sarabun, sans-serif`
      return measureCtx.measureText(s).width
    }
  }
  return s.length * CH
}

/** ตัดบรรทัดตามความกว้างจริง: แบ่งตามช่องว่าง และหั่นคำที่ยาวเกิน (ข้อความไทยมักไม่มีช่องว่าง) */
const wrap = (text: string, maxPx: number): string[] => {
  const lines: string[] = []
  let cur = ''
  const push = () => { if (cur) { lines.push(cur); cur = '' } }
  for (const w of text.split(/\s+/).filter(Boolean)) {
    const cand = cur ? cur + ' ' + w : w
    if (textWidth(cand) <= maxPx) { cur = cand; continue }
    // คำเดี่ยวที่ยาวเกินเล็กน้อยให้อยู่บรรทัดเดียว (กล่องขยายตาม) ดีกว่าหั่นเหลือเศษท้าย
    if (textWidth(w) <= maxPx * 1.3) { push(); cur = w; continue }
    push()
    let piece = ''
    for (const ch of w) {
      if (piece && textWidth(piece + ch) > maxPx) { lines.push(piece); piece = ch }
      else piece += ch
    }
    cur = piece
  }
  push()
  return lines.length ? lines : ['']
}

interface Laid {
  node: FlowNode
  lines: string[]
  cy: number
  w: number
  h: number
}

function measure(kind: NodeKind, text: string): { lines: string[]; w: number; h: number } {
  const maxPx = kind === 'decision' ? 150 : kind === 'process' ? 270 : 240
  const lines = wrap(text, maxPx)
  const tw = Math.max(...lines.map(textWidth))
  const th = lines.length * LINE_H
  if (kind === 'decision') return { lines, w: Math.max(150, tw * 1.9 + 34), h: th + 52 }
  if (kind === 'start' || kind === 'end') return { lines, w: Math.max(180, tw + 76), h: th + 34 }
  return { lines, w: Math.max(180, tw + 44), h: th + 22 }
}

/** สร้าง SVG string จากรายการโหนด (เรียงบนลงล่าง + เส้นวนกลับอัตโนมัติ) */
export function renderFlowSvg(nodes: FlowNode[]): { svg: string; width: number; height: number } {
  const laid: Laid[] = []
  let y = PAD
  let maxW = 0
  for (const node of nodes) {
    const { lines, w, h } = measure(node.kind, node.text || kindLabel[node.kind])
    laid.push({ node, lines, cy: y + h / 2, w, h })
    y += h + VGAP
    maxW = Math.max(maxW, w)
  }
  const height = Math.max(y - VGAP + PAD, PAD * 2 + 50)

  // จัดสรรช่องเดินเส้นวนกลับ: สลับ ขวา → ซ้าย → ขวา(ถัดออกไป) …
  const idOf = new Map(laid.map((l, i) => [l.node.id, i]))
  interface Loop { from: number; to: number; side: 1 | -1; lane: number }
  const loops: Loop[] = []
  let rightLanes = 0, leftLanes = 0
  for (let i = 0; i < laid.length; i++) {
    const lt = laid[i].node.loopTo
    if (!lt || !idOf.has(lt) || idOf.get(lt) === i) continue
    const side: 1 | -1 = (rightLanes + leftLanes) % 2 === 0 ? 1 : -1
    loops.push({ from: i, to: idOf.get(lt)!, side, lane: side === 1 ? rightLanes++ : leftLanes++ })
  }

  const spineHalf = maxW / 2
  const leftExtent = leftLanes ? spineHalf + CHAN_GAP * leftLanes + 8 : spineHalf
  const rightExtent = rightLanes ? spineHalf + CHAN_GAP * rightLanes + 8 : spineHalf
  const cx = PAD + leftExtent
  const width = PAD * 2 + leftExtent + rightExtent

  const parts: string[] = []
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="TH Sarabun New, Sarabun, sans-serif">`)
  parts.push(`<rect width="${width}" height="${height}" fill="#ffffff"/>`)
  parts.push(`<defs><marker id="arw" markerWidth="9" markerHeight="8" refX="7.5" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L8,3 L0,6 Z" fill="${STROKE}"/></marker></defs>`)

  // เส้นแกนกลาง (โหนดถัดไปตามลำดับ)
  for (let i = 0; i < laid.length - 1; i++) {
    const a = laid[i], b = laid[i + 1]
    parts.push(`<line x1="${cx}" y1="${a.cy + a.h / 2}" x2="${cx}" y2="${b.cy - b.h / 2 - 1.5}" stroke="${STROKE}" stroke-width="1.3" marker-end="url(#arw)"/>`)
  }

  // เส้นวนกลับ: ออกข้างข้าวหลามตัด → ช่องข้าง → แนวตั้ง → เข้าด้านข้างปลายทาง
  for (const lp of loops) {
    const a = laid[lp.from], b = laid[lp.to]
    const chanX = cx + lp.side * (spineHalf + CHAN_GAP * (lp.lane + 1))
    const exitX = cx + lp.side * (a.w / 2)
    const entryX = cx + lp.side * (b.w / 2)
    parts.push(`<polyline points="${exitX},${a.cy} ${chanX},${a.cy} ${chanX},${b.cy} ${entryX + lp.side * 2},${b.cy}" fill="none" stroke="${STROKE}" stroke-width="1.3" marker-end="url(#arw)"/>`)
  }

  // โหนด
  for (const { node, lines, cy, w, h } of laid) {
    if (node.kind === 'decision') {
      parts.push(`<polygon points="${cx},${cy - h / 2} ${cx + w / 2},${cy} ${cx},${cy + h / 2} ${cx - w / 2},${cy}" fill="#ffffff" stroke="${STROKE}" stroke-width="1.3"/>`)
    } else if (node.kind === 'start' || node.kind === 'end') {
      parts.push(`<ellipse cx="${cx}" cy="${cy}" rx="${w / 2}" ry="${h / 2}" fill="#ffffff" stroke="${STROKE}" stroke-width="1.3"/>`)
    } else {
      parts.push(`<rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" fill="#ffffff" stroke="${STROKE}" stroke-width="1.3"/>`)
    }
    const startY = cy - ((lines.length - 1) * LINE_H) / 2
    lines.forEach((ln, i) => {
      parts.push(`<text x="${cx}" y="${startY + i * LINE_H + 5.5}" text-anchor="middle" font-size="${FONT_PX}" fill="#000000">${esc(ln)}</text>`)
    })
  }

  parts.push(`</svg>`)
  return { svg: parts.join(''), width, height }
}

/** แปลง SVG → PNG (Uint8Array) สำหรับฝังในไฟล์ Word */
export async function svgToPng(svg: string, width: number, height: number, scale = 2): Promise<Uint8Array> {
  const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
  const img = new Image()
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('render svg failed'))
    img.src = url
  })
  const canvas = document.createElement('canvas')
  canvas.width = width * scale
  canvas.height = height * scale
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  const blob: Blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b!), 'image/png'))
  return new Uint8Array(await blob.arrayBuffer())
}
