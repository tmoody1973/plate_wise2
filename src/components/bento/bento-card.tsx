import * as React from 'react'
import { cn } from '@/utils/helpers'
import { BENTO_SIZES } from '@/utils/constants'

export interface BentoCardProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: keyof typeof BENTO_SIZES
  culturalTheme?: string
  priority?: number
}

const BentoCard = React.forwardRef<HTMLDivElement, BentoCardProps>(
  ({ className, size = 'medium', culturalTheme, priority, children, ...props }, ref) => {
    return (
      <div
        className={cn(
          'bento-card',
          BENTO_SIZES[size],
          culturalTheme && `theme-${culturalTheme}`,
          className
        )}
        style={{ order: priority }}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    )
  }
)
BentoCard.displayName = 'BentoCard'

export { BentoCard }