# Integración del Middleware KPI en Vite + Express

Para exponer el endpoint `/api/kpi` en tu entorno de desarrollo Vite usando Express, sigue estos pasos:

1. **Asegúrate de tener las dependencias:**
   - `express` y `@types/express` ya están en tu `package.json`.

2. **Archivo de Middleware:**
   - El middleware está en: `src/server/kpi-middleware.ts`
   - Plugin de integración: `vite.express-middleware.ts`

3. **Modifica tu configuración de Vite para usar Express:**
   - Edita tu `vite.config.ts` para agregar el middleware en el hook `configureServer`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { setupKpiApi } from './vite.express-middleware';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'kpi-api-middleware',
      configureServer(server) {
        // @ts-expect-error: Vite dev server usa .app de Express
        setupKpiApi(server.app);
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

4. **Reinicia el servidor de desarrollo:**
   - Ejecuta `npm run dev`.

5. **Prueba el endpoint:**
   - Realiza un POST a `/api/kpi` desde tu frontend o con una herramienta como Postman.

---

Este setup permite exponer endpoints personalizados en tu entorno local sin afectar el build de producción.
