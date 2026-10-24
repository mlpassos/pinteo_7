/** Query estática de recuperação; expõe só a porta pública consumida pelo wrapper. */
declare module '*?editor-retry' {
  /** Mesma classe local, observada somente pelos métodos usados pela UI. */
  export class LogoEditor {
    /** Monta a mesma implementação com chave de módulo independente. */
    constructor(parent: HTMLElement, source: string, change: (source: string) => void);
    /** Sincroniza somente mudanças externas de fonte. */
    setSource(source: string): void;
    /** Posiciona o cursor no diagnóstico sem alterar a fonte. */
    focusDiagnostic(
      diagnostic: Readonly<{
        code: string;
        message: string;
        span?: Readonly<{ start: number; end: number }>;
      }>,
    ): void;
    /** Desconecta o editor quando sua montagem termina. */
    destroy(): void;
  }
}
