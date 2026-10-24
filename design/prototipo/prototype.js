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
/** Preenche a paleta com uma categoria de demonstração. */
function showCategory(index) {
  document.querySelectorAll('.categories button').forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
  const [, color, commands] = categories[index];
  const list = document.querySelector('#palette-list');
  list.replaceChildren();
  commands.forEach(label => {
    const button = document.createElement('button');
    button.className = color;
    button.textContent = label;
    button.title = 'Demonstrar inserção: ' + label;
    button.addEventListener('click', () => {
      if (mode === 'code') { toast('Demonstração: os blocos são inseridos no modo Visual. Seu código foi mantido.'); return; }
      const block = document.createElement('div');
      block.className = 'code-block ' + color;
      block.textContent = label + ' · demo';
      document.querySelector('#block-stack').append(block);
      toast('Prévia de inserção. Sem arrastar, executar ou converter nesta versão.');
    });
    list.append(button);
  });
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
/** Abre a paleta e posiciona o foco para navegação em telas pequenas. */
function openPalette() {
  document.querySelector('#palette').classList.add('is-open');
  document.querySelector('.categories button[aria-pressed=true]').focus();
}

categories.forEach(([name], index) => {
  const button = document.createElement('button');
  button.textContent = name;
  button.setAttribute('aria-pressed', 'false');
  button.addEventListener('click', () => showCategory(index));
  document.querySelector('.categories').append(button);
});
showCategory(0);
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
document.querySelector('#close-palette').addEventListener('click', () => { document.querySelector('#palette').classList.remove('is-open'); document.querySelector('#open-palette').focus(); });
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
document.querySelector('#explore').addEventListener('click', () => toast('Experimente 30°, 45° ou 90° no programa final. Nesta prévia, o desenho é fixo.'));
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
