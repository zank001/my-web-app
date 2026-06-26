import { useSyncExternalStore } from 'react'
import type {
  Activity, Department, Distribution, QualityDocument, User,
} from '../types'
import {
  activities as seedActivities,
  departments as seedDepartments,
  distributions as seedDistributions,
  documents as seedDocuments,
  users as seedUsers,
} from './seed'

interface State {
  currentUserId: string
  users: User[]
  departments: Department[]
  documents: QualityDocument[]
  distributions: Distribution[]
  activities: Activity[]
}

let state: State = {
  currentUserId: 'u-qmr',
  users: seedUsers,
  departments: seedDepartments,
  documents: seedDocuments,
  distributions: seedDistributions,
  activities: seedActivities,
}

const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
const getSnapshot = () => state
const findDist = (id: string) => state.distributions.find((d) => d.id === id)

export const useStore = <T,>(selector: (s: State) => T): T =>
  useSyncExternalStore(subscribe, () => selector(getSnapshot()))

const update = (mut: (s: State) => State) => {
  state = mut(state)
  emit()
}

export const actions = {
  setCurrentUser(userId: string) {
    update((s) => ({ ...s, currentUserId: userId }))
  },
  addDocument(doc: QualityDocument) {
    update((s) => ({ ...s, documents: [doc, ...s.documents] }))
    actions.logActivity(`อัปโหลดเอกสาร ${doc.code}`, doc.title)
  },
  updateDocumentStatus(id: string, status: QualityDocument['status']) {
    update((s) => ({
      ...s,
      documents: s.documents.map((d) => (d.id === id ? { ...d, status, updatedAt: new Date().toISOString() } : d)),
    }))
  },
  createDistribution(dist: Distribution) {
    update((s) => ({
      ...s,
      distributions: [dist, ...s.distributions],
      documents: s.documents.map((d) =>
        d.id === dist.documentId ? { ...d, status: 'distributed' } : d,
      ),
    }))
    const doc = state.documents.find((d) => d.id === dist.documentId)
    actions.logActivity('ส่งเอกสาร', `${doc?.code ?? dist.documentId} → ${dist.recipients.length} หน่วยงาน`)
  },
  acknowledge(distId: string, departmentId: string, signature: string, note?: string) {
    const now = new Date().toISOString()
    update((s) => ({
      ...s,
      distributions: s.distributions.map((d) =>
        d.id !== distId
          ? d
          : {
              ...d,
              recipients: d.recipients.map((r) =>
                r.departmentId === departmentId
                  ? { ...r, status: 'acknowledged', acknowledgedAt: now, openedAt: r.openedAt ?? now, signature, note }
                  : r,
              ),
            },
      ),
    }))
    const dept = state.departments.find((d) => d.id === departmentId)
    const docCode = state.documents.find((d) => d.id === findDist(distId)?.documentId)?.code
    actions.logActivity('รับทราบเอกสาร', `${docCode ?? ''} โดย ${dept?.nameTh ?? ''}`)
  },
  markOpened(distId: string, departmentId: string) {
    const now = new Date().toISOString()
    update((s) => ({
      ...s,
      distributions: s.distributions.map((d) =>
        d.id !== distId
          ? d
          : {
              ...d,
              recipients: d.recipients.map((r) =>
                r.departmentId === departmentId && r.status === 'pending'
                  ? { ...r, status: 'opened', openedAt: now }
                  : r,
              ),
            },
      ),
    }))
  },
  logActivity(action: string, target: string) {
    const user = state.users.find((u) => u.id === state.currentUserId)
    update((s) => ({
      ...s,
      activities: [
        {
          id: `a-${Math.random().toString(36).slice(2, 8)}`,
          at: new Date().toISOString(),
          actorId: state.currentUserId,
          actorName: user?.name ?? 'ระบบ',
          action, target,
        },
        ...s.activities,
      ].slice(0, 50),
    }))
  },
}

