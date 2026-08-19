import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Button } from "./button";
import { Dialog } from "./dialog";

function DialogHarness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open details</Button>
      <Dialog
        description="A concise description"
        open={open}
        title="Details"
        onOpenChange={setOpen}
      >
        <p>Dialog content</p>
      </Dialog>
    </>
  );
}

describe("Dialog", () => {
  it("opens from a trigger and closes with its labelled close control", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);

    await user.click(screen.getByRole("button", { name: "Open details" }));

    const dialog = screen.getByRole("dialog", { name: "Details" });
    expect(dialog).toHaveAttribute("open");
    expect(screen.getByText("Dialog content")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Close dialog" }));
    expect(dialog).not.toHaveAttribute("open");
  });
});
