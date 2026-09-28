export const money = (n) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0)

export const uid = () => crypto.randomUUID()

// Ngày hiện tại theo giờ địa phương, dạng YYYY-MM-DD
export const today = () =>
  new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)

export const EXPENSE_CATS = {
  food: 'Ăn uống', shopping: 'Mua sắm', transport: 'Di chuyển', housing: 'Nhà ở',
  bills: 'Hóa đơn', fun: 'Giải trí', health: 'Sức khỏe', edu: 'Giáo dục',
  travel: 'Du lịch', other: 'Khác',
}
export const INCOME_CATS = {
  salary: 'Lương', bonus: 'Thưởng', side: 'Làm thêm', invest: 'Đầu tư',
  gift: 'Quà tặng', other: 'Khác',
}
export const PRIORITIES = { low: 'Thấp', medium: 'Trung bình', high: 'Cao', urgent: 'Khẩn cấp' }
export const STATUSES = { todo: 'Todo', in_progress: 'In Progress', review: 'Review', done: 'Done' }

// Đọc số tiền người dùng gõ: "300000", "300.000", "50k", "5tr", "1,5tr", "2 tỷ",
// và kiểu viết tắt: "6tr890" = 6.890.000, "1tr5" = 1.500.000, "2tỷ350" = 2.350.000.000
const UNITS = { k: 1e3, nghin: 1e3, 'nghìn': 1e3, tr: 1e6, trieu: 1e6, 'triệu': 1e6, m: 1e6, ty: 1e9, 'tỷ': 1e9, b: 1e9 }
export const parseAmount = (input) => {
  const m = String(input).toLowerCase().replace(/\s/g, '').match(/^([\d.,]+)(?:([a-zà-ỹ]+)(\d+)?)?$/)
  if (!m) return NaN
  const [, num, unit, tail] = m
  if (!unit) return Number(num.replace(/[.,]/g, '')) // không đơn vị: dấu . , là ngăn cách hàng nghìn
  if (!UNITS[unit]) return NaN
  // Số đứng sau đơn vị là phần thập phân của đơn vị đó: 6tr890 -> 6,890 triệu
  const value = tail ? Number(num.replace(/[.,]/g, '') + '.' + tail) : Number(num.replace(',', '.'))
  return Math.round(value * UNITS[unit])
}
