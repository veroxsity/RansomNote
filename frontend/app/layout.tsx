import '../styles/globals.css'
import { ReactNode } from 'react'
import { SocketProvider } from './contexts/socket.provider'
import { GameProvider } from './contexts/game.provider'

export const metadata = {
  title: 'Ransom Notes Online',
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
