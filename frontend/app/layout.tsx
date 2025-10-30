import '../styles/globals.css'
import { ReactNode } from 'react'
import { SocketProvider } from './contexts/socket.provider'
import { GameProvider } from './contexts/game.provider'
import type { Viewport } from 'next'

export const metadata = {
  title: 'Ransom Notes Online',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SocketProvider>
          <GameProvider>
            <main>{children}</main>
          </GameProvider>
        </SocketProvider>
      </body>
    </html>
  )
}
