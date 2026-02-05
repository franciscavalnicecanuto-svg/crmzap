'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { User, CreditCard, Bell, Settings } from 'lucide-react'

const navItems = [
  { href: '/profile', label: 'Perfil', icon: User },
  { href: '/subscription', label: 'Assinatura', icon: CreditCard },
  { href: '/reminders', label: 'Lembretes', icon: Bell },
  { href: '/settings', label: 'Configurações', icon: Settings },
]

export function SettingsNav() {
  const pathname = usePathname()

  return (
    <div className="border-b bg-muted/30">
      <div className="max-w-2xl mx-auto px-4">
        <nav className="flex gap-1 -mb-px overflow-x-auto scrollbar-hide">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
