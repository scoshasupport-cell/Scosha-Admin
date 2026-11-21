"use client"

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""

type TokenClient = {
  requestAccessToken: () => void
}

type GoogleAccounts = {
  oauth2: {
    initTokenClient: (config: {
      client_id: string
      scope: string
      callback: (response: { access_token?: string; error?: string }) => void
    }) => TokenClient
  }
}

declare global {
  interface Window {
    google?: { accounts: GoogleAccounts }
  }
}

let scriptPromise: Promise<void> | null = null

function loadGoogleScript() {
  if (typeof window === "undefined") return Promise.reject(new Error("Google sign-in is unavailable"))
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-scosha-google]")
    if (existing) {
      existing.addEventListener("load", () => resolve())
      existing.addEventListener("error", () => reject(new Error("Could not load Google sign-in")))
      return
    }
    const script = document.createElement("script")
    script.src = "https://accounts.google.com/gsi/client"
    script.async = true
    script.dataset.scoshaGoogle = "1"
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("Could not load Google sign-in"))
    document.head.appendChild(script)
  })
  return scriptPromise
}

export function googleSignInConfigured() {
  return Boolean(CLIENT_ID)
}

export async function requestGoogleAccessToken() {
  if (!CLIENT_ID) {
    throw new Error("Google sign-in needs a Google client id before it can open.")
  }
  await loadGoogleScript()
  const oauth = window.google?.accounts?.oauth2
  if (!oauth) throw new Error("Could not load Google sign-in")

  return new Promise<string>((resolve, reject) => {
    const client = oauth.initTokenClient({
      client_id: CLIENT_ID,
      scope: "openid email profile",
      callback: (response) => {
        if (response.access_token) resolve(response.access_token)
        else reject(new Error(response.error === "access_denied" ? "Google sign-in was cancelled" : "Google sign-in failed"))
      },
    })
    client.requestAccessToken()
  })
}
