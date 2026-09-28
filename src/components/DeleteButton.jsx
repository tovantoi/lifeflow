import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

// Nút Xóa có hộp thoại xác nhận (nhấn Esc hoặc bấm ra ngoài để hủy)
export default function DeleteButton({ onConfirm, title = 'Xóa mục này?', message = 'Hành động này không thể hoàn tác.' }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <button className="ghost" onClick={() => setOpen(true)} aria-label={title}>Xóa</button>
      {open &&
        createPortal(
          <div className="overlay" onClick={() => setOpen(false)}>
            <div className="modal" role="alertdialog" aria-modal="true" aria-labelledby="dlg-title" onClick={(e) => e.stopPropagation()}>
              <div className="modal-icon">!</div>
              <h3 id="dlg-title">{title}</h3>
              <p className="mute">{message}</p>
              <div className="modal-actions">
                <button autoFocus onClick={() => setOpen(false)}>Hủy</button>
                <button className="danger" onClick={() => { setOpen(false); onConfirm() }}>Xóa</button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
