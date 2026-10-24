import type { ProgramDocument } from '../../shared/index.js';

const characterFiles = import.meta.glob<string>('../../../images/personagens/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});
/** Vite inclui somente PNGs locais conhecidos; nenhum caminho externo é executado. */
export function characterUrl(id: ProgramDocument['characterId']): string {
  return characterFiles[`../../../images/personagens/${id}.png`] ?? '';
}
export const snapUrl = new URL('../../../sounds/click.mp3', import.meta.url).href;
export const deleteUrl = new URL('../../../sounds/delete.mp3', import.meta.url).href;
export const helpVideoUrl = new URL('../../../videos/blockprog.mp4', import.meta.url).href;
export const helpCaptionsUrl = new URL('../../../legendas/pt-br.vtt', import.meta.url).href;
/** Rótulos humanos dos mesmos 21 personagens preservados. */
export const CHARACTER_NAMES: Readonly<Record<ProgramDocument['characterId'], string>> = {
  tartaruga: 'Tartaruga',
  jabuti: 'Jabuti',
  capivara: 'Capivara',
  arara: 'Arara',
  onca: 'Onça',
  boto: 'Boto',
  joaninha: 'Joaninha',
  rato: 'Rato',
  'robo-quadrado': 'Robô quadrado',
  'robo-redondo': 'Robô redondo',
  astronauta: 'Astronauta',
  foguete: 'Foguete',
  'disco-voador': 'Disco voador',
  'nave-estrela': 'Nave estrela',
  'fantasma-azul': 'Fantasma azul',
  'fantasma-verde': 'Fantasma verde',
  'fantasma-rosa': 'Fantasma rosa',
  'fantasma-laranja': 'Fantasma laranja',
  'muiraquita-dourado': 'Muiraquitã dourado',
  'muiraquita-jade': 'Muiraquitã jade',
  'muiraquita-verde': 'Muiraquitã verde',
};
