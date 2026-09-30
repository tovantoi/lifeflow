import { Component, useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  useLocation,
} from "react-router-dom";
import { useStore } from "./stores/useStore";
import Dashboard from "./pages/Dashboard";
import Tasks from "./pages/Tasks";
import Transactions from "./pages/Transactions";
import DeleteButton from "./components/DeleteButton";
import {
  notifySupported,
  notifyPermission,
  enablePush,
  listenForegroundPush,
  checkDueTasksLocally,
} from "./lib/notify";

const PATHS = {
  home: "M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z",
  task: "M4 12l5 5L20 6",
  wallet: "M3 7h18v13H3zM3 7l2-3h14l2 3M16 13.5h2",
  sun: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5",
  moon: "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z",
  out: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  bell: "M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10 21a2 2 0 0 0 4 0",
};
const Icon = ({ name }) => (
  <svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={PATHS[name]} />
  </svg>
);

const links = [
  ["/", "Tổng quan", "home"],
  ["/tasks", "Công việc", "task"],
  ["/transactions", "Giao dịch", "wallet"],
];

function Shell() {
  const {
    theme,
    toggleTheme,
    user,
    ready,
    loadError,
    init,
    login,
    logout,
    tasks,
  } = useStore();
  const [permission, setPermission] = useState(
    notifySupported() ? notifyPermission() : "unsupported",
  );
  const { pathname } = useLocation();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  useEffect(() => init(), [init]);

  // Kiểm tra việc đến hạn khi mở app, rồi lặp lại mỗi 5 phút trong lúc app đang mở
  useEffect(() => {
    if (!user) return;
    checkDueTasksLocally(tasks);
    const id = setInterval(() => checkDueTasksLocally(tasks), 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [user, tasks]);

  useEffect(() => {
    if (permission === "granted") listenForegroundPush();
  }, [permission]);

  const enableNotify = async () => setPermission(await enablePush());

  if (!ready) return <div className="center mute">Đang tải…</div>;

  if (loadError)
    return (
      <div className="center">
        <div className="card login">
          <h2>Không tải được LifeFlow</h2>
          <p className="mute">
            Lỗi khi kết nối tài khoản hoặc tải dữ liệu. Chi tiết:
          </p>
          <pre
            style={{
              maxWidth: "100%",
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
              textAlign: "left",
            }}
          >
            {loadError}
          </pre>
          <button className="primary" onClick={() => window.location.reload()}>
            Tải lại trang
          </button>
        </div>
      </div>
    );

  if (!user)
    return (
      <div className="center">
        <div className="card login">
          <span className="logo">L</span>
          <h2>LifeFlow</h2>
          <p className="mute">
            Đăng nhập để lưu và đồng bộ dữ liệu trên mọi thiết bị của bạn.
          </p>
          <button className="primary" onClick={login}>
            Đăng nhập bằng Google
          </button>
        </div>
      </div>
    );

  return (
    <div className="app">
      <nav className="side" aria-label="Điều hướng chính">
        <div className="brand">
          <span className="logo">L</span>LifeFlow
        </div>
        {links.map(([to, label, icon]) => (
          <NavLink key={to} to={to} end={to === "/"}>
            <Icon name={icon} />
            {label}
          </NavLink>
        ))}
        {permission === "default" && (
          <button className="theme" onClick={enableNotify}>
            <Icon name="bell" />
            Bật thông báo nhắc việc
          </button>
        )}
        {permission === "denied" && (
          <div className="mute" style={{ padding: "6px 12px", fontSize: 12 }}>
            Thông báo đang bị chặn. Bật lại trong cài đặt trình duyệt cho trang
            này.
          </div>
        )}
        <button className="theme" onClick={toggleTheme}>
          <Icon name={theme === "light" ? "moon" : "sun"} />
          {theme === "light" ? "Chế độ tối" : "Chế độ sáng"}
        </button>
        <DeleteButton
          className="theme"
          label={
            <>
              <Icon name="out" />
              Đăng xuất
            </>
          }
          confirmLabel="Đăng xuất"
          confirmClass="primary"
          title="Đăng xuất khỏi LifeFlow?"
          message="Bạn sẽ cần đăng nhập lại bằng Google để xem dữ liệu. Dữ liệu của bạn vẫn được lưu an toàn."
          onConfirm={logout}
        />
      </nav>
      <main key={pathname} className="page">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/transactions" element={<Transactions />} />
        </Routes>
      </main>
    </div>
  );
}

class AppErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Lỗi khi dựng giao diện LifeFlow:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="center">
          <div className="card login">
            <h2>LifeFlow gặp lỗi</h2>
            <p className="mute">Chi tiết lỗi để kiểm tra:</p>
            <pre
              style={{
                maxWidth: "100%",
                whiteSpace: "pre-wrap",
                overflowWrap: "anywhere",
                textAlign: "left",
              }}
            >
              {this.state.error.message}
            </pre>
            <button
              className="primary"
              onClick={() => window.location.reload()}
            >
              Tải lại trang
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <AppErrorBoundary>
      <BrowserRouter>
        <Shell />
      </BrowserRouter>
    </AppErrorBoundary>
  );
}
