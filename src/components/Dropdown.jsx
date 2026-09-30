import { useEffect, useRef, useState } from 'react'

// Danh sách xổ xuống tự vẽ hoàn toàn (không dùng <select> gốc của trình duyệt),
// nên màu sắc, bo góc, hiệu ứng hover đều theo đúng giao diện của app.
export default function Dropdown({ value, options, onChange, disabled, placeholder = '--' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDocClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDocClick)
    window.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDocClick); window.removeEventListener('keydown', onKey) }
  }, [open])

  return (
    <div className="dd" ref={ref}>
      <button type="button" className="dd-btn" disabled={disabled} onClick={() => setOpen((o) => !o)}>
        {value || placeholder}
      </button>
      {open && (
        <div className="dd-list" role="listbox">
          {options.map((o) => (
            <div
              key={o}
              role="option"
              aria-selected={o === value}
              className={`dd-opt${o === value ? ' active' : ''}`}
              onClick={() => { onChange(o); setOpen(false) }}
            >
              {o}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
