import { useState } from 'react'
import { useStore } from '../stores/useStore'
import DeleteButton from '../components/DeleteButton'
import { PRIORITIES, STATUSES } from '../lib/format'

const ORDER = { urgent: 0, high: 1, medium: 2, low: 3 }
const empty = { title: '', description: '', priority: 'medium', dueDate: '', category: '' }

export default function Tasks() {
  const { tasks, addTask, updateTask, removeTask } = useStore()
  const [form, setForm] = useState(empty)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const [sort, setSort] = useState('deadline')
  const [editId, setEditId] = useState(null)

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const cancelEdit = () => {
    setForm(empty)
    setEditId(null)
  }

  // Nạp công việc vào form để sửa
  const startEdit = (t) => {
    setEditId(t.id)
    setForm({
      title: t.title,
      description: t.description || '',
      priority: t.priority || 'medium',
      dueDate: t.dueDate || '',
      category: t.category || '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const submit = (e) => {
    e.preventDefault()
    if (!form.title.trim()) return
    const data = { ...form, title: form.title.trim() }
    if (editId) updateTask(editId, data)
    else addTask(data)
    cancelEdit()
  }

  const list = tasks
    .filter((t) => (status === 'all' || t.status === status) && t.title.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) =>
      sort === 'priority' ? ORDER[a.priority] - ORDER[b.priority] : (a.dueDate || '9999').localeCompare(b.dueDate || '9999')
    )

  return (
    <>
      <h2>Công việc</h2>
      <form className="form" onSubmit={submit}>
        <input placeholder="Tên công việc" value={form.title} onChange={set('title')} required />
        <input placeholder="Nhãn (vd: Development)" value={form.category} onChange={set('category')} />
        <select value={form.priority} onChange={set('priority')}>
          {Object.entries(PRIORITIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input type="date" value={form.dueDate} onChange={set('dueDate')} />
        <input placeholder="Mô tả" value={form.description} onChange={set('description')} />
        <button className="primary">{editId ? 'Cập nhật' : 'Thêm công việc'}</button>
        {editId && <button type="button" onClick={cancelEdit}>Hủy sửa</button>}
      </form>

      <div className="form">
        <input placeholder="Tìm công việc" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">Tất cả trạng thái</option>
          {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="deadline">Sắp xếp theo deadline</option>
          <option value="priority">Sắp xếp theo độ ưu tiên</option>
        </select>
      </div>

      <div className="card">
        {list.length === 0 && <p className="mute">Chưa có công việc phù hợp.</p>}
        {list.map((t) => (
          <div className={`row${editId === t.id ? ' editing' : ''}`} key={t.id}>
            <label style={{ flex: 1 }}>
              <input
                type="checkbox"
                checked={t.status === 'done'}
                onChange={(e) => updateTask(t.id, { status: e.target.checked ? 'done' : 'todo' })}
              />{' '}
              <span className={t.status === 'done' ? 'done' : ''}>{t.title}</span>
              <div className="mute">
                <span className={`badge ${t.priority}`}>{PRIORITIES[t.priority]}</span>{t.category && ` · ${t.category}`}{t.dueDate && ` · hạn ${t.dueDate}`}
                {t.description && ` · ${t.description}`}
              </div>
            </label>
            <select value={t.status} onChange={(e) => updateTask(t.id, { status: e.target.value })}>
              {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <button className="ghost edit" onClick={() => startEdit(t)}>Sửa</button>
            <DeleteButton title="Xóa công việc này?" message={`"${t.title}" sẽ bị xóa vĩnh viễn.`} onConfirm={() => removeTask(t.id)} />
          </div>
        ))}
      </div>
    </>
  )
}
