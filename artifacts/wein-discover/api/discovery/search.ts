import { handleDiscoveryRequest } from '../../src/server/discovery/api-handler';

export default async function handler(req: any, res: any) {
  const result = await handleDiscoveryRequest({
    method: req.method,
    pathname: '/api/discovery/search',
    body: req.body,
  });
  res.status(result.status).json(result.body);
}