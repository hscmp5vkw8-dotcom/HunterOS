import { fresh, validateWorkspace } from './domain.ts';
// Only a missing record means a new workspace. Empty or damaged records must
// reach recovery rather than being replaced by a fresh workspace.
export function decodeSaved(raw: string | null) {
  return raw === null ? fresh() : validateWorkspace(JSON.parse(raw));
}
