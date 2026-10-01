import { useState } from 'react'
import { useStore } from '../stores/useStore'
import DeleteButton from '../components/DeleteButton'
import MonthYearPicker from '../components/MonthYearPicker'
import { money, today, parseAmount, EXPENSE_CATS, INCOME_CATS } from '../lib/format'

export default function Transactions() {
  const { transactions, addTx, updateTx, removeTx, resetData } = useStore()
  const [type, setType] = useState('expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('food')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(today())
  const [filter, setFilter] = useState('all')
  const [q, setQ] = useState('')
  const [error, setError] = useState('')
  const [editId, setEditId] = useState(null)
  const [periodType, setPeriodType] = useState('month')
  const [period, setPeriod] = useState(today().slice(0, 7))

  const cats = type === 'expense' ? EXPENSE_CATS : INCOME_CATS
  const catName = (transaction) => (transaction.type === 'expense' ? EXPENSE_CATS : INCOME_CATS)[transaction.category] || transaction.category || 'Khác'
  const changeType = (value) => {
    setType(value)
    setCategory(Object.keys(value === 'expense' ? EXPENSE_CATS : INCOME_CATS)[0])
  }
  const resetForm = () => { setEditId(null); setAmount(''); setNote(''); setError('') }

  const startEdit = (transaction) => {
    setEditId(transaction.id)
    setType(transaction.type)
    setCategory(transaction.category)
    setAmount(String(transaction.amount))
    setNote(transaction.note || '')
    setDate(transaction.date || today())
    setError('')
  }

  const submit = (e) => {
    e.preventDefault()
    const value = parseAmount(amount)
    if (!(value > 0)) return setError('Số tiền không hợp lệ. Ví dụ: 500000, 500k, 5tr, 1,5 tỷ.')
    if (value > 1e12) return setError('Số tiền quá lớn.')
    setError('')
    const data = { type, amount: value, category, note: note.trim(), date }
    if (editId) updateTx(editId, data)
    else addTx(data)
    resetForm()
  }

  const list = transactions
    .filter((transaction) => (filter === 'all' || transaction.type === filter) && `${transaction.note || ''} ${catName(transaction)}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))

  const years = [...new Set([today().slice(0, 4), ...transactions.map((transaction) => transaction.date?.slice(0, 4)).filter(Boolean)])].sort().reverse()
  const periodTransactions = transactions.filter((transaction) => transaction.date && (periodType === 'month'
    ? transaction.date.slice(0, 7) === period
    : transaction.date.slice(0, 4) === period))

  const exportCSV = () => {
    const textCell = (value) => {
      let text = String(value ?? '')
      if (/^[\t\r ]*[=+@-]/.test(text)) text = `'${text}`
      return `"${text.replace(/"/g, '""')}"`
    }
    const dateCell = (value) => {
      const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
      return match ? `${match[3]}/${match[2]}/${match[1]}` : value || ''
    }
    const rows = [
      ['Ngày', 'Loại giao dịch', 'Danh mục', 'Số tiền (VND)', 'Ghi chú'].map(textCell),
      ...list.map((transaction) => [
        textCell(dateCell(transaction.date)),
        textCell(transaction.type === 'income' ? 'Thu nhập' : 'Chi tiêu'),
        textCell(catName(transaction)),
        Number.isFinite(Number(transaction.amount)) ? String(Number(transaction.amount)) : '0',
        textCell(transaction.note || ''),
      ]),
    ]
    // Excel theo thiết lập vùng Việt Nam dùng dấu chấm phẩy để tách cột.
    const blob = new Blob(['\uFEFF' + rows.map((row) => row.join(';')).join('\r\n') + '\r\n'], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'lifeflow-giao-dich.csv'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <div className="page-heading">
        <div><span className="eyebrow">THU CHI CỦA BẠN</span><h2>Giao dịch</h2></div>
        <span className="heading-count">{transactions.length} mục</span>
      </div>

      <form className="form transaction-form card" onSubmit={submit}>
        <select value={type} onChange={(e) => changeType(e.target.value)} aria-label="Loại giao dịch">
          <option value="expense">Chi tiêu</option><option value="income">Thu nhập</option>
        </select>
        <input inputMode="text" placeholder="Số tiền (vd: 500k, 5tr, 2 tỷ)" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Danh mục">
          {Object.entries(cats).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
        <input placeholder="Ghi chú" value={note} onChange={(e) => setNote(e.target.value)} />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Ngày giao dịch" />
        <button className="primary">{editId ? 'Cập nhật giao dịch' : '＋ Lưu giao dịch'}</button>
        {editId && <button type="button" onClick={resetForm}>Hủy sửa</button>}
        {error && <span className="bad form-message">{error}</span>}
        {amount && !error && <span className="mute form-message">{parseAmount(amount) > 0 ? `Số tiền: ${money(parseAmount(amount))}` : 'Chưa nhận ra số tiền'}</span>}
      </form>

      <div className="form transaction-filters">
        <input placeholder="⌕  Tìm giao dịch" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Lọc giao dịch">
          <option value="all">Tất cả giao dịch</option><option value="income">Thu nhập</option><option value="expense">Chi tiêu</option>
        </select>
        <button type="button" onClick={exportCSV} disabled={!list.length}>Xuất CSV</button>
      </div>

      <div className="period-tools card">
        <div className="period-copy"><strong>Dọn danh sách theo kỳ</strong><span className="mute">Xóa giao dịch trong tháng hoặc năm đã chọn.</span></div>
        <div className="period-controls">
          <select value={periodType} onChange={(e) => {
            const value = e.target.value
            setPeriodType(value)
            setPeriod(value === 'month' ? today().slice(0, 7) : today().slice(0, 4))
          }} aria-label="Kiểu kỳ">
            <option value="month">Theo tháng</option><option value="year">Theo năm</option>
          </select>
          {periodType === 'month'
            ? <MonthYearPicker value={period} years={years} onChange={setPeriod} ariaLabel="Chọn tháng cần dọn giao dịch" />
            : <select value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Chọn năm">{years.map((year) => <option key={year} value={year}>{year}</option>)}</select>}
          <DeleteButton
            className="danger period-delete"
            label={`Xóa ${periodTransactions.length} giao dịch`}
            confirmLabel={`Xóa ${periodTransactions.length} giao dịch`}
            disabled={!periodTransactions.length}
            title="Xóa giao dịch theo kỳ?"
            message={`Sẽ xóa vĩnh viễn ${periodTransactions.length} giao dịch ${periodType === 'month' ? 'trong tháng' : 'trong năm'} ${period}. Thao tác này không thể hoàn tác.`}
            onConfirm={() => resetData('transactions', periodTransactions.map((transaction) => transaction.id))}
          />
        </div>
      </div>

      <section className="records-panel card" aria-label="Danh sách giao dịch">
        <div className="records-heading"><div><h3>Danh sách giao dịch</h3><span className="mute">Cuộn trong khung để xem thêm</span></div><span className="records-total">{list.length} mục</span></div>
        <div className="records-scroll">
          {list.length === 0 && <p className="empty-state">Chưa có giao dịch phù hợp. Thêm giao dịch ở biểu mẫu phía trên.</p>}
          {list.map((transaction) => (
            <article className={`record-item transaction-record${editId === transaction.id ? ' editing' : ''}`} key={transaction.id}>
              <span className={`transaction-mark ${transaction.type === 'income' ? 'income-mark' : 'expense-mark'}`} aria-hidden="true">{transaction.type === 'income' ? '↙' : '↗'}</span>
              <div className="record-main">
                <strong>{transaction.note || 'Không có ghi chú'}</strong>
                <div className="record-meta"><span>{catName(transaction)}</span><span>{transaction.date || 'Chưa có ngày'}</span><span className={`badge ${transaction.type === 'income' ? 'income-badge' : 'expense-badge'}`}>{transaction.type === 'income' ? 'Thu nhập' : 'Chi tiêu'}</span></div>
              </div>
              <strong className={`transaction-amount ${transaction.type === 'income' ? 'good' : 'bad'}`}>{transaction.type === 'income' ? '+' : '−'}{money(transaction.amount)}</strong>
              <div className="record-actions">
                <button type="button" className="ghost edit" onClick={() => startEdit(transaction)}>Sửa</button>
                <DeleteButton title="Xóa giao dịch này?" message={`Giao dịch ${money(transaction.amount)} sẽ bị xóa vĩnh viễn.`} onConfirm={() => removeTx(transaction.id)} />
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  )
}
