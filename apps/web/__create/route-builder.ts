import { existsSync } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Hono } from 'hono';
import type { Handler } from 'hono/types';
import updatedFetch from '../src/__create/fetch';

const API_BASENAME = '/api';
const api = new Hono();

// API route modules live in source tree. When this file is bundled under build/server/assets/,
// a path relative to import.meta.url points at a non-existent folder; prefer cwd (apps/web).
const apiDirFromProjectRoot = join(process.cwd(), 'src', 'app', 'api');
const apiDirFromCreateFile = join(
  fileURLToPath(new URL('.', import.meta.url)),
  '..',
  'src',
  'app',
  'api',
);
const __dirname = existsSync(apiDirFromProjectRoot)
  ? apiDirFromProjectRoot
  : apiDirFromCreateFile;
if (globalThis.fetch) {
  globalThis.fetch = updatedFetch;
}

/** Map Vite glob key (any slash style) to Hono path under /api */
function honoPathFromViteGlobKey(globKey: string): string {
  const norm = globKey.replace(/\\/g, '/');
  const needle = 'src/app/api/';
  const i = norm.indexOf(needle);
  if (i === -1) return '';
  let rest = norm.slice(i + needle.length);
  if (!rest.endsWith('/route.js')) return '';
  rest = rest.slice(0, -'/route.js'.length);
  if (rest.endsWith('/')) rest = rest.slice(0, -1);
  if (!rest) return '/';
  const segs = rest.split('/').filter(Boolean);
  return (
    '/' +
    segs
      .map((segment) => {
        const pm = segment.match(/^\[(\.{3})?([^\]]+)\]$/);
        if (pm) {
          return pm[1] === '...' ? `:${pm[2]}{.+}` : `:${pm[2]}`;
        }
        return segment;
      })
      .join('/')
  );
}

function attachRouteModule(honoPath: string, route: Record<string, unknown>) {
  const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as const;
  for (const method of methods) {
    try {
      const fn = route[method];
      if (typeof fn !== 'function') continue;
      const handler: Handler = async (c) =>
        await (fn as (req: Request, ctx: { params: unknown }) => Promise<Response>)(
          c.req.raw,
          { params: c.req.param() },
        );
      const methodLowercase = method.toLowerCase();
      switch (methodLowercase) {
        case 'get':
          api.get(honoPath, handler);
          break;
        case 'post':
          api.post(honoPath, handler);
          break;
        case 'put':
          api.put(honoPath, handler);
          break;
        case 'delete':
          api.delete(honoPath, handler);
          break;
        case 'patch':
          api.patch(honoPath, handler);
          break;
        default:
          console.warn(`Unsupported method: ${method}`);
      }
    } catch (error) {
      console.error(`Error registering route ${honoPath} for method ${method}:`, error);
    }
  }
}

/** Production: routes are pre-bundled so `@/` imports resolve; Node cannot load raw route.js from disk. */
function registerRoutesProd() {
  const mods = import.meta.glob<Record<string, unknown>>('../src/app/api/**/route.js', {
    eager: true,
  });
  api.routes = [];
  const keys = Object.keys(mods).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    const honoPath = honoPathFromViteGlobKey(key);
    if (!honoPath) {
      console.warn('[route-builder] skip key (no Hono path):', key);
      continue;
    }
    attachRouteModule(honoPath, mods[key]!);
  }
}

// Recursively find all route.js files (development)
async function findRouteFiles(dir: string): Promise<string[]> {
  const files = await readdir(dir);
  let routes: string[] = [];

  for (const file of files) {
    try {
      const filePath = join(dir, file);
      const statResult = await stat(filePath);

      if (statResult.isDirectory()) {
        routes = routes.concat(await findRouteFiles(filePath));
      } else if (file === 'route.js') {
        if (filePath === join(__dirname, 'route.js')) {
          routes.unshift(filePath);
        } else {
          routes.push(filePath);
        }
      }
    } catch (error) {
      console.error(`Error reading file ${file}:`, error);
    }
  }

  return routes;
}

function getHonoPath(routeFile: string): { name: string; pattern: string }[] {
  const rel = relative(__dirname, routeFile);
  const parts = rel.split(sep).filter(Boolean);
  const routeParts = parts.slice(0, -1);
  if (routeParts.length === 0) {
    return [{ name: 'root', pattern: '' }];
  }
  const transformedParts = routeParts.map((segment) => {
    const match = segment.match(/^\[(\.{3})?([^\]]+)\]$/);
    if (match) {
      const [_, dots, param] = match;
      return dots === '...'
        ? { name: param, pattern: `:${param}{.+}` }
        : { name: param, pattern: `:${param}` };
    }
    return { name: segment, pattern: segment };
  });
  return transformedParts;
}

async function registerRoutesDev() {
  const routeFiles = (
    await findRouteFiles(__dirname).catch((error) => {
      console.error('Error finding route files:', error);
      return [];
    })
  )
    .slice()
    .sort((a, b) => {
      return b.length - a.length;
    });

  api.routes = [];

  for (const routeFile of routeFiles) {
    try {
      const routeModuleUrl = pathToFileURL(routeFile).href;
      const route = await import(/* @vite-ignore */ routeModuleUrl);

      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
      for (const method of methods) {
        try {
          if (route[method]) {
            const parts = getHonoPath(routeFile);
            const honoPath = `/${parts.map(({ pattern }) => pattern).join('/')}`;
            const handler: Handler = async (c) => {
              const params = c.req.param();
              if (import.meta.env.DEV) {
                const updatedRoute = await import(/* @vite-ignore */ routeModuleUrl);
                return await updatedRoute[method](c.req.raw, { params });
              }
              return await route[method](c.req.raw, { params });
            };
            const methodLowercase = method.toLowerCase();
            switch (methodLowercase) {
              case 'get':
                api.get(honoPath, handler);
                break;
              case 'post':
                api.post(honoPath, handler);
                break;
              case 'put':
                api.put(honoPath, handler);
                break;
              case 'delete':
                api.delete(honoPath, handler);
                break;
              case 'patch':
                api.patch(honoPath, handler);
                break;
              default:
                console.warn(`Unsupported method: ${method}`);
                break;
            }
          }
        } catch (error) {
          console.error(`Error registering route ${routeFile} for method ${method}:`, error);
        }
      }
    } catch (error) {
      console.error(`Error importing route file ${routeFile}:`, error);
    }
  }
}

if (import.meta.env.DEV) {
  await registerRoutesDev();
  import.meta.glob('../src/app/api/**/route.js', {
    eager: true,
  });
  if (import.meta.hot) {
    import.meta.hot.accept(() => {
      registerRoutesDev().catch((err) => {
        console.error('Error reloading routes:', err);
      });
    });
  }
} else {
  registerRoutesProd();
}

export { api, API_BASENAME };
