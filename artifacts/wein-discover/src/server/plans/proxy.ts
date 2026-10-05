type Request = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
  query?: Record<string, unknown>;
};
type Response = {
  status: (code: number) => Response;
  json: (body: unknown) => unknown;
};

/** Forward only the Plans endpoints implemented by this milestone. */
export async function proxyPlans(
  request: Request,
  response: Response,
  id?: string,
) {
  const allowed = id ? ["GET"] : ["GET", "POST"];
  if (!allowed.includes(request.method || ""))
    return response.status(405).json({ message: "Method not allowed." });
  if (id && !/^[a-f0-9-]{36}$/i.test(id))
    return response.status(400).json({ message: "Invalid plan ID." });
  const base = process.env.PLANS_API_URL;
  if (!base)
    return response
      .status(503)
      .json({ message: "Plans API is not configured." });
  const actor = request.headers["x-user-id"];
  if (typeof actor !== "string" || !actor.trim())
    return response.status(401).json({ message: "A profile is required." });
  const status = request.query?.status;
  if (
    status !== undefined &&
    (typeof status !== "string" ||
      !["planning", "confirmed", "completed", "archived"].includes(status))
  ) {
    return response.status(400).json({ message: "Invalid plan status." });
  }
  try {
    const upstream = await fetch(
      `${base.replace(/\/$/, "")}/api/plans${id ? `/${encodeURIComponent(id)}` : ""}${!id && status ? `?status=${status}` : ""}`,
      {
        method: request.method,
        headers: { "Content-Type": "application/json", "X-User-Id": actor },
        ...(request.method === "POST"
          ? { body: JSON.stringify(request.body) }
          : {}),
        signal: AbortSignal.timeout(10000),
      },
    );
    return response.status(upstream.status).json(await upstream.json());
  } catch {
    return response
      .status(502)
      .json({ message: "Plans API is unavailable. Please try again." });
  }
}
