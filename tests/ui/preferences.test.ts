import { describe, expect, it } from 'vitest';
import { readPreferences, writePreferences } from '../../src/ui/preferences.js';

describe('preferências locais limitadas', () => {
  it('valida enums e rejeita dados extras ou JSON inválido sem bloquear a interface', () => {
    const saved = { characterId: 'capivara', speed: 'slow', sound: false };
    expect(readPreferences({ getItem: () => JSON.stringify(saved) })).toEqual(saved);
    for (const raw of [
      '{',
      JSON.stringify({ ...saved, source: 'print 42' }),
      JSON.stringify({ ...saved, characterId: '../segredo' }),
    ]) {
      expect(readPreferences({ getItem: () => raw }).characterId).toBe('tartaruga');
    }
    expect(
      readPreferences({
        getItem: () => {
          throw new Error('Privacy mode');
        },
      }).sound,
    ).toBe(true);
  });
  it('grava só personagem, velocidade e som; quota falha sem lançar exceção', () => {
    let raw = '';
    writePreferences(
      { characterId: 'arara', speed: 'fast', sound: false },
      {
        setItem: (_key, value) => {
          raw = value;
        },
      },
    );
    expect(JSON.parse(raw) as unknown).toEqual({
      characterId: 'arara',
      speed: 'fast',
      sound: false,
    });
    expect(() => {
      writePreferences(
        { characterId: 'arara', speed: 'fast', sound: true },
        {
          setItem: () => {
            throw new Error('Quota');
          },
        },
      );
    }).not.toThrow();
  });
});
