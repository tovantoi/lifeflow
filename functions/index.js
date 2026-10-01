const { onSchedule } = require('firebase-functions/v2/scheduler')
const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { initializeApp } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')
const { getMessaging } = require('firebase-admin/messaging')
const { getStorage } = require('firebase-admin/storage')
const { randomUUID } = require('node:crypto')
const ExcelJS = require('exceljs')

const bucketName = 'lifeflow-59e20.firebasestorage.app'
initializeApp({ storageBucket: bucketName })
const db = getFirestore()
const bucket = getStorage().bucket()

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

const ARCHIVE_TIME_ZONE = 'Asia/Ho_Chi_Minh'
const PRIORITY_LABELS = { low: 'Thấp', medium: 'Trung bình', high: 'Cao', urgent: 'Khẩn cấp' }
const STATUS_LABELS = { todo: 'Cần làm', in_progress: 'Đang làm', review: 'Đang xem lại', done: 'Hoàn thành' }
const TRANSACTION_CATEGORIES = {
  food: 'Ăn uống', shopping: 'Mua sắm', transport: 'Di chuyển', housing: 'Nhà ở',
  bills: 'Hóa đơn', fun: 'Giải trí', health: 'Sức khỏe', edu: 'Giáo dục',
  travel: 'Du lịch', other: 'Khác', salary: 'Lương', bonus: 'Thưởng',
  side: 'Làm thêm', invest: 'Đầu tư', gift: 'Quà tặng',
}

function getPreviousVietnamMonth(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: ARCHIVE_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now)
  const year = Number(parts.find((part) => part.type === 'year').value)
  const month = Number(parts.find((part) => part.type === 'month').value)
  const previous = new Date(Date.UTC(year, month - 2, 1))
  const monthId = `${previous.getUTCFullYear()}-${String(previous.getUTCMonth() + 1).padStart(2, '0')}`
  const start = Date.UTC(previous.getUTCFullYear(), previous.getUTCMonth(), 1) - 7 * 60 * 60 * 1000
  const end = Date.UTC(previous.getUTCFullYear(), previous.getUTCMonth() + 1, 1) - 7 * 60 * 60 * 1000
  return { monthId, start, end }
}

function csvText(value) {
  let text = String(value ?? '')
  if (/^[\t\r ]*[=+@-]/.test(text)) text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}

function csvNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? String(number) : '0'
}

function makeCsv(rows) {
  // Dùng dấu chấm phẩy để Excel theo vùng Việt Nam tách dữ liệu thành cột.
  return `\uFEFF${rows.map((row) => row.join(';')).join('\r\n')}\r\n`
}

function formatIsoDate(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return match ? `${match[3]}/${match[2]}/${match[1]}` : String(value || '')
}

function formatVietnamDateTime(value) {
  const timestamp = typeof value === 'number' ? value : value?.toMillis?.()
  if (!timestamp) return ''
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: ARCHIVE_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(timestamp))
}

function transactionsCsv(docs) {
  const rows = [[
    'Ngày', 'Loại giao dịch', 'Danh mục', 'Ghi chú', 'Số tiền (VND)',
  ].map(csvText)]
  for (const doc of docs) {
    const transaction = doc.data()
    rows.push([
      csvText(formatIsoDate(transaction.date)),
      csvText(transaction.type === 'income' ? 'Thu nhập' : 'Chi tiêu'),
      csvText(TRANSACTION_CATEGORIES[transaction.category] || transaction.category || 'Khác'),
      csvText(transaction.note || ''),
      csvNumber(transaction.amount),
    ])
  }
  return makeCsv(rows)
}

function tasksCsv(docs) {
  const rows = [[
    'Công việc', 'Mô tả', 'Danh mục', 'Độ ưu tiên', 'Trạng thái', 'Ngày tạo', 'Ngày đến hạn', 'Giờ đến hạn',
  ].map(csvText)]
  for (const doc of docs) {
    const task = doc.data()
    rows.push([
      csvText(task.title || ''),
      csvText(task.description || ''),
      csvText(task.category || ''),
      csvText(PRIORITY_LABELS[task.priority] || task.priority || ''),
      csvText(STATUS_LABELS[task.status] || task.status || ''),
      csvText(formatVietnamDateTime(task.createdAt)),
      csvText(formatIsoDate(task.dueDate)),
      csvText(task.dueTime || ''),
    ])
  }
  return makeCsv(rows)
}

function excelDate(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return match ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))) : ''
}

async function makeExcel(sheetName, headers, rows, widths, dateColumns = []) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'LifeFlow'
  const sheet = workbook.addWorksheet(sheetName, { views: [{ state: 'frozen', ySplit: 1 }] })
  sheet.columns = headers.map((header, index) => ({ header, key: `c${index}`, width: widths[index] || 18 }))
  rows.forEach((values) => sheet.addRow(Object.fromEntries(values.map((value, index) => [`c${index}`, value]))))
  sheet.autoFilter = { from: 'A1', to: `${String.fromCharCode(64 + headers.length)}${Math.max(sheet.rowCount, 1)}` }
  const header = sheet.getRow(1)
  header.height = 30
  header.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF087E78' } }
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    cell.border = { bottom: { style: 'medium', color: { argb: 'FF20C9B7' } } }
  })
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    row.height = 23
    row.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowNumber % 2 === 0 ? 'FFF0FAF9' : 'FFFFFFFF' } }
      cell.border = { bottom: { style: 'thin', color: { argb: 'FFDCE9E8' } } }
      cell.alignment = { vertical: 'middle', wrapText: true }
    })
    for (const column of dateColumns) row.getCell(column).numFmt = 'dd/mm/yyyy'
  })
  return Buffer.from(await workbook.xlsx.writeBuffer())
}

async function transactionsXlsx(docs) {
  const rows = docs.map((doc) => {
    const transaction = doc.data()
    return [
      excelDate(transaction.date),
      transaction.type === 'income' ? 'Thu nhập' : 'Chi tiêu',
      TRANSACTION_CATEGORIES[transaction.category] || transaction.category || 'Khác',
      Number.isFinite(Number(transaction.amount)) ? Number(transaction.amount) : 0,
      transaction.note || '',
    ]
  })
  const buffer = await makeExcel('Giao dịch', ['Ngày', 'Loại giao dịch', 'Danh mục', 'Số tiền (VND)', 'Ghi chú'], rows, [15, 19, 20, 20, 38], [1])
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  const sheet = workbook.getWorksheet('Giao dịch')
  sheet.getColumn(4).numFmt = '#,##0 "₫"'
  sheet.getColumn(4).alignment = { vertical: 'middle', horizontal: 'right' }
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber < 2) return
    row.getCell(4).font = { bold: true, color: { argb: row.getCell(2).value === 'Thu nhập' ? 'FF16834A' : 'FFDA6A25' } }
  })
  return Buffer.from(await workbook.xlsx.writeBuffer())
}

async function tasksXlsx(docs) {
  const rows = docs.map((doc) => {
    const task = doc.data()
    const createdAt = typeof task.createdAt === 'number' ? new Date(task.createdAt) : task.createdAt?.toDate?.() || ''
    return [task.title || '', task.description || '', task.category || '', PRIORITY_LABELS[task.priority] || task.priority || '', STATUS_LABELS[task.status] || task.status || '', createdAt, excelDate(task.dueDate), task.dueTime || '']
  })
  const buffer = await makeExcel('Công việc', ['Công việc', 'Mô tả', 'Danh mục', 'Độ ưu tiên', 'Trạng thái', 'Ngày tạo', 'Ngày đến hạn', 'Giờ đến hạn'], rows, [30, 42, 18, 18, 20, 22, 18, 16], [6, 7])
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  workbook.getWorksheet('Công việc').getColumn(6).numFmt = 'dd/mm/yyyy hh:mm'
  return Buffer.from(await workbook.xlsx.writeBuffer())
}

async function saveArchiveFile(path, content, fileName, monthId, kind) {
  await bucket.file(path).save(Buffer.from(content, 'utf8'), {
    resumable: false,
    metadata: {
      contentType: 'text/csv; charset=utf-8',
      contentDisposition: `attachment; filename="${fileName}"`,
      cacheControl: 'private, max-age=0, no-transform',
      metadata: { firebaseStorageDownloadTokens: randomUUID(), month: monthId, kind },
    },
  })
}

async function saveArchiveWorkbook(path, content, fileName, monthId, kind) {
  await bucket.file(path).save(content, {
    resumable: false,
    metadata: {
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      contentDisposition: `attachment; filename="${fileName}"`,
      cacheControl: 'private, max-age=0, no-transform',
      metadata: { firebaseStorageDownloadTokens: randomUUID(), month: monthId, kind },
    },
  })
}

// Tạo hai bản CSV vào 00:10 ngày đầu tháng theo giờ Việt Nam, cho tháng vừa kết thúc.
exports.archivePreviousMonth = onSchedule(
  { schedule: '10 0 1 * *', timeZone: ARCHIVE_TIME_ZONE, region: 'asia-southeast1', timeoutSeconds: 540 },
  async () => {
    const { monthId, start, end } = getPreviousVietnamMonth()
    const users = await db.collection('users').get()
    let archivedUsers = 0

    for (const userDoc of users.docs) {
      const userRef = userDoc.ref
      const [transactions, tasks] = await Promise.all([
        userRef.collection('transactions').where('date', '>=', monthId + '-01').where('date', '<', nextMonthDate(monthId)).get(),
        userRef.collection('tasks').where('createdAt', '>=', start).where('createdAt', '<', end).get(),
      ])
      if (transactions.empty && tasks.empty) continue

      const transactionPath = `users/${userDoc.id}/archives/${monthId}/transactions.csv`
      const taskPath = `users/${userDoc.id}/archives/${monthId}/tasks.csv`
      const transactionExcelPath = `users/${userDoc.id}/archives/${monthId}/transactions.xlsx`
      const taskExcelPath = `users/${userDoc.id}/archives/${monthId}/tasks.xlsx`
      const transactionFileName = `LifeFlow-Giao-dich-${monthId}.csv`
      const taskFileName = `LifeFlow-Cong-viec-${monthId}.csv`

      const [transactionWorkbook, taskWorkbook] = await Promise.all([
        transactionsXlsx(transactions.docs),
        tasksXlsx(tasks.docs),
      ])
      await Promise.all([
        saveArchiveFile(transactionPath, transactionsCsv(transactions.docs), transactionFileName, monthId, 'transactions'),
        saveArchiveFile(taskPath, tasksCsv(tasks.docs), taskFileName, monthId, 'tasks'),
        saveArchiveWorkbook(transactionExcelPath, transactionWorkbook, transactionFileName.replace(/\.csv$/, '.xlsx'), monthId, 'transactions'),
        saveArchiveWorkbook(taskExcelPath, taskWorkbook, taskFileName.replace(/\.csv$/, '.xlsx'), monthId, 'tasks'),
      ])
      await userRef.collection('archives').doc(monthId).set({
        month: monthId,
        transactionPath,
        taskPath,
        transactionExcelPath,
        taskExcelPath,
        transactionCount: transactions.size,
        taskCount: tasks.size,
        createdAt: new Date(),
      })
      archivedUsers += 1
    }

    console.log(`Đã lưu CSV tháng ${monthId} cho ${archivedUsers} tài khoản.`)
  }
)

function nextMonthDate(monthId) {
  const [year, month] = monthId.split('-').map(Number)
  const next = new Date(Date.UTC(year, month, 1))
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-01`
}

function createDownloadUrl(path, metadata) {
  const token = metadata.metadata?.firebaseStorageDownloadTokens?.split(',')[0]
  if (!token) return null
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${encodeURIComponent(token)}`
}

// Trả về kho lưu trữ và các liên kết tải xuống riêng cho tài khoản đã đăng nhập.
exports.listMonthlyArchives = onCall(
  { region: 'asia-southeast1' },
  async (request) => {
    const uid = request.auth?.uid
    if (!uid) throw new HttpsError('unauthenticated', 'Bạn cần đăng nhập để xem kho lưu trữ.')

    const snapshot = await db.collection(`users/${uid}/archives`).orderBy('month', 'desc').get()
    const archives = await Promise.all(snapshot.docs.map(async (doc) => {
      const archive = doc.data()
      const month = doc.id
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return null
      const transactionPath = `users/${uid}/archives/${month}/transactions.csv`
      const taskPath = `users/${uid}/archives/${month}/tasks.csv`
      const transactionExcelPath = `users/${uid}/archives/${month}/transactions.xlsx`
      const taskExcelPath = `users/${uid}/archives/${month}/tasks.xlsx`
      const [transactionMetadata, taskMetadata, transactionExcelMetadata, taskExcelMetadata] = await Promise.all([
        archive.transactionPath ? bucket.file(transactionPath).getMetadata().catch(() => [null]) : [null],
        archive.taskPath ? bucket.file(taskPath).getMetadata().catch(() => [null]) : [null],
        archive.transactionExcelPath ? bucket.file(transactionExcelPath).getMetadata().catch(() => [null]) : [null],
        archive.taskExcelPath ? bucket.file(taskExcelPath).getMetadata().catch(() => [null]) : [null],
      ])
      return {
        month,
        transactionCount: archive.transactionCount || 0,
        taskCount: archive.taskCount || 0,
        transactionUrl: transactionMetadata[0] ? createDownloadUrl(transactionPath, transactionMetadata[0]) : null,
        taskUrl: taskMetadata[0] ? createDownloadUrl(taskPath, taskMetadata[0]) : null,
        transactionExcelUrl: transactionExcelMetadata[0] ? createDownloadUrl(transactionExcelPath, transactionExcelMetadata[0]) : null,
        taskExcelUrl: taskExcelMetadata[0] ? createDownloadUrl(taskExcelPath, taskExcelMetadata[0]) : null,
      }
    }))
    return { archives: archives.filter(Boolean) }
  }
)
