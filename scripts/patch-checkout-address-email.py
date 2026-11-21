#!/usr/bin/env python3
from pathlib import Path

p = Path("/var/www/scosha/app/checkout/page.tsx")
t = p.read_text(encoding="utf-8")
old = """      const res = await api.post<ApiAddress>("/addresses", {
        ...newAddr,
        email: user?.email,
        isDefault: addresses.length === 0,
      })"""
new = """      const email =
        typeof user?.email === "string" && user.email.includes("@") ? user.email : undefined
      const res = await api.post<ApiAddress>("/addresses", {
        ...newAddr,
        ...(email ? { email } : {}),
        isDefault: addresses.length === 0,
      })"""
if old not in t:
    if "user.email.includes(\"@\")" in t:
        print("ALREADY_PATCHED")
        raise SystemExit(0)
    raise SystemExit("PATCH_TARGET_MISSING")
p.write_text(t.replace(old, new, 1), encoding="utf-8")
print("CHECKOUT_ADDRESS_EMAIL_PATCHED")
