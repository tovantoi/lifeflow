import Dropdown from './Dropdown'

// Ô chọn giờ 24h tự vẽ hoàn toàn — không phụ thuộc cài đặt 12h/24h của hệ điều hành,
// và không còn menu xổ xuống gốc của trình duyệt.
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))

export default function TimeInput({ value, onChange, disabled, title }) {
  const [h = '', m = ''] = value ? value.split(':') : []
  const emit = (hh, mm) => onChange({ target: { value: hh && mm ? `${hh}:${mm}` : '' } })

  return (
    <div className={`time-input${disabled ? ' disabled' : ''}`} title={title}>
      <Dropdown value={h} options={HOURS} disabled={disabled} onChange={(hh) => emit(hh, m || '00')} />
      <span>:</span>
      <Dropdown value={m} options={MINUTES} disabled={disabled || !h} onChange={(mm) => emit(h, mm)} />
      {value && !disabled && (
        <button type="button" className="ghost" onClick={() => emit('', '')} aria-label="Xóa giờ" title="Xóa giờ">×</button>
      )}
    </div>
  )
}
