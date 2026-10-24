import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { root } from './inventory.mjs';

/** Exercita a função Executar real com adaptadores DOM mínimos e seleção deliberadamente diferente.
 * O BlocksParser é uma porta observada: a comparação de semântica LOGO pertence ao harness Papert.
 * @param {'visual'|'code'} mode Modo ativo da interface original.
 * @returns {unknown} Fonte passada a run e seletores consultados.
 */
export function observeExecutionSelection(mode) {
  if (mode !== 'visual' && mode !== 'code') throw new Error('Modo inválido');
  const source = readFileSync(`${root}js/pinteo7.js`, 'utf8');
  const start = source.indexOf('function Executar(');
  const end = source.indexOf('function checkForMoves(', start);
  if (start < 0 || end < 0) throw new Error('Função legada não localizada');
  const sandbox = createContext(
    { __mode: mode },
    { codeGeneration: { strings: false, wasm: false } },
  );
  runInContext(
    `
    var __source='forward 10\\nright 90',__calls=[],__selectors=[];
    var __blocks=[{code:'forward 10\\n',selected:false},{code:'right 90\\n',selected:true}];
    var cm={getValue:function(){return __source;},setValue:function(value){__source=value;},getSelection:function(){throw new Error('Seleção CLI consultada');}};
    function run(speed,show) { __calls.push({source:__source,speed:speed,show:show}); }
    function alert(message){throw new Error(message);}
    function BlocksParser(element){return element.code;}
    function $(selector) {
      if(typeof selector==='object') return selector;
      __selectors.push(selector);
      return {is:function(){return __mode==='code';},length:__blocks.length,each:function(callback){__blocks.forEach(function(block,index){callback.call(block,index);});}};
    }
  `,
    sandbox,
    { timeout: 100 },
  );
  runInContext(source.slice(start, end), sandbox, {
    filename: 'js/pinteo7.js:Executar',
    timeout: 100,
  });
  const result = runInContext(
    'Executar(5,false);JSON.stringify({calls:__calls,selectors:__selectors})',
    sandbox,
    { timeout: 100 },
  );
  if (typeof result !== 'string') throw new Error('Observação inválida');
  /** @type {unknown} */
  const parsed = JSON.parse(result);
  return parsed;
}
