import { getToken, onMessage } from "firebase/messaging";
import { doc, setDoc } from "firebase/firestore";
import { auth, db, messagingPromise } from "../firebase";

// Trạng thái quyền thông báo của trình duyệt: 'default' | 'granted' | 'denied' | 'unsupported'
export const notifySupported = () => "Notification" in window;
export const notifyPermission = () =>
  notifySupported() ? Notification.permission : "unsupported";

async function showAppNotification(title, options) {
  if (
    !notifySupported() ||
    Notification.permission !== "granted" ||
    !("serviceWorker" in navigator)
  )
    return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, options);
    return true;
  } catch (e) {
    console.error("Không thể hiển thị thông báo LifeFlow:", e);
    return false;
  }
}

// Bật thông báo đẩy: xin quyền, lấy FCM token, lưu token vào Firestore để
// Cloud Function server dùng gửi thông báo dù app đang đóng.
export async function enablePush() {
  if (!notifySupported()) return "unsupported";
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission;

  const messaging = await messagingPromise;
  if (!messaging) return "unsupported"; // trình duyệt không hỗ trợ FCM (vd Safari cũ)

  const reg = await navigator.serviceWorker.ready;
  const token = await getToken(messaging, {
    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: reg,
  });
  await setDoc(doc(db, "users", auth.currentUser.uid, "tokens", token), {
    createdAt: Date.now(),
  });
  return "granted";
}

// Thông báo khi app đang mở sẵn trên màn hình (FCM không tự hiện popup lúc này)
export async function listenForegroundPush() {
  const messaging = await messagingPromise;
  if (!messaging) return;
  onMessage(messaging, (payload) => {
    void showAppNotification(payload.notification?.title || "LifeFlow", {
      body: payload.notification?.body,
      icon: "/icon-192.png",
    });
  });
}

// Kiểm tra tức thời phía trình duyệt: báo ngay khi vừa mở app, không cần chờ
// Cloud Function chạy theo lịch (server tối đa 15 phút mới quét một lần).
const NOTIFIED_KEY = "lifeflow_notified_local";
const readNotified = () => {
  try {
    return JSON.parse(localStorage.getItem(NOTIFIED_KEY)) || {};
  } catch {
    return {};
  }
};
export async function checkDueTasksLocally(tasks) {
  if (notifyPermission() !== "granted") return;
  const today = new Date().toISOString().slice(0, 10);
  const notified = readNotified();
  const due = tasks.filter(
    (t) =>
      t.status !== "done" && t.dueDate && t.dueDate <= today && !notified[t.id],
  );
  if (!due.length) return;
  for (const t of due) {
    const overdue = t.dueDate < today;
    const shown = await showAppNotification("LifeFlow — nhắc việc", {
      body: `${overdue ? "Đã trễ hạn: " : "Đến hạn hôm nay: "}${t.title}`,
      icon: "/icon-192.png",
    });
    if (shown) notified[t.id] = Date.now();
  }
  try {
    localStorage.setItem(NOTIFIED_KEY, JSON.stringify(notified));
  } catch (e) {
    console.warn("Không lưu được trạng thái thông báo trên thiết bị:", e);
  }
}
