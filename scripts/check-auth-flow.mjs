import { chromium } from 'playwright'

const baseUrl = (process.env.APP_URL ?? 'http://localhost:5173').replace(/\/$/, '')
const loginUrl = `${baseUrl}/login`
const dashboardUrl = `${baseUrl}/dashboard`

const credentials = {
  email: process.env.TEST_EMAIL ?? 'admin@example.com',
  password: process.env.TEST_PASSWORD ?? '123456',
}

const results = []

async function runStep(label, handler) {
  try {
    const detail = await handler()
    results.push({ step: label, status: 'PASS', details: detail ?? '' })
  } catch (error) {
    results.push({ step: label, status: 'FAIL', details: error?.message ?? String(error) })
  }
}

function waitForLoginResponse(page) {
  return page.waitForResponse(
    (response) =>
      response.url().includes('/auth/login') && response.request().method() === 'POST',
    { timeout: 10_000 },
  )
}

async function fillLoginForm(page, email, password) {
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
}

async function loginToDashboard(page, { email, password }) {
  await page.goto(loginUrl, { waitUntil: 'networkidle' })
  await fillLoginForm(page, email, password)
  const loginResponsePromise = waitForLoginResponse(page)
  const navigationPromise = page.waitForURL('**/dashboard', { timeout: 10_000 })
  await page.click('button[type="submit"]')
  const loginResponse = await loginResponsePromise
  await navigationPromise
  const body = await loginResponse.json()
  return { body, loginResponse }
}

async function main() {
  const browser = await chromium.launch()

  await runStep('1. Login with valid credentials returns tokens', async () => {
    const context = await browser.newContext()
    const page = await context.newPage()
    try {
      const { body } = await loginToDashboard(page, credentials)
      const hasToken = typeof body.token === 'string' && body.token.length > 0
      const hasRefresh = typeof body.refreshToken === 'string' && body.refreshToken.length > 0
      if (!hasToken || !hasRefresh) {
        throw new Error(`Response missing token fields: ${JSON.stringify(body)}`)
      }
      return `Received access and refresh tokens; landed on ${page.url()}`
    } finally {
      await context.close()
    }
  })

  await runStep('2. Invalid login shows backend error', async () => {
    const context = await browser.newContext()
    const page = await context.newPage()
    try {
      await page.goto(loginUrl, { waitUntil: 'networkidle' })
      await fillLoginForm(page, credentials.email, 'WrongPassword!')
      const loginResponsePromise = waitForLoginResponse(page)
      await page.click('button[type="submit"]')
      const loginResponse = await loginResponsePromise
      const body = await loginResponse.json()
      await page.waitForSelector('text="Invalid credentials"', { timeout: 5_000 })
      const missingRefreshMessageCount = await page.locator('text="Missing refresh token"').count()
      if (loginResponse.status() !== 401) {
        throw new Error(`Expected 401, received ${loginResponse.status()}`)
      }
      if (body.message !== 'Invalid credentials') {
        throw new Error(`Server returned unexpected message: ${body.message}`)
      }
      if (missingRefreshMessageCount > 0) {
        throw new Error('UI incorrectly shows "Missing refresh token"')
      }
      return 'UI displays the "Invalid credentials" message from the backend.'
    } finally {
      await context.close()
    }
  })

  await runStep('3. Access token stored in memory only', async () => {
    const context = await browser.newContext()
    const page = await context.newPage()
    try {
      await loginToDashboard(page, credentials)
      const storage = await page.evaluate(() => ({
        token: localStorage.getItem('token'),
        refreshToken: localStorage.getItem('refreshToken'),
      }))
      const meetsExpectation = storage.token === null && typeof storage.refreshToken === 'string'
      if (!meetsExpectation) {
        throw new Error(`Unexpected storage snapshot: ${JSON.stringify(storage)}`)
      }
      return 'Only refresh token persisted to localStorage.'
    } finally {
      await context.close()
    }
  })

  await runStep('4. Logout clears tokens and redirects to /login', async () => {
    const context = await browser.newContext()
    const page = await context.newPage()
    try {
      await loginToDashboard(page, credentials)
      await page.getByRole('button', { name: /đăng xuất/i }).click()
      await page.waitForURL('**/login', { timeout: 5_000 })
      const storage = await page.evaluate(() => ({
        token: localStorage.getItem('token'),
        refreshToken: localStorage.getItem('refreshToken'),
      }))
      if (storage.token || storage.refreshToken) {
        throw new Error('Tokens still remain in localStorage after logout')
      }
      return 'Tokens cleared and user redirected to /login.'
    } finally {
      await context.close()
    }
  })

  await runStep('5. Protected route without token redirects to /login', async () => {
    const context = await browser.newContext()
    const page = await context.newPage()
    try {
      await page.goto(dashboardUrl, { waitUntil: 'domcontentloaded' })
      await page.waitForURL('**/login', { timeout: 5_000 })
      if (!page.url().endsWith('/login')) {
        throw new Error(`Expected /login, landed on ${page.url()}`)
      }
      return 'Visiting /dashboard unauthenticated results in /login redirect.'
    } finally {
      await context.close()
    }
  })

  await runStep('6. Expired access token triggers refresh automatically', async () => {
    const context = await browser.newContext()
    const page = await context.newPage()
    try {
      await loginToDashboard(page, credentials)
      await page.evaluate(() => {
        localStorage.setItem('token', 'expired-token')
      })
      const refreshResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes('/refresh-token') && response.request().method() === 'POST',
        { timeout: 10_000 },
      )
      await page.reload({ waitUntil: 'networkidle' })
      const refreshResponse = await refreshResponsePromise
      if (refreshResponse.status() !== 200) {
        throw new Error(`Refresh endpoint returned status ${refreshResponse.status()}`)
      }
      await page.waitForSelector('text="admin@example.com"', { timeout: 10_000 })
      const storage = await page.evaluate(() => ({
        token: localStorage.getItem('token'),
        refreshToken: localStorage.getItem('refreshToken'),
      }))
      if (!storage.token || storage.token === 'expired-token') {
        throw new Error('Access token was not replaced after refresh')
      }
      return 'Refresh token renewed access seamlessly on reload.'
    } finally {
      await context.close()
    }
  })

  await browser.close()

  console.log('\nAuth flow verification results:')
  for (const result of results) {
    console.log(`${result.step.padEnd(60)} ${result.status.padEnd(4)} ${result.details}`)
  }

  const failed = results.filter((entry) => entry.status === 'FAIL')
  if (failed.length > 0) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error('Unexpected error while running auth checks:', error)
  process.exitCode = 1
})
