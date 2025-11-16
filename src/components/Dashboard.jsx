import { useMemo } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useUserQuery } from '../hooks/useUserQuery.js'
import { useLogoutMutation } from '../hooks/useLogoutMutation.js'

const formatTimestamp = (timestamp) => {
  if (!timestamp) {
    return 'Chưa đồng bộ'
  }

  try {
    return new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(timestamp))
  } catch (error) {
    console.warn('Unable to format timestamp:', error)
    return new Date(timestamp).toLocaleString()
  }
}

function Dashboard() {
  const { user } = useAuth()
  const { data, isError, isLoading, isFetching, refetch, dataUpdatedAt } = useUserQuery()
  const logoutMutation = useLogoutMutation()

  const profile = data ?? user
  const displayName = profile?.name ?? profile?.email ?? 'người dùng'
  const roleLabel = profile?.role ?? 'user'

  const lastSyncedLabel = useMemo(() => formatTimestamp(dataUpdatedAt), [dataUpdatedAt])

  const queryStatus = useMemo(() => {
    if (isLoading) return 'Đang tải'
    if (isFetching) return 'Đang đồng bộ'
    if (isError) return 'Gặp lỗi'
    return 'Sẵn sàng'
  }, [isError, isFetching, isLoading])

  const queryTone = isError ? 'error' : isLoading || isFetching ? 'warning' : 'success'

  return (
    <section className="dashboard">
      <div className="card dashboard__hero">
        <div>
          <p className="dashboard__eyebrow">Phiên làm việc bảo vệ bằng JWT</p>
          <h2>Xin chào, {displayName}</h2>
          <p className="muted">
            Truy cập bảng điều khiển để xem thông tin tài khoản, trạng thái truy vấn và các hành động được phân quyền.
          </p>
        </div>
        <span className="chip">{roleLabel}</span>
      </div>

      <ul className="dashboard__stats">
        <li>
          <p className="label">Trạng thái truy vấn</p>
          <strong className={`status status--${queryTone}`}>{queryStatus}</strong>
        </li>
        <li>
          <p className="label">Đồng bộ gần nhất</p>
          <strong>{lastSyncedLabel}</strong>
        </li>
        <li>
          <p className="label">Vai trò</p>
          <strong className="status__role">{roleLabel}</strong>
        </li>
      </ul>

      <div className="dashboard__grid">
        <article className="panel">
          <header className="panel__header">
            <div>
              <p className="panel__eyebrow">Tài khoản</p>
              <h3>Thông tin người dùng</h3>
            </div>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              {isFetching ? 'Đang làm mới...' : 'Làm mới'}
            </button>
          </header>

          {isError && <p className="error">Không thể tải dữ liệu người dùng.</p>}
          {isLoading && <p>Đang tải thông tin...</p>}

          <dl className="profile-grid">
            <div>
              <dt>Email</dt>
              <dd>{profile?.email ?? 'Chưa xác định'}</dd>
            </div>
            <div>
              <dt>Vai trò</dt>
              <dd>{profile?.role ?? 'user'}</dd>
            </div>
            <div>
              <dt>Mã người dùng</dt>
              <dd>{profile?.id ?? '—'}</dd>
            </div>
          </dl>
        </article>

        <article className="panel panel--session">
          <header className="panel__header">
            <div>
              <p className="panel__eyebrow">Phiên đăng nhập</p>
              <h3>Quản lý truy cập</h3>
            </div>
          </header>
          <p className="muted">
            Theo dõi trạng thái đồng bộ và đăng xuất ngay khi kết thúc phiên làm việc để đảm bảo an toàn.
          </p>
          <ul className="session-list">
            <li>
              <span>Phiên:</span>
              <strong>{logoutMutation.isPending ? 'Đang đăng xuất' : 'Đang hoạt động'}</strong>
            </li>
            <li>
              <span>Trạng thái truy vấn:</span>
              <strong>{queryStatus}</strong>
            </li>
            <li>
              <span>Lần đồng bộ gần nhất:</span>
              <strong>{lastSyncedLabel}</strong>
            </li>
          </ul>

          <div className="panel__actions">
            <button
              type="button"
              className="btn btn--outline"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              {isFetching ? 'Đang đồng bộ...' : 'Tải lại dữ liệu'}
            </button>
            <button
              type="button"
              className="btn btn--danger"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
            >
              {logoutMutation.isPending ? 'Đang đăng xuất...' : 'Đăng xuất'}
            </button>
          </div>
        </article>
      </div>
    </section>
  )
}

export default Dashboard
