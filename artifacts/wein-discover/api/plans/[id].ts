import { proxyPlans } from "../../src/server/plans/proxy.js";

export default async function handler(req: any, res: any) {
  return proxyPlans(
    req,
    res,
    typeof req.query.id === "string" ? req.query.id : "invalid",
  );
}
