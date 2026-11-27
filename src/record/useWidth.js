import { useLayoutEffect, useState } from 'react'

// The element's content width in CSS pixels, kept current as it resizes.
export function useWidth(ref, fallback = 600) {
  const [w, setW] = useState(fallback)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const read = () => setW(Math.round(el.getBoundingClientRect().width) || fallback)
    read()
    if (typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(read)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref, fallback])
  return w
}
