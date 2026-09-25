import { validateWorkspace } from './domain.ts';
import type { Workspace } from './types';
export function readCloudBackup(value: unknown): {workspace: Workspace; updated_at: string} | null {
 if (value === null) return null;
 if (!value || typeof value !== 'object' || !('workspace' in value) || !('updated_at' in value) || typeof value.updated_at !== 'string' || !Number.isFinite(Date.parse(value.updated_at))) throw Error('The cloud backup could not be read. Your local workspace has not changed.');
 return {workspace: validateWorkspace(value.workspace), updated_at: value.updated_at};
}
export function restoreUnchanged(current: Workspace, before: string, remote: Workspace): Workspace {
 if (JSON.stringify(current) !== before) throw Error('Your local plans changed while the backup was loading. Review the restore again.');
 return validateWorkspace(remote);
}
