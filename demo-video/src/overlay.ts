import type { Page } from 'playwright'

const captions = new WeakMap<Page, string | undefined>()

async function apply(page: Page, text: string | undefined): Promise<void> {
  await page
    .evaluate((t) => {
      document.getElementById('demo-caption')?.remove()
      if (!t) return
      const el = document.createElement('div')
      el.id = 'demo-caption'
      el.textContent = t
      el.style.cssText =
        'position:fixed;left:50%;bottom:36px;transform:translateX(-50%);max-width:78%;z-index:2147483647;' +
        'padding:14px 28px;border-radius:14px;background:rgba(10,38,40,.92);color:#fff;' +
        'font:600 30px/1.35 system-ui,Segoe UI,sans-serif;text-align:center;box-shadow:0 8px 30px rgba(0,0,0,.35);pointer-events:none'
      document.documentElement.appendChild(el)
    }, text)
    .catch(() => {})
}

export async function showCaption(page: Page, text: string): Promise<void> {
  captions.set(page, text)
  await apply(page, text)
}

export async function clearCaption(page: Page): Promise<void> {
  captions.set(page, undefined)
  await apply(page, undefined)
}

/** Re-applies the current caption after each navigation. */
export async function installOverlayOnNavigation(page: Page): Promise<void> {
  page.on('domcontentloaded', () => void apply(page, captions.get(page)))
}

export async function showCard(page: Page, card: { title: string; subtitle?: string }): Promise<void> {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
  const html =
    `<!doctype html><meta charset="utf-8"><body style="margin:0;height:100vh;display:flex;flex-direction:column;` +
    `align-items:center;justify-content:center;gap:28px;background:oklch(0.27 0.04 185);color:oklch(0.93 0.02 185);` +
    `font-family:system-ui,Segoe UI,sans-serif;text-align:center;padding:0 12%">` +
    `<h1 style="margin:0;font-size:68px;line-height:1.15;font-weight:650">${esc(card.title)}</h1>` +
    (card.subtitle ? `<p style="margin:0;font-size:34px;color:oklch(0.8 0.03 185)">${esc(card.subtitle)}</p>` : '') +
    `</body>`
  await page.goto(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
}
