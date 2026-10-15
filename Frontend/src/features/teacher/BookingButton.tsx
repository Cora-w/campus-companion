import { Button, Tooltip } from 'antd'
import './BookingButton.css'

export function BookingButton({ onClick, disabled = false, label = '约谈学生' }: { onClick: () => void; disabled?: boolean; label?: string }) {
  return <Tooltip title={label}>
    <span className="teacher-booking-control">
      <Button type="primary" className="teacher-booking-button" aria-label={label} title={label} disabled={disabled} onClick={onClick}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="7.5" cy="8" r="3"/>
          <path d="M2.5 20v-2a5 5 0 0 1 10 0v2M15 4h6v7h-3l-3 3V4Z"/>
        </svg>
      </Button>
    </span>
  </Tooltip>
}
