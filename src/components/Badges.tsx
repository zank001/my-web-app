import type { AckStatus, DocLevel, DocumentStatus, RequestKind, RequestStatus } from '../types'
import { ackLabel, levelTier, requestKindLabel, requestStatusLabel, statusLabel } from '../lib/format'

const cls = 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap'

export const LevelBadge = ({ level }: { level: DocLevel }) => {
  const colors: Record<DocLevel, string> = {
    QM:  'bg-violet-100 text-violet-700',
    SOP: 'bg-blue-100 text-blue-700',
    WI:  'bg-sky-100 text-sky-700',
    FM:  'bg-amber-100 text-amber-700',
    EXT: 'bg-slate-200 text-slate-700',
  }
  return <span className={`${cls} ${colors[level]}`}>{level} · {levelTier[level]}</span>
}

export const StatusBadge = ({ status }: { status: DocumentStatus }) => {
  const colors: Record<DocumentStatus, string> = {
    draft:            'bg-slate-100 text-slate-700',
    pending_review:   'bg-amber-100 text-amber-700',
    pending_approval: 'bg-orange-100 text-orange-700',
    controlled:       'bg-emerald-100 text-emerald-700',
    cancelled:        'bg-rose-100 text-rose-700',
  }
  return <span className={`${cls} ${colors[status]}`}>{statusLabel[status]}</span>
}

export const RequestKindBadge = ({ kind }: { kind: RequestKind }) => {
  const colors: Record<RequestKind, string> = {
    new:    'bg-brand-100 text-brand-700',
    revise: 'bg-amber-100 text-amber-700',
    cancel: 'bg-rose-100 text-rose-700',
  }
  return <span className={`${cls} ${colors[kind]}`}>{requestKindLabel[kind]}</span>
}

export const RequestStatusBadge = ({ status }: { status: RequestStatus }) => {
  const colors: Record<RequestStatus, string> = {
    submitted: 'bg-slate-100 text-slate-700',
    needs_fix: 'bg-amber-100 text-amber-700',
    reviewed:  'bg-blue-100 text-blue-700',
    approved:  'bg-emerald-100 text-emerald-700',
    rejected:  'bg-rose-100 text-rose-700',
  }
  return <span className={`${cls} ${colors[status]}`}>{requestStatusLabel[status]}</span>
}

export const AckBadge = ({ status }: { status: AckStatus }) => {
  const dot: Record<AckStatus, string> = {
    pending: 'bg-slate-400', opened: 'bg-amber-400', acknowledged: 'bg-emerald-500', overdue: 'bg-rose-500',
  }
  const txt: Record<AckStatus, string> = {
    pending: 'text-slate-600 bg-slate-100', opened: 'text-amber-700 bg-amber-100',
    acknowledged: 'text-emerald-700 bg-emerald-100', overdue: 'text-rose-700 bg-rose-100',
  }
  return (
    <span className={`${cls} ${txt[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot[status]}`} />
      {ackLabel[status]}
    </span>
  )
}
