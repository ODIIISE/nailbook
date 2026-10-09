import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  // Non-interactive element: no focus styles. Pill family, never rectangles.
  // Tone variants map the v2 signature tones (dot + tinted shell).
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-caption tracking-[0.01em]",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive/10 text-destructive",
        outline: "text-foreground",
        success: "border-transparent bg-success/10 text-success",
        pearl: "tone-pearl",
        gold: "tone-gold",
        sage: "tone-sage",
        wine: "tone-wine",
        rose: "tone-rose",
        mute: "tone-mute",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
