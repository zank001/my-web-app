import type { AckStatus, DocumentStatus, DocumentType, Priority } from '../types'
import { ackLabel, docTypeLabel, priorityLabel, statusLabel } from '../lib/format'

const cls = 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium'

export const TypeBadge = ({ type }: { type: DocumentType }) => {
  const colors: Record<DocumentType, string> = {
    policy:           'bg-violet-100 text-violet-700',
    procedure:        'bg-blue-100 text-blue-700',
    work_instruction: 'bg-sky-100 text-sky-700',
    form:             'bg-amber-100 text-amber-700',
    manual:           'bg-emerald-100 text-emerald-700',
    announcement:     'bg-rose-100 text-rose-700',
    external:         'bg-slate-100 text-slate-700',
  }
  return <span className={`${cls} ${colors[type]}`}>{docTypeLabel[type]}</span>
}

export const StatusBadge = ({ status }: { status: DocumentStatus }) => {
  const colors: Record<DocumentStatus, string> = {
    draft:       'bg-slate-100 text-slate-700',
    in_review:   'bg-amber-100 text-amber-700',
    approved:    'bg-emerald-100 text-emerald-700',
    distributed: 'bg-brand-100 text-brand-700',
    obsolete:    'bg-rose-100 text-rose-700',
  }
  return <span className={`${cls} ${colors[status]}`}>{statusLabel[status]}</span>
}

export const AckBadge = ({ status }: { status: AckStatus }) => {
  const dotColor: Record<AckStatus, string> = {
    pending:      'bg-slate-400',
    opened:       'bg-amber-400',
    acknowledged: 'bg-emerald-500',
    overdue:      'bg-rose-500',
  }
  const txt: Record<AckStatus, string> = {
    pending:      'text-slate-600 bg-slate-100',
    opened:       'text-amber-700 bg-amber-100',
    acknowledged: 'text-emerald-700 bg-emerald-100',
    overdue:      'text-rose-700 bg-rose-100',
  }
  return (
    <span className={`${cls} ${txt[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dotColor[status]}`} />
      {ackLabel[status]}
    </span>
  )
}

export const PriorityBadge = ({ p }: { p: Priority }) => {
  const colors: Record<Priority, string> = {
    normal:   'bg-slate-100 text-slate-700',
    urgent:   'bg-amber-100 text-amber-700',
    critical: 'bg-rose-100 text-rose-700',
  }
  return <span className={`${cls} ${colors[p]}`}>{priorityLabel[p]}</span>
}
