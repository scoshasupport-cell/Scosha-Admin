"use client"

import { useEffect, useMemo, useState } from "react"
import {
  COUNTRY_DIALS,
  DEFAULT_COUNTRY_ISO,
  composeE164,
  getCountryByIso,
  splitPhone,
} from "@/lib/country-codes"
import { cn } from "@/lib/utils"

type PhoneFieldProps = {
  value: string
  onChange: (e164: string) => void
  label?: string
  required?: boolean
  disabled?: boolean
  id?: string
  name?: string
  className?: string
  /** Scosha uses rounded pills on account; welcome modal uses rounded-xl */
  variant?: "pill" | "soft" | "square"
}

export function PhoneField({
  value,
  onChange,
  label,
  required,
  disabled,
  id = "phone",
  name = "phone",
  className,
  variant = "pill",
}: PhoneFieldProps) {
  const parsed = useMemo(() => splitPhone(value), [value])
  const [iso, setIso] = useState(parsed.iso || DEFAULT_COUNTRY_ISO)
  const [national, setNational] = useState(parsed.national)

  useEffect(() => {
    const composed = composeE164(getCountryByIso(iso).dial, national)
    if (value === composed) return
    const next = splitPhone(value, iso)
    setIso(next.iso)
    setNational(next.national)
  }, [value, iso, national])

  const country = getCountryByIso(iso)
  const shell =
    variant === "pill"
      ? "rounded-full bg-[#ededed]"
      : variant === "soft"
        ? "rounded-xl bg-[#ededed]"
        : "rounded-[10px] border border-border-subtle bg-white"

  function emit(nextIso: string, nextNational: string) {
    const c = getCountryByIso(nextIso)
    onChange(composeE164(c.dial, nextNational))
  }

  return (
    <div className={cn("w-full", className)}>
      {label ? (
        <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted">
          {label}
        </span>
      ) : null}
      <div className={cn("flex h-12 w-full overflow-hidden", shell)}>
        <select
          aria-label="Country code"
          disabled={disabled}
          value={iso}
          onChange={(e) => {
            const nextIso = e.target.value
            setIso(nextIso)
            emit(nextIso, national)
          }}
          className="max-w-[7.25rem] shrink-0 border-0 border-r border-black/10 bg-transparent py-0 pl-3 pr-1 text-[13px] outline-none disabled:opacity-50"
        >
          {COUNTRY_DIALS.map((c) => (
            <option key={c.iso} value={c.iso}>
              {c.flag} +{c.dial}
            </option>
          ))}
        </select>
        <input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          required={required}
          disabled={disabled}
          placeholder="Phone number"
          value={national}
          onChange={(e) => {
            const next = e.target.value.replace(/[^\d\s()-]/g, "")
            setNational(next)
            emit(iso, next)
          }}
          className="min-w-0 flex-1 border-0 bg-transparent px-3 text-[15px] outline-none disabled:opacity-50"
        />
      </div>
      <p className="mt-1 text-[11px] text-muted">
        {country.flag} {country.name} (+{country.dial})
      </p>
      {/* Full E.164 for native form submits */}
      <input type="hidden" name={name} value={composeE164(country.dial, national)} readOnly />
    </div>
  )
}
