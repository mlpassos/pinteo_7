/* Estudo descartável de UX: não interpreta, converte, salva ou publica LOGO. */
const categories = [
  ['Movimento', 'movement', ['↑ Para frente · 100', '↓ Para trás · 100', '↶ Girar à esquerda · 90°', '↱ Girar à direita · 90°', '↔ Posição x · 0', '↕ Posição y · 0', '⌖ Posição x, y · 0, 0']],
  ['Desenho', 'drawing', ['✎ Baixar caneta', '⌁ Levantar caneta', '⌫ Reiniciar', '● Escolher cor']],
  ['Repetição', 'control', ['↻ Repetir · 4 vezes']],
  ['Procedimentos', 'control', ['✧ Definir procedimento', '▷ Chamar procedimento']],
  ['Variáveis', 'data', ['◇ Criar variável']],
  ['Operadores', 'operator', ['＋ Soma', '− Diferença', '× Produto', '÷ Divisão']],
];
const characters = ['tartaruga','jabuti','capivara','arara','onca','boto','joaninha','rato','robo-quadrado','robo-redondo','astronauta','foguete','disco-voador','nave-estrela','fantasma-azul','fantasma-verde','fantasma-rosa','fantasma-laranja','muiraquita-dourado','muiraquita-jade','muiraquita-verde'];
const characterNames = ['Tartaruga','Jabuti','Capivara','Arara','Onça','Boto','Joaninha','Rato','Robô quadrado','Robô redondo','Astronauta','Foguete','Disco voador','Nave estrela','Fantasma azul','Fantasma verde','Fantasma rosa','Fantasma laranja','Muiraquitã dourado','Muiraquitã jade','Muiraquitã verde'];
const source = document.querySelector('#source');
source.value = '; Uma flor de possibilidades\ncolor [118 77 215]\nrepeat 12 [\n  repeat 4 [\n    forward 100\n    right 90\n  ]\n  right 30\n]';
let activeCategory = 0;
let pendingCommand = null;
let suppressClick = false;
let dragState = null;
let blockCounter = 0;
let soundEnabled = true;
let mode = 'visual';
let unsupportedScenario = false;
let editedDraft = false;
let shareAttempts = 0;
let runTimer;
let toastTimer;

/** Apresenta retorno temporário para ações fictícias. */
function toast(message) {
  const target = document.querySelector('#toast');
  target.textContent = message;
  target.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { target.hidden = true; }, 4500);
}
/** Expande uma família no topo; novo clique recolhe os comandos. */
function showCategory(index, toggle = true) {
  const drawer = document.querySelector('#command-drawer');
  if (toggle && activeCategory === index && !drawer.hidden) { closePalette(); return; }
  activeCategory = index;
  pendingCommand = null;
  drawer.hidden = false;
  document.querySelectorAll('.categories button').forEach((button, i) => {
    button.setAttribute('aria-expanded', String(i === index));
  });
  const [, color, commands] = categories[index];
  const list = document.querySelector('#palette-list');
  list.replaceChildren();
  commands.forEach((label, commandIndex) => {
    const button = document.createElement('button');
    button.className = color;
    button.textContent = label;
    button.dataset.command = index + ':' + commandIndex;
    button.setAttribute('aria-pressed', 'false');
    button.title = 'Arraste ou selecione e clique em um encaixe';
    button.addEventListener('click', () => {
      if (suppressClick) { suppressClick = false; return; }
      if (mode === 'code') { toast('Volte aos Blocos para experimentar o encaixe. O rascunho não muda.'); return; }
      pendingCommand = [index, commandIndex];
      document.querySelectorAll('.palette-list button').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      toast('Bloco escolhido. Clique em um encaixe pontilhado, ou use Tab e Enter.');
    });
    list.append(button);
  });
}
/** Recolhe a gaveta, devolvendo o espaço à área de criação. */
function closePalette() {
  document.querySelector('#command-drawer').hidden = true;
  document.querySelectorAll('.categories button').forEach(button => button.setAttribute('aria-expanded', 'false'));
}
/** Alterna a apresentação dos modos, sem converter o rascunho. */
function switchMode(next) {
  if (next === 'visual' && (unsupportedScenario || editedDraft)) {
    const notice = document.querySelector('#conversion-notice');
    notice.classList.remove('error');
    if (editedDraft && !unsupportedScenario) {
      notice.replaceChildren();
      const strong = document.createElement('strong');
      strong.textContent = 'Seu rascunho foi preservado.';
      const p = document.createElement('p');
      p.textContent = 'Esta prévia não converte edições de texto. Continue no modo Código ou recarregue para voltar ao exemplo visual.';
      notice.append(strong, p);
    } else {
      notice.innerHTML = '<strong>Seu código continua aqui.</strong><p>Linha 1: “random” não tem equivalente nestes blocos. Continue no modo Código; o texto foi preservado.</p><small>Cenário simulado, sem parser ou conversor.</small>';
    }
    notice.hidden = false;
    return;
  }
  mode = next;
  for (const name of ['visual', 'code']) {
    document.querySelector('#' + name + '-panel').hidden = name !== next;
    const tab = document.querySelector('#' + name + '-tab');
    tab.setAttribute('aria-selected', String(name === next));
    tab.tabIndex = name === next ? 0 : -1;
  }
  document.querySelector('#conversion-notice').hidden = true;
}
/** Aplica um personagem local ao palco e ao seletor. */
function chooseCharacter(index) {
  const path = 'assets/personagens/' + characters[index] + '.png';
  document.querySelector('#stage-character').src = path;
  document.querySelector('#chosen-character').src = path;
  const name = document.querySelector('#character-name');
  name.textContent = characterNames[index] + ' ⌄';
  document.querySelector('.stage').setAttribute('aria-label', 'Prévia estática de uma flor geométrica violeta, com personagem ' + characterNames[index]);
  document.querySelectorAll('.characters-grid button').forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
}
/** Encerra somente a animação ilustrativa, sem execução LOGO. */
function stopDemo(message) {
  clearTimeout(runTimer);
  document.body.classList.remove('running');
  document.querySelector('#run').disabled = false;
  document.querySelector('#stop').disabled = true;
  document.querySelector('#run-status').textContent = message;
}
/** Expande a última categoria e leva o foco aos comandos. */
function openPalette() {
  showCategory(activeCategory, false);
  document.querySelector('.palette-list button').focus();
}

const categoryStyles = [
  ['↗','#e0efff','#8abaf3','#164c91'],
  ['✎','#ffe5ed','#f4a6bd','#8d2647'],
  ['↻','#fff2bf','#e7bd44','#6d5100'],
  ['✧','#eee4ff','#bfa0e7','#63388d'],
  ['◇','#d9f7ec','#7fcdb7','#155e4e'],
  ['＋','#ffe7d8','#efb291','#89411c'],
];
categories.forEach(([name], index) => {
  const button = document.createElement('button');
  const [icon, background, border, ink] = categoryStyles[index];
  button.style.setProperty('--category-bg', background);
  button.style.setProperty('--category-border', border);
  button.style.setProperty('--category-ink', ink);
  const symbol = document.createElement('span'); symbol.className = 'category-icon'; symbol.textContent = icon; symbol.setAttribute('aria-hidden', 'true');
  const label = document.createElement('span'); label.className = 'category-text'; label.textContent = name;
  const caret = document.createElement('span'); caret.className = 'category-caret'; caret.textContent = '⌄'; caret.setAttribute('aria-hidden', 'true');
  button.append(symbol, label, caret);
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-controls', 'command-drawer');
  button.addEventListener('click', () => showCategory(index));
  document.querySelector('.categories').append(button);
});
characters.forEach((character, index) => {
  const button = document.createElement('button');
  const img = document.createElement('img');
  img.src = 'assets/personagens/' + character + '.png';
  img.alt = '';
  const label = document.createElement('span');
  label.textContent = characterNames[index];
  button.append(img, label);
  button.setAttribute('aria-pressed', String(index === 0));
  button.addEventListener('click', () => { chooseCharacter(index); document.querySelector('#characters-dialog').close(); toast('Personagem escolhido · demonstração local.'); });
  document.querySelector('#characters-grid').append(button);
});
// Geometria ilustrativa fixa: nenhuma entrada LOGO é interpretada.
for (let i = 0; i < 12; i++) {
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('x', '250'); rect.setAttribute('y', '125');
  rect.setAttribute('width', '125'); rect.setAttribute('height', '125');
  rect.setAttribute('transform', 'rotate(' + i * 30 + ' 250 250)');
  document.querySelector('#flower').append(rect);
}
['Flor geométrica','Voltas e mais voltas','Uma estrela no papel'].forEach((name, index) => {
  const button = document.createElement('button');
  button.className = 'gallery-card';
  const art = document.createElement('span'); art.className = 'gallery-art'; art.textContent = ['✳','◎','☆'][index]; art.setAttribute('aria-hidden', 'true');
  const title = document.createElement('strong'); title.textContent = name;
  const caption = document.createElement('small'); caption.textContent = 'Abrir exemplo · demonstração';
  button.append(art, title, caption);
  button.addEventListener('click', () => { document.querySelector('#gallery-dialog').close(); toast('Prévia de abertura de exemplo. Seu rascunho não foi alterado.'); });
  document.querySelector('#gallery-grid').append(button);
});
document.querySelectorAll('[data-dialog]').forEach(button => button.addEventListener('click', () => document.querySelector('#' + button.dataset.dialog + '-dialog').showModal()));
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
document.querySelector('#visual-tab').addEventListener('click', () => switchMode('visual'));
document.querySelector('#code-tab').addEventListener('click', () => switchMode('code'));
document.querySelectorAll('[role=tab]').forEach(tab => tab.addEventListener('keydown', event => {
  if (['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) {
    event.preventDefault();
    const target = event.key === 'Home' ? 'visual' : event.key === 'End' ? 'code' : mode === 'visual' ? 'code' : 'visual';
    switchMode(target);
    document.querySelector('#' + mode + '-tab').focus();
  }
}));
source.addEventListener('input', () => { editedDraft = true; unsupportedScenario = false; document.querySelector('#conversion-notice').hidden = true; });
document.querySelector('#unsupported').addEventListener('click', () => {
  unsupportedScenario = true;
  // Acrescenta o cenário sem sobrescrever o texto já digitado.
  if (!source.value.startsWith('forward random 100\n')) source.value = 'forward random 100\n' + source.value;
  switchMode('visual');
});
document.querySelector('#open-palette').addEventListener('click', openPalette);
document.querySelector('#add-block').addEventListener('click', openPalette);
document.querySelector('#close-palette').addEventListener('click', () => { closePalette(); document.querySelectorAll('.categories button')[activeCategory].focus(); });
document.querySelector('#random-character').addEventListener('click', () => { chooseCharacter(Math.floor(Math.random() * characters.length)); toast('Personagem sorteado · demonstração.'); });
document.querySelector('#new-program').addEventListener('click', () => toast('Demonstração de novo programa. O rascunho atual foi mantido.'));
document.querySelector('#run').addEventListener('click', () => {
  document.querySelector('#flower').style.display = '';
  document.body.classList.add('running');
  document.querySelector('#run').disabled = true;
  document.querySelector('#stop').disabled = false;
  document.querySelector('#run-status').textContent = 'Animação de demonstração · sem executar LOGO';
  runTimer = setTimeout(() => stopDemo('Demonstração concluída · nenhum LOGO executado'), 3000);
});
document.querySelector('#stop').addEventListener('click', () => stopDemo('Demonstração interrompida · rascunho preservado'));
document.querySelector('#clear').addEventListener('click', () => { stopDemo('Prévia limpa · rascunho preservado'); document.querySelector('#flower').style.display = 'none'; toast('Prévia limpa. Executar restaura a ilustração.'); });
document.querySelector('#speed').addEventListener('change', () => toast('Velocidade selecionada · sem efeito sobre a ilustração fixa.'));
document.querySelector('#download').addEventListener('click', () => toast('Demonstração de exportação PNG. Nenhum arquivo é gerado.'));

document.querySelector('#error-scenario').addEventListener('click', () => {
  const notice = document.querySelector('#conversion-notice');
  notice.innerHTML = '<strong>Não foi possível executar.</strong><p>Linha 5: informe um número de passos válido. Revise o valor e tente novamente. Seu programa e desenho foram mantidos.</p><small>Erro fictício para avaliar o feedback.</small>';
  notice.classList.add('error'); notice.hidden = false;
});
document.querySelector('#share-submit').addEventListener('click', () => {
  shareAttempts++;
  const feedback = document.querySelector('#share-feedback');
  feedback.className = 'notice';
  feedback.textContent = shareAttempts % 2 ? 'Não foi possível conectar. Código e desenho preservados. Falha de rede simulada.' : 'Compartilhamento simulado concluído. Em produção, o link público aparecerá aqui. Nada foi publicado.';
  document.querySelector('#share-submit').textContent = shareAttempts % 2 ? 'Tentar novamente · demo' : 'Simular nova tentativa';
});
document.querySelectorAll('.code-block input').forEach(input => input.addEventListener('change', () => toast('Campo de demonstração alterado. A ilustração e o código de exemplo são fixos.')));

/** Dá identidade local aos elementos de demonstração, sem modelo de produto. */
function tagBlocks() {
  document.querySelectorAll('.block-stack .repeat-shell, .block-stack .code-block').forEach(block => {
    if (block.classList.contains('code-block') && block.parentElement.classList.contains('repeat-shell')) return;
    if (!block.dataset.demoBlock) block.dataset.demoBlock = 'demo-' + (++blockCounter);
    block.tabIndex = 0;
    block.setAttribute('role', 'group');
    block.setAttribute('aria-label', (block.querySelector('.code-block') || block).textContent.trim() + '. Alt mais seta para cima ou para baixo para reordenar.');
  });
}
/** Cria encaixes reais na prévia, inclusive dentro de repetições. */
function refreshSlots() {
  document.querySelectorAll('.drop-slot').forEach(slot => slot.remove());
  tagBlocks();
  document.querySelectorAll('.block-stack, .repeat-body').forEach(container => {
    const blocks = [...container.children].filter(child => child.dataset.demoBlock);
    for (let i = 0; i <= blocks.length; i++) {
      const slot = document.createElement('button');
      slot.className = 'drop-slot';
      slot.setAttribute('aria-label', 'Encaixar bloco na posição ' + (i + 1) + (container.classList.contains('repeat-body') ? ' dentro da repetição' : ' do programa'));
      container.insertBefore(slot, blocks[i] || null);
      slot.addEventListener('click', () => {
        if (suppressClick) { suppressClick = false; return; }
        if (!pendingCommand) { toast('Escolha primeiro um comando na barra de cima.'); return; }
        const block = makeDemoBlock(...pendingCommand);
        slot.before(block);
        pendingCommand = null;
        document.querySelectorAll('.palette-list button').forEach(button => button.setAttribute('aria-pressed', 'false'));
        refreshSlots();
        playSnap();
        toast('Bloco encaixado! Prévia visual, sem gerar ou executar código.');
        (block.querySelector('input') || block).focus();
      });
    }
  });
}
/** Cria somente o aspecto e o corpo encaixável de um comando fictício. */
function makeDemoBlock(categoryIndex, commandIndex) {
  const [,color,commands] = categories[categoryIndex];
  const block = document.createElement('div');
  block.className = 'code-block ' + color;
  const text = document.createElement('span');
  text.textContent = commands[commandIndex];
  block.append(text);
  if (categoryIndex === 2 || (categoryIndex === 3 && commandIndex === 0)) {
    const shell = document.createElement('div'); shell.className = 'repeat-shell';
    const body = document.createElement('div'); body.className = 'repeat-body';
    shell.append(block, body);
    return shell;
  }
  return block;
}
/** Toca o mesmo arquivo de encaixe usado pelo legado após gesto do usuário. */
function playSnap() {
  if (!soundEnabled) return;
  const sound = document.querySelector('#snap-audio');
  sound.currentTime = 0;
  sound.play().catch(() => toast('Bloco encaixado. O navegador não liberou o som; tente pelo clique.'));
}
/** Resolve um encaixe sob o ponteiro, evitando mover um bloco para dentro dele mesmo. */
function getDropSlot(x, y) {
  const hit = document.elementFromPoint(x, y);
  let slot = hit?.closest('.drop-slot');
  if (!slot) {
    const block = hit?.closest('.code-block');
    const item = block?.parentElement.classList.contains('repeat-shell') ? block.parentElement : block;
    if (item) {
      const rect = item.getBoundingClientRect();
      slot = y < rect.top + rect.height / 2 ? item.previousElementSibling : item.nextElementSibling;
      if (!slot?.classList.contains('drop-slot')) slot = null;
    }
  }
  if (dragState?.block?.contains(slot)) return null;
  return slot;
}
/** Remove o estado transitório do arraste sem apagar o bloco original. */
function finishDrag() {
  dragState?.ghost?.remove();
  dragState?.block?.classList.remove('dragging-block');
  document.querySelectorAll('.drop-active').forEach(slot => slot.classList.remove('drop-active'));
  document.body.classList.remove('drag-active');
  dragState = null;
}

tagBlocks();
refreshSlots();
document.querySelector('#sound-toggle').addEventListener('click', event => {
  soundEnabled = !soundEnabled;
  event.currentTarget.setAttribute('aria-pressed', String(soundEnabled));
  event.currentTarget.textContent = soundEnabled ? '♫ Som ligado' : '♫ Som desligado';
});
document.addEventListener('pointerdown', event => {
  if (event.button !== 0 || event.target.closest('input, textarea, select, .drop-slot')) return;
  const paletteButton = event.target.closest('[data-command]');
  const header = event.target.closest('.code-block');
  let block = header?.parentElement.classList.contains('repeat-shell') ? header.parentElement : header;
  if (!paletteButton && !block) return;
  if (mode !== 'visual') return;
  if (paletteButton) block = null;
  dragState = { pointerId:event.pointerId, x:event.clientX, y:event.clientY, paletteButton, block, ghost:null, slot:null };
  event.target.setPointerCapture(event.pointerId);
});
document.addEventListener('pointermove', event => {
  if (!dragState || event.pointerId !== dragState.pointerId) return;
  const distance = Math.hypot(event.clientX - dragState.x, event.clientY - dragState.y);
  if (!dragState.ghost && distance < 7) return;
  event.preventDefault();
  if (!dragState.ghost) {
    const original = dragState.paletteButton || dragState.block.querySelector('.code-block') || dragState.block;
    const ghost = document.createElement('div');
    ghost.className = 'drag-ghost';
    ghost.textContent = original.textContent;
    ghost.style.backgroundColor = getComputedStyle(original).backgroundColor;
    ghost.style.color = getComputedStyle(original).color;
    document.body.append(ghost);
    dragState.ghost = ghost;
    dragState.block?.classList.add('dragging-block');
    document.body.classList.add('drag-active');
  }
  dragState.ghost.style.left = event.clientX + 14 + 'px';
  dragState.ghost.style.top = event.clientY + 10 + 'px';
  document.querySelectorAll('.drop-active').forEach(slot => slot.classList.remove('drop-active'));
  const area = document.querySelector('.program-body');
  const bounds = area.getBoundingClientRect();
  if (event.clientX >= bounds.left && event.clientX <= bounds.right) {
    if (event.clientY < bounds.top + 40) area.scrollTop -= 14;
    if (event.clientY > bounds.bottom - 40) area.scrollTop += 14;
  }
  dragState.slot = getDropSlot(event.clientX, event.clientY);
  dragState.slot?.classList.add('drop-active');
});
document.addEventListener('pointerup', event => {
  if (!dragState || event.pointerId !== dragState.pointerId) return;
  if (!dragState.ghost) { finishDrag(); return; }
  suppressClick = true;
  setTimeout(() => { suppressClick = false; }, 0);
  const slot = dragState.slot;
  if (slot?.isConnected) {
    const block = dragState.block || makeDemoBlock(...dragState.paletteButton.dataset.command.split(':').map(Number));
    slot.before(block);
    pendingCommand = null;
    document.querySelectorAll('.palette-list button').forEach(button => button.setAttribute('aria-pressed', 'false'));
    playSnap();
    toast('Encaixou! Arraste novamente para mudar a ordem · demonstração.');
  } else toast('Solte sobre um encaixe azul. Nenhum bloco foi removido.');
  finishDrag();
  refreshSlots();
});
document.addEventListener('pointercancel', finishDrag);
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') { finishDrag(); pendingCommand = null; }
});

/** Alternativa simples para reordenar irmãos pelo teclado nesta demonstração. */
document.querySelector('#block-stack').addEventListener('keydown', event => {
  if (!event.altKey || !['ArrowUp', 'ArrowDown'].includes(event.key) || event.target.matches('input')) return;
  const block = event.target.closest('[data-demo-block]');
  if (!block) return;
  event.preventDefault();
  event.stopPropagation();
  const siblings = [...block.parentElement.children].filter(child => child.dataset.demoBlock);
  const index = siblings.indexOf(block);
  const next = siblings[index + (event.key === 'ArrowUp' ? -1 : 1)];
  if (!next) { toast('Este é o limite da sequência.'); return; }
  if (event.key === 'ArrowUp') next.before(block); else next.after(block);
  refreshSlots();
  block.focus();
  playSnap();
  toast('Ordem alterada pelo teclado · demonstração.');
});
