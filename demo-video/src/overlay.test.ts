import { chromium, type Browser, type Page } from 'playwright'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { clearCaption, installOverlayOnNavigation, showCaption, showCard } from './overlay'

let browser: Browser
let page: Page
const url = (body: string) => `data:text/html,<body>${body}</body>`

beforeAll(async () => {
  browser = await chromium.launch()
  page = await (await browser.newContext()).newPage()
  await installOverlayOnNavigation(page)
  await page.goto(url('one'))
})
afterAll(() => browser.close())

describe('overlay', () => {
  it('shows and replaces a caption', async () => {
    await showCaption(page, 'Hello')
    expect(await page.locator('#demo-caption').textContent()).toBe('Hello')
    await showCaption(page, 'World')
    expect(await page.locator('#demo-caption').count()).toBe(1)
    expect(await page.locator('#demo-caption').textContent()).toBe('World')
  })
  it('keeps the caption across navigation', async () => {
    await page.goto(url('two'))
    await page.waitForSelector('#demo-caption')
    expect(await page.locator('#demo-caption').textContent()).toBe('World')
  })
  it('clears the caption', async () => {
    await clearCaption(page)
    expect(await page.locator('#demo-caption').count()).toBe(0)
    await page.goto(url('three'))
    expect(await page.locator('#demo-caption').count()).toBe(0)
  })
  it('renders a title card', async () => {
    await showCard(page, { title: 'SafeDesk', subtitle: 'Sub line' })
    const text = await page.locator('body').innerText()
    expect(text).toContain('SafeDesk')
    expect(text).toContain('Sub line')
  })
})
