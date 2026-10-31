import { z } from 'zod';

export const sourceSchema = z.string().max(1048576);
export const idSchema = z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
export const panelIdSchema = z.enum(['library', 'playlist', 'preview', 'effects']);
export const panelSchema = z.object({ id: panelIdSchema, collapsed: z.boolean(), weight: z.number().min(1).max(10000) });
export const layoutSchema = z.object({
  leftWidth: z.number().min(200).max(600), rightWidth: z.number().min(260).max(700),
  left: z.array(panelSchema).max(4), right: z.array(panelSchema).max(4), problems: z.boolean(),
}).refine(l => {
  const ids = [...l.left, ...l.right].map(p => p.id);
  return ids.length === 4 && new Set(ids).size === 4;
}, 'Each panel must occur exactly once');
export const defaultLayout = {
  leftWidth: 270, rightWidth: 370, problems: true,
  left: [{ id: 'library' as const, collapsed: false, weight: 57 }, { id: 'playlist' as const, collapsed: false, weight: 43 }],
  right: [{ id: 'preview' as const, collapsed: false, weight: 43 }, { id: 'effects' as const, collapsed: false, weight: 57 }],
};
export const documentSchema = z.object({
  id: idSchema, name: z.string().min(1).max(240), path: z.string().max(32768).nullable(),
  content: sourceSchema, savedContent: sourceSchema, dirty: z.boolean(),
});
export const workspaceSchema = z.object({
  version: z.literal(1), documents: z.array(documentSchema).max(100),
  activeId: idSchema.nullable(), layout: layoutSchema, activePlaylist: idSchema.nullable(),
});
export const settingsSchema = z.object({
  version: z.literal(1), storageRoot: z.string().min(1).max(32768),
  autoPreview: z.boolean(), fontSize: z.number().int().min(11).max(22),
});
export const presetSchema = z.object({
  id: idSchema, name: z.string(), path: z.string(), originalPath: z.string(),
  importedAt: z.string(), hash: z.string(), status: z.enum(['ready', 'repaired', 'review']),
  repairs: z.array(z.string()), warnings: z.array(z.string()),
});
export const playlistSchema = z.object({ id: idSchema, name: z.string(), paths: z.array(z.string().max(32768)).max(50000) });
export type PanelId = z.infer<typeof panelIdSchema>;
export type PanelState = z.infer<typeof panelSchema>;
export type Layout = z.infer<typeof layoutSchema>;
export type PresetDocument = z.infer<typeof documentSchema>;
export type Workspace = z.infer<typeof workspaceSchema>;
export type Settings = z.infer<typeof settingsSchema>;
export type Preset = z.infer<typeof presetSchema>;
export type Playlist = z.infer<typeof playlistSchema>;
export interface ImportReport { imported: Preset[]; rejected: { name: string; reason: string }[] }
export interface Bootstrap { settings: Settings; workspace: Workspace; library: Preset[]; playlists: Playlist[]; recoveryWarning?: string }
export interface PresetDiagnostic { from: number; to: number; severity: 'error' | 'warning'; message: string; line: number }
export interface MilkLabAPI {
  bootstrap(): Promise<Bootstrap>;
  lintPreset(content: string): Promise<PresetDiagnostic[]>;
  importPresets(folder: boolean): Promise<ImportReport>;
  readPreset(id: string): Promise<PresetDocument>;
  saveDocument(document: PresetDocument, saveAs: boolean): Promise<PresetDocument | null>;
  persistWorkspace(workspace: Workspace): Promise<void>;
  chooseStorage(): Promise<string | null>;
  updateSettings(settings: Settings): Promise<Bootstrap>;
  savePlaylist(playlist: Playlist): Promise<Playlist>;
  addPresetToPlaylist(playlistId: string, presetId: string): Promise<Playlist>;
  createPlaylist(name: string): Promise<Playlist>;
  importPlaylist(): Promise<Playlist | null>;
  exportPlaylist(id: string): Promise<boolean>;
  exportWorkspace(workspace: Workspace): Promise<boolean>;
  importWorkspace(): Promise<Workspace | null>;
  windowControl(action: 'minimize' | 'maximize' | 'close' | 'close-ready'): void;
  onClosing(callback: () => void): () => void;
}
declare global { interface Window { milkLab?: MilkLabAPI } }
