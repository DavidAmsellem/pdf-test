const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  savePDF: (fileData) => ipcRenderer.invoke('save-pdf', fileData),
  getPDFs: () => ipcRenderer.invoke('get-pdfs'),
  openPDF: (fileName) => ipcRenderer.invoke('open-pdf', fileName),
  deletePDF: (fileName) => ipcRenderer.invoke('delete-pdf', fileName),
  renamePDF: (oldName, newName) => ipcRenderer.invoke('rename-pdf', oldName, newName),
  closeApp: () => ipcRenderer.invoke('close-app'),
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  getPdfUrl: (fileName) => ipcRenderer.invoke('get-pdf-url', fileName)
});


contextBridge.exposeInMainWorld('electronAPI', {
    saveToCache: (pdfId, data, metadata) => 
        ipcRenderer.invoke('save-to-cache', pdfId, data, metadata),
    getFromCache: async (pdfId) => {
        const result = await ipcRenderer.invoke('get-from-cache', pdfId);
        if (result && result.data) {
            // Convertir Buffer a ArrayBuffer para transferencia
            return {
                ...result,
                data: Array.from(result.data)
            };
        }
        return result;
    },
    removeFromCache: (pdfId) => 
        ipcRenderer.invoke('remove-from-cache', pdfId),
    downloadAndCache: (data) => ipcRenderer.invoke('download-and-cache', data),
    
    // Añadir función de precarga
    preloadPDFs: (pdfsData) => ipcRenderer.invoke('preload-pdfs', pdfsData),
    openCacheFolder: () => ipcRenderer.invoke('open-cache-folder'),
    clearCache: () => ipcRenderer.invoke('clear-cache'),
    getCacheStats: () => ipcRenderer.invoke('get-cache-stats'),
    refreshCache: () => ipcRenderer.invoke('refresh-cache'),
    
    // Funciones para YouSign
    sendToYouSign: (data) => ipcRenderer.invoke('send-to-yousign', data),
    getYouSignStatus: (procedureId) => ipcRenderer.invoke('get-yousign-status', procedureId),
    getYouSignApiKey: () => ipcRenderer.invoke('get-yousign-api-key'),
    getYouSignApiUrl: () => ipcRenderer.invoke('get-yousign-api-url'),
    downloadSignedDocument: (procedureId) => ipcRenderer.invoke('download-signed-document', procedureId),
    openExternal: (url) => ipcRenderer.invoke('open-external', url),
});