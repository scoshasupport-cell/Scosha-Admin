#!/usr/bin/env python3
"""Ensure lib/auth.tsx captures local cart lines before setUser and hydrates API cart."""
from pathlib import Path

p = Path("/var/www/scosha/lib/auth.tsx")
t = p.read_text(encoding="utf-8")

new_merge = '''async function mergeCartAfterLogin(localLines: { variantId: string; quantity: number }[]) {
  try {
    await api.post("/cart/merge")
  } catch {
    /* guest cart may not exist */
  }

  let hasApiItems = false
  try {
    const cart = await api.get<{ items?: unknown[] }>("/cart")
    hasApiItems = Array.isArray(cart.data?.items) && cart.data.items.length > 0
  } catch {
    /* ignore */
  }

  // Only hydrate from local storage when the server cart is still empty after merge.
  if (!hasApiItems) {
    for (const line of localLines) {
      const variantId = Number(line.variantId)
      const quantity = Number(line.quantity) || 1
      if (!Number.isFinite(variantId) || variantId <= 0 || quantity < 1) continue
      try {
        await api.post("/cart/items", { variantId, quantity })
      } catch {
        /* stock / missing variant — skip */
      }
    }
  }

  // Start a fresh anonymous session id so the next guest cart cannot reuse the merged one
  rotateGuestSessionId()
}'''

import re

t2, n = re.subn(
    r"async function mergeCartAfterLogin\([\s\S]*?\n\}",
    new_merge,
    t,
    count=1,
)
if n != 1:
    # Insert after AuthContext line if function missing / signature differs
    if "mergeCartAfterLogin(localLines" not in t:
        marker = "const AuthContext = createContext<AuthContextValue | null>(null)\n"
        if marker not in t:
            raise SystemExit("AUTH_MERGE_INSERT_FAILED")
        t2 = t.replace(marker, marker + "\n" + new_merge + "\n", 1)
        print("AUTH_MERGE_INSERTED")
    else:
        raise SystemExit("AUTH_MERGE_REPLACE_FAILED")
else:
    print("AUTH_MERGE_REPLACED")

adopt = '''  const adoptCartAfterAuth = useCallback(
    async (userId: string | number) => {
      const localLines = useCart.getState().lines.map((l) => ({
        variantId: String(l.variantId),
        quantity: l.quantity,
      }))
      await mergeCartAfterLogin(localLines)
      await queryClient.removeQueries({ queryKey: ["cart"] })
      resetLocalCartForOwner(`user:${userId}`)
      await attachGuestWishlist()
    },
    [attachGuestWishlist, queryClient, resetLocalCartForOwner],
  )
'''

if "adoptCartAfterAuth" not in t2:
    marker = "  const attachGuestWishlist = useCallback(async () => {\n"
    end = "  }, [queryClient])\n"
    i = t2.find(marker)
    if i < 0:
        raise SystemExit("ATTACH_WISHLIST_MISSING")
    j = t2.find(end, i)
    if j < 0:
        raise SystemExit("ATTACH_WISHLIST_END_MISSING")
    j += len(end)
    t2 = t2[:j] + "\n" + adopt + t2[j:]
    print("ADOPT_INSERTED")
else:
    t2, n = re.subn(
        r"  const adoptCartAfterAuth = useCallback\(\n(?:.*\n)*?    \[attachGuestWishlist, queryClient, resetLocalCartForOwner\],\n  \)\n",
        adopt,
        t2,
        count=1,
    )
    print("ADOPT_OK" if n == 1 else "ADOPT_ALREADY_OR_SKIP")

# Force login/google/register/verify to adopt before setUser
replacements = [
    (
        '''  const login = useCallback(
    async (input: { email?: string; phone?: string; password: string }) => {
      const res = await api.post<{ user: AuthUser }>("/auth/login", input, { skipAuth: true })
      setUser(res.data.user)
      await mergeCartAfterLogin()
      await queryClient.removeQueries({ queryKey: ["cart"] })
      resetLocalCartForOwner(`user:${res.data.user.id}`)
      await attachGuestWishlist()
      return res.data.user
    },''',
        '''  const login = useCallback(
    async (input: { email?: string; phone?: string; password: string }) => {
      const res = await api.post<{ user: AuthUser }>("/auth/login", input, { skipAuth: true })
      await adoptCartAfterAuth(res.data.user.id)
      setUser(res.data.user)
      return res.data.user
    },''',
    ),
]

# Broader: if login still calls mergeCartAfterLogin() with no args or setUser before adopt
old_login_block = re.search(
    r"  const login = useCallback\(\n    async \(input: \{ email\?: string; phone\?: string; password: string \}\) => \{\n(?:.*\n)*?    \[[^\]]*\],\n  \)\n",
    t2,
)
if old_login_block:
    new_login = '''  const login = useCallback(
    async (input: { email?: string; phone?: string; password: string }) => {
      const res = await api.post<{ user: AuthUser }>("/auth/login", input, { skipAuth: true })
      await adoptCartAfterAuth(res.data.user.id)
      setUser(res.data.user)
      return res.data.user
    },
    [adoptCartAfterAuth],
  )
'''
    t2 = t2[: old_login_block.start()] + new_login + t2[old_login_block.end() :]
    print("LOGIN_REWIRED")

old_google = re.search(
    r"  const loginWithGoogle = useCallback\(\n    async \(accessToken: string\) => \{\n(?:.*\n)*?    \[[^\]]*\],\n  \)\n",
    t2,
)
if old_google:
    new_google = '''  const loginWithGoogle = useCallback(
    async (accessToken: string) => {
      const res = await api.post<{ user: AuthUser }>("/auth/google", { accessToken }, { skipAuth: true })
      await adoptCartAfterAuth(res.data.user.id)
      setUser(res.data.user)
      return res.data.user
    },
    [adoptCartAfterAuth],
  )
'''
    t2 = t2[: old_google.start()] + new_google + t2[old_google.end() :]
    print("GOOGLE_REWIRED")

# register: only when user is returned
t2, n = re.subn(
    r"      if \(res\.data\.user\) \{\n(?:        .*\n)+?      \}\n      return res\.data",
    '''      if (res.data.user) {
        await adoptCartAfterAuth(res.data.user.id)
        setUser(res.data.user)
      }
      return res.data''',
    t2,
    count=1,
)
print("REGISTER_REWIRED" if n == 1 else "REGISTER_SKIP")

# Fix register deps to adoptCartAfterAuth if still listing merge pieces
t2 = re.sub(
    r"(  const register = useCallback\([\s\S]*?\n    )\[([^\]]*)\],(\n  \)\n\n  const verifyEmail)",
    r"\1[adoptCartAfterAuth],\3",
    t2,
    count=1,
)

old_verify = re.search(
    r"  const verifyEmail = useCallback\(\n    async \(email: string, otp: string\) => \{\n(?:.*\n)*?    \[[^\]]*\],\n  \)\n",
    t2,
)
if old_verify:
    new_verify = '''  const verifyEmail = useCallback(
    async (email: string, otp: string) => {
      const res = await api.post<{ user: AuthUser }>("/auth/verify-email", { email, otp }, { skipAuth: true })
      await adoptCartAfterAuth(res.data.user.id)
      setUser(res.data.user)
      return res.data.user
    },
    [adoptCartAfterAuth],
  )
'''
    t2 = t2[: old_verify.start()] + new_verify + t2[old_verify.end() :]
    print("VERIFY_REWIRED")

if "adoptCartAfterAuth" not in t2 or "mergeCartAfterLogin(localLines" not in t2:
    raise SystemExit("AUTH_PATCH_INCOMPLETE")

p.write_text(t2, encoding="utf-8")
print("AUTH_DONE")
