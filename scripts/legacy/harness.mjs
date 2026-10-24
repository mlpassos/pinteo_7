import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createContext, runInContext } from 'node:vm';

const root = fileURLToPath(new URL('../../', import.meta.url));
const sources = ['parser', 'logo', 'turtle', 'init'].map((name) => ({
  name,
  text: readFileSync(`${root}js/${name}.js`, 'utf8'),
}));

/** @typedef {{kind:'run', source:string, speed?:1|5|25, drain?:boolean}|{kind:'clear'|'stop'|'setup'|'drain'}} Action */

/** Valida ações antes de atravessar a fronteira VM; nunca avalia texto LOGO como JavaScript.
 * @param {unknown} input Dados da sessão.
 * @returns {asserts input is Action[]} Ações permitidas.
 */
function validateActions(input) {
  if (!Array.isArray(input) || input.length > 100) throw new Error('Sessão inválida');
  for (const item of input) {
    if (typeof item !== 'object' || item === null || !('kind' in item))
      throw new Error('Ação inválida');
    if (item.kind === 'run') {
      if (!('source' in item) || typeof item.source !== 'string' || item.source.length > 100_000)
        throw new Error('Fonte inválida');
      if ('speed' in item && ![1, 5, 25].includes(item.speed))
        throw new Error('Velocidade inválida');
      if ('drain' in item && typeof item.drain !== 'boolean') throw new Error('Drenagem inválida');
    } else if (!['clear', 'stop', 'setup', 'drain'].includes(item.kind))
      throw new Error('Ação desconhecida');
  }
}

const environment = `
var __operations = [], __queue = [], __delays = [], __snapshots = [], __exceptions = [], __source = '';
var __context = {
  lineWidth: 1, strokeStyle: 'rgb(0,0,0)', fillStyle: 'rgb(255,255,255)',
  beginPath: function() { this.path = []; },
  moveTo: function(x,y) { this.path.push(['move',x,y]); },
  lineTo: function(x,y) { this.path.push(['line',x,y]); },
  arc: function(x,y,r,start,end,ccw) { this.path.push(['arc',x,y,r,start,end,ccw]); },
  stroke: function() { __record({kind:'stroke',path:this.path.slice(),width:this.lineWidth,color:this.strokeStyle}); },
  fillRect: function(x,y,w,h) { __record({kind:'fill',x:x,y:y,width:w,height:h,color:this.fillStyle}); }
};
function __record(op) { if (__operations.length >= 100000) throw new Error('Limite de operações'); __operations.push(op); }
var __sprite = {style:{},setAttribute:function(){}};
var __canvas = {width:500,height:500,offsetTop:0,offsetLeft:0,style:{},getContext:function(){return __context;}};
var document = {getElementById:function(){return __sprite;}};
function $(selector) { return {css:function(){return this;},animate:function(){return this;},get:function(){return {scrollHeight:0};},dialog:function(){return this;},prev:function(){return this;},addClass:function(){return this;}}; }
function setTimeout(callback,delay) { __queue.push(callback); __delays.push(delay); }
function __drain() { var n=0; while(__queue.length) { if(++n>100000) throw new Error('Limite de agendamentos'); __queue.shift()(); } }
function __snapshot() {
  var t=turtle.turtle;
  __snapshots.push({position:{x:t.x,y:t.y},heading:t.angle,visible:t.visible,pen:t.pen,color:__context.strokeStyle,width:__context.lineWidth,
  output:textOutput.innerHTML,history:oldcode.innerHTML,error:out && out.type==='error'?out.data:null,pending:turtle.pipeline?turtle.pipeline.length:0,
  operations:__operations.length,scheduled:__queue.length});
}
canvas=__canvas; sprite=__sprite; textOutput={innerHTML:''}; oldcode={innerHTML:''};
var cm={getValue:function(){return __source;}};
setup(); logo.srand(12345);
`;

/** Executa o Papert original em VM com timeout síncrono efetivo e fila de desenho determinística.
 * DOM/canvas são adaptadores de observação, não uma implementação alternativa do motor.
 * @param {unknown} actions Ações validadas da sessão.
 * @param {number} timeoutMs Teto efetivo da execução VM completa.
 * @returns {unknown} Captura JSON sem objetos vivos da VM.
 */
export function runLegacy(actions, timeoutMs = 1000) {
  validateActions(actions);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 10_000)
    throw new Error('Timeout inválido');
  const sandbox = createContext(
    { __actionsJson: JSON.stringify(actions) },
    { codeGeneration: { strings: false, wasm: false } },
  );
  for (const source of sources)
    runInContext(source.text, sandbox, { filename: `js/${source.name}.js`, timeout: timeoutMs });
  runInContext(environment, sandbox, { filename: 'legacy-environment.js', timeout: timeoutMs });
  const result = runInContext(
    `
    JSON.parse(__actionsJson).forEach(function(action) {
      try { if(action.kind==='run') { __source=action.source; run(action.speed || 5, action.speed===25); if(action.drain!==false) __drain(); }
      else if(action.kind==='clear') clearcanvas();
      else if(action.kind==='stop') stop();
      else if(action.kind==='setup') { setup(); logo.srand(12345); }
      else __drain(); } catch(error) { __exceptions.push(String(error)); }
      __snapshot();
    });
    JSON.stringify({operations:__operations,snapshots:__snapshots,delays:__delays,exceptions:__exceptions});
  `,
    sandbox,
    { filename: 'legacy-session.js', timeout: timeoutMs },
  );
  if (typeof result !== 'string') throw new Error('Captura inválida');
  /** @type {unknown} */
  const parsed = JSON.parse(result);
  return parsed;
}
