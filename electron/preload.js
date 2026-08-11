const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
    on: (channel, listener) => {
      ipcRenderer.on(channel, (event, ...args) => listener(...args));
    },
    removeAllListeners: (channel) => {
      ipcRenderer.removeAllListeners(channel);
    },
    removeListener: (channel, listener) => {
      // Note: This won't work perfectly for function references across the bridge without extra care,
      // but we can expose it to prevent the TypeError. Ideally, we shouldn't use removeListener across contextBridge.
      ipcRenderer.removeListener(channel, listener);
    }
  }
});
