import { useEffect, useRef, useState } from 'react'
import { Check, Languages } from 'lucide-react'
import { cn } from '../../utils/cn'

// GP-08 — language switcher. UI-only: it changes a local label, it does not
// translate the app. Real localization is out of scope for this build.
const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'ta', label: 'தமிழ்' },
]

export function LanguageSwitcher() {
  const [open, setOpen] = useState(false)
  const [languageCode, setLanguageCode] = useState('en')
  const rootRef = useRef<HTMLDivElement>(null)
  const current = LANGUAGES.find((language) => language.code === languageCode)!

  useEffect(() => {
    if (!open) return undefined
    function handleClick(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Change language"
        className="flex items-center gap-1.5 rounded-full p-2 text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
      >
        <Languages className="h-4 w-4" strokeWidth={1.75} />
        <span className="hidden text-xs font-medium sm:inline">{current.code.toUpperCase()}</span>
      </button>

      {open ? (
        <div
          role="listbox"
          className="menu-surface absolute right-0 top-[calc(100%+6px)] z-30 w-36 overflow-hidden rounded-xl py-1"
        >
          {LANGUAGES.map((language) => (
            <button
              key={language.code}
              type="button"
              role="option"
              aria-selected={language.code === languageCode}
              onClick={() => {
                setLanguageCode(language.code)
                setOpen(false)
              }}
              className={cn(
                'flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-surface-muted',
                language.code === languageCode ? 'text-primary-text' : 'text-ink',
              )}
            >
              {language.label}
              {language.code === languageCode ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
