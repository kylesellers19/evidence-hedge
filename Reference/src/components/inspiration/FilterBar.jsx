import React from 'react'
import { getAllPlugins } from '../../plugins/index'

export default function FilterBar({ activeSource, onSourceChange }) {
  const plugins = getAllPlugins()
  const enabledPlugins = plugins.filter(p => p.isConfigured())

  if (enabledPlugins.length <= 1) return null

  const sources = [
    { name: 'all', displayName: 'All', icon: '✦' },
    ...enabledPlugins.map(p => ({ name: p.name, displayName: p.displayName, icon: p.icon })),
  ]

  return (
    <div className="overflow-x-auto no-scrollbar">
      <div className="flex gap-2 px-5 pb-1 min-w-max">
        {sources.map(source => {
          const active = activeSource === source.name
          return (
            <button
              key={source.name}
              onClick={() => onSourceChange(source.name)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] tracking-editorial uppercase border transition-colors whitespace-nowrap ${
                active
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-muted border-border hover:border-gray-400 hover:text-gray-700'
              }`}
            >
              <span>{source.icon}</span>
              {source.displayName}
            </button>
          )
        })}
      </div>
    </div>
  )
}
