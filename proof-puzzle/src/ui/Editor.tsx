import { useCallback, useEffect, useMemo, useRef } from 'react'
import CodeMirror, {
  Decoration,
  EditorView,
  keymap,
  Prec,
  ViewPlugin,
  type DecorationSet,
  type Range,
  type ViewUpdate,
} from '@uiw/react-codemirror'

type EditorProps = {
  value: string
  onChange: (value: string) => void
  executedLine?: number
  failingLine?: number
  onRun: () => void
  onStepForward: () => void
  onStepBack: () => void
}

type EditorActions = Pick<EditorProps, 'onRun' | 'onStepForward' | 'onStepBack'>

const keywords = new Set(['theorem', 'def', 'by', 'sorry'])
const tactics = new Set(['swap', 'paint', 'rotate'])
const colors = new Set(['blue', 'green', 'yellow', 'purple', 'orange', 'teal'])

export function Editor({
  value,
  onChange,
  executedLine,
  failingLine,
  onRun,
  onStepForward,
  onStepBack,
}: EditorProps) {
  const changeHandler = useRef(onChange)
  const actions = useRef<EditorActions>({ onRun, onStepForward, onStepBack })

  useEffect(() => {
    changeHandler.current = onChange
    actions.current = { onRun, onStepForward, onStepBack }
  }, [onChange, onRun, onStepForward, onStepBack])

  const handleChange = useCallback((nextValue: string) => {
    changeHandler.current(nextValue)
  }, [])

  const syntaxExtension = useMemo(
    () => createSyntaxExtension(executedLine, failingLine),
    [executedLine, failingLine],
  )
  const shortcutExtension = useMemo(() => Prec.highest(keymap.of([
    {
      key: 'Ctrl-Enter',
      run: () => {
        actions.current.onRun()
        return true
      },
    },
    {
      key: 'Alt-ArrowRight',
      run: () => {
        actions.current.onStepForward()
        return true
      },
    },
    {
      key: 'Alt-ArrowLeft',
      run: () => {
        actions.current.onStepBack()
        return true
      },
    },
  ])), [])
  const extensions = useMemo(() => [
    EditorView.contentAttributes.of({ 'aria-labelledby': 'proof-editor-label', spellcheck: 'false' }),
    EditorView.lineWrapping,
    syntaxExtension,
    shortcutExtension,
  ], [syntaxExtension, shortcutExtension])

  return (
    <CodeMirror
      className="proof-editor"
      value={value}
      onChange={handleChange}
      theme="dark"
      minHeight="270px"
      basicSetup={{ highlightActiveLine: false, highlightActiveLineGutter: false }}
      extensions={extensions}
    />
  )
}

function createSyntaxExtension(executedLine?: number, failingLine?: number) {
  return ViewPlugin.fromClass(class {
    decorations: DecorationSet = Decoration.none

    constructor(view: EditorView) {
      this.decorations = buildDecorations(view, executedLine, failingLine)
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildDecorations(update.view, executedLine, failingLine)
      }
    }
  }, {
    decorations: (plugin) => plugin.decorations,
  })
}

function buildDecorations(
  view: EditorView,
  executedLine?: number,
  failingLine?: number,
): DecorationSet {
  const ranges: Range<Decoration>[] = []
  const document = view.state.doc

  for (let lineNumber = 1; lineNumber <= document.lines; lineNumber += 1) {
    const line = document.line(lineNumber)
    const lineIndex = lineNumber - 1
    const lineClasses = [
      lineIndex === executedLine ? 'cm-proof-executing-line' : '',
      lineIndex === failingLine ? 'cm-proof-failing-line' : '',
    ].filter(Boolean).join(' ')

    if (lineClasses) {
      ranges.push(Decoration.line({ class: lineClasses }).range(line.from))
    }

    addTokenDecorations(line.text, line.from, ranges)
  }

  return Decoration.set(ranges, true)
}

function addTokenDecorations(text: string, lineStart: number, ranges: Range<Decoration>[]) {
  const commentStart = text.indexOf('--')
  const codeEnd = commentStart < 0 ? text.length : commentStart
  const code = text.slice(0, codeEnd)
  const tokenPattern = /\b(?:theorem|def|by|sorry|swap|paint|rotate|blue|green|yellow|purple|orange|teal)\b/g

  for (const match of code.matchAll(tokenPattern)) {
    const token = match[0]
    const from = lineStart + (match.index ?? 0)
    const to = from + token.length
    ranges.push(Decoration.mark({ class: tokenClass(token) }).range(from, to))
  }

  if (commentStart >= 0) {
    ranges.push(
      Decoration.mark({ class: 'cm-proof-comment' })
        .range(lineStart + commentStart, lineStart + text.length),
    )
  }
}

function tokenClass(token: string): string {
  if (keywords.has(token)) return 'cm-proof-keyword'
  if (tactics.has(token)) return 'cm-proof-tactic'
  if (colors.has(token)) return `cm-proof-color-${token}`
  return ''
}
