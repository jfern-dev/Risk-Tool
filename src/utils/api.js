export const apiFetch = async (url, options = {}) => {
  const { method = 'GET', body } = options;
  let parsedBody = body ? JSON.parse(body) : undefined;
  
  const path = url.replace('http://localhost:3000', '');
  
  try {
    const data = await window.electron.ipcRenderer.invoke('api-request', { path, method, body: parsedBody });
    if (data && data.error) {
      return {
        ok: false,
        json: async () => data
      };
    }
    return {
      ok: true,
      json: async () => data
    };
  } catch (err) {
    return {
      ok: false,
      json: async () => ({ error: err.message })
    };
  }
};
