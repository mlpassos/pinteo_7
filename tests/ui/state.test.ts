import { describe, expect, it } from 'vitest';
import { initialWorkspace, workspaceReducer } from '../../src/ui/state.js';
import { TestConversion, TEST_SOURCE } from './fakes.js';

const document = { formatVersion: 1, source: TEST_SOURCE, characterId: 'tartaruga' } as const;
describe('fonte canônica na interface', () => {
  it('recusa projeção antiga depois de digitação, preservando texto e comentários exatos', () => {
    const initial = initialWorkspace(document);
    const conversion = new TestConversion().sourceToBlocks(TEST_SOURCE, 0);
    if (!conversion.ok) throw new Error('Fixture inválida');
    const changed = workspaceReducer(initial, {
      type: 'source',
      source: '; rascunho novo\nforward random 100  \n',
    });
    expect(workspaceReducer(changed, { type: 'projected', projection: conversion.value })).toBe(
      changed,
    );
    expect(changed.document.source).toBe('; rascunho novo\nforward random 100  \n');
    expect(changed.mode).toBe('code');
    expect(
      workspaceReducer(changed, {
        type: 'edited',
        projection: conversion.value,
        source: TEST_SOURCE,
        previousRevision: 0,
      }),
    ).toBe(changed);
  });
  it('falha e cancelamento de execução mantêm documento e histórico, com saída limitada', () => {
    const initial = initialWorkspace(document);
    const running = workspaceReducer(workspaceReducer(initial, { type: 'run' }), {
      type: 'status',
      status: 'running',
    });
    const failed = workspaceReducer(running, {
      type: 'diagnostics',
      diagnostics: [{ code: 'FAIL', message: 'Falha' }],
    });
    const stopped = workspaceReducer(failed, { type: 'status', status: 'idle' });
    expect(stopped.document).toBe(document);
    expect(stopped.history).toEqual([TEST_SOURCE]);
    expect(
      workspaceReducer(stopped, { type: 'text', text: 'x'.repeat(30_000) }).output,
    ).toHaveLength(20 * 1024);
    const multibyte = workspaceReducer(stopped, { type: 'text', text: 'á'.repeat(20_000) });
    expect(new TextEncoder().encode(multibyte.output).byteLength).toBeLessThanOrEqual(20 * 1024);
    expect(multibyte.output).not.toContain('�');
  });
  it('Limpar elimina histórico/diagnósticos sem apagar fonte; clear-text LOGO conserva histórico', () => {
    const used = workspaceReducer(workspaceReducer(initialWorkspace(document), { type: 'run' }), {
      type: 'run',
    });
    expect(workspaceReducer(used, { type: 'clear-text' }).history).toHaveLength(2);
    const cleared = workspaceReducer(used, { type: 'clear-session' });
    expect(cleared.history).toHaveLength(0);
    expect(cleared.document.source).toBe(TEST_SOURCE);
    expect(cleared.output).toBe('');
  });
  it('alternar sem edição conserva espaços e comentários, sem serializar novamente', () => {
    const initial = initialWorkspace(document);
    const result = new TestConversion().sourceToBlocks(TEST_SOURCE, 0);
    if (!result.ok) throw new Error('Fixture inválida');
    const visual = workspaceReducer(initial, { type: 'projected', projection: result.value });
    const code = workspaceReducer(visual, { type: 'mode', mode: 'code' });
    expect(code.document.source).toBe(TEST_SOURCE);
    expect(code.revision).toBe(0);
  });
});
