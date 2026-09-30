import { Component } from 'react'

// Nếu một trang bị lỗi khi hiển thị, React sẽ gỡ toàn bộ giao diện và để lại màn hình
// trống (rất khó biết chuyện gì xảy ra, nhất là trên điện thoại vì không mở được
// console). Bắt lỗi ở đây để hiện thông báo và nút tải lại thay vì màn hình trống.
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error(error, info)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="center">
        <div className="card login">
          <span className="logo">L</span>
          <h2>Đã xảy ra lỗi</h2>
          <p className="mute">LifeFlow gặp sự cố khi hiển thị. Hãy thử tải lại trang.</p>
          <pre className="mute" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, fontSize: 12 }}>
            {String(this.state.error?.message || this.state.error)}
          </pre>
          <button className="primary" onClick={() => location.reload()}>Tải lại</button>
        </div>
      </div>
    )
  }
}
