import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'

// Firebase config is loaded from Vite env vars (VITE_FIREBASE_*).
// Without env vars, the app runs entirely on the in-memory mock store in
// src/data/store.ts — useful for design review / demo before provisioning a
// real Firebase project.
const config = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
}

export const firebaseEnabled = Boolean(config.apiKey && config.projectId)

let app: FirebaseApp | null = null
export const getFirebase = (): FirebaseApp | null => {
  if (!firebaseEnabled) return null
  if (!app) app = getApps()[0] ?? initializeApp(config)
  return app
}
