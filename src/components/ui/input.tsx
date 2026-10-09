import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

const inputVariants = {
  size: {
    sm: "h-[var(--field-sm)] rounded-[16px] px-2.5 py-1 text-base md:text-sm",
    md: "h-[var(--field-md)] rounded-[16px] px-3 py-1.5 text-base md:text-sm",
    lg: "h-[var(--field-lg)] rounded-[16px] px-3 py-2 text-base",
    xl: "h-[var(--field-xl)] rounded-[16px] px-3 py-2 text-base",
  },
}

interface InputProps extends React.ComponentProps<"input"> {
  inputSize?: keyof typeof inputVariants.size;
}

function Input({ className, type, inputSize = "xl", ...props }: InputProps) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "w-full min-w-0 border border-input bg-[var(--input-bg)] outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-normal file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:text-foreground/70 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        inputVariants.size[inputSize],
        className
      )}
      {...props}
    />
  )
}

export { Input, inputVariants }
