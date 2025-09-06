import type { Metadata } from 'next'
import './globals.css'
import { ImportProgressProvider } from '@/contexts/import-progress-context'
import { GlobalProgressIndicator } from '@/components/global-progress-indicator'
import { ScrollNavigator } from '@/components/scroll-navigator'

export const metadata: Metadata = {
  title: 'The Workflow Bazaar - Discover & Share n8n Automations',
  description: 'Discover, rate, and share thousands of n8n workflow automations in the ultimate workflow marketplace',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <ImportProgressProvider>
          {children}
          <GlobalProgressIndicator />
          <ScrollNavigator />
        </ImportProgressProvider>
      </body>
    </html>
  )
}