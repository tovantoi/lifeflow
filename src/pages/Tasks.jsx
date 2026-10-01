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
  const [exportError, setExportError] = useState('')
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

  const formatDate = (value) => {
    const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
    return match ? `${match[3]}/${match[2]}/${match[1]}` : value || ''
  }
  const createdDate = (task) => typeof task.createdAt === 'number'
    ? new Date(task.createdAt)
    : task.createdAt?.toDate?.() || null
  const createdDateText = (task) => {
    const value = createdDate(task)
    return value ? new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' }).format(value) : ''
  }
  const exportCSV = () => {
    const textCell = (value) => {
      let text = String(value ?? '')
      if (/^[\t\r ]*[=+@-]/.test(text)) text = `'${text}`
      return `"${text.replace(/"/g, '""')}"`
    }
    const rows = [
      ['Công việc', 'Mô tả', 'Danh mục', 'Độ ưu tiên', 'Trạng thái', 'Ngày tạo', 'Ngày đến hạn', 'Giờ đến hạn'].map(textCell),
      ...list.map((task) => [
        task.title || '', task.description || '', task.category || '',
        PRIORITIES[task.priority] || task.priority || '', STATUSES[task.status] || STATUSES.todo,
        createdDateText(task), formatDate(task.dueDate), task.dueTime || '',
      ].map(textCell)),
    ]
    const blob = new Blob(['\uFEFF' + rows.map((row) => row.join(';')).join('\r\n') + '\r\n'], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'lifeflow-cong-viec.csv'
    anchor.click()
    URL.revokeObjectURL(url)
  }
  const exportXLSX = async () => {
    try {
      setExportError('')
      const { default: ExcelJS } = await import('exceljs')
      const workbook = new ExcelJS.Workbook()
      workbook.creator = 'LifeFlow'
      workbook.created = new Date()
      const sheet = workbook.addWorksheet('Công việc', { views: [{ state: 'frozen', ySplit: 1 }] })
      sheet.columns = [
        { header: 'Công việc', key: 'title', width: 30 },
        { header: 'Mô tả', key: 'description', width: 42 },
        { header: 'Danh mục', key: 'category', width: 20 },
        { header: 'Độ ưu tiên', key: 'priority', width: 18 },
        { header: 'Trạng thái', key: 'status', width: 20 },
        { header: 'Ngày tạo', key: 'createdAt', width: 22 },
        { header: 'Ngày đến hạn', key: 'dueDate', width: 18 },
        { header: 'Giờ đến hạn', key: 'dueTime', width: 16 },
      ]
      list.forEach((task) => {
        const match = String(task.dueDate || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
        sheet.addRow({
          title: task.title || '', description: task.description || '', category: task.category || '',
          priority: PRIORITIES[task.priority] || task.priority || '', status: STATUSES[task.status] || STATUSES.todo,
          createdAt: createdDate(task),
          dueDate: match ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))) : task.dueDate || '',
          dueTime: task.dueTime || '',
        })
      })
      sheet.autoFilter = { from: 'A1', to: `H${Math.max(sheet.rowCount, 1)}` }
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
        row.height = 25
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowNumber % 2 === 0 ? 'FFF0FAF9' : 'FFFFFFFF' } }
          cell.border = { bottom: { style: 'thin', color: { argb: 'FFDCE9E8' } } }
          cell.alignment = { vertical: 'middle', wrapText: true }
        })
        row.getCell(4).font = { bold: true, color: { argb: taskPriorityColor(row.getCell(4).value) } }
        row.getCell(6).numFmt = 'dd/mm/yyyy hh:mm'
        row.getCell(7).numFmt = 'dd/mm/yyyy'
      })
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = 'lifeflow-cong-viec.xlsx'
      anchor.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (e) {
      console.error('Không thể tạo file Excel công việc:', e)
      setExportError('Không thể tạo file Excel. Vui lòng thử lại.')
    }
  }

  function taskPriorityColor(label) {
    if (label === PRIORITIES.urgent) return 'FFCF3344'
    if (label === PRIORITIES.high) return 'FFDA6A25'
    if (label === PRIORITIES.low) return 'FF16834A'
    return 'FF2576B9'
  }

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
        <button type="button" onClick={exportXLSX} disabled={!list.length}>Xuất Excel (.xlsx)</button>
        <button type="button" onClick={exportCSV} disabled={!list.length}>Xuất CSV</button>
        {exportError && <span className="bad form-message" role="alert">{exportError}</span>}
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
