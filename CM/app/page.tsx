"use client"

import { useLCA } from "@/lib/lca-context"
import LoginScreen from "@/components/auth/login-screen"
import DashboardLayout from "@/components/layout/dashboard-layout"

function PageContent() {
  const { isAuthenticated, setIsAuthenticated } = useLCA()

  const handleLogin = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Login failed')
    }

    setIsAuthenticated(true)
  }

  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} />
  }

  return <DashboardLayout />
}

export default function Home() {
  return <PageContent />
}
