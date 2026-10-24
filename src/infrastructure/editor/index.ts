import { EditorState } from '@codemirror/state';
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  drawSelection,
} from '@codemirror/view';
import {
  StreamLanguage,
  syntaxHighlighting,
  defaultHighlightStyle,
  indentOnInput,
  indentUnit,
} from '@codemirror/language';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { autocompletion, completeFromList } from '@codemirror/autocomplete';
import type { Diagnostic } from '../../core/common/index.js';

const commands = [
  'forward',
  'backward',
  'left',
  'right',
  'setx',
  'sety',
  'setxy',
  'penup',
  'pendown',
  'reset',
  'color',
  'repeat',
  'make',
  'to',
  'end',
  'print',
  'sum',
  'difference',
  'product',
  'divide',
];
const logo = StreamLanguage.define({
  startState: () => ({ depth: 0 }),
  token(stream, state) {
    if (stream.eatSpace()) return null;
    if (stream.match(';')) {
      stream.skipToEnd();
      return 'comment';
    }
    if (stream.match(/^-?(?:\d+(?:\.\d*)?|\.\d+)/)) return 'number';
    if (stream.match(/^:[^\s\[\]]+/)) return 'variableName';
    if (stream.match(/^"[^\s\[\]]+/)) return 'string';
    if (stream.match('[')) {
      state.depth++;
      return 'bracket';
    }
    if (stream.match(']')) {
      state.depth = Math.max(0, state.depth - 1);
      return 'bracket';
    }
    const word = stream.match(/^[a-zA-Z?]+/);
    if (word && typeof word !== 'boolean') return commands.includes(word[0]) ? 'keyword' : 'name';
    stream.next();
    return null;
  },
  indent: (state) => state.depth * 2,
  languageData: { commentTokens: { line: ';' }, closeBrackets: { brackets: ['['] } },
});

/** Editor de longa vida: alterações externas não recriam a instância nem o undo local. */
export class LogoEditor {
  readonly view: EditorView;
  private externalUpdate = false;
  /** Monta CodeMirror com linguagem LOGO, teclado e sugestões locais. */
  constructor(parent: HTMLElement, source: string, change: (source: string) => void) {
    this.view = new EditorView({
      parent,
      state: EditorState.create({
        doc: source,
        extensions: [
          lineNumbers(),
          highlightActiveLine(),
          drawSelection(),
          history(),
          logo,
          indentOnInput(),
          indentUnit.of('  '),
          syntaxHighlighting(defaultHighlightStyle),
          keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
          autocompletion({
            override: [completeFromList(commands.map((label) => ({ label, type: 'keyword' })))],
          }),
          EditorView.contentAttributes.of({ 'aria-label': 'Código LOGO', spellcheck: 'false' }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged && !this.externalUpdate) change(update.state.doc.toString());
          }),
          EditorView.theme({
            '&': { height: '100%', minHeight: '360px', fontSize: '14px' },
            '.cm-scroller': { overflow: 'auto', fontFamily: 'ui-monospace, monospace' },
            '.cm-content': { padding: '18px 0' },
            '.cm-gutters': { backgroundColor: '#f5efd9', color: '#6b6047', border: 'none' },
            '&.cm-focused': { outline: '2px solid #22665d', outlineOffset: '-2px' },
          }),
        ],
      }),
    });
  }
  /** Atualiza documento somente quando diverge, mantendo seleção dentro dos limites. */
  setSource(source: string): void {
    if (source === this.view.state.doc.toString()) return;
    this.externalUpdate = true;
    try {
      this.view.dispatch({ changes: { from: 0, to: this.view.state.doc.length, insert: source } });
    } finally {
      this.externalUpdate = false;
    }
  }
  /** Localiza um diagnóstico sem executar ou alterar o documento. */
  focusDiagnostic(diagnostic: Diagnostic): void {
    const position = Math.min(this.view.state.doc.length, Math.max(0, diagnostic.span?.start ?? 0));
    this.view.dispatch({ selection: { anchor: position }, scrollIntoView: true });
    this.view.focus();
  }
  /** Desconecta observadores e handlers da instância. */
  destroy(): void {
    this.view.destroy();
  }
}
