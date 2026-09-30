const { onSchedule } = require('firebase-functions/v2/scheduler')
const { initializeApp } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')
const { getMessaging } = require('firebase-admin/messaging')

initializeApp()
const db = getFirestore()

// Chạy mỗi 15 phút: tìm công việc đến hạn hoặc trễ hạn, gửi thông báo đẩy tới các
// thiết bị đã đăng ký của đúng người dùng đó, rồi đánh dấu để không báo lại.
exports.checkDueTasks = onSchedule(
  { schedule: 'every 15 minutes', timeZone: 'Asia/Ho_Chi_Minh', region: 'asia-southeast1' },
  async () => {
    const today = new Date().toISOString().slice(0, 10)

    // dueDate > '' loại các việc chưa đặt hạn; dueDate <= today lấy việc đến/trễ hạn
    const dueSnap = await db
      .collectionGroup('tasks')
      .where('dueDate', '>', '')
      .where('dueDate', '<=', today)
      .get()

    // Với việc đúng hôm nay có đặt giờ: chỉ báo khi đã qua giờ đó
    const nowStr = new Date().toISOString().slice(0, 16) // "YYYY-MM-DDTHH:MM"
    const pending = dueSnap.docs.filter((d) => {
      const t = d.data()
      if (t.status === 'done' || t.notifiedServer) return false
      if (t.dueDate === today && t.dueTime) return `${today}T${t.dueTime}` <= nowStr
      return true
    })
    if (pending.length === 0) return

    // Gom việc theo từng người dùng (uid là thư mục cha của collection "tasks")
    const byUser = new Map()
    for (const d of pending) {
      const uid = d.ref.parent.parent.id
      if (!byUser.has(uid)) byUser.set(uid, [])
      byUser.get(uid).push(d)
    }

    for (const [uid, docs] of byUser) {
      const tokensSnap = await db.collection(`users/${uid}/tokens`).get()
      const tokens = tokensSnap.docs.map((t) => t.id)

      for (const d of docs) {
        const task = d.data()
        const overdue = task.dueDate < today
        if (tokens.length) {
          const res = await getMessaging().sendEachForMulticast({
            tokens,
            notification: {
              title: 'LifeFlow — nhắc việc',
              body: `${overdue ? 'Đã trễ hạn: ' : 'Đến hạn hôm nay: '}${task.title}`,
            },
            webpush: { fcmOptions: { link: '/' } },
          })
          // Dọn token đã hết hạn hoặc bị gỡ quyền để lần sau khỏi gửi vào chỗ chết
          res.responses.forEach((r, i) => {
            if (!r.success && ['messaging/registration-token-not-registered', 'messaging/invalid-argument'].includes(r.error?.code)) {
              db.collection(`users/${uid}/tokens`).doc(tokens[i]).delete().catch(() => {})
            }
          })
        }
        await d.ref.update({ notifiedServer: true })
      }
    }
  }
)
