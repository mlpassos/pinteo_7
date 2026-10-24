import { fail, succeed } from '../../core/common/index.js';
import type { Result } from '../../core/common/index.js';
import { infixCatalog, parseLogo, resolveCommand } from '../../core/logo/index.js';
import type { LogoNode } from '../../core/logo/index.js';
import { programDocumentSchema } from '../../shared/index.js';
import type { ProgramDocument } from '../../shared/index.js';
import { importLegacyCp7 } from './cp7.js';
import type { ImportedCp7 } from './cp7.js';

/** Nó LOGO normalizado para comparação estrutural, sem avaliar comandos. */
type CanonicalNode =
  | Readonly<{ kind: 'number'; value: number }>
  | Readonly<{ kind: 'symbol' | 'variable'; name: string }>
  | Readonly<{ kind: 'call'; name: string; args: readonly CanonicalNode[] }>
  | Readonly<{ kind: 'list'; items: readonly CanonicalNode[] }>
  | Readonly<{
      kind: 'define';
      name: string;
      parameters: readonly string[];
      body: readonly CanonicalNode[];
    }>;

/** Diferença de dados concreta, sem declarar igualdade de programas por imagem parecida. */
export type LegacyDifference = Readonly<{ path: string; txt: unknown; cp7: unknown }>;

/** Auditoria mantém ambas as fontes e torna a escolha de TXT explícita. */
export type LegacyAudit = Readonly<{
  program: ProgramDocument;
  cp7: ImportedCp7;
  comparison: 'equivalent-ast' | 'different-ast';
  differences: readonly LegacyDifference[];
  resolution: string;
}>;

/** Normaliza somente aliases/infixos/spans/delimitadores equivalentes nesta gramática. */
function canonicalNode(node: LogoNode): CanonicalNode {
  switch (node.kind) {
    case 'number':
      return { kind: 'number', value: node.value };
    case 'symbol':
    case 'variable':
      return { kind: node.kind, name: node.name };
    case 'call':
      return {
        kind: 'call',
        name: infixCatalog[node.name]?.name ?? resolveCommand(node.name)?.name ?? node.name,
        args: node.args.map(canonicalNode),
      };
    case 'list':
      return { kind: 'list', items: node.items.map(canonicalNode) };
    case 'define':
      return {
        kind: 'define',
        name: node.name,
        parameters: node.parameters,
        body: node.body.map(canonicalNode),
      };
  }
}

/** Compara árvores por índice, registrando até 32 diferenças sem truncar a fonte escolhida. */
function differencesBetween(
  txt: readonly CanonicalNode[],
  cp7: readonly CanonicalNode[],
): LegacyDifference[] {
  const differences: LegacyDifference[] = [];
  const maximum = Math.max(txt.length, cp7.length);
  for (let index = 0; index < maximum; index += 1) {
    const left = txt[index],
      right = cp7[index];
    if (JSON.stringify(left) !== JSON.stringify(right))
      differences.push({ path: `body[${String(index)}]`, txt: left ?? null, cp7: right ?? null });
    if (differences.length >= 32) break;
  }
  return differences;
}

/**
 * Audita CP7 integralmente e compara AST ao TXT, sem executar nenhum deles.
 * TXT validado e caracterizado é sempre a fonte canônica, conservada byte a byte.
 */
export function auditLegacyPair(txt: string, cp7: string): Result<LegacyAudit> {
  const imported = importLegacyCp7(cp7);
  if (!imported.ok) return imported;
  const document = programDocumentSchema.safeParse({
    formatVersion: 1,
    source: txt,
    characterId: 'tartaruga',
  });
  if (!document.success)
    return fail({
      code: 'LEGACY_DOCUMENT_INVALID',
      message: 'O TXT não atende ao contrato de documento.',
    });
  const txtParsed = parseLogo(txt),
    cp7Parsed = parseLogo(imported.value.source);
  if (!txtParsed.ok || !cp7Parsed.ok)
    return fail({
      code: 'LEGACY_SYNTAX_INVALID',
      message: 'O conjunto legado precisa de revisão sintática antes da migração.',
    });
  const differences = differencesBetween(
    txtParsed.value.body.map(canonicalNode),
    cp7Parsed.value.body.map(canonicalNode),
  );
  const comparison = differences.length === 0 ? 'equivalent-ast' : 'different-ast';
  return succeed({
    program: document.data,
    cp7: imported.value,
    comparison,
    differences,
    resolution:
      comparison === 'equivalent-ast'
        ? 'TXT original preservado integralmente; CP7 confirma a mesma AST após aliases, variáveis dos slots e infixos serem normalizados.'
        : imported.value.orphanExpressions.length > 0
          ? 'TXT original caracterizado preservado integralmente. Expressão solta existente apenas no CP7 permanece na auditoria; não é inventado bloco executável nem incorporado texto ausente do TXT.'
          : 'TXT original caracterizado preservado integralmente como fonte canônica; divergências do CP7 registradas por instrução, sem sobrescrever ou reparar silenciosamente nenhuma fonte.',
  });
}
