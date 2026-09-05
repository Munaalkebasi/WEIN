import type { Plugin } from 'vite';
import { handleDiscoveryRequest } from './api-handler';

async function readBody(req: NodeJS.ReadableStream) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  if (!chunks.length) return undefined;
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return undefined;
  }
}

export function discoveryApiPlugin(): Plugin {
  return {
    name: 'wein-discovery-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/discovery/')) {
          next();
          return;
        }

        const url = new URL(req.url, 'http://localhost');
        const result = await handleDiscoveryRequest({
          method: req.method,
          pathname: url.pathname,
          searchParams: url.searchParams,
          body: req.method === 'POST' ? await readBody(req) : undefined,
        });
        res.statusCode = result.status;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(result.body));
      });
    },
  };
}