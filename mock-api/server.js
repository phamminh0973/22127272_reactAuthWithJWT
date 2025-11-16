import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import jwt from 'jsonwebtoken'
import { nanoid } from 'nanoid'

const PORT = process.env.MOCK_API_PORT || 4000
const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'https://22127272-react-auth-with-jwt.netlify.app',
]

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || DEFAULT_ALLOWED_ORIGINS.join(','))
  .split(',')
  .map((origin) => origin.trim())

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'dev-access-secret'
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'dev-refresh-secret'
const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || '2m'
const REFRESH_TOKEN_TTL = process.env.REFRESH_TOKEN_TTL || '30m'

const users = [
  {
    id: '1',
    email: 'admin@example.com',
    password: '123456',
    role: 'admin',
    name: 'Admin User',
  },
  {
    id: '2',
    email: 'student@example.com',
    password: '123456',
    role: 'student',
    name: 'Student User',
  },
]

const refreshStore = new Map()

const app = express()

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, origin ?? true)
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`))
      }
    },
    credentials: true,
  }),
)

app.use(express.json())
app.use(cookieParser())

function issueTokens(user) {
  const token = jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    ACCESS_TOKEN_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL },
  )

  const refreshId = nanoid()
  const refreshToken = jwt.sign({ sub: user.id, jti: refreshId }, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_TTL,
  })

  refreshStore.set(refreshToken, { userId: user.id, issuedAt: Date.now() })

  return { token, refreshToken }
}

function authenticate(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null

  if (!token) {
    return res.status(401).json({ message: 'Missing access token' })
  }

  try {
    const payload = jwt.verify(token, ACCESS_TOKEN_SECRET)
    const user = users.find((u) => u.id === payload.sub)
    if (!user) {
      return res.status(401).json({ message: 'Invalid access token' })
    }
    req.user = user
    next()
  } catch (error) {
    console.error('Access token verification failed:', error)
    return res.status(401).json({ message: 'Access token expired or invalid' })
  }
}

app.get('/', (req, res) => {
  res.json({ status: 'ok', endpoints: ['/auth/login', '/auth/profile', '/refresh-token'] })
})

app.get('/auth/accounts', (req, res) => {
  res.json(
    users.map(({ password, ...user }) => ({
      ...user,
      hint: `password is ${password}`,
    })),
  )
})

app.post('/auth/login', (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' })
  }

  const user = users.find((u) => u.email === email && u.password === password)
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' })
  }

  const tokens = issueTokens(user)
  res.json({ ...tokens, user: { id: user.id, email: user.email, role: user.role, name: user.name } })
})

app.get('/auth/profile', authenticate, (req, res) => {
  const { id, email, role, name } = req.user
  res.json({ id, email, role, name })
})

app.post('/refresh-token', (req, res) => {
  const { refreshToken } = req.body || {}
  if (!refreshToken) {
    return res.status(400).json({ message: 'Refresh token is required' })
  }

  if (!refreshStore.has(refreshToken)) {
    return res.status(401).json({ message: 'Unknown refresh token' })
  }

  try {
    const payload = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET)
    const user = users.find((u) => u.id === payload.sub)
    if (!user) {
      refreshStore.delete(refreshToken)
      return res.status(401).json({ message: 'Refresh token no longer valid' })
    }

    refreshStore.delete(refreshToken)
    const tokens = issueTokens(user)
    res.json({ ...tokens, user: { id: user.id, email: user.email, role: user.role, name: user.name } })
  } catch (error) {
    console.error('Refresh token verification failed:', error)
    refreshStore.delete(refreshToken)
    return res.status(401).json({ message: 'Refresh token expired or invalid' })
  }
})

app.listen(PORT, () => {
  console.log(`Mock API ready on http://localhost:${PORT}`)
  console.log('Available accounts:')
  users.forEach((user) => console.log(` - ${user.email} / ${user.password}`))
})
