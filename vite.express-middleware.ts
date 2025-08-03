
import type { Express } from 'express';
import { json } from 'express';
import { kpiApiHandler } from './src/server/kpi-middleware';

/**
 * Vite plugin para exponer el endpoint /api/kpi usando Express middleware.
 * Solo registra si app existe y es Express.
 */
export function setupKpiApi(app: unknown) {
  // Solo registrar si app existe y tiene .post (Express)
  if (app && typeof (app as Express).post === 'function') {
    (app as Express).post('/api/kpi', json(), kpiApiHandler);
  } else {
    console.warn('[setupKpiApi] No Express app found, /api/kpi not registered');
  }
}
