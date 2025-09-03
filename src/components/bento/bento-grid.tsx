import * as React from 'react'
import { cn } from '@/utils/helpers'

export interface BentoGridProps extends React.HTMLAttributes<HTMLDivElement> {
  culturalTheme?: string
}

const BentoGrid = React.forwardRef<HTMLDivElement, BentoGridProps>(
  ({ className, culturalTheme, children, ...props }, ref) => {
    return (
      <div
        className={cn(
          'bento-grid',
          culturalTheme && `theme-${culturalTheme}`,
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    )
  }
)
BentoGrid.displayName = 'BentoGrid'

export { BentoGrid }