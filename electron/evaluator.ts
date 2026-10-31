import { pathToFileURL } from 'node:url';
import type { Evaluate } from '../src/domain/diagnostics';
export async function loadEvaluator(modulePath: string): Promise<Evaluate> {
  const { default: createModule } = await import(pathToFileURL(modulePath).href);
  const module = await createModule({ print: () => {}, printErr: () => {} });
  return code => ({
    message: module.ccall('ml_validate', 'string', ['string'], [code]),
    line: module.ccall('ml_line', 'number', [], []),
    column: module.ccall('ml_column', 'number', [], []),
  });
}
