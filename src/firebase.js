import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getMessaging, isSupported } from 'firebase/messaging'
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, getFirestore } from 'firebase/firestore'

const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
})

export const auth = getAuth(app)
export const provider = new GoogleAuthProvider()
// Cache offline: mất mạng vẫn dùng được, có mạng lại sẽ tự đồng bộ
// Bật lưu dữ liệu ngoại tuyến (cache) để mất mạng vẫn dùng được. Một số trình duyệt
// di động (chế độ ẩn danh, Safari cũ, hoặc khi IndexedDB đã bị trình duyệt khác
// giữ) không hỗ trợ việc này và initializeFirestore sẽ ném lỗi ngay khi tải trang,
// làm cả app trắng màn hình. Nếu vậy, quay về Firestore không cache offline.
let firestoreDb
try {
  firestoreDb = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  })
} catch (e) {
  console.warn('Không bật được cache ngoại tuyến, dùng chế độ thường:', e)
  firestoreDb = getFirestore(app)
}
export const db = firestoreDb

// Không phải mọi trình duyệt hỗ trợ FCM (ví dụ Safari cũ), nên kiểm tra trước
export const messagingPromise = isSupported().then((ok) => (ok ? getMessaging(app) : null))
