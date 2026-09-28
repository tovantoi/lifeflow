// Service worker tối thiểu để trình duyệt cho phép cài đặt ứng dụng (không lưu cache, luôn lấy dữ liệu mới)
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))
self.addEventListener('fetch', () => {})
