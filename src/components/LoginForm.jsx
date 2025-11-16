import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useLoginMutation } from '../hooks/useLoginMutation.js'

const defaultValues = {
  email: '',
  password: '',
}

function LoginForm() {
  const navigate = useNavigate()
  const location = useLocation()
  const { register, handleSubmit, formState, reset } = useForm({ defaultValues })
  const { errors, isSubmitting } = formState
  const { error, isAuthenticated } = useAuth()
  const loginMutation = useLoginMutation()

  useEffect(() => {
    if (isAuthenticated) {
      const redirectTo = location.state?.from?.pathname ?? '/dashboard'
      navigate(redirectTo, { replace: true })
    }
  }, [isAuthenticated, location.state, navigate])

  const onSubmit = async (values) => {
    try {
      await loginMutation.mutateAsync(values)
      reset(defaultValues)
      const redirectTo = location.state?.from?.pathname ?? '/dashboard'
      navigate(redirectTo, { replace: true })
    } catch {
      // errors handled via context state
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit(onSubmit)}>
      <h2>Đăng nhập</h2>
      <p className="muted">Nhập thông tin được cấp để truy cập hệ thống.</p>
      <label className="field">
        <span>Email</span>
        <input
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          {...register('email', {
            required: 'Vui lòng nhập email',
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: 'Email không đúng định dạng',
            },
          })}
        />
        {errors.email && <em className="error">{errors.email.message}</em>}
      </label>

      <label className="field">
        <span>Mật khẩu</span>
        <input
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          {...register('password', {
            required: 'Vui lòng nhập mật khẩu',
            minLength: {
              value: 6,
              message: 'Mật khẩu phải có ít nhất 6 ký tự',
            },
          })}
        />
        {errors.password && <em className="error">{errors.password.message}</em>}
      </label>

      {error && <p className="error">{error}</p>}

      {loginMutation.isError && !error && (
        <p className="error">{loginMutation.error?.message ?? 'Không thể đăng nhập'}</p>
      )}

      <button type="submit" disabled={loginMutation.isPending || isSubmitting}>
        {loginMutation.isPending || isSubmitting ? 'Đang xử lý...' : 'Đăng nhập'}
      </button>
    </form>
  )
}

export default LoginForm
