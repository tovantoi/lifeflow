import { useCallback, useEffect, useState } from 'react'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../firebase'
import { useStore } from '../stores/useStore'

const monthFormatter = new Intl.DateTimeFormat('vi-VN', {
  month: 'long',
  year: 'numeric',
  timeZone: 'Asia/Ho_Chi_Minh',
})

function monthLabel(month) {
  return monthFormatter.format(new Date(`${month}-01T12:00:00+07:00`))
}

export default function Archive() {
  const user = useStore((state) => state.user)
  const [archives, setArchives] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadArchives = useCallback(async () => {
    try {
      const result = await httpsCallable(functions, 'listMonthlyArchives')()
      setArchives(result.data.archives || [])
      setError('')
    } catch (e) {
      console.error('Không tải được kho lưu trữ:', e)
      setError(e.message || 'Không thể tải kho lưu trữ lúc này.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!user) return
    const timer = window.setTimeout(() => { void loadArchives() }, 0)
    return () => window.clearTimeout(timer)
  }, [user, loadArchives])
  const refreshArchives = () => { setLoading(true); void loadArchives() }

  return (
    <>
      <div className="page-heading archive-page-heading">
        <div><span className="eyebrow">BẢN SAO THEO THÁNG</span><h2>Kho lưu trữ</h2></div>
        <button type="button" onClick={refreshArchives} disabled={loading}>↻ Làm mới</button>
      </div>
      <section className="archive-intro card">
        <span className="archive-intro-icon" aria-hidden="true">▤</span>
        <div>
          <h3>Lịch sử của bạn, được lưu tự động</h3>
          <p className="mute">Bản CSV và Excel của tháng trước được tạo vào ngày 1 hàng tháng lúc 00:10 theo giờ Việt Nam. Dữ liệu gốc trong Công việc và Giao dịch vẫn được giữ nguyên.</p>
        </div>
      </section>

      {error && !loading && <div className="archive-error card" role="alert"><strong>Chưa tải được kho lưu trữ</strong><span>{error}</span><button type="button" onClick={refreshArchives}>Thử lại</button></div>}
      {loading && <div className="card archive-empty"><span className="archive-spinner" aria-hidden="true">◌</span><span>Đang tải các bản lưu…</span></div>}
      {!loading && !error && archives.length === 0 && (
          <div className="card archive-empty"><span className="archive-empty-icon" aria-hidden="true">▤</span><strong>Chưa có bản lưu nào</strong><span className="mute">Bản lưu đầu tiên sẽ xuất hiện sau lần chạy lưu trữ hàng tháng kế tiếp.</span></div>
      )}
      {!loading && !error && archives.length > 0 && (
        <section className="archive-list" aria-label="Các bản lưu theo tháng">
          {archives.map((archive) => (
            <article className="archive-card card" key={archive.month}>
              <div className="archive-card-heading">
                <div><span className="eyebrow">BẢN LƯU THÁNG</span><h3>{monthLabel(archive.month)}</h3></div>
                <span className="archive-month-tag">{archive.month}</span>
              </div>
              <div className="archive-files">
                <div className="archive-file-row">
                  <span className="archive-file-icon transaction-file-icon">₫</span>
                  <div className="archive-file-info"><strong>Giao dịch</strong><span className="mute">{archive.transactionCount} dòng · CSV và Excel</span></div>
                  {archive.transactionUrl
                    ? <a className="archive-download" href={archive.transactionUrl} download={`LifeFlow-Giao-dich-${archive.month}.csv`}>Tải CSV <span aria-hidden="true">↓</span></a>
                    : <span className="archive-unavailable">Chưa có tệp</span>}
                  {archive.transactionExcelUrl && <a className="archive-download archive-download-xlsx" href={archive.transactionExcelUrl} download={`LifeFlow-Giao-dich-${archive.month}.xlsx`}>Tải Excel <span aria-hidden="true">↓</span></a>}
                </div>
                <div className="archive-file-row">
                  <span className="archive-file-icon task-file-icon">✓</span>
                  <div className="archive-file-info"><strong>Công việc</strong><span className="mute">{archive.taskCount} dòng · CSV và Excel</span></div>
                  {archive.taskUrl
                    ? <a className="archive-download" href={archive.taskUrl} download={`LifeFlow-Cong-viec-${archive.month}.csv`}>Tải CSV <span aria-hidden="true">↓</span></a>
                    : <span className="archive-unavailable">Chưa có tệp</span>}
                  {archive.taskExcelUrl && <a className="archive-download archive-download-xlsx" href={archive.taskExcelUrl} download={`LifeFlow-Cong-viec-${archive.month}.xlsx`}>Tải Excel <span aria-hidden="true">↓</span></a>}
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </>
  )
}
