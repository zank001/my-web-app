export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('th-TH', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export const relativeTime = (iso: string) => {
  const ms = Date.now() - new Date(iso).getTime()
  const m = Math.round(ms / 60_000)
  if (m < 1) return 'เมื่อสักครู่'
  if (m < 60) return `${m} นาทีที่แล้ว`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} ชม.ที่แล้ว`
  const d = Math.round(h / 24)
  if (d < 30) return `${d} วันที่แล้ว`
  return formatDate(iso)
}

export const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`
}

export const docTypeLabel: Record<string, string> = {
  policy: 'นโยบาย',
  procedure: 'ระเบียบปฏิบัติ',
  work_instruction: 'วิธีปฏิบัติงาน',
  form: 'แบบฟอร์ม',
  manual: 'คู่มือ',
  announcement: 'ประกาศ',
  external: 'เอกสารภายนอก',
}

export const statusLabel: Record<string, string> = {
  draft: 'ฉบับร่าง',
  in_review: 'กำลังทบทวน',
  approved: 'อนุมัติแล้ว',
  distributed: 'ส่งออกแล้ว',
  obsolete: 'ยกเลิกใช้',
}

export const ackLabel: Record<string, string> = {
  pending: 'รอเปิดอ่าน',
  opened: 'เปิดอ่านแล้ว',
  acknowledged: 'รับทราบแล้ว',
  overdue: 'เกินกำหนด',
}

export const priorityLabel: Record<string, string> = {
  normal: 'ปกติ',
  urgent: 'ด่วน',
  critical: 'ด่วนที่สุด',
}
