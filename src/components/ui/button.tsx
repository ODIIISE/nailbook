import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  // Studio: every button is a pill. Primary is the pearl gradient
  // (--button-primary-bg); glass/ghost/danger follow the v2 kit.
  // Disabled stays tinted and legible — never opacity-50 text collapse.
  "group/button inline-flex shrink-0 items-center justify-center rounded-full border border-transparent bg-clip-padding text-sm font-normal whitespace-nowrap outline-none select-none transition-transform duration-[var(--duration-micro)] ease-[var(--ease-standard)] focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring active:not-aria-[haspopup]:scale-[0.97] aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 " +
    "disabled:pointer-events-none disabled:border-transparent disabled:bg-primary/15 disabled:text-foreground/70",
  {
    variants: {
      variant: {
        default: "bg-[var(--button-primary-bg)] text-[var(--button-primary-text)] hover:brightness-105 font-normal",
        outline:
          "border-[var(--line2)] bg-[var(--glass)] backdrop-blur-xl hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "text-muted-foreground hover:text-foreground hover:bg-muted aria-expanded:bg-muted aria-expanded:text-foreground",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
        paper:
          "rounded-full bg-foreground text-background hover:bg-foreground/85",
      },
      size: {
        xs: "h-[var(--btn-xs)] gap-1 px-2 text-caption has-data-[icon=inline-end]:pe-1.5 has-data-[icon=inline-start]:ps-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-[var(--btn-sm)] gap-1 px-2.5 text-caption has-data-[icon=inline-end]:pe-1.5 has-data-[icon=inline-start]:ps-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        md: "h-[var(--btn-md)] gap-1.5 px-3 text-sm has-data-[icon=inline-end]:pe-2 has-data-[icon=inline-start]:ps-2",
        lg: "h-[var(--btn-lg)] gap-1.5 px-4 text-sm has-data-[icon=inline-end]:pe-2.5 has-data-[icon=inline-start]:ps-2.5",
        xl: "h-[var(--btn-xl)] gap-2 px-5 text-sm has-data-[icon=inline-end]:pe-3 has-data-[icon=inline-start]:ps-3",
        "2xl": "h-[var(--btn-2xl)] gap-2 px-6 text-base has-data-[icon=inline-end]:pe-4 has-data-[icon=inline-start]:ps-4",
        icon: "size-[var(--btn-md)] rounded-full",
        "icon-sm": "size-[var(--btn-sm)] rounded-full",
        "icon-lg": "size-[var(--btn-lg)] rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "md",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
