import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-[14px] border border-transparent bg-clip-padding text-[15px] font-bold whitespace-nowrap transition-all duration-180 outline-none select-none focus-visible:ring-2 focus-visible:ring-primary/30 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 min-h-[48px] min-w-[48px] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_2px_12px_rgba(184,112,112,0.25)] hover:shadow-[0_4px_18px_rgba(184,112,112,0.35)]",
        outline: "glass hover:bg-white/55 text-foreground border-white/40",
        secondary: "glass hover:bg-white/70 text-foreground border-white/30",
        ghost: "hover:bg-white/30 text-foreground",
        destructive: "bg-destructive text-white hover:bg-destructive/90 shadow-[0_2px_10px_rgba(220,53,69,0.2)]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-12 px-6",
        sm: "h-11 px-4 text-[13px] rounded-[12px]",
        lg: "h-14 px-8 text-[17px] rounded-[16px]",
        icon: "h-12 w-12",
        "icon-sm": "h-10 w-10 rounded-[12px]",
        "icon-lg": "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
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
