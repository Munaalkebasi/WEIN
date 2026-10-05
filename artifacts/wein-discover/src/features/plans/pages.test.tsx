import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Router, Route, Switch } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { CreatePlanPage, PlanDetail, PlansList } from "./pages";
import { getPlansActor, planKeys } from "./api";

const id = "11111111-1111-4111-8111-111111111111";
const plan = {
  id,
  name: "Friday night",
  description: "Dinner together",
  status: "planning",
  privacy: "private",
  creatorUserId: "owner",
  createdAt: "2026-10-05T00:00:00Z",
  updatedAt: "2026-10-05T00:00:00Z",
};
const workspace = {
  plan,
  members: [{ id: "member", userId: getPlansActor(), role: "owner" }],
  attendance: [],
  messages: [],
  sharedItems: [],
  polls: [],
  media: [],
  decision: null,
  memory: null,
};
const fetchMock = vi.fn<typeof fetch>();
beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

function mount(path = "/plans") {
  const location = memoryLocation({ path, record: true });
  const cache = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={cache}>
      <Router hook={location.hook}>
        <Switch>
          <Route path="/plans/new" component={CreatePlanPage} />
          <Route path="/plans/:id">
            {(params) => <PlanDetail planId={params.id} />}
          </Route>
          <Route path="/plans" component={PlansList} />
        </Switch>
      </Router>
    </QueryClientProvider>,
  );
  return { location, cache };
}

test("shows an empty list and a working create link", async () => {
  fetchMock.mockResolvedValue(Response.json({ plans: [] }));
  const { location } = mount();
  expect(screen.getByRole("status").textContent).toContain("Loading");
  await screen.findByRole("heading", { name: "Your next outing starts here" });
  await userEvent.click(
    screen.getByRole("link", { name: "Create your first plan" }),
  );
  expect(location.history.at(-1)).toBe("/plans/new");
  expect(screen.getByRole("heading", { name: "Create a plan" })).toBeTruthy();
});

test("loads real cards, sends identity, searches, filters, and opens detail", async () => {
  fetchMock.mockImplementation(async (url) =>
    String(url).includes(id)
      ? Response.json(workspace)
      : String(url).includes("completed")
        ? Response.json({ plans: [] })
        : Response.json({ plans: [plan] }),
  );
  const { location } = mount();
  const card = await screen.findByRole("link", { name: /Friday night/ });
  const headers = new Headers(fetchMock.mock.calls[0][1]?.headers);
  expect(headers.get("x-user-id")).toBe(getPlansActor());
  await userEvent.type(screen.getByRole("searchbox"), "nothing");
  expect(
    screen.getByRole("heading", { name: "No matching plans" }),
  ).toBeTruthy();
  await userEvent.clear(screen.getByRole("searchbox"));
  await userEvent.click(screen.getByRole("button", { name: "Completed" }));
  await screen.findByRole("heading", { name: "No matching plans" });
  expect(
    fetchMock.mock.calls.some(([url]) =>
      String(url).includes("status=completed"),
    ),
  ).toBe(true);
  await userEvent.click(screen.getByRole("button", { name: "All" }));
  await userEvent.click(
    await screen.findByRole("link", { name: /Friday night/ }),
  );
  expect(location.history.at(-1)).toBe(`/plans/${id}`);
  await screen.findByRole("heading", { name: "Friday night" });
  expect(screen.getByText("You")).toBeTruthy();
  expect(
    screen.getByText("No date, time, or place has been confirmed yet."),
  ).toBeTruthy();
  expect(card).toBeTruthy();
});

test("list failures show retry and recover", async () => {
  fetchMock
    .mockRejectedValueOnce(new TypeError("offline"))
    .mockResolvedValue(Response.json({ plans: [plan] }));
  mount();
  expect((await screen.findByRole("alert")).textContent).toContain(
    "could not connect",
  );
  await userEvent.click(screen.getByRole("button", { name: "Try again" }));
  await screen.findByRole("link", { name: /Friday night/ });
});

test("an HTML page fallback shows a recoverable list error", async () => {
  fetchMock.mockResolvedValue(
    new Response("<html>page fallback</html>", {
      headers: { "Content-Type": "text/html" },
    }),
  );
  mount();
  expect((await screen.findByRole("alert")).textContent).toContain(
    "could not connect",
  );
  expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
});

test("validates a blank name without calling the API", async () => {
  mount("/plans/new");
  await userEvent.type(screen.getByLabelText(/Plan name/), "   ");
  await userEvent.click(screen.getByRole("button", { name: "Create plan" }));
  expect(screen.getByRole("alert").textContent).toContain("1–120");
  expect(fetchMock).not.toHaveBeenCalled();
});

test("creates with trimmed input, blocks duplicate submissions, invalidates lists, and navigates", async () => {
  let resolveCreate!: (response: Response) => void;
  fetchMock.mockImplementation(async (_url, options) =>
    options?.method === "POST"
      ? new Promise<Response>((resolve) => {
          resolveCreate = resolve;
        })
      : Response.json(workspace),
  );
  const { location, cache } = mount("/plans/new");
  const invalidate = vi.spyOn(cache, "invalidateQueries");
  await userEvent.type(screen.getByLabelText(/Plan name/), "  Friday night  ");
  await userEvent.type(
    screen.getByLabelText(/Description/),
    "  Dinner together  ",
  );
  await userEvent.click(screen.getByRole("radio", { name: /Public/ }));
  const form = screen
    .getByRole("button", { name: "Create plan" })
    .closest("form")!;
  fireEvent.submit(form);
  fireEvent.submit(form);
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  expect(
    (screen.getByRole("button", { name: "Creating…" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toEqual({
    name: "Friday night",
    description: "Dinner together",
    privacy: "public",
  });
  await act(async () => resolveCreate(Response.json(plan, { status: 201 })));
  await screen.findByRole("heading", { name: "Friday night" });
  expect(location.history.at(-1)).toBe(`/plans/${id}`);
  expect(invalidate).toHaveBeenCalledWith({
    queryKey: planKeys.lists(getPlansActor()),
  });
});

test("failed creation preserves the draft and can be retried with private default", async () => {
  fetchMock
    .mockResolvedValueOnce(
      Response.json({ message: "Unavailable" }, { status: 500 }),
    )
    .mockImplementation(async (_url, options) =>
      options?.method === "POST"
        ? Response.json(plan, { status: 201 })
        : Response.json(workspace),
    );
  mount("/plans/new");
  await userEvent.type(screen.getByLabelText(/Plan name/), "Friday night");
  await userEvent.click(screen.getByRole("button", { name: "Create plan" }));
  await screen.findByRole("alert");
  expect((screen.getByLabelText(/Plan name/) as HTMLInputElement).value).toBe(
    "Friday night",
  );
  expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string).privacy).toBe(
    "private",
  );
  await userEvent.click(screen.getByRole("button", { name: "Create plan" }));
  await screen.findByRole("heading", { name: "Friday night" });
});

test.each([401, 403, 404, 500])(
  "detail handles HTTP %s without sample data",
  async (status) => {
    fetchMock.mockResolvedValue(
      Response.json({ message: "error" }, { status }),
    );
    mount(`/plans/${id}`);
    await screen.findByRole("alert");
    expect(screen.queryByRole("heading", { name: "Friday night" })).toBeNull();
    expect(screen.getAllByRole("link", { name: "Your plans" })).toHaveLength(1);
  },
);

test("invalid detail IDs do not trigger a request", async () => {
  mount("/plans/invalid");
  expect(screen.getByRole("alert").textContent).toContain("could not be found");
  expect(fetchMock).not.toHaveBeenCalled();
});

test("cancel returns to the list without creating a plan", async () => {
  fetchMock.mockResolvedValue(Response.json({ plans: [] }));
  const { location } = mount("/plans/new");
  await userEvent.click(screen.getByRole("link", { name: "Cancel" }));
  expect(location.history.at(-1)).toBe("/plans");
  expect(
    fetchMock.mock.calls.every(([, options]) => options?.method !== "POST"),
  ).toBe(true);
});
