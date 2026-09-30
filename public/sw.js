// Service worker: (1) cho phép cài đặt LifeFlow như ứng dụng, (2) nhận và hiển thị
// thông báo đẩy (FCM) khi app đang đóng hoặc chạy nền.
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js')

// Các giá trị này không phải bí mật (giống apiKey ở client), an toàn khi để ở đây
firebase.initializeApp({
  apiKey: 'AIzaSyAPS53_ReSUHlRHSszGi-HBOrLfr-rac-k',
  authDomain: 'lifeflow-59e20.firebaseapp.com',
  projectId: 'lifeflow-59e20',
  storageBucket: 'lifeflow-59e20.firebasestorage.app',
  messagingSenderId: '909122655642',
  appId: '1:909122655642:web:5f30a6db639d6039035623',
})

const messaging = firebase.messaging()
messaging.onBackgroundMessage((payload) => {
  self.registration.showNotification(payload.notification?.title || 'LifeFlow', {
    body: payload.notification?.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
  })
})

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))
