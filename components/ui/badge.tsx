import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-lg border px-3 py-1 text-xs font-bold w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1.5 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-all duration-200 overflow-hidden',
  {
    variants: {
      variant: {
        default:
          'border-primary/40 bg-gradient-to-b from-primary/15 to-primary/10 text-primary font-bold [a&]:hover:border-primary/60 [a&]:hover:bg-primary/20 hover:shadow-lg hover:shadow-primary/20',
        secondary:
          'border-secondary/40 bg-secondary/10 text-secondary-foreground font-bold [a&]:hover:border-secondary/60 [a&]:hover:bg-secondary/20',
        destructive:
          'border-destructive/40 bg-gradient-to-b from-destructive/15 to-destructive/10 text-destructive font-bold [a&]:hover:border-destructive/60 [a&]:hover:bg-destructive/20 hover:shadow-lg hover:shadow-destructive/20',
        outline:
          'border-primary/30 bg-primary/5 text-foreground font-semibold [a&]:hover:border-primary/50 [a&]:hover:bg-primary/10 [a&]:hover:text-primary transition-all',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'span'

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
