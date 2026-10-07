import { beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Router, Route, Switch } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { CreationDetail, CreationEditor, CreationsList } from "./pages";
import {
  buildCreation,
  readCreations,
  saveCreation,
  type CreationFields,
} from "./store";

const fields: CreationFields = {
  kind: "activity",
  title: "Surrey park meetup",
  description: "Bring a ball",
  place: "Bear Creek Park, Surrey",
  category: "Sports",
  start: "2099-10-10T17:00",
  end: "",
  cost: "0",
  capacity: "10",
  organizer: "",
  ticketUrl: "",
};
beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});
function mount(path: string) {
  const location = memoryLocation({ path, record: true });
  render(
    <Router hook={location.hook}>
      <Switch>
        <Route path="/create/activity">
          {() => <CreationEditor kind="activity" />}
        </Route>
        <Route path="/create/event">
          {() => <CreationEditor kind="event" />}
        </Route>
        <Route path="/creations/:id/edit">
          {(params) => <CreationEditor id={params.id} />}
        </Route>
        <Route path="/creations/:id">
          {(params) => <CreationDetail id={params.id} />}
        </Route>
        <Route path="/creations" component={CreationsList} />
      </Switch>
    </Router>,
  );
  return location;
}
function fillForm() {
  fireEvent.change(screen.getByLabelText("Title *"), {
    target: { value: fields.title },
  });
  fireEvent.change(screen.getByLabelText("Place *"), {
    target: { value: fields.place },
  });
  fireEvent.change(screen.getByLabelText("Start date and time *"), {
    target: { value: fields.start },
  });
}
test("saves an activity once and opens its details, which survive a reload", async () => {
  const location = mount("/create/activity");
  fillForm();
  const button = screen.getByRole("button", { name: "Save hangout" });
  fireEvent.click(button);
  fireEvent.click(button);
  await screen.findByRole("heading", { name: fields.title });
  expect(readCreations()).toHaveLength(1);
  expect(location.history.at(-1)).toBe(`/creations/${readCreations()[0].id}`);
  expect(
    screen.getByText("Saved in this browser only · Not published"),
  ).toBeTruthy();
  const plan = new URL(
    screen.getByRole("link", { name: "Make a Plan" }).getAttribute("href")!,
    "https://wein.test",
  );
  expect(plan.searchParams.get("name")).toBe(fields.title);
  expect(plan.searchParams.get("description")).toContain(fields.place);
  cleanup();
  mount("/creations");
  expect(screen.getByRole("heading", { name: fields.title })).toBeTruthy();
});
test("event form requires an organizer and persists event-specific details", async () => {
  mount("/create/event");
  fillForm();
  fireEvent.click(screen.getByRole("button", { name: "Save event" }));
  expect(screen.getByRole("alert").textContent).toContain("organizer");
  fireEvent.change(screen.getByLabelText("Organizer *"), {
    target: { value: "Surrey Arts" },
  });
  fireEvent.change(screen.getByLabelText("Ticket link (optional)"), {
    target: { value: "javascript:alert(1)" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save event" }));
  expect(screen.getByRole("alert").textContent).toContain("http");
  fireEvent.change(screen.getByLabelText("Ticket link (optional)"), {
    target: { value: "https://example.com/tickets" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save event" }));
  await screen.findByRole("heading", { name: fields.title });
  expect(readCreations()[0]).toMatchObject({
    kind: "event",
    organizer: "Surrey Arts",
    ticketUrl: "https://example.com/tickets",
  });
});
test("editing replaces the saved item and retains its identity", async () => {
  const item = buildCreation(fields);
  saveCreation(item);
  mount(`/creations/${item.id}/edit`);
  fireEvent.change(screen.getByLabelText("Title *"), {
    target: { value: "Updated meetup" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await screen.findByRole("heading", { name: "Updated meetup" });
  expect(readCreations()).toHaveLength(1);
  expect(readCreations()[0].id).toBe(item.id);
});
test("storage failure keeps the form available and retries without duplicate saves", async () => {
  mount("/create/activity");
  fillForm();
  const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new DOMException("Full", "QuotaExceededError");
  });
  fireEvent.click(screen.getByRole("button", { name: "Save hangout" }));
  await screen.findByRole("alert");
  expect((screen.getByLabelText("Title *") as HTMLInputElement).value).toBe(
    fields.title,
  );
  expect(readCreations()).toHaveLength(0);
  spy.mockRestore();
  fireEvent.click(screen.getByRole("button", { name: "Save hangout" }));
  await screen.findByRole("heading", { name: fields.title });
  expect(readCreations()).toHaveLength(1);
});
test("empty list and missing details have recovery links", () => {
  mount("/creations");
  expect(screen.getByText("No hangouts or events yet")).toBeTruthy();
  expect(
    screen.getByRole("link", { name: "Create event" }).getAttribute("href"),
  ).toBe("/create/event");
  cleanup();
  mount("/creations/missing");
  expect(
    screen.getByRole("heading", {
      name: "Couldn't find this hangout or event",
    }),
  ).toBeTruthy();
});
test("corrupt storage is never overwritten by saving a new item", () => {
  localStorage.setItem("wein-creations-v1", "broken");
  mount("/create/activity");
  expect(screen.getByRole("alert").textContent).toContain(
    "stored data has been kept",
  );
  expect(() => saveCreation(buildCreation(fields))).toThrow();
  expect(localStorage.getItem("wein-creations-v1")).toBe("broken");
});
test("rejects invalid dates, negative cost and fractional capacity", () => {
  expect(() => buildCreation({ ...fields, start: "2020-01-01T12:00" })).toThrow(
    /future/,
  );
  expect(() => buildCreation({ ...fields, end: "2099-10-09T17:00" })).toThrow(
    /after/,
  );
  expect(() => buildCreation({ ...fields, cost: "-1" })).toThrow(/cost/);
  expect(() => buildCreation({ ...fields, capacity: "1.5" })).toThrow(
    /whole number/,
  );
});
