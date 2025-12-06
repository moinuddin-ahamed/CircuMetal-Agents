"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"

interface LoginScreenProps {
  onLogin: (email: string, password: string) => Promise<void>
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [isSignup, setIsSignup] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const validateEmail = (emailValue: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(emailValue)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim()) {
      setError("Email is required")
      return
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address")
      return
    }

    if (!password) {
      setError("Password is required")
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    setError("")
    setIsLoading(true)

    try {
      await onLogin(email, password)
    } catch (err: any) {
      setError(err.message || "Login failed")
      setIsLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim()) {
      setError("Email is required")
      return
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address")
      return
    }

    if (!password) {
      setError("Password is required")
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (!name.trim()) {
      setError("Full name is required")
      return
    }

    setError("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.toLowerCase(),
          password,
          name: name.trim(),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || `Signup failed with status ${response.status}`)
      }

      window.location.href = "/dashboard"
    } catch (err: any) {
      setError(err.message || "Signup failed")
      setIsLoading(false)
    }
  }

  const handleToggleMode = () => {
    setIsSignup(!isSignup)
    setError("")
    setEmail("")
    setPassword("")
    setConfirmPassword("")
    setName("")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4 gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <span className="text-primary-foreground font-bold">◉</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground">CircuMet LCA</h1>
          </div>
          <p className="text-muted-foreground text-sm">AI-powered metal LCA & circularity insights</p>
        </div>

        <Card className="p-8 border border-border bg-card">
          <h2 className="text-lg font-semibold text-foreground mb-6">
            {isSignup ? "Create Account" : "Sign In"}
          </h2>

          <form onSubmit={isSignup ? handleSignup : handleLogin} className="space-y-6">
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded text-destructive text-sm">
                {error}
              </div>
            )}

            {isSignup && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Full Name</label>
                <Input
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-input text-foreground border-border"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Email</label>
              <Input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-input text-foreground border-border"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Password</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-input text-foreground border-border"
              />
              {!isSignup && (
                <p className="text-xs text-muted-foreground mt-1">Minimum 6 characters</p>
              )}
            </div>

            {isSignup && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Confirm Password</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-input text-foreground border-border"
                />
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium disabled:opacity-50"
            >
              {isLoading ? (isSignup ? "Creating Account..." : "Signing In...") : isSignup ? "Sign Up" : "Sign In"}
            </Button>

            {!isSignup && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-card text-muted-foreground">or continue with</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-border text-foreground hover:bg-secondary bg-transparent"
                >
                  SSO
                </Button>
              </>
            )}
          </form>

          <p className="text-center text-xs text-muted-foreground mt-6">
            {isSignup ? "Already have an account? " : "Don't have an account? "}
            <button
              onClick={handleToggleMode}
              className="text-accent hover:text-accent/80 font-medium"
            >
              {isSignup ? "Sign in" : "Sign up"}
            </button>
          </p>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-8">
          Platform for circular metal assessment and LCA analysis
        </p>
      </div>
    </div>
  )
}
