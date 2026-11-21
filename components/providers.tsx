"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState, type ReactNode } from "react"
import { AuthProvider } from "@/lib/auth"
import { VipCongratsModal } from "@/components/vip/vip-congrats-modal"
import { WelcomeRegisterModal } from "@/components/auth/welcome-register-modal"
import { Toaster } from "sonner"

export function AppProviders({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  )

  return (
    <QueryClientProvider client={client}>
      <AuthProvider>
        {children}
        <WelcomeRegisterModal />
        <VipCongratsModal />
        <Toaster richColors position="top-center" />
      </AuthProvider>
    </QueryClientProvider>
  )
}
