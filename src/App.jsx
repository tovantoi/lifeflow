import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { useStore } from './stores/useStore'
import Dashboard from './pages/Dashboard'
import Tasks from './pages/Tasks'
import Transactions from './pages/Transactions'

const PATHS = {
  home: 'M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z',
  task: 'M4 12l5 5L20 6',
  wallet: 'M3 7h18v13H3zM3 7l2-3h14l2 3M16 13.5h2',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5',
  moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
  out: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
}
const Icon = ({ name }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={PATHS[name]} />
  </svg>
)

const links = [
  ['/', 'Tổng quan', 'home'],
  ['/tasks', 'Công việc', 'task'],
  ['/transactions', 'Giao dịch', 'wallet'],
]

function Shell() {
  const { theme, toggleTheme, user, ready, init, login, logout } = useStore()
  const { pathname } = useLocation()

  useEffect(() => { document.documentElement.dataset.theme = theme }, [theme])
  useEffect(() => init(), [init])

  if (!ready) return <div className="center mute">Đang tải…</div>

  if (!user)
    return (
      <div className="center">
        <div className="card login">
          <span className="logo">L</span>
          <h2>LifeFlow</h2>
          <p className="mute">Đăng nhập để lưu và đồng bộ dữ liệu trên mọi thiết bị của bạn.</p>
          <button className="primary" onClick={login}>Đăng nhập bằng Google</button>
        </div>
      </div>
    )

  return (
    <div className="app">
      <nav className="side" aria-label="Điều hướng chính">
        <div className="brand"><span className="logo">L</span>LifeFlow</div>
        {links.map(([to, label, icon]) => (
          <NavLink key={to} to={to} end={to === '/'}><Icon name={icon} />{label}</NavLink>
        ))}
        <button className="theme" onClick={toggleTheme}>
          <Icon name={theme === 'light' ? 'moon' : 'sun'} />{theme === 'light' ? 'Chế độ tối' : 'Chế độ sáng'}
        </button>
        <button className="theme" onClick={logout}><Icon name="out" />Đăng xuất</button>
      </nav>
      <main key={pathname} className="page">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/transactions" element={<Transactions />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  )
}
