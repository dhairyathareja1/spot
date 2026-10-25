import { autocompletion, snippetCompletion, type Completion, type CompletionContext } from '@codemirror/autocomplete'
import { lintGutter, setDiagnostics, type Diagnostic as LintDiagnostic } from '@codemirror/lint'
import { Prec } from '@codemirror/state'
import {
  Decoration,
  EditorView,
  keymap,
  ViewPlugin,
  WidgetType,
  type DecorationSet,
  type ViewUpdate,
} from '@codemirror/view'
import CodeMirror from '@uiw/react-codemirror'
import { useEffect, useMemo, useRef, useState } from 'react'
import { COLORS } from '../engine/types'

export type EditorMessage = { line: number; message: string; severity: 'error' | 'warning' }

export type LineNote = { text: string; tone: 'progress' | 'done' | 'error' }

type EditorProps = {
  value: string
  onChange: (value: string) => void
  messages: EditorMessage[]
  notes: Record<number, LineNote>
  executedLine?: number
  failingLine?: number
  allowHelpers: boolean
  allowLoops: boolean
  onCaretLine: (line: number) => void
  onRun: () => void
  onStepForward: () => void
  onStepBack: () => void
}

const keywords = new Set(['theorem', 'example', 'def', 'by', 'sorry', 'for', 'in', 'do', 'Nat', 'Color', 'Solve', 'start', 'target'])
const tactics = new Set(['swap', 'paint', 'rotate', 'ccw', 'cw'])
const colorSet = new Set<string>(COLORS)
const tokenPattern = /\b[A-Za-z_][A-Za-z0-9_']*\b|\b\d+\b|:=|[+\-*/%]/g

export function Editor({
  value,
  onChange,
  messages,
  notes,
  executedLine,
  failingLine,
  allowHelpers,
  allowLoops,
  onCaretLine,
  onRun,
  onStepForward,
  onStepBack,
}: EditorProps) {
  const viewRef = useRef<EditorView | null>(null)
  // A stable box the CodeMirror extensions read at event time, so they never need rebuilding.
  const [callbacks] = useState(() => new CallbackBox({ onChange, onCaretLine, onRun, onStepForward, onStepBack }))

  useEffect(() => {
    callbacks.update({ onChange, onCaretLine, onRun, onStepForward, onStepBack })
  })

  const [staticExtensions] = useState(() => [
    EditorView.contentAttributes.of({ 'aria-labelledby': 'proof-editor-label', spellcheck: 'false' }),
    EditorView.lineWrapping,
    lintGutter(),
    Prec.highest(keymap.of([
      { key: 'Mod-Enter', run: () => (callbacks.current.onRun(), true) },
      { key: 'Alt-ArrowRight', run: () => (callbacks.current.onStepForward(), true) },
      { key: 'Alt-ArrowLeft', run: () => (callbacks.current.onStepBack(), true) },
    ])),
    EditorView.updateListener.of((update) => {
      if (update.selectionSet || update.docChanged) {
        const head = update.state.selection.main.head
        callbacks.current.onCaretLine(update.state.doc.lineAt(head).number - 1)
      }
    }),
    syntaxHighlighter,
  ])

  const dynamicExtensions = useMemo(() => [
    lineHighlighter(executedLine, failingLine),
    noteWidgets(notes),
    autocompletion({ override: [completionSource(allowHelpers, allowLoops)], icons: false }),
  ], [executedLine, failingLine, notes, allowHelpers, allowLoops])

  const extensions = useMemo(() => [...staticExtensions, ...dynamicExtensions], [staticExtensions, dynamicExtensions])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const doc = view.state.doc
    const diagnostics: LintDiagnostic[] = messages
      .filter((message) => message.line < doc.lines)
      .map((message) => {
        const line = doc.line(message.line + 1)
        const from = line.from + (line.text.length - line.text.trimStart().length)
        return { from, to: Math.max(from, line.to), severity: message.severity, message: message.message }
      })
    view.dispatch(setDiagnostics(view.state, diagnostics))
  }, [messages, value])

  return (
    <CodeMirror
      className="proof-editor"
      value={value}
      onChange={(next) => callbacks.current.onChange(next)}
      onCreateEditor={(view) => {
        viewRef.current = view
      }}
      theme="light"
      minHeight="240px"
      basicSetup={{
        highlightActiveLine: true,
        highlightActiveLineGutter: true,
        foldGutter: false,
        autocompletion: false,
        searchKeymap: false,
      }}
      extensions={extensions}
    />
  )
}

type Callbacks = Pick<EditorProps, 'onChange' | 'onCaretLine' | 'onRun' | 'onStepForward' | 'onStepBack'>

class CallbackBox {
  current: Callbacks

  constructor(callbacks: Callbacks) {
    this.current = callbacks
  }

  update(callbacks: Callbacks) {
    this.current = callbacks
  }
}

const syntaxHighlighter = ViewPlugin.fromClass(class {
  decorations: DecorationSet

  constructor(view: EditorView) {
    this.decorations = highlight(view)
  }

  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged) this.decorations = highlight(update.view)
  }
}, { decorations: (plugin) => plugin.decorations })

function highlight(view: EditorView): DecorationSet {
  const ranges = []
  const doc = view.state.doc
  let inBlockComment = false

  for (let number = 1; number <= doc.lines; number += 1) {
    const line = doc.line(number)
    const text = line.text
    let codeEnd = text.length
    let codeStart = 0

    if (inBlockComment) {
      const end = text.indexOf('-/')
      if (end < 0) {
        if (text.length) ranges.push(Decoration.mark({ class: 'tok-comment' }).range(line.from, line.to))
        continue
      }
      ranges.push(Decoration.mark({ class: 'tok-comment' }).range(line.from, line.from + end + 2))
      codeStart = end + 2
      inBlockComment = false
    }

    const blockStart = text.indexOf('/-', codeStart)
    const lineComment = text.indexOf('--', codeStart)
    if (blockStart >= 0 && (lineComment < 0 || blockStart < lineComment) && text.indexOf('-/', blockStart + 2) < 0) {
      inBlockComment = true
      codeEnd = blockStart
    } else if (lineComment >= 0) {
      codeEnd = lineComment
    }

    for (const match of text.slice(codeStart, codeEnd).matchAll(tokenPattern)) {
      const token = match[0]
      const className = tokenClass(token)
      if (!className) continue
      const from = line.from + codeStart + (match.index ?? 0)
      ranges.push(Decoration.mark({ class: className }).range(from, from + token.length))
    }
    if (codeEnd < text.length) {
      ranges.push(Decoration.mark({ class: 'tok-comment' }).range(line.from + codeEnd, line.to))
    }
  }

  return Decoration.set(ranges, true)
}

function tokenClass(token: string): string {
  if (keywords.has(token)) return 'tok-keyword'
  if (tactics.has(token)) return 'tok-tactic'
  if (colorSet.has(token)) return `tok-color tok-color-${token}`
  if (/^\d+$/.test(token)) return 'tok-number'
  if (/^(:=|[+\-*/%])$/.test(token)) return 'tok-operator'
  return ''
}

function lineHighlighter(executedLine?: number, failingLine?: number) {
  return EditorView.decorations.compute(['doc'], (state) => {
    const ranges = []
    for (const [lineIndex, className] of [[executedLine, 'cm-step-line'], [failingLine, 'cm-error-line']] as const) {
      if (lineIndex === undefined || lineIndex < 0 || lineIndex >= state.doc.lines) continue
      ranges.push(Decoration.line({ class: className }).range(state.doc.line(lineIndex + 1).from))
    }
    return Decoration.set(ranges, true)
  })
}

class NoteWidget extends WidgetType {
  readonly note: LineNote

  constructor(note: LineNote) {
    super()
    this.note = note
  }

  eq(other: NoteWidget) {
    return other.note.text === this.note.text && other.note.tone === this.note.tone
  }

  toDOM() {
    const element = document.createElement('span')
    element.className = `cm-line-note note-${this.note.tone}`
    element.textContent = this.note.text
    return element
  }
}

function noteWidgets(notes: Record<number, LineNote>) {
  return EditorView.decorations.compute(['doc'], (state) => {
    const ranges = Object.entries(notes)
      .map(([line, note]) => [Number(line), note] as const)
      .filter(([line]) => line >= 0 && line < state.doc.lines)
      .sort(([a], [b]) => a - b)
      .map(([line, note]) => Decoration.widget({ widget: new NoteWidget(note), side: 1 }).range(state.doc.line(line + 1).to))
    return Decoration.set(ranges)
  })
}

function completionSource(allowHelpers: boolean, allowLoops: boolean) {
  const base: Completion[] = [
    snippetCompletion('swap ${i} ${j}', { label: 'swap', detail: 'i j', info: 'Swap two blocks.', type: 'keyword' }),
    snippetCompletion('paint ${i} ${color}', { label: 'paint', detail: 'i color', info: 'Paint a block.', type: 'keyword' }),
    snippetCompletion('rotate ${i}', { label: 'rotate', detail: 'i', info: 'Turn a block to the right.', type: 'keyword' }),
    snippetCompletion('rotate ${i} ccw', { label: 'rotate ccw', detail: 'i', info: 'Turn a block to the left.', type: 'keyword' }),
    { label: 'sorry', type: 'keyword', info: 'Leave the proof unfinished.' },
    ...COLORS.map((color) => ({ label: color, type: 'constant', detail: 'Color' })),
  ]
  if (allowLoops) {
    base.push(snippetCompletion('for ${i} in [${0}:${n}] do ${}', { label: 'for', detail: 'in [a:b] do', info: 'Repeat a move for each number in a range.', type: 'keyword' }))
  }
  if (allowHelpers) {
    base.push(snippetCompletion('def ${name} (${i} : Nat) := by\n  ${}', { label: 'def', detail: 'helper', info: 'Make a helper you can use again.', type: 'keyword' }))
    base.push({ label: 'Nat', type: 'type' }, { label: 'Color', type: 'type' })
  }

  return (context: CompletionContext) => {
    const word = context.matchBefore(/[A-Za-z_][A-Za-z0-9_']*/)
    if (!word || (word.from === word.to && !context.explicit)) return null
    const helpers = [...context.state.doc.toString().matchAll(/^def\s+([A-Za-z_][A-Za-z0-9_']*)([^:\n]*)/gm)]
      .map((match) => ({ label: match[1], type: 'function', detail: match[2].trim() || 'helper' }))
    return { from: word.from, options: [...base, ...helpers], validFor: /^[A-Za-z_][A-Za-z0-9_']*$/ }
  }
}
