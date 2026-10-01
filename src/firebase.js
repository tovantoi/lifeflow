import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getMessaging, isSupported } from "firebase/messaging";
import { getFunctions } from "firebase/functions";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
});

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const functions = getFunctions(app, "asia-southeast1");
// Trên điện thoại dùng cache trong bộ nhớ để tránh phụ thuộc IndexedDB khi khởi động.
// Máy tính vẫn giữ cache ngoại tuyến persistent như trước. Nếu không tạo được cache,
// fallback về Firestore mặc định để giao diện tiếp tục tải và có thể hiện lỗi thật.
const isMobileBrowser =
  typeof navigator !== "undefined" &&
  (navigator.userAgentData?.mobile ||
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));

let firestoreDb;
if (isMobileBrowser) {
  firestoreDb = getFirestore(app);
} else {
  try {
    firestoreDb = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch (e) {
    console.warn(
      "Không bật được cache ngoại tuyến, dùng cache trong bộ nhớ:",
      e,
    );
    firestoreDb = getFirestore(app);
  }
}
export const db = firestoreDb;

// Không phải mọi trình duyệt hỗ trợ FCM (ví dụ Safari cũ), nên kiểm tra trước
export const messagingPromise = isSupported().then((ok) =>
  ok ? getMessaging(app) : null,
);
