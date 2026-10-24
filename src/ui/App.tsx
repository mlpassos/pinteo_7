import '@fontsource/nunito/latin-400.css';
import '@fontsource/nunito/latin-600.css';
import '@fontsource/nunito/latin-700.css';
import '@fontsource/nunito/latin-800.css';
import nunitoLicense from '@fontsource/nunito/LICENSE?raw';
import { useEffect, useReducer, useRef, useState } from 'react';
import type { Block, BlockAction, BlockId, BodyTarget, Projection } from '../core/program/index.js';
import { createBlockId } from '../core/program/index.js';
import type { ProgramDocument } from '../shared/index.js';
import { CHARACTER_IDS, programDocumentSchema } from '../shared/index.js';
import type { Renderer, Speed } from '../application/index.js';
import {
  CHARACTER_NAMES,
  characterUrl,
  deleteUrl,
  snapUrl,
  helpVideoUrl,
  helpCaptionsUrl,
} from '../infrastructure/assets/index.js';
import type { UiServices } from './services.js';
import { initialWorkspace, workspaceReducer } from './state.js';
import { WorkspaceContext, useWorkspace } from './WorkspaceContext.js';
import { PALETTE, CATEGORIES } from './blocks/catalog.js';
import type { PaletteItem } from './blocks/catalog.js';
import { BlockWorkspace, useBlockDrag } from './blocks/BlockWorkspace.js';
import { CodeEditor } from './CodeEditor.js';
import { Stage } from './Stage.js';
import { Modal } from './dialogs/Modal.js';
import { Gallery } from './dialogs/Gallery.js';
import { Share } from './dialogs/Share.js';
import { readPreferences, writePreferences } from './preferences.js';
import './workspace.css';

const firstDocument: ProgramDocument = {
  formatVersion: 1,
  source: '; Minha primeira ideia\nrepeat 4 [forward 100 right 90]\n',
  characterId: 'tartaruga',
};
type DialogName = 'characters' | 'gallery' | 'share' | 'help' | 'replace' | null;

/** Ambiente real com portas injetadas; ausência de integração é explícita e nunca simulada. */
export function App({
  services,
  initialDocument = firstDocument,
  environmentLabel,
}: {
  services?: UiServices;
  initialDocument?: ProgramDocument;
  environmentLabel?: string;
}) {
  const [preferences] = useState(readPreferences);
  const [state, dispatch] = useReducer(
    workspaceReducer,
    {
      ...initialDocument,
      characterId:
        initialDocument === firstDocument ? preferences.characterId : initialDocument.characterId,
    },
    (document) => ({ ...initialWorkspace(document), speed: preferences.speed }),
  );
  const [category, setCategory] = useState<number | null>(null);
  const [pending, setPending] = useState<PaletteItem | BlockId | null>(null);
  const [dialog, setDialog] = useState<DialogName>(null);
  const [replacement, setReplacement] = useState<ProgramDocument | null>(null);
  const [sound, setSound] = useState(preferences.sound);
  const [message, setMessage] = useState('');
  const [renderer, setRenderer] = useState<Renderer | null>(null);
  const [busy, setBusy] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressedClick = useRef(0);

  useEffect(
    () =>
      services?.runner.subscribe((event) => {
        if (event.type === 'state') dispatch({ type: 'status', status: event.status });
        else if (event.type === 'text') dispatch({ type: 'text', text: event.text });
        else if (event.type === 'clear-text') dispatch({ type: 'clear-text' });
        else if (event.type === 'error') {
          dispatch({ type: 'status', status: 'error' });
          dispatch({ type: 'diagnostics', diagnostics: [event.diagnostic] });
        }
      }),
    [services],
  );
  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      audio.current?.pause();
    },
    [],
  );

  useEffect(() => {
    writePreferences({ characterId: state.document.characterId, speed: state.speed, sound });
  }, [state.document.characterId, state.speed, sound]);

  /** Mensagem temporária sem capturar foco ou apagar diagnósticos persistentes. */
  function announce(text: string) {
    setMessage(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      setMessage('');
    }, 5000);
  }
  /** Som útil do legado só toca depois de edição confirmada e gesto explícito. */
  function playSound(remove = false) {
    if (!sound) return;
    audio.current?.pause();
    const next = new Audio(remove ? deleteUrl : snapUrl);
    audio.current = next;
    void next.play().catch(() => {
      announce('Edição concluída. O navegador não liberou o som.');
    });
  }
  /** Alternância só aceita projeção integral fornecida pelo conversor, sem executar LOGO. */
  function switchMode(mode: 'visual' | 'code') {
    setPending(null);
    if (mode === 'code') {
      dispatch({ type: 'mode', mode });
      return;
    }
    if (!services) {
      announce('O modo Blocos aguarda a conexão do conversor. Seu código foi preservado.');
      return;
    }
    const result = services.conversion.sourceToBlocks(state.document.source, state.revision);
    if (!result.ok) {
      dispatch({ type: 'diagnostics', diagnostics: result.diagnostics });
      return;
    }
    dispatch({ type: 'projected', projection: result.value });
  }
  /** Valida edição e serialização antes de confirmar fonte/projeção na mesma transição. */
  function apply(action: BlockAction): boolean {
    if (!services || !state.projection || state.projection.sourceRevision !== state.revision)
      return false;
    const edited = services.conversion.editBlocks(state.projection, action);
    if (!edited.ok) {
      dispatch({ type: 'diagnostics', diagnostics: edited.diagnostics });
      return false;
    }
    const serialized = services.conversion.blocksToSource(edited.value);
    if (!serialized.ok) {
      dispatch({ type: 'diagnostics', diagnostics: serialized.diagnostics });
      return false;
    }
    const projection: Projection = {
      ...edited.value,
      originalSource: serialized.value,
      sourceRevision: state.revision + 1,
    };
    dispatch({
      type: 'edited',
      projection,
      source: serialized.value,
      previousRevision: state.revision,
    });
    setPending(null);
    if (action.type === 'remove') dispatch({ type: 'select', id: null });
    playSound(action.type === 'remove');
    const id =
      action.type === 'insert' ? action.block.id : action.type === 'remove' ? null : action.id;
    requestAnimationFrame(() => {
      const target = id
        ? document.querySelector<HTMLElement>(`[data-block-id="${id}"] > .code-block`)
        : document.querySelector<HTMLElement>('#visual-tab');
      target?.focus();
      if (target && !window.matchMedia('(prefers-reduced-motion: reduce)').matches)
        target.animate([{ transform: 'translateY(-4px)' }, { transform: 'translateY(0)' }], {
          duration: 160,
        });
    });
    return true;
  }
  /** Insere ou move apenas o tipo esperado no destino. */
  function place(target: BodyTarget, dragged?: PaletteItem | BlockId) {
    const selected = dragged ?? pending;
    if (!selected) {
      announce('Escolha um comando ou selecione Mover em um bloco primeiro.');
      return;
    }
    if (typeof selected === 'string') {
      apply({ type: 'move', id: selected, target });
      return;
    }
    if (selected.expression) {
      announce('Operadores são expressões: encaixe em um campo de valor.');
      return;
    }
    const identity = createBlockId(crypto.randomUUID());
    if (!identity.ok) return;
    let block = selected.create(identity.value);
    const names = procedureNames(state.projection?.blocks ?? []);
    if (block.kind === 'define') {
      let suffix = 1;
      while (names.includes(block.name)) block = { ...block, name: 'desenho' + String(++suffix) };
    }
    if (block.kind === 'call' && names[0]) block = { ...block, name: names[0] };
    if ('id' in block) apply({ type: 'insert', block, target });
  }
  const drag = useBlockDrag(setPending, place);
  /** Abre a última família por teclado sem conservar seleção oculta. */
  function openPalette() {
    setCategory(category ?? 0);
    setPending(null);
    requestAnimationFrame(() =>
      document.querySelector<HTMLButtonElement>('.palette-list button')?.focus(),
    );
  }
  /** Abrir/novo pede decisão explícita antes de substituir fonte não vazia. */
  function requestDocument(document: ProgramDocument) {
    const parsed = programDocumentSchema.safeParse(document);
    if (!parsed.success) {
      announce('Documento inválido. Seu rascunho foi preservado.');
      return;
    }
    if (state.document.source.length > 0 && state.document.source !== document.source) {
      setReplacement(parsed.data);
      setDialog('replace');
    } else {
      services?.runner.clear();
      dispatch({ type: 'load', document: parsed.data });
      setDialog(null);
    }
  }
  /** Executa fonte integral atual; seleção visual nunca altera o programa implicitamente. */
  function run() {
    if (!services) return;
    const valid = programDocumentSchema.safeParse(state.document);
    if (!valid.success) {
      announce('O programa ultrapassa o limite de 20 KiB. Reduza o texto antes de executar.');
      return;
    }
    const result = services.runner.start(state.document.source, state.speed);
    if (result.ok) dispatch({ type: 'run' });
    else dispatch({ type: 'diagnostics', diagnostics: result.diagnostics });
  }
  /** Exporta somente o palco; falhas não modificam código, desenho ou seleção. */
  async function download() {
    if (!renderer || busy) return;
    setBusy(true);
    try {
      const blob = await renderer.exportPng();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'pinte-o-7.png';
      link.click();
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
    } catch {
      announce('Não foi possível baixar o PNG. Seu desenho foi preservado.');
    } finally {
      setBusy(false);
    }
  }
  /** Somente agendamento muda ao selecionar velocidade, sem reset de sessão. */
  function speedChanged(value: string) {
    const speed: Speed = value === 'slow' || value === 'fast' ? value : 'normal';
    dispatch({ type: 'speed', speed });
    services?.runner.setSpeed(speed);
  }
  const title =
    dialog === 'characters'
      ? 'Escolha seu personagem'
      : dialog === 'gallery'
        ? 'Galeria de possibilidades'
        : dialog === 'share'
          ? 'Compartilhar seu desenho'
          : dialog === 'replace'
            ? 'Substituir o rascunho?'
            : 'Pequenos comandos, grandes ideias';
  return (
    <WorkspaceContext value={state}>
      <div
        className="app"
        onPointerMove={drag.move}
        onPointerUp={(event) => {
          if (drag.preview) suppressedClick.current = performance.now() + 250;
          drag.end(event);
        }}
        onPointerCancel={drag.cancel}
        onClickCapture={(event) => {
          if (
            event.detail > 0 &&
            event.target instanceof Element &&
            event.target.closest('.palette-handle, .grip') &&
            performance.now() < suppressedClick.current
          ) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            drag.cancel();
            setPending(null);
          }
        }}
      >
        <a className="skip" href="#program">
          Pular para o programa
        </a>
        <header className="topbar">
          <div className="brand">
            <span className="brand-mark">
              7<span>✦</span>
            </span>
            <span>
              Pinte o <b>7</b>
              <small>IMAGINE. PROGRAME. DESENHE.</small>
            </span>
          </div>
          <nav aria-label="Principal">
            <button
              aria-label="Abrir galeria"
              onClick={() => {
                setDialog('gallery');
              }}
            >
              ▦ <span>Galeria</span>
            </button>
            <button
              aria-label="Abrir ajuda"
              onClick={() => {
                setDialog('help');
              }}
            >
              ? <span>Ajuda</span>
            </button>
            <button
              className="share top-share"
              onClick={() => {
                setDialog('share');
              }}
            >
              ↗ Compartilhar
            </button>
          </nav>
        </header>
        {(environmentLabel || !services) && (
          <p className="integration-banner" role="status">
            {environmentLabel ??
              'Interface em integração — motor, conversor e compartilhamento ainda não conectados.'}
          </p>
        )}
        <section className="command-dock" aria-label="Comandos">
          <div className="dock-heading">
            <strong>Caixa de ideias</strong>
            <span>Escolha uma família e comece a criar</span>
            <button
              aria-pressed={sound}
              onClick={() => {
                setSound(!sound);
              }}
            >
              ♫ Som {sound ? 'ligado' : 'desligado'}
            </button>
          </div>
          <div className="categories">
            {CATEGORIES.map((name, index) => (
              <button
                key={name}
                aria-expanded={category === index}
                aria-controls="command-drawer"
                onClick={() => {
                  setCategory(category === index ? null : index);
                  setPending(null);
                }}
              >
                <span className="category-icon" aria-hidden="true">
                  {['↗', '✎', '↻', '✧', '◇', '＋'][index]}
                </span>
                {name}
                <span aria-hidden="true">⌄</span>
              </button>
            ))}
          </div>
          {category !== null && (
            <div className="command-drawer" id="command-drawer">
              <div className="drawer-heading">
                <p>Arraste pela alça ou escolha uma peça e depois um encaixe.</p>
                <button
                  onClick={() => {
                    setCategory(null);
                    setPending(null);
                    document
                      .querySelector<HTMLButtonElement>('.categories button[aria-expanded="true"]')
                      ?.focus();
                  }}
                >
                  Recolher ⌃
                </button>
              </div>
              <div className="palette-list">
                {PALETTE.filter((item) => item.category === category).map((item) => (
                  <div
                    className={`palette-piece category-${String(item.category)}`}
                    key={item.label}
                  >
                    <button
                      className="palette-handle"
                      aria-label={`Arrastar ${item.label}`}
                      onPointerDown={(event) => {
                        drag.beginDrag(event, item);
                      }}
                      onClick={() => {
                        setPending(item);
                        announce(
                          'Peça escolhida. Use Tab para chegar ao encaixe e Enter para inserir.',
                        );
                      }}
                    >
                      ⠿
                    </button>
                    <button
                      aria-pressed={pending === item}
                      onClick={() => {
                        setPending(item);
                        announce(
                          item.expression
                            ? 'Escolha um campo para encaixar a expressão.'
                            : 'Escolha um encaixe no programa.',
                        );
                      }}
                    >
                      {item.label}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
        <main className="workspace">
          <section
            className="program panel"
            id="program"
            tabIndex={-1}
            aria-labelledby="program-heading"
          >
            <div className="panel-heading">
              <div>
                <span className="eyebrow">01 / ATELIÊ DE IDEIAS</span>
                <h1 id="program-heading">Meu programa</h1>
              </div>
              <span className="local-label">Seu espaço de inventar</span>
            </div>
            <div className="program-tools">
              <div className="mode-tabs" role="tablist" aria-label="Modo do programa">
                {(['visual', 'code'] as const).map((mode) => (
                  <button
                    key={mode}
                    id={`${mode}-tab`}
                    role="tab"
                    aria-selected={state.mode === mode}
                    tabIndex={state.mode === mode ? 0 : -1}
                    aria-controls={`${mode}-panel`}
                    onClick={() => {
                      switchMode(mode);
                    }}
                    onKeyDown={(event) => {
                      if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
                        event.preventDefault();
                        const next =
                          event.key === 'Home'
                            ? 'visual'
                            : event.key === 'End'
                              ? 'code'
                              : state.mode === 'visual'
                                ? 'code'
                                : 'visual';
                        switchMode(next);
                        requestAnimationFrame(() =>
                          document
                            .querySelector<HTMLButtonElement>('[role="tab"][aria-selected="true"]')
                            ?.focus(),
                        );
                      }
                    }}
                  >
                    {mode === 'visual' ? '▦ Blocos' : '</> Código'}
                  </button>
                ))}
              </div>
              <button onClick={openPalette}>＋ Comandos</button>
              <button
                className="quiet"
                onClick={() => {
                  requestDocument({ ...state.document, source: '' });
                }}
              >
                Novo
              </button>
            </div>
            <div className="program-body">
              <div
                id="visual-panel"
                hidden={state.mode !== 'visual'}
                role="tabpanel"
                aria-labelledby="visual-tab"
              >
                <div className="program-caption">
                  Uma ideia de cada vez <span>SEU PROGRAMA</span>
                </div>
                {state.projection && (
                  <BlockWorkspace
                    blocks={state.projection.blocks}
                    selected={state.selected}
                    pending={pending}
                    select={(id) => {
                      dispatch({ type: 'select', id });
                    }}
                    pick={setPending}
                    place={place}
                    apply={(action) => {
                      apply(action);
                    }}
                    beginDrag={drag.beginDrag}
                    takeExpression={() => {
                      if (typeof pending !== 'object' || !pending?.expression) return null;
                      const id = createBlockId(crypto.randomUUID());
                      if (!id.ok) return null;
                      const value = pending.create(id.value);
                      return 'id' in value ? null : value;
                    }}
                  />
                )}
                <button className="add-block" onClick={openPalette}>
                  ＋ Escolher um comando
                </button>
                <p className="workspace-hint">
                  Peças com corpo aceitam outras peças. Operadores cabem nos valores.
                </p>
              </div>
              <div
                id="code-panel"
                hidden={state.mode !== 'code'}
                role="tabpanel"
                aria-labelledby="code-tab"
              >
                <CodeEditor
                  source={state.document.source}
                  change={(source) => {
                    dispatch({ type: 'source', source });
                  }}
                  diagnostic={state.mode === 'code' ? state.diagnostics[0] : undefined}
                />
              </div>
              {state.diagnostics.length > 0 && (
                <div className="notice error" role="alert">
                  <strong>Seu programa foi preservado.</strong>
                  {state.diagnostics.map((diagnostic, index) => (
                    <p key={index}>
                      {diagnostic.message}
                      {diagnostic.span && ` (posição ${String(diagnostic.span.start + 1)})`}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </section>
          <section className="stage-panel panel" aria-labelledby="stage-heading">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">02 / MÁQUINA DE DESENHAR</span>
                <h2 id="stage-heading">Seu desenho</h2>
              </div>
              <span className="device-speaker" aria-hidden="true" />
              <button
                className="quiet"
                disabled={!services}
                onClick={() => {
                  services?.runner.clear();
                  dispatch({ type: 'clear-session' });
                }}
              >
                ⌫ Limpar
              </button>
            </div>
            <div className="execution">
              <div className="run-row">
                <button className="primary" disabled={!services} onClick={run}>
                  ▶ Executar
                </button>
                <button
                  disabled={!services || state.status !== 'running'}
                  onClick={() => services?.runner.stop()}
                >
                  ■ Parar
                </button>
                <label className="speed">
                  Velocidade
                  <select
                    value={state.speed}
                    onChange={(event) => {
                      speedChanged(event.target.value);
                    }}
                  >
                    <option value="slow">Lenta</option>
                    <option value="normal">Normal</option>
                    <option value="fast">Rápida</option>
                  </select>
                </label>
              </div>
              <RunStatus />
            </div>
            <Stage
              factory={services?.createRenderer}
              runner={services?.runner}
              character={state.document.characterId}
              ready={setRenderer}
            />
            <div className="character-bar">
              <button
                onClick={() => {
                  setDialog('characters');
                }}
              >
                <img src={characterUrl(state.document.characterId)} alt="" width={46} height={46} />
                <span>
                  <small>QUEM VAI DESENHAR?</small>
                  <strong>{CHARACTER_NAMES[state.document.characterId]} ⌄</strong>
                </span>
              </button>
              <button
                aria-label="Sortear personagem"
                onClick={() => {
                  const characterId =
                    CHARACTER_IDS[Math.floor(Math.random() * CHARACTER_IDS.length)];
                  if (characterId) dispatch({ type: 'character', characterId });
                }}
              >
                ⚄
              </button>
            </div>
            <div className="toy-deck">
              <span className="toy-knob" aria-hidden="true" />
              <div className="stage-actions">
                <button
                  disabled={!renderer || busy}
                  onClick={() => {
                    void download();
                  }}
                >
                  ↓ Baixar PNG
                </button>
                <button
                  onClick={() => {
                    setDialog('share');
                  }}
                >
                  ↗ Compartilhar
                </button>
              </div>
              <span className="toy-knob" aria-hidden="true" />
            </div>
            <details className="output">
              <summary>
                Saída e histórico <span>{state.history.length} execuções</span>
              </summary>
              <pre aria-live="polite">{state.output || 'A saída do programa aparecerá aqui.'}</pre>
              <ol>
                {state.history.map((source, index) => (
                  <li key={index}>
                    <pre>{source}</pre>
                  </li>
                ))}
              </ol>
            </details>
          </section>
        </main>
        <footer className="app-footer">
          <span>Um espaço para aprender criando.</span>
          <span>Feito com LOGO e imaginação ✳</span>
          <button
            onClick={() => {
              setDialog('help');
            }}
          >
            Sobre o Pinte o 7
          </button>
        </footer>
        {message && (
          <div className="toast" role="status">
            {message}
          </div>
        )}
        {pending && (
          <div className="pending-action" role="status">
            {typeof pending === 'string'
              ? 'Mover bloco: escolha um encaixe'
              : `Encaixar ${pending.label}`}
            <button
              onClick={() => {
                setPending(null);
              }}
            >
              Cancelar
            </button>
          </div>
        )}
        {drag.preview && (
          <div
            className="drag-ghost"
            aria-hidden="true"
            style={{ left: drag.preview.x + 12, top: drag.preview.y + 10 }}
          >
            {drag.preview.label}
          </div>
        )}
        {dialog && (
          <Modal
            title={title}
            close={() => {
              setDialog(null);
              setReplacement(null);
            }}
          >
            {dialog === 'characters' && (
              <div className="characters-grid">
                {CHARACTER_IDS.map((characterId) => (
                  <button
                    key={characterId}
                    aria-pressed={state.document.characterId === characterId}
                    onClick={() => {
                      dispatch({ type: 'character', characterId });
                      setDialog(null);
                    }}
                  >
                    <img src={characterUrl(characterId)} alt="" width={64} height={64} />
                    {CHARACTER_NAMES[characterId]}
                  </button>
                ))}
              </div>
            )}
            {dialog === 'gallery' && <Gallery store={services?.shares} load={requestDocument} />}
            {dialog === 'share' && (
              <Share store={services?.shares} renderer={renderer} document={state.document} />
            )}
            {dialog === 'help' && (
              <>
                <ol className="help-steps">
                  <li>Escolha uma família de comandos e uma peça.</li>
                  <li>Arraste pela alça ou escolha a peça e use Tab/Enter no encaixe.</li>
                  <li>
                    Use setas nos controles das peças ou Alt+↑/↓ para reordenar. Delete exclui a
                    peça focada.
                  </li>
                  <li>
                    Escreva LOGO no Código; comandos sem representação visual permanecem lá, com o
                    texto intacto.
                  </li>
                </ol>
                <details>
                  <summary>Referência de comandos</summary>
                  <dl>
                    {PALETTE.map((item) => (
                      <div key={item.label}>
                        <dt>{item.label}</dt>
                        <dd>{CATEGORIES[item.category]}</dd>
                      </div>
                    ))}
                  </dl>
                  <p>
                    <code>repeat 4 [forward 100 right 90]</code> desenha um quadrado. Valores
                    aceitam números, variáveis como :passos e os quatro operadores da paleta.
                  </p>
                </details>
                <details>
                  <summary>Vídeo com legendas</summary>
                  <video controls preload="none">
                    <source src={helpVideoUrl} type="video/mp4" />
                    <track
                      src={helpCaptionsUrl}
                      kind="captions"
                      srcLang="pt-BR"
                      label="Português"
                      default
                    />
                  </video>
                  <a href={helpCaptionsUrl}>Ler legendas</a>
                </details>
                <details>
                  <summary>Sobre e créditos</summary>
                  <p>
                    Pinte o 7 é um projeto educacional para aprender programação desenhando com
                    LOGO. Interpretador Papert de Thomas Figg, licença MIT. Personagens originais
                    preservados; Nunito local sob SIL OFL. Materiais procedurais criados para o
                    projeto.
                  </p>
                  <details>
                    <summary>Licença da fonte Nunito (SIL OFL)</summary>
                    <pre className="license-text">{nunitoLicense}</pre>
                  </details>
                </details>
              </>
            )}
            {dialog === 'replace' && (
              <>
                <p>
                  O código atual será substituído. Se precisar, volte ao Código e copie seu rascunho
                  antes de continuar.
                </p>
                <div className="dialog-actions">
                  <button
                    onClick={() => {
                      setReplacement(null);
                      setDialog(null);
                    }}
                  >
                    Manter meu rascunho
                  </button>
                  <button
                    className="primary"
                    onClick={() => {
                      if (replacement) {
                        services?.runner.clear();
                        dispatch({ type: 'load', document: replacement });
                      }
                      setReplacement(null);
                      setDialog(null);
                    }}
                  >
                    Substituir rascunho
                  </button>
                </div>
              </>
            )}
          </Modal>
        )}
      </div>
    </WorkspaceContext>
  );
}
/** Estado de execução vem do mesmo documento/contexto usado pelos controles. */
function RunStatus() {
  const state = useWorkspace();
  return (
    <div className="execution-meta" role="status">
      {state.status === 'running'
        ? 'Desenhando…'
        : state.status === 'error'
          ? 'Revise o programa para continuar'
          : 'Pronto para experimentar'}
    </div>
  );
}

/** Sugere nomes disponíveis sem reinterpretar a fonte nem criar outro catálogo de comandos. */
function procedureNames(blocks: readonly Block[]): string[] {
  return blocks.flatMap((block) =>
    block.kind === 'define'
      ? [block.name, ...procedureNames(block.body)]
      : block.kind === 'repeat'
        ? procedureNames(block.body)
        : [],
  );
}
