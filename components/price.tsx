"use client"

import { useCurrency } from "@/lib/use-currency"
import { cn } from "@/lib/utils"

export function Price({
  amount,
  className,
  compareClassName,
  compareAt,
  prefix,
}: {
  amount: number
  className?: string
  compareClassName?: string
  compareAt?: number
  prefix?: string
}) {
  const { format } = useCurrency()
  return (
    <span className="inline-flex items-baseline gap-2">
      {prefix ? <span className={className}>{prefix}</span> : null}
      <span className={className}>{format(amount)}</span>
      {compareAt && compareAt > amount ? (
        <span className={cn("text-muted-foreground line-through", compareClassName)}>{format(compareAt)}</span>
      ) : null}
    </span>
  )
}
