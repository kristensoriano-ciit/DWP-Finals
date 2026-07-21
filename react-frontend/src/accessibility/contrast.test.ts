import appCss from '../App.css?raw'
import indexCss from '../index.css?raw'

function luminance(hex: string) {
  const channels = hex.match(/[a-f\d]{2}/gi)!.map((value) => {
    const channel = Number.parseInt(value, 16) / 255
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
}

function contrast(foreground: string, background: string) {
  const values = [luminance(foreground), luminance(background)].sort((left, right) => right - left)
  return (values[0] + 0.05) / (values[1] + 0.05)
}

it('keeps muted and fallback text at WCAG AA contrast', () => {
  const muted = indexCss.match(/--muted:\s*(#[a-f\d]{6})/i)?.[1]
  expect(muted).toBeDefined()
  expect(contrast(muted!, '#f4f1e9')).toBeGreaterThanOrEqual(4.5)
  expect(contrast(muted!, '#d9d5cc')).toBeGreaterThanOrEqual(4.5)
  expect(appCss).toMatch(/\.featured\s*>\s*\.content-image\s+\.content-image__fallback\s*{[^}]*background:\s*#15201b/s)
})
