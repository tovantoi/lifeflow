import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { useStore } from '../stores/useStore'
import DeleteButton from '../components/DeleteButton'
import { money, today, EXPENSE_CATS } from '../lib/format'

const COLORS = ['#0f766e', '#c2410c', '#2563eb', '#a16207', '#7c3aed', '#be185d', '#0891b2', '#65a30d', '#475569', '#dc2626']

export default function Dashboard() {
  const { tasks, transactions, resetData } = useStore()
  const month = today().slice(0, 7)
  const sum = (list, type) => list.filter((t) => t.type === type).reduce((a, t) => a + t.amount, 0)

  const thisMonth = transactions.filter((t) => t.date.startsWith(month))
  const income = sum(thisMonth, 'income')
  const expense = sum(thisMonth, 'expense')
  const balance = sum(transactions, 'income') - sum(transactions, 'expense')
  const openTasks = tasks.filter((t) => t.status !== 'done')

  const byCat = Object.entries(EXPENSE_CATS)
    .map(([key, name]) => ({
      name,
      value: thisMonth.filter((t) => t.type === 'expense' && t.category === key).reduce((a, t) => a + t.amount, 0),
    }))
    .filter((d) => d.value > 0)

  return (
    <>
      <h2>Tổng quan</h2>
      <div className="grid g4">
        <div className="card stat"><div className="mute">Tổng số dư</div><div className="big">{money(balance)}</div></div>
        <div className="card stat"><div className="mute">Thu nhập tháng này</div><div className="big good">{money(income)}</div></div>
        <div className="card stat"><div className="mute">Chi tiêu tháng này</div><div className="big bad">{money(expense)}</div></div>
        <div className="card stat"><div className="mute">Việc cần hoàn thành</div><div className="big">{openTasks.length}</div></div>
      </div>

      <div className="grid g2">
        <div className="card">
          <h3>Chi tiêu theo danh mục</h3>
          {byCat.length === 0 ? (
            <p className="mute">Chưa có khoản chi nào trong tháng này. Thêm ở trang Giao dịch.</p>
          ) : (
            <div style={{ height: 240 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={byCat} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90}>
                    {byCat.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => money(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card">
          <h3>Việc cần làm</h3>
          {openTasks.length === 0 && <p className="mute">Không còn việc nào. Thêm việc mới ở trang Công việc.</p>}
          {openTasks.slice(0, 6).map((t) => (
            <div className="row" key={t.id}><span>{t.title}</span><span className="mute">{t.dueDate}</span></div>
          ))}
        </div>

        <div className="card">
          <h3>Giao dịch gần đây</h3>
          {transactions.length === 0 && <p className="mute">Chưa có giao dịch.</p>}
          {transactions.slice(0, 6).map((t) => (
            <div className="row" key={t.id}>
              <span>{t.note || 'Không có ghi chú'} <span className="mute">{t.date}</span></span>
              <b className={t.type === 'income' ? 'good' : 'bad'}>{t.type === 'income' ? '+' : '-'}{money(t.amount)}</b>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>Đặt lại dữ liệu</h3>
        <p className="mute" style={{ margin: '0 0 12px' }}>
          Xóa vĩnh viễn để bắt đầu lại từ đầu. Thu nhập và chi tiêu "tháng này" tự động tính lại theo tháng, nên sang tháng mới bạn không cần đặt lại.
        </p>
        <div className="form" style={{ marginBottom: 0 }}>
          <DeleteButton
            className="" label="Xóa tất cả giao dịch" confirmLabel="Xóa tất cả" disabled={!transactions.length}
            title="Xóa TẤT CẢ giao dịch?"
            message={`${transactions.length} giao dịch sẽ bị xóa vĩnh viễn và số dư về 0. Không thể hoàn tác.`}
            onConfirm={() => resetData('transactions')}
          />
          <DeleteButton
            className="" label="Xóa tất cả công việc" confirmLabel="Xóa tất cả" disabled={!tasks.length}
            title="Xóa TẤT CẢ công việc?"
            message={`${tasks.length} công việc sẽ bị xóa vĩnh viễn. Không thể hoàn tác.`}
            onConfirm={() => resetData('tasks')}
          />
        </div>
      </div>
    </>
  )
}
