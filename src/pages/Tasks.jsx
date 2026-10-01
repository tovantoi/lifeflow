import { useState } from 'react'
import { useStore } from '../stores/useStore'
import DeleteButton from '../components/DeleteButton'
import MonthYearPicker from '../components/MonthYearPicker'
import TimeInput from '../components/TimeInput'
import { PRIORITIES, STATUSES, today } from '../lib/format'

const ORDER = { urgent: 0, high: 1, medium: 2, low: 3 }
const empty = { title: '', description: '', priority: 'medium', dueDate: '', dueTime: '', category: '' }

export default function Tasks() {
  const { tasks, addTask, updateTask, removeTask, resetData } = useStore()
  const [form, setForm] = useState(empty)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const [sort, setSort] = useState('deadline')
  const [editId, setEditId] = useState(null)
  const [periodType, setPeriodType] = useState('month')
  const [period, setPeriod] = useState(today().slice(0, 7))

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const cancelEdit = () => { setForm(empty); setEditId(null) }

  const startEdit = (task) => {
    setEditId(task.id)
    setForm({
      title: task.title,
      description: task.description || '',
      priority: task.priority || 'medium',
      dueDate: task.dueDate || '',
      dueTime: task.dueTime || '',
      category: task.category || '',
    })
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
    .filter((task) => (status === 'all' || task.status === status) && (task.title || '').toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => sort === 'priority'
      ? ORDER[a.priority] - ORDER[b.priority]
      : `${a.dueDate || '9999'} ${a.dueTime || ''}`.localeCompare(`${b.dueDate || '9999'} ${b.dueTime || ''}`))

  const years = [...new Set([today().slice(0, 4), ...tasks.map((task) => task.dueDate?.slice(0, 4)).filter(Boolean)])].sort().reverse()
  const periodTasks = tasks.filter((task) => task.dueDate && (periodType === 'month'
    ? task.dueDate.slice(0, 7) === period
    : task.dueDate.slice(0, 4) === period))

  return (
    <>
      <div className="page-heading">
        <div><span className="eyebrow">KẾ HOẠCH CỦA BẠN</span><h2>Công việc</h2></div>
        <span className="heading-count">{tasks.length} việc</span>
      </div>

      <form className="form task-form card" onSubmit={submit}>
        <input placeholder="Tên công việc" value={form.title} onChange={set('title')} required />
        <input placeholder="Nhãn (vd: Development)" value={form.category} onChange={set('category')} />
        <select value={form.priority} onChange={set('priority')} aria-label="Độ ưu tiên">
          {Object.entries(PRIORITIES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
        <input type="date" value={form.dueDate} onChange={set('dueDate')} aria-label="Ngày đến hạn" />
        <TimeInput value={form.dueTime} onChange={set('dueTime')} disabled={!form.dueDate} title={!form.dueDate ? 'Chọn ngày trước' : 'Giờ đến hạn (không bắt buộc)'} />
        <input placeholder="Mô tả" value={form.description} onChange={set('description')} />
        <button className="primary">{editId ? 'Cập nhật việc' : '＋ Thêm công việc'}</button>
        {editId && <button type="button" onClick={cancelEdit}>Hủy sửa</button>}
      </form>

      <div className="form task-filters">
        <input placeholder="⌕  Tìm công việc" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Lọc theo trạng thái">
          <option value="all">Tất cả trạng thái</option>
          {Object.entries(STATUSES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sắp xếp công việc">
          <option value="deadline">Hạn gần nhất</option>
          <option value="priority">Độ ưu tiên</option>
        </select>
      </div>

      <div className="period-tools card">
        <div className="period-copy"><strong>Dọn danh sách theo kỳ</strong><span className="mute">Chỉ xóa việc có ngày đến hạn trong kỳ đã chọn.</span></div>
        <div className="period-controls">
          <select value={periodType} onChange={(e) => {
            const type = e.target.value
            setPeriodType(type)
            setPeriod(type === 'month' ? today().slice(0, 7) : today().slice(0, 4))
          }} aria-label="Kiểu kỳ">
            <option value="month">Theo tháng</option><option value="year">Theo năm</option>
          </select>
          {periodType === 'month'
            ? <MonthYearPicker value={period} years={years} onChange={setPeriod} ariaLabel="Chọn tháng cần dọn công việc" />
            : <select value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Chọn năm">{years.map((year) => <option key={year} value={year}>{year}</option>)}</select>}
          <DeleteButton
            className="danger period-delete"
            label={`Xóa ${periodTasks.length} việc`}
            confirmLabel={`Xóa ${periodTasks.length} việc`}
            disabled={!periodTasks.length}
            title="Xóa công việc theo kỳ?"
            message={`Sẽ xóa vĩnh viễn ${periodTasks.length} công việc có hạn ${periodType === 'month' ? 'trong tháng' : 'trong năm'} ${period}. Các việc không có ngày đến hạn được giữ nguyên.`}
            onConfirm={() => resetData('tasks', periodTasks.map((task) => task.id))}
          />
        </div>
      </div>

      <section className="records-panel card" aria-label="Danh sách công việc">
        <div className="records-heading"><div><h3>Danh sách công việc</h3><span className="mute">Cuộn trong khung để xem thêm</span></div><span className="records-total">{list.length} mục</span></div>
        <div className="records-scroll">
          {list.length === 0 && <p className="empty-state">Chưa có công việc phù hợp. Thêm việc mới ở biểu mẫu phía trên.</p>}
          {list.map((task) => (
            <article className={`record-item task-record${editId === task.id ? ' editing' : ''}`} key={task.id}>
              <label className="task-check" aria-label={`Đánh dấu ${task.title}`}>
                <input type="checkbox" checked={task.status === 'done'} onChange={(e) => updateTask(task.id, { status: e.target.checked ? 'done' : 'todo' })} />
              </label>
              <div className="record-main">
                <strong className={task.status === 'done' ? 'done' : ''}>{task.title}</strong>
                <div className="record-meta">
                  <span className={`badge ${task.priority || 'medium'}`}>{PRIORITIES[task.priority] || 'Trung bình'}</span>
                  {task.category && <span>{task.category}</span>}
                  {task.dueDate && <span>Hạn {task.dueDate}{task.dueTime ? ` · ${task.dueTime}` : ''}</span>}
                </div>
                {task.description && <p className="record-description">{task.description}</p>}
              </div>
              <select className="task-status" value={task.status || 'todo'} onChange={(e) => updateTask(task.id, { status: e.target.value })} aria-label={`Trạng thái: ${task.title}`}>
                {Object.entries(STATUSES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
              <div className="record-actions">
                <button type="button" className="ghost edit" onClick={() => startEdit(task)}>Sửa</button>
                <DeleteButton title="Xóa công việc này?" message={`“${task.title}” sẽ bị xóa vĩnh viễn.`} onConfirm={() => removeTask(task.id)} />
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  )
}
