import { handleDiscoveryRequest } from "../../../src/server/discovery/api-handler.js";

export default async function handler(req: any, res: any) {
  const id = Array.isArray(req.query?.id)
    ? req.query.id[0]
    : req.query?.id;

  const result = await handleDiscoveryRequest({
    method: req.method,
    pathname: `/api/discovery/event/${encodeURIComponent(id || "")}`,
  });

  res.status(result.status).json(result.body);
}