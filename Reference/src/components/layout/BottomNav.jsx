import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { IconScissors, IconSparkles, IconHeart, IconShare } from '../Icons'

const NAV_ITEMS = [
  { to: '/', label: 'Occasion', Icon: IconScissors },
  { to: '/inspire', label: 'Inspire', Icon: IconSparkles },
  { to: '/looks', label: 'Looks', Icon: IconHeart },
  { to: '/share', label: 'Share', Icon: IconShare },
]

export default function BottomNav() {
  const location = useLocation()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-border pb-safe">
      <div className="max-w-lg mx-auto px-2 h-16 flex items-center">
        {NAV_ITEMS.map(({ to, label, Icon }) => {
          const active = to === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(to)
          return (
            <Link
              key={to}
              to={to}
              className={`flex-1 flex flex-col items-center gap-1 py-2 transition-colors ${
                active ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className={`text-[9px] tracking-editorial uppercase ${active ? 'font-medium' : 'font-normal'}`}>
                {label}
              </span>
              {active && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-px bg-gray-900" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
