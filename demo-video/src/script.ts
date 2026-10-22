import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

export interface Scene {
  id: string
  caption: string
  narration: string
  card?: { title: string; subtitle?: string }
  holdMs: number
}

export function loadScript(path = fileURLToPath(new URL('../script.json', import.meta.url))): { teamName: string; scenes: Scene[] } {
  const raw = JSON.parse(fs.readFileSync(path, 'utf8'))
  if (typeof raw.teamName !== 'string' || !Array.isArray(raw.scenes)) throw new Error('script.json: need teamName and scenes')
  for (const s of raw.scenes) {
    for (const k of ['id', 'caption', 'narration'] as const) {
      if (typeof s[k] !== 'string' || !s[k]) throw new Error(`script.json: scene ${s.id ?? '?'} missing ${k}`)
    }
    if (!Number.isInteger(s.holdMs) || s.holdMs < 1) throw new Error(`script.json: scene ${s.id} needs a positive integer holdMs`)
  }
  return raw
}
