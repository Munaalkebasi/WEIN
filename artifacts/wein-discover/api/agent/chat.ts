import { handleAgentRequest } from "../../src/server/agent/chat.js";

export const config = { maxDuration: 60 };
export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Allow", "POST");
  const result = await handleAgentRequest(req.method, req.body);
  res.status(result.status).json(result.body);
}
