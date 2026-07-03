/** ตัวสร้างแผนผัง flowchart อย่างง่าย — ไม่พึ่ง library ภายนอก */

export type NodeKind = 'start' | 'process' | 'decision' | 'end'

export interface FlowNode {
  id: string
  kind: NodeKind
  text: string
}

export const kindLabel: Record<NodeKind, string> = {
  start: 'เริ่มต้น',
  process: 'ขั้นตอน',
  decision: 'ตัดสินใจ',
  end: 'สิ้นสุด',
}

const COLORS: Record<NodeKind, { fill: string; stroke: string }> = {
  start:    { fill: '#dcfce7', stroke: '#16a34a' },
  process:  { fill: '#eff6ff', stroke: '#2563eb' },
  decision: { fill: '#fef3c7', stroke: '#d97706' },
  end:      { fill: '#fee2e2', stroke: '#dc2626' },
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const wrap = (text: string, max: number): string[] => {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > max && cur) { lines.push(cur); cur = w }
    else cur = (cur + ' ' + w).trim()
  }
  if (cur) lines.push(cur)
  return lines.length ? lines : ['']
}

const NODE_W = 240
const GAP = 34
const PAD = 20
const LINE_H = 20

interface Laid { node: FlowNode; y: number; h: number; lines: string[] }

/** สร้าง SVG string จากรายการโหนด (เรียงบนลงล่าง) */
export function renderFlowSvg(nodes: FlowNode[]): { svg: string; width: number; height: number } {
  const laid: Laid[] = []
  let y = PAD
  for (const node of nodes) {
    const lines = wrap(node.text || kindLabel[node.kind], 30)
    const h = Math.max(46, lines.length * LINE_H + 22)
    laid.push({ node, y, h, lines })
    y += h + GAP
  }
  const width = NODE_W + PAD * 2 + 80
  const height = Math.max(y - GAP + PAD, PAD * 2 + 46)
  const cx = width / 2

  const parts: string[] = []
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="TH Sarabun New, Sarabun, sans-serif">`)
  parts.push(`<rect width="${width}" height="${height}" fill="#ffffff"/>`)
  parts.push(`<defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L8,3 L0,6 Z" fill="#64748b"/></marker></defs>`)

  // เส้นเชื่อม
  for (let i = 0; i < laid.length - 1; i++) {
    const a = laid[i]; const b = laid[i + 1]
    const y1 = a.y + a.h; const y2 = b.y
    parts.push(`<line x1="${cx}" y1="${y1}" x2="${cx}" y2="${y2 - 2}" stroke="#64748b" stroke-width="1.6" marker-end="url(#arrow)"/>`)
  }

  // โหนด
  for (const { node, y, h, lines } of laid) {
    const c = COLORS[node.kind]
    const x = cx - NODE_W / 2
    if (node.kind === 'decision') {
      const mx = cx; const my = y + h / 2
      parts.push(`<polygon points="${mx},${y} ${x + NODE_W},${my} ${mx},${y + h} ${x},${my}" fill="${c.fill}" stroke="${c.stroke}" stroke-width="1.8"/>`)
    } else {
      const rx = node.kind === 'start' || node.kind === 'end' ? h / 2 : 10
      parts.push(`<rect x="${x}" y="${y}" width="${NODE_W}" height="${h}" rx="${rx}" fill="${c.fill}" stroke="${c.stroke}" stroke-width="1.8"/>`)
    }
    const startY = y + h / 2 - ((lines.length - 1) * LINE_H) / 2
    lines.forEach((ln, i) => {
      parts.push(`<text x="${cx}" y="${startY + i * LINE_H + 5}" text-anchor="middle" font-size="15" fill="#0f172a">${esc(ln)}</text>`)
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
