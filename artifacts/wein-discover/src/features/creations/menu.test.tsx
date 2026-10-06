import { afterEach, expect, test } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import App from "../../App";

afterEach(() => window.history.replaceState(null, "", "/"));
test.each([
  ["Activity", "/create/activity", "Create an activity"],
  ["Event", "/create/event", "Create an event"],
])(
  "Create menu %s opens its real form and cancel returns to Create",
  (button, path, heading) => {
    window.history.replaceState(null, "", "/discover?tab=Create");
    render(<App />);
    fireEvent.click(
      screen.getByRole("button", { name: new RegExp(`^${button}`) }),
    );
    expect(window.location.pathname).toBe(path);
    expect(screen.getByRole("heading", { name: heading })).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "Cancel" }),
    );
    expect(
      screen.getByRole("heading", { name: "What's the move?" }),
    ).toBeTruthy();
  },
);

