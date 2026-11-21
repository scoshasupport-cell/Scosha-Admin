#!/usr/bin/env python3
"""Patch storefront checkout email-verify gate (phone-only COD allowed). Run on VPS in /var/www/scosha."""
from pathlib import Path

checkout = Path("app/checkout/page.tsx")
account = Path("app/account/page.tsx")

t = checkout.read_text()
if "const needsEmailVerify = Boolean(user?.email) && !user?.isEmailVerified" not in t:
    old = """    if (!user?.isEmailVerified) {
      toast.error("Verify your email before placing an order")
      router.push(`/verify-email?email=${encodeURIComponent(user?.email || "")}`)
      return
    }"""
    new = """    if (needsEmailVerify) {
      toast.error("Verify your email before placing an order")
      router.push(`/verify-email?email=${encodeURIComponent(user?.email || "")}`)
      return
    }"""
    if old not in t:
        raise SystemExit("checkout placeOrder block not found")
    t = t.replace(old, new, 1)
    t = t.replace("{!user?.isEmailVerified && (", "{needsEmailVerify && (", 1)
    t = t.replace("disabled={busy}", "disabled={busy || needsEmailVerify}", 1)
    marker = "  const total = Math.max(0, subtotal + shipping - effectiveDiscount)\n\n  useEffect(() => {"
    insert = (
        "  const total = Math.max(0, subtotal + shipping - effectiveDiscount)\n\n"
        "  // Match API: email accounts must verify; phone-only accounts can place COD without email.\n"
        "  const needsEmailVerify = Boolean(user?.email) && !user?.isEmailVerified\n\n"
        "  useEffect(() => {"
    )
    if marker not in t:
        raise SystemExit("checkout marker not found")
    t = t.replace(marker, insert, 1)
    checkout.write_text(t)
    print("CHECKOUT_PATCHED")
else:
    print("CHECKOUT_OK")

t2 = account.read_text()
old2 = "{!user.isEmailVerified && ("
new2 = "{Boolean(user.email) && !user.isEmailVerified && ("
if old2 in t2:
    account.write_text(t2.replace(old2, new2, 1))
    print("ACCOUNT_PATCHED")
else:
    print("ACCOUNT_OK")
