import { describe, expect, it } from 'vitest';
import { observeExecutionSelection } from '../../scripts/legacy/ui-observation.mjs';

describe('seleção na interface legada ativa', () => {
  it('executa fonte CLI inteira sem consultar a seleção do editor', () => {
    expect(observeExecutionSelection('code')).toEqual({
      calls: [{ source: 'forward 10\nright 90', speed: 5, show: false }],
      selectors: ['#codeblocks'],
    });
  });

  it('executa todos os blocos raiz mesmo quando somente o segundo está marcado', () => {
    expect(observeExecutionSelection('visual')).toMatchObject({
      calls: [{ source: 'forward 10\nright 90\n ', speed: 5, show: false }],
    });
  });
});
