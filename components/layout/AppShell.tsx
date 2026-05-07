'use client'
import { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

interface AppShellProps {
  children: ReactNode
  vesselName?: string
  refNumber?: string
}

export function AppShell({ children, vesselName, refNumber }: AppShellProps) {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        <Header vesselName={vesselName} refNumber={refNumber} />
        <main className="page-body">
          {children}
        </main>
      </div>
    </div>
  )
}
