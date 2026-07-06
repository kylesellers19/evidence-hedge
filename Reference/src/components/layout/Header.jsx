import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { IconArrowLeft } from '../Icons'

const PAGE_TITLES = {
  '/': null,
  '/inspire': 'Inspiration',
  '/looks': 'Saved Looks',
  '/share': 'Share Look',
}

export default function Header() {
  const location = useLocation()
  const isHome = location.pathname === '/'
  const title = PAGE_TITLES[location.pathname]

  return (
    <header className="sticky top-0 z-40 bg-cream/95 backdrop-blur-sm border-b border-border">
      <div className="max-w-lg mx-auto px-5 h-14 flex items-center justify-between">
        {isHome ? (
          <div className="flex items-center gap-3">
            <span className="font-serif text-2xl font-medium tracking-tight text-gray-900 leading-none">
              Gigi
            </span>
            <span className="hidden sm:block font-sans text-[10px] tracking-editorial uppercase text-muted border-l border-border pl-3">
              Dress for every occasion
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="w-9 h-9 flex items-center justify-center hover:bg-linen transition-colors rounded-sm text-gray-700"
              aria-label="Back"
            >
              <IconArrowLeft className="w-4 h-4" />
            </Link>
            <span className="font-serif text-lg font-medium tracking-tight text-gray-900">
              {title}
            </span>
          </div>
        )}

        <Link to="/" className={isHome ? 'invisible' : ''}>
          <span className="font-serif text-xl font-medium tracking-tight text-gray-900">
            Gigi
          </span>
        </Link>
      </div>
    </header>
  )
}
