import { runMonteCarloSimulation } from '../utils/mcEngine.js';

self.onmessage = function (e) {
  try {
    const { risks, probabilityMapping, iterations = 50000 } = e.data || {};
    const results = runMonteCarloSimulation(risks, probabilityMapping, iterations);
    self.postMessage(results);
  } catch (err) {
    self.postMessage({ error: err.message || 'Worker simulation error' });
  }
};
