import { describe, expect, it } from 'vitest'
import { loadScript } from './script'

const IDS = ['hook', 'customer-status', 'customer-small-refund', 'attack', 'tide-login', 'admin-deny', 'admin-approve', 'audit', 'close']

describe('loadScript', () => {
  const { scenes, teamName } = loadScript()

  it('has the nine scenes in order', () => {
    expect(scenes.map((s) => s.id)).toEqual(IDS)
    expect(teamName).toBe('The Farmers')
  })
  it('has caption, narration and a positive integer holdMs on every scene', () => {
    for (const s of scenes) {
      expect(s.caption.length).toBeGreaterThan(0)
      expect(s.narration.length).toBeGreaterThan(0)
      expect(Number.isInteger(s.holdMs) && s.holdMs > 0).toBe(true)
    }
  })
  it('never overclaims', () => {
    const text = scenes.map((s) => `${s.caption} ${s.narration}`).join(' ').toLowerCase()
    for (const bad of ['password', 'tamper-proof', 'real payments']) expect(text).not.toContain(bad)
  })
  it('hook and close have a card', () => {
    for (const id of ['hook', 'close']) expect(scenes.find((s) => s.id === id)?.card).toBeTruthy()
  })
})
