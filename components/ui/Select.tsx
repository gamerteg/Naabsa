'use client'
import { SelectHTMLAttributes, forwardRef, ReactNode } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  children: ReactNode
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, children, className = '', id, ...props },
  ref
) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="form-group">
      {label && <label className="field-label" htmlFor={inputId}>{label}</label>}
      <select
        ref={ref}
        id={inputId}
        className={`field-input ${error ? 'error' : ''} ${className}`}
        style={{ cursor: 'pointer' }}
        {...props}
      >
        {children}
      </select>
      {error && <span className="field-error">{error}</span>}
    </div>
  )
})
