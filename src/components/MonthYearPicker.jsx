const MONTHS = Array.from({ length: 12 }, (_, index) => `Tháng ${index + 1}`)

export default function MonthYearPicker({ value, years, onChange, ariaLabel = 'Chọn tháng và năm' }) {
  const [year, month] = value.split('-')

  const setMonth = (nextMonth) => onChange(`${year}-${nextMonth}`)
  const setYear = (nextYear) => onChange(`${nextYear}-${month}`)

  return (
    <div className="month-year-picker" role="group" aria-label={ariaLabel}>
      <select value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Tháng">
        {MONTHS.map((label, index) => {
          const monthValue = String(index + 1).padStart(2, '0')
          return <option key={monthValue} value={monthValue}>{label}</option>
        })}
      </select>
      <select value={year} onChange={(e) => setYear(e.target.value)} aria-label="Năm">
        {years.map((optionYear) => <option key={optionYear} value={optionYear}>Năm {optionYear}</option>)}
      </select>
    </div>
  )
}
