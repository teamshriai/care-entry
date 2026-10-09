import { useEffect, useRef, useState } from 'react'
import { Check, Mic, Plus, Trash2 } from 'lucide-react'
import { Card } from '../ui/Card'
import { useToast } from '../../hooks/useToast'
import { useTodos } from '../../hooks/useTodos'
import type { Todo } from '../../hooks/useTodos'
import { cn } from '../../utils/cn'

// The browser's own speech recognition (Chrome, Edge, Safari) — no library.
interface Recognition {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onend: (() => void) | null
  onerror: ((event: { error: string }) => void) | null
  start: () => void
  stop: () => void
}
type RecognitionCtor = new () => Recognition
const SpeechRecognitionCtor: RecognitionCtor | undefined =
  typeof window === 'undefined'
    ? undefined
    : ((window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: RecognitionCtor }).webkitSpeechRecognition)

const savedTime = (at: number) => new Date(at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

/**
 * Quick to-do notes for the desk: + adds one (type, then Enter), the
 * microphone adds one by voice, a tick marks it done, the bin removes it.
 * Text can be edited in place. Kept in this browser (see useTodos).
 */
export function TodoCard() {
  const { todos, add, edit, toggle, remove } = useTodos()
  const { notify } = useToast()
  const [draft, setDraft] = useState<string | null>(null)
  const [listening, setListening] = useState(false)
  const recognition = useRef<Recognition | null>(null)
  const pending = todos.filter((t) => !t.done).length
  // Open ones first, then done, each newest first.
  const shown = [...todos.filter((t) => !t.done), ...todos.filter((t) => t.done)]

  useEffect(() => () => recognition.current?.stop(), [])

  function commitDraft() {
    if (draft !== null) add(draft)
    setDraft(null)
  }

  function startVoice() {
    if (!SpeechRecognitionCtor) {
      notify('Voice input isn’t available in this browser', { tone: 'error', detail: 'Use + to type the task instead.' })
      return
    }
    if (listening) {
      recognition.current?.stop()
      return
    }
    const rec = new SpeechRecognitionCtor()
    rec.lang = 'en-IN'
    rec.interimResults = true
    rec.continuous = false
    let heard = ''
    rec.onresult = (event) => {
      heard = Array.from(event.results)
        .map((r) => r[0]?.transcript ?? '')
        .join(' ')
      setDraft(heard)
    }
    rec.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') notify('Microphone access was blocked', { tone: 'error', detail: 'Allow the microphone for this site, or type the task.' })
    }
    rec.onend = () => {
      setListening(false)
      recognition.current = null
      if (heard.trim()) {
        add(heard)
        setDraft(null)
      }
    }
    recognition.current = rec
    setDraft('')
    setListening(true)
    rec.start()
  }

  return (
    <Card className="flex flex-col">
      <div className="flex items-center gap-2 px-4 pb-2 pt-4 sm:px-5">
        <h2 className="text-lg font-semibold tracking-tight text-ink">To-do</h2>
        <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-surface-2 px-1.5 text-xs font-bold tabular-nums text-ink" aria-label={`${pending} to do`}>
          {pending}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={startVoice}
            aria-pressed={listening}
            aria-label={listening ? 'Stop listening' : 'Add a to-do by voice'}
            title={SpeechRecognitionCtor ? (listening ? 'Listening… tap to stop' : 'Add by voice') : 'Voice input isn’t available in this browser'}
            className={cn(
              'focus-ring flex h-10 w-10 items-center justify-center rounded-full transition-colors',
              listening
                ? 'animate-pulse bg-[var(--color-hue-violet)] text-white'
                : 'bg-[color-mix(in_oklab,var(--color-hue-violet)_55%,var(--color-surface-1))] text-ink hover:bg-[color-mix(in_oklab,var(--color-hue-violet)_70%,var(--color-surface-1))]',
            )}
          >
            <Mic className="h-4.5 w-4.5" strokeWidth={2} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setDraft((d) => (d === null ? '' : d))}
            aria-label="Add a to-do"
            title="Add a to-do"
            className="focus-ring flex h-10 w-10 items-center justify-center rounded-full bg-ink text-surface-1 transition-opacity hover:opacity-85"
          >
            <Plus className="h-5 w-5" strokeWidth={2.25} aria-hidden="true" />
          </button>
        </div>
      </div>

      <ul className="flex max-h-[22rem] flex-col gap-2 overflow-y-auto px-4 pb-4 pt-1 sm:px-5">
        {draft !== null ? (
          <li className="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-2.5 ring-2 ring-primary-600/30">
            <span className="h-6 w-6 shrink-0 rounded-md border-2 border-border bg-surface-1" aria-hidden="true" />
            <input
              autoFocus={!listening}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitDraft()
                if (e.key === 'Escape') setDraft(null)
              }}
              onBlur={() => !listening && commitDraft()}
              placeholder={listening ? 'Listening…' : 'What needs doing? Press Enter to save'}
              aria-label="New to-do"
              maxLength={160}
              className="min-w-0 flex-1 bg-transparent text-sm font-medium text-ink outline-none placeholder:text-ink-subtle"
            />
          </li>
        ) : null}
        {shown.map((todo) => (
          <TodoItem key={`${todo.id}-${todo.savedAt}`} todo={todo} onToggle={() => toggle(todo.id)} onEdit={(text) => edit(todo.id, text)} onDelete={() => remove(todo.id)} />
        ))}
        {todos.length === 0 && draft === null ? <li className="py-6 text-center text-sm text-ink-subtle">Nothing to do yet — tap + or the microphone to add one.</li> : null}
      </ul>
    </Card>
  )
}

function TodoItem({ todo, onToggle, onEdit, onDelete }: { todo: Todo; onToggle: () => void; onEdit: (text: string) => void; onDelete: () => void }) {
  // Keyed on the saved time, so a change saved elsewhere (another tab) starts it afresh.
  const [text, setText] = useState(todo.text)
  return (
    <li className="group flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-2.5">
      <button
        type="button"
        role="checkbox"
        aria-checked={todo.done}
        aria-label={todo.done ? `Mark “${todo.text}” as not done` : `Mark “${todo.text}” as done`}
        onClick={onToggle}
        className={cn(
          'focus-ring flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors',
          todo.done ? 'border-success-fg bg-success-fg text-white' : 'border-border bg-surface-1 hover:border-primary-600',
        )}
      >
        {todo.done ? <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" /> : null}
      </button>
      <div className="min-w-0 flex-1">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => onEdit(text)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
            if (e.key === 'Escape') {
              setText(todo.text)
              e.currentTarget.blur()
            }
          }}
          aria-label="To-do"
          maxLength={160}
          className={cn('w-full truncate bg-transparent text-sm font-medium outline-none', todo.done ? 'text-ink-subtle line-through' : 'text-ink')}
        />
        <p className="text-xs text-ink-subtle">Saved {savedTime(todo.savedAt)}</p>
      </div>
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Delete “${todo.text}”`}
        title="Delete"
        className="focus-ring flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-subtle transition-colors hover:bg-critical-bg hover:text-critical-fg"
      >
        <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
      </button>
    </li>
  )
}
