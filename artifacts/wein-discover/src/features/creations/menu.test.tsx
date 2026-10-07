import { afterEach, expect, test } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import App from "../../App";

afterEach(() => window.history.replaceState(null, "", "/"));
test.each([
  ["Hangout", "/create/activity", "Create a hangout"],
  ["Event", "/create/event", "Create an event"],
])(
  "Create menu %s opens its real form and cancel returns to Create",
  (button, path, heading) => {
    window.history.replaceState(null, "", "/discover?tab=Create");
    render(<App />);
    expect(screen.queryByRole("button", { name: /^Activity/ })).toBeNull();
    expect(
      screen.getByRole("button", {
        name: "HangoutSet up a quick, casual meetup.",
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: "EventSet up an organized event with a time and venue.",
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: "PlanPlan together: choose what to do, where and when.",
      }),
    ).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: new RegExp(`^${button}`) }),
    );
    expect(window.location.pathname).toBe(path);
    expect(screen.getByRole("heading", { name: heading })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(
      screen.getByRole("heading", { name: "What's the move?" }),
    ).toBeTruthy();
  },
);
