import React, { forwardRef, useMemo, useRef, useState } from 'react'
import DatePicker from 'react-datepicker'
import { Calendar as CalendarIcon } from 'lucide-react'
import { format, parseISO, isValid } from 'date-fns'
import 'react-datepicker/dist/react-datepicker.css'

// Stable inner input so Popper can measure the correct anchor
const InnerInput = forwardRef(function InnerInput(props, ref){
  const { value, onClick, onChange, onBlur, onFocus, placeholder, className } = props
  return (
    <input
      ref={ref}
      onClick={onClick}
      onChange={onChange}
      onBlur={onBlur}
      onFocus={onFocus}
      value={value}
      placeholder={placeholder}
      className={className}
      readOnly
    />
  )
})

// A unified date input that stores value as 'yyyy-MM-dd' string
// Props: value, onChange(str), placeholder, className, popperPlacement ('auto'|'top-start' etc.), portalId (optional), usePortal (bool)
const DateInput = ({ value, onChange, placeholder = 'yyyy-mm-dd', className = '', popperPlacement = 'bottom-start', portalId = null, usePortal = true }, ref) => {
  const wrapRef = useRef(null)
  const dpRef = useRef(null)
  const [open, setOpen] = useState(false)
  const selected = useMemo(() => {
    if (!value) return null
    try {
      // value expected in yyyy-MM-dd
      const d = parseISO(value)
      return isValid(d) ? d : null
    } catch {
      return null
    }
  }, [value])

  return (
    <div className="relative" ref={wrapRef}>
      <DatePicker
        ref={dpRef}
        open={open}
        selected={selected}
        onChange={(d) => {
          if (!d || !isValid(d)) { onChange(''); return }
          onChange(format(d, 'yyyy-MM-dd'))
          // close after selection for better UX
          setOpen(false)
        }}
        placeholderText={placeholder}
        dateFormat="yyyy-MM-dd"
        customInput={<InnerInput placeholder={placeholder} className={`input pr-9 ${className}`} />}
        popperPlacement={popperPlacement}
        calendarClassName="msm-datepicker"
        popperClassName="msm-datepicker-popper"
        showPopperArrow={false}
        onInputClick={()=> setOpen(true)}
        onFocus={()=> setOpen(true)}
        onCalendarClose={()=> setOpen(false)}
        // Render the calendar in a portal to avoid clipping within overflow/positioned parents
        {...(usePortal ? { withPortal: true } : {})}
        {...(portalId ? { portalId } : {})}
      />
      <CalendarIcon
        size={16}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
        onClick={()=>{
          try {
            const el = wrapRef.current?.querySelector('input')
            el?.focus()
            // Explicitly open the calendar popper for reliability
            setOpen(true)
          } catch(_){}
        }}
        title="Open calendar"
      />
    </div>
  )
}

export default forwardRef(DateInput)
