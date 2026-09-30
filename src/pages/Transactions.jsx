import { useState } from 'react'
import { useStore } from '../stores/useStore'
import DeleteButton from '../components/DeleteButton'
import { money, today, parseAmount, EXPENSE_CATS, INCOME_CATS } from '../lib/format'

export default function Transactions() {
  const { transactions, addTx, updateTx, removeTx } = useStore()
  const [type, setType] = useState('expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('food')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(today())
  const [filter, setFilter] = useState('all')
  const [q, setQ] = useState('')
  const [error, setError] = useState('')
  const [editId, setEditId] = useState(null)

  const cats = type === 'expense' ? EXPENSE_CATS : INCOME_CATS
  const catName = (t) => (t.type === 'expense' ? EXPENSE_CATS : INCOME_CATS)[t.category] || t.category

  const changeType = (v) => {
    setType(v)
    setCategory(Object.keys(v === 'expense' ? EXPENSE_CATS : INCOME_CATS)[0])
  }

  const resetForm = () => {
    setEditId(null)
    setAmount('')
    setNote('')
    setError('')
  }

  // Nạp giao dịch vào form để sửa
  const startEdit = (t) => {
    setEditId(t.id)
    setType(t.type)
    setCategory(t.category)
    setAmount(String(t.amount))
    setNote(t.note || '')
    setDate(t.date)
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
    .filter((t) => (filter === 'all' || t.type === filter) && (t.note + catName(t)).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))

  const exportCSV = () => {
    const rows = [['Ngày', 'Loại', 'Danh mục', 'Số tiền', 'Ghi chú'],
      ...list.map((t) => [t.date, t.type === 'income' ? 'Thu' : 'Chi', catName(t), t.amount, `"${(t.note || '').replace(/"/g, '""')}"`])]
    const blob = new Blob(['\uFEFF' + rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'lifeflow-giao-dich.csv'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <>
      <h2>Giao dịch</h2>
      <form className="form" onSubmit={submit}>
        <select value={type} onChange={(e) => changeType(e.target.value)}>
          <option value="expense">Chi tiêu</option>
          <option value="income">Thu nhập</option>
        </select>
        <input inputMode="text" placeholder="Số tiền (vd: 500k, 5tr, 2 tỷ)" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {Object.entries(cats).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input placeholder="Ghi chú" value={note} onChange={(e) => setNote(e.target.value)} />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <button className="primary">{editId ? 'Cập nhật' : 'Lưu giao dịch'}</button>
        {editId && <button type="button" onClick={resetForm}>Hủy sửa</button>}
        {error && <span className="bad">{error}</span>}
        {amount && !error && (
          <span className="mute" style={{ flex: '1 1 100%' }}>
            {parseAmount(amount) > 0 ? `= ${money(parseAmount(amount))}` : 'Chưa nhận ra số tiền'}
          </span>
        )}
      </form>

      <div className="form">
        <input placeholder="Tìm giao dịch" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">Tất cả</option>
          <option value="income">Thu nhập</option>
          <option value="expense">Chi tiêu</option>
        </select>
        <button onClick={exportCSV} disabled={!list.length}>Xuất CSV</button>
      </div>

      <div className="card">
        {list.length === 0 && <p className="mute">Chưa có giao dịch. Nhập khoản đầu tiên ở form phía trên.</p>}
        {list.map((t) => (
          <div className={`row${editId === t.id ? ' editing' : ''}`} key={t.id}>
            <span>{t.note || 'Không có ghi chú'} <span className="mute">{catName(t)} · {t.date}</span></span>
            <span>
              <b className={t.type === 'income' ? 'good' : 'bad'}>{t.type === 'income' ? '+' : '-'}{money(t.amount)}</b>{' '}
              <button className="ghost edit" onClick={() => startEdit(t)}>Sửa</button>
              <DeleteButton title="Xóa giao dịch này?" message={`Giao dịch ${money(t.amount)} sẽ bị xóa vĩnh viễn.`} onConfirm={() => removeTx(t.id)} />
            </span>
          </div>
        ))}
      </div>
    </>
  )
}
