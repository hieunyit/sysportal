'use client'

import { useTheme } from 'next-themes'
import { Toaster as Sonner, ToasterProps } from 'sonner'

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      closeButton
      richColors
      expand={false}
      duration={2200}
      position="top-center"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:rounded-xl group-[.toaster]:border group-[.toaster]:border-border/80 group-[.toaster]:bg-card/95 group-[.toaster]:px-4 group-[.toaster]:py-3 group-[.toaster]:shadow-[0_24px_80px_-42px_rgba(15,23,42,0.88)]",
          title: "text-sm font-semibold text-foreground",
          description: "text-xs text-muted-foreground",
          closeButton:
            "group-[.toast]:border-border/80 group-[.toast]:bg-background/70 group-[.toast]:text-muted-foreground",
        },
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
