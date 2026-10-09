/**
 * nav.js — Spatial D-pad navigation for Samsung TV
 * Exported as window.Nav
 */
const Nav = (() => {
  let focused = null
  let enabled = true

  /**
   * Return all focusable elements that are currently visible
   * (not hidden, not inside an inactive screen)
   */
  function getItems() {
    return [...document.querySelectorAll('[data-focusable]')]
      .filter(el => {
        // Must be attached to layout (not display:none)
        if (el.offsetParent === null) return false
        // Must not be inside a screen that is not active
        const screen = el.closest('.screen')
        if (screen && !screen.classList.contains('active')) return false
        // Must not be inside a hidden setup panel
        const panel = el.closest('.setup-panel')
        if (panel && !panel.classList.contains('active')) return false
        return true
      })
  }

  /**
   * Move focus to a specific element
   */
  function setFocus(el) {
    if (!el) return
    if (focused) focused.classList.remove('focused')
    focused = el
    el.classList.add('focused')
    el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
  }

  /**
   * Focus the first available focusable element
   */
  function focusFirst() {
    const items = getItems()
    if (items.length) setFocus(items[0])
    else focused = null
  }

  /**
   * Move focus in a direction using spatial scoring.
   * Directional bias: perpendicular distance is penalised 4×.
   */
  function move(dir) {
    if (!enabled) return
    if (!focused || !document.contains(focused)) {
      focusFirst()
      return
    }

    const rect = focused.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2

    const candidates = getItems()
      .filter(el => el !== focused)
      .filter(el => {
        const r = el.getBoundingClientRect()
        const ex = r.left + r.width / 2
        const ey = r.top + r.height / 2
        switch (dir) {
          case 'left':  return ex < cx - 20
          case 'right': return ex > cx + 20
          case 'up':    return ey < cy - 20
          case 'down':  return ey > cy + 20
          default:      return false
        }
      })
      .map(el => {
        const r = el.getBoundingClientRect()
        const ex = r.left + r.width / 2
        const ey = r.top + r.height / 2
        const dx = ex - cx
        const dy = ey - cy
        const primary = (dir === 'left' || dir === 'right') ? Math.abs(dx) : Math.abs(dy)
        const secondary = (dir === 'left' || dir === 'right') ? Math.abs(dy) : Math.abs(dx)
        const score = primary + secondary * 4
        return { el, score }
      })
      .sort((a, b) => a.score - b.score)

    if (candidates.length) {
      setFocus(candidates[0].el)
    }
  }

  /**
   * Trigger a click on the currently focused element
   */
  function select() {
    if (focused) focused.click()
  }

  /**
   * Disable navigation (e.g., during text input or loading)
   */
  function disable() {
    enabled = false
  }

  /**
   * Re-enable navigation and focus first visible item
   */
  function enable() {
    enabled = true
    focusFirst()
  }

  /**
   * Get the currently focused element
   */
  function getCurrent() {
    return focused
  }

  return { focusFirst, setFocus, move, select, enable, disable, getCurrent }
})()

window.Nav = Nav
