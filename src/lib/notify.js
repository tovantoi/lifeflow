// Thông báo nhắc việc — chỉ chạy được khi LifeFlow đang mở (tab nền hoặc app đã cài).
// Trình duyệt không cho web hẹn giờ khi đã đóng hẳn, nên đây là mức tốt nhất có thể làm
// mà không cần máy chủ riêng. Xem giải thích đầy đủ trong tin nhắn kèm theo.

const NOTIFIED_KEY = 'lifeflow_notified'
const readNotified = () => { try { return JSON.parse(localStorage.getItem(NOTIFIED_KEY)) || {} } catch { return {} } }
const markNotified = (id) => {
  const map = readNotified()
  map[id] = Date.now()
  // chỉ giữ 30 ngày gần nhất để khỏi phình localStorage
  const cutoff = Date.now() - 30 * 86400000
  for (const k in map) if (map[k] < cutoff) delete map[k]
  localStorage.setItem(NOTIFIED_KEY, JSON.stringify(map))
}

export const notifySupported = () => 'Notification' in window
export const notifyPermission = () => (notifySupported() ? Notification.permission : 'unsupported')
export const requestNotifyPermission = () => Notification.requestPermission()

const show = async (title, body) => {
  const reg = await navigator.serviceWorker?.getRegistration()
  if (reg) reg.showNotification(title, { body, icon: '/icon-192.png', badge: '/icon-192.png' })
  else new Notification(title, { body, icon: '/icon-192.png' })
}

// Kiểm tra việc đến hạn hôm nay hoặc đã trễ hạn, báo mỗi việc một lần
export function checkDueTasks(tasks) {
  if (notifyPermission() !== 'granted') return
  const today = new Date().toISOString().slice(0, 10)
  const notified = readNotified()
  tasks
    .filter((t) => t.status !== 'done' && t.dueDate && t.dueDate <= today && !notified[t.id])
    .forEach((t) => {
      const overdue = t.dueDate < today
      show('LifeFlow — nhắc việc', `${overdue ? 'Đã trễ hạn: ' : 'Đến hạn hôm nay: '}${t.title}`)
      markNotified(t.id)
    })
}
