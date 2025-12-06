'use client'

import * as React from 'react'
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from 'next-themes'

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  // Set default theme to light and use class attribute to toggle dark mode
  return (
    <NextThemesProvider {...props} defaultTheme="light" attribute="class">
      {children}
    </NextThemesProvider>
  )
}
