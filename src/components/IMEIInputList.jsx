import { useEffect, useMemo, useRef } from 'react'
import { normalizeIMEI, isCompleteIMEI } from '../utils/imei'

/**
 * IMEIInputList
 * - Renders a vertical list of inputs for IMEIs
 * - Auto-advances focus on Enter or when value looks complete (length 14-17)
 * - Appends a new empty input when last one is filled to keep scanning hands-free
 * - Supports manual typing and editing
 *
 * Props:
 * - values: string[] (controlled)
 * - onChange: (next: string[]) => void
 * - autoFocusFirst?: boolean (default true)
 * - max?: number (optional limit of IMEIs)
 * - placeholderBase?: string (default 'IMEI')
 * - showIndex?: boolean (default true)
 */
export default function IMEIInputList({
  values = [''],
  onChange,
  autoFocusFirst = true,
  max,
  placeholderBase = 'IMEI',
  showIndex = true,
}) {
  const arr = Array.isArray(values) && values.length > 0 ? values : ['']
  const inputsRef = useRef([])

  // Keep refs size in sync
  useEffect(() => {
    inputsRef.current = inputsRef.current.slice(0, arr.length)
  }, [arr.length])

  const canAddMore = typeof max === 'number' ? arr.length < max : true

  const setAt = (idx, raw) => {
    const next = [...arr]
    next[idx] = normalizeIMEI(raw)
    // If last has content and can add more, append an empty slot
    if (idx === arr.length - 1 && next[idx] && canAddMore) {
      next.push('')
    }
    onChange?.(next)
  }

  const removeAt = (idx) => {
    const next = arr.filter((_, i) => i !== idx)
    onChange?.(next.length ? next : [''])
    // focus previous
    queueMicrotask(() => {
      const target = inputsRef.current[Math.max(0, idx - 1)]
      target?.focus()
    })
  }

  const focusAt = (idx) => {
    const el = inputsRef.current[idx]
    el?.focus()
    el?.select?.()
  }

  const handleKeyDown = (e, idx) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (idx === arr.length - 1) {
        if (arr[idx]) {
          // Ensure next slot exists
          if (canAddMore) onChange?.([...arr, ''])
          queueMicrotask(() => focusAt(Math.min(idx + 1, (inputsRef.current.length))))
        }
      } else {
        focusAt(idx + 1)
      }
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (idx < arr.length - 1) focusAt(idx + 1)
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (idx > 0) focusAt(idx - 1)
    }
    if (e.key === 'Backspace' && !arr[idx] && idx > 0) {
      // If empty and backspace, go to previous
      focusAt(idx - 1)
    }
  }

  const handleChange = (e, idx) => {
    const val = e.target.value
    setAt(idx, val)
    const normalized = normalizeIMEI(val)
    if (isCompleteIMEI(normalized)) {
      // Auto-advance on complete-looking value
      queueMicrotask(() => {
        if (idx === arr.length - 1) {
          if (normalized && canAddMore) onChange?.([...arr.slice(0, idx + 1), normalized, ''])
          focusAt(idx + 1)
        } else {
          focusAt(idx + 1)
        }
      })
    }
  }

  return (
    <div className="space-y-2">
      {arr.map((v, i) => (
        <div key={i} className="flex items-center gap-2">
          {showIndex && (
            <div className="w-8 text-xs text-gray-500 text-right">{i + 1}.</div>
          )}
          <input
            ref={(el) => (inputsRef.current[i] = el)}
            className="input flex-1"
            placeholder={`${placeholderBase} ${i + 1}`}
            value={v}
            onChange={(e) => handleChange(e, i)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            autoFocus={autoFocusFirst && i === 0}
            inputMode="numeric"
            pattern="[0-9]*"
          />
          {v ? (
            <button type="button" className="btn-secondary btn-sm" onClick={() => setAt(i, '')}>Clear</button>
          ) : (
            i > 0 && (
              <button type="button" className="btn-secondary btn-sm" onClick={() => removeAt(i)}>Remove</button>
            )
          )}
        </div>
      ))}
    </div>
  )
}
