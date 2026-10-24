import { isAbsolute, relative, resolve, sep } from 'node:path';

/** Configuração explícita de uma única instância; os dados não são artefatos web. */
export type ServerConfig = Readonly<{
  dataDirectory: string;
  publicOrigin: string;
  port: number;
  quotaBytes: number;
  trustLocalProxy: boolean;
}>;

/** Verifica contenção de caminhos sem confundir prefixos de nomes de diretório. */
export function isInside(directory: string, candidate: string): boolean {
  const path = relative(resolve(directory), resolve(candidate));
  return path === '' || (path !== '..' && !path.startsWith(`..${sep}`) && !isAbsolute(path));
}

/** Lê inteiro de configuração; configuração inválida impede a inicialização. */
function positiveInteger(value: string | undefined, fallback: number, maximum: number): number {
  if (value === undefined) return fallback;
  if (!/^[1-9][0-9]*$/.test(value)) throw new Error('Configuração numérica inválida.');
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number > maximum)
    throw new Error('Configuração numérica fora do limite.');
  return number;
}

/**
 * Carrega somente as opções conhecidas. Diretório absoluto e origem são obrigatórios.
 * O caminho de dados deve ficar fora do checkout (portanto fora de dist/web).
 */
export function readServerConfig(environment: NodeJS.ProcessEnv, checkout: string): ServerConfig {
  const dataDirectory = environment.PINTEO7_DATA_DIR;
  const publicOrigin = environment.PINTEO7_PUBLIC_ORIGIN;
  if (!dataDirectory || !isAbsolute(dataDirectory) || isInside(checkout, dataDirectory)) {
    throw new Error('Defina PINTEO7_DATA_DIR absoluto e fora do checkout público.');
  }
  if (!publicOrigin) throw new Error('Defina PINTEO7_PUBLIC_ORIGIN.');
  const origin = new URL(publicOrigin);
  if (
    !['http:', 'https:'].includes(origin.protocol) ||
    origin.pathname !== '/' ||
    origin.username ||
    origin.password ||
    origin.search ||
    origin.hash
  ) {
    throw new Error('A origem deve conter apenas protocolo HTTP(S), host e porta opcional.');
  }
  if (
    environment.PINTEO7_TRUST_LOCAL_PROXY !== undefined &&
    !['true', 'false'].includes(environment.PINTEO7_TRUST_LOCAL_PROXY)
  ) {
    throw new Error('PINTEO7_TRUST_LOCAL_PROXY deve ser true ou false.');
  }
  return {
    dataDirectory: resolve(dataDirectory),
    publicOrigin: origin.origin,
    port: positiveInteger(environment.PORT, 5178, 65535),
    quotaBytes: positiveInteger(
      environment.PINTEO7_QUOTA_BYTES,
      250 * 1024 * 1024,
      Number.MAX_SAFE_INTEGER,
    ),
    trustLocalProxy: environment.PINTEO7_TRUST_LOCAL_PROXY === 'true',
  };
}
