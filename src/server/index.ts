/** Fronteira pública do servidor para composição, operação e testes de contrato. */
export { readServerConfig } from './config.js';
export { createApi } from './http.js';
export { FileShareRepository } from './repository.js';
export { startApiServer } from './runtime.js';
export { importPreparedExamples } from './migration.js';
export type { MigrationOptions, MigrationSummary } from './migration.js';
export type { ServerConfig } from './config.js';
export type { ApiEnvironment, ApiOptions } from './http.js';
export type { ShareRepository } from './repository.js';
