import type { ReactNode } from 'react'

type IconProps = { size?: number; className?: string }

function Svg({ size = 18, className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export const BackIcon = (props: IconProps) => <Svg {...props}><path d="M19 12H5M11 6l-6 6 6 6" /></Svg>
export const ArrowRightIcon = (props: IconProps) => <Svg {...props}><path d="M5 12h14M13 6l6 6-6 6" /></Svg>
export const ChevronLeftIcon = (props: IconProps) => <Svg {...props}><path d="M15 6l-6 6 6 6" /></Svg>
export const ChevronRightIcon = (props: IconProps) => <Svg {...props}><path d="M9 6l6 6-6 6" /></Svg>
export const CloseIcon = (props: IconProps) => <Svg {...props}><path d="M6 6l12 12M18 6L6 18" /></Svg>
export const CheckIcon = (props: IconProps) => <Svg {...props}><path d="M5 12.5l4.5 4.5L19 7.5" /></Svg>
export const ExternalIcon = (props: IconProps) => <Svg {...props}><path d="M14 5h5v5M19 5l-8 8M18 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4" /></Svg>
export const PlayIcon = (props: IconProps) => <Svg {...props}><path d="M8 5.5v13l10-6.5z" fill="currentColor" /></Svg>
export const PauseIcon = (props: IconProps) => <Svg {...props}><path d="M8 5v14M16 5v14" /></Svg>
export const StepBackIcon = (props: IconProps) => <Svg {...props}><path d="M15 6l-6 6 6 6" /></Svg>
export const StepForwardIcon = (props: IconProps) => <Svg {...props}><path d="M9 6l6 6-6 6" /></Svg>
export const SkipStartIcon = (props: IconProps) => <Svg {...props}><path d="M6 5v14M17 6l-6 6 6 6" /></Svg>
export const SkipEndIcon = (props: IconProps) => <Svg {...props}><path d="M18 5v14M7 6l6 6-6 6" /></Svg>
export const TurnRightIcon = (props: IconProps) => <Svg {...props}><path d="M20 11a8 8 0 1 1-2.3-5.7M20 4v5h-5" /></Svg>
export const TurnLeftIcon = (props: IconProps) => <Svg {...props}><path d="M4 11a8 8 0 1 0 2.3-5.7M4 4v5h5" /></Svg>
export const CalendarIcon = (props: IconProps) => <Svg {...props}><rect x="4" y="5" width="16" height="15" rx="3" /><path d="M8 3v4M16 3v4M4 10h16" /></Svg>
export const ShuffleIcon = (props: IconProps) => <Svg {...props}><path d="M4 7h3l10 10h3M4 17h3l3-3M14 10l3-3h3M18 4l3 3-3 3M18 14l3 3-3 3" /></Svg>
export const PencilIcon = (props: IconProps) => <Svg {...props}><path d="M4 20l4-1L19 8l-3-3L5 16zM14 7l3 3" /></Svg>
export const SoundIcon = (props: IconProps) => <Svg {...props}><path d="M4 9v6h4l5 4V5L8 9zM16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" /></Svg>
export const SoundOffIcon = (props: IconProps) => <Svg {...props}><path d="M4 9v6h4l5 4V5L8 9zM17 10l4 4M21 10l-4 4" /></Svg>
export const MusicIcon = (props: IconProps) => <Svg {...props}><path d="M9 17V5l11-2v12" /><circle cx="6.5" cy="17" r="2.5" /><circle cx="17.5" cy="15" r="2.5" /></Svg>
export const MusicOffIcon = (props: IconProps) => (
  <Svg {...props}><path d="M9 17V5l11-2v12" /><circle cx="6.5" cy="17" r="2.5" /><circle cx="17.5" cy="15" r="2.5" /><path d="M3 3l18 18" /></Svg>
)
export const StarIcon = (props: IconProps) => (
  <svg viewBox="0 0 24 24" width={props.size ?? 18} height={props.size ?? 18} className={props.className} aria-hidden="true">
    <path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z" fill="currentColor" />
  </svg>
)

export function Stars({ count, size = 18 }: { count: number; size?: number }) {
  return (
    <span className="stars-inline" role="img" aria-label={`${count} of 3 stars`}>
      {[1, 2, 3].map((star) => <StarIcon key={star} size={size} className={star <= count ? 'is-earned' : ''} />)}
    </span>
  )
}
