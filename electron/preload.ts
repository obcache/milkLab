import { contextBridge, ipcRenderer } from 'electron';
import type { MilkLabAPI } from '../src/shared/contracts';
const api: MilkLabAPI = {
  bootstrap: () => ipcRenderer.invoke('bootstrap'),
  lintPreset: content => ipcRenderer.invoke('lint', content),
  importPresets: folder => ipcRenderer.invoke('import-presets', folder),
  readPreset: id => ipcRenderer.invoke('read-preset', id),
  saveDocument: (doc, saveAs) => ipcRenderer.invoke('save-document', doc, saveAs),
  persistWorkspace: workspace => ipcRenderer.invoke('persist-workspace', workspace),
  chooseStorage: () => ipcRenderer.invoke('choose-storage'),
  updateSettings: settings => ipcRenderer.invoke('update-settings', settings),
  savePlaylist: playlist => ipcRenderer.invoke('save-playlist', playlist),
  addPresetToPlaylist: (playlistId, presetId) => ipcRenderer.invoke('add-preset-to-playlist', playlistId, presetId),
  createPlaylist: name => ipcRenderer.invoke('create-playlist', name),
  importPlaylist: () => ipcRenderer.invoke('import-playlist'),
  exportPlaylist: id => ipcRenderer.invoke('export-playlist', id),
  exportWorkspace: workspace => ipcRenderer.invoke('export-workspace', workspace),
  importWorkspace: () => ipcRenderer.invoke('import-workspace'),
  windowControl: action => ipcRenderer.send('window-control', action),
  onClosing: callback => { const listener = () => callback(); ipcRenderer.on('closing', listener); return () => ipcRenderer.removeListener('closing', listener); },
};
contextBridge.exposeInMainWorld('milkLab', api);
