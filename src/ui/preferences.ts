import { z } from 'zod';
import { CHARACTER_IDS } from '../shared/index.js';

const schema = z.strictObject({
  characterId: z.enum(CHARACTER_IDS),
  speed: z.enum(['slow', 'normal', 'fast']),
  sound: z.boolean(),
});
/** Somente preferências sem programa, rascunho, histórico ou identificadores pessoais. */
export type Preferences = Readonly<z.infer<typeof schema>>;
const fallback: Preferences = { characterId: 'tartaruga', speed: 'normal', sound: true };
const key = 'pinte-o-7-preferences-v1';
/** Dados locais também são não confiáveis; quota/privacy/storage bloqueado nunca impedem uso. */
export function readPreferences(storage?: Pick<Storage, 'getItem'>): Preferences {
  try {
    const raw = (storage ?? window.localStorage).getItem(key);
    if (!raw || raw.length > 512) return fallback;
    const parsed = schema.safeParse(JSON.parse(raw) as unknown);
    return parsed.success ? parsed.data : fallback;
  } catch {
    return fallback;
  }
}
/** Grava apenas campos aprovados, mesmo se um chamador trouxer propriedades extras. */
export function writePreferences(
  preferences: Preferences,
  storage?: Pick<Storage, 'setItem'>,
): void {
  try {
    const value: Preferences = {
      characterId: preferences.characterId,
      speed: preferences.speed,
      sound: preferences.sound,
    };
    const parsed = schema.safeParse(value);
    if (parsed.success) (storage ?? window.localStorage).setItem(key, JSON.stringify(parsed.data));
  } catch {
    /* Preferência local é opcional; o documento nunca é persistido aqui. */
  }
}
