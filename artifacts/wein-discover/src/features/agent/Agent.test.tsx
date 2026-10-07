import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { WeinAgent, eventPlanUrl } from "./Agent";
const event = {
  id: "ticketmaster:abc",
  provider: "Ticketmaster",
  providerId: "abc",
  name: "Real concert",
  category: "Music",
  status: "SCHEDULED" as const,
  lastVerifiedAt: "2027-01-01T00:00:00Z",
  venueName: "Venue",
  city: "Vancouver",
  startTime: "2027-01-01T20:00:00Z",
  ticketUrl: "https://ticketmaster.com/event/abc",
};
afterEach(() => vi.unstubAllGlobals());
test("changing location aborts old requests and ignores late replies without locking the new search", async () => {
  const resolvers: Array<(response: Response) => void> = [];
  const fetch = vi.fn((_url: string, _options: RequestInit) => new Promise<Response>(resolve => resolvers.push(resolve)));
  vi.stubGlobal("fetch", fetch);
  const view = render(<WeinAgent location={{city: "Vancouver"}} renderEvent={item => <p>{item.name}</p>} />);
  fireEvent.change(screen.getByLabelText("Message WEIN"), {target: {value: "20 dollars"}});
  fireEvent.click(screen.getByLabelText("Send message"));
  view.rerender(<WeinAgent location={{latitude: 49, longitude: -123}} renderEvent={item => <p>{item.name}</p>} />);
  expect(fetch.mock.calls[0][1].signal!.aborted).toBe(true);
  expect(screen.queryByRole("status")).toBeNull();
  fireEvent.click(screen.getByLabelText("Send message"));
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(JSON.parse(String(fetch.mock.calls[1][1].body)).search).toMatchObject({latitude:49,longitude:-123});
  await act(async () => resolvers[0](Response.json({reply:"Stale city reply",search:{city:"Vancouver"},events:[event],searched:true})));
  expect(screen.queryByText("Stale city reply")).toBeNull();
  expect(screen.getByRole("status")).toBeTruthy();
  await act(async () => resolvers[1](Response.json({reply:"New location reply",search:{latitude:49,longitude:-123},events:[],searched:true})));
  expect(screen.getByText("New location reply")).toBeTruthy();
  expect(screen.queryByText("Real concert")).toBeNull();
});

test("a location change clears old conversation errors and recommendations", async () => {
  const fetch = vi.fn().mockResolvedValue(Response.json({reply:"Old location",search:{city:"Vancouver"},events:[event],searched:true}));
  vi.stubGlobal("fetch",fetch);
  const view = setup();
  fireEvent.change(screen.getByLabelText("Message WEIN"),{target:{value:"music"}});
  fireEvent.click(screen.getByLabelText("Send message"));
  await screen.findByText("Old location");
  view.rerender(<WeinAgent location={{city:"Surrey"}} renderEvent={item => <p>{item.name}</p>} />);
  expect(screen.queryByText("Old location")).toBeNull();
  expect(screen.queryByText("Real concert")).toBeNull();
});
const setup = () =>
  render(
    <WeinAgent
      location={{ city: "Vancouver" }}
      renderEvent={(item) => <p>{item.name}</p>}
    />,
  );
test("sends conversation refinements, shows verified recommendations and prefilled Plan links", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValue(
      Response.json({
        reply: "Try this concert.",
        events: [event],
        searched: true,
        search: { city: "Vancouver", maxPrice: 25 },
      }),
    );
  vi.stubGlobal("fetch", fetch);
  setup();
  fireEvent.change(screen.getByLabelText("Message WEIN"), {
    target: { value: "music under $25" },
  });
  fireEvent.click(screen.getByLabelText("Send message"));
  await screen.findByText("Try this concert.");
  expect(screen.getByText("Real concert")).toBeTruthy();
  expect(screen.getByText("Add to Plan")).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Message WEIN"), {
    target: { value: "closer please" },
  });
  fireEvent.click(screen.getByLabelText("Send message"));
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  const body = JSON.parse(String(fetch.mock.calls[1][1].body));
  expect(body.messages).toHaveLength(3);
  expect(body.search.maxPrice).toBe(25);
  expect(body.recommendations[0].providerId).toBe("abc");
  const url = new URL(eventPlanUrl(event), "http://localhost");
  expect(url.pathname).toBe("/plans/new");
  expect(url.searchParams.get("name")).toBe("Real concert");
  expect(url.searchParams.get("description")).toContain("Venue");
});
test("shows loading, prevents duplicate submits and preserves failed input for retry", async () => {
  let resolve!: (value: Response) => void;
  const fetch = vi.fn(
    () =>
      new Promise<Response>((r) => {
        resolve = r;
      }),
  );
  vi.stubGlobal("fetch", fetch);
  setup();
  fireEvent.change(screen.getByLabelText("Message WEIN"), {
    target: { value: "music" },
  });
  fireEvent.click(screen.getByLabelText("Send message"));
  fireEvent.click(screen.getByLabelText("Send message"));
  expect(screen.getByRole("status")).toBeTruthy();
  expect(fetch).toHaveBeenCalledTimes(1);
  await act(async () =>
    resolve(
      Response.json({ message: "Provider unavailable" }, { status: 503 }),
    ),
  );
  expect(screen.getByRole("alert").textContent).toContain(
    "Provider unavailable",
  );
  expect(
    (screen.getByLabelText("Message WEIN") as HTMLInputElement).value,
  ).toBe("music");
});
test("shows empty results and verified event actions", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        Response.json({
          reply: "Widen your distance?",
          events: [],
          searched: true,
          search: { city: "Vancouver" },
          action: { type: "details", event },
        }),
      ),
  );
  setup();
  fireEvent.change(screen.getByLabelText("Message WEIN"), {
    target: { value: "show details" },
  });
  fireEvent.click(screen.getByLabelText("Send message"));
  await screen.findByText("Widen your distance?");
  expect(screen.getByText(/No matching events/)).toBeTruthy();
  expect(screen.getByText(/Open event details:/)).toBeTruthy();
});
