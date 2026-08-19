import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProtocolDetail } from "./protocol-detail";
import type { Protocol, ProtocolVersion } from "./types";

const mocks = vi.hoisted(() => ({
  createNewProtocolVersion: vi.fn(),
  getProtocol: vi.fn(),
  getProtocolVersion: vi.fn(),
  publishProtocolVersion: vi.fn(),
}));

vi.mock("./api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./api")>()),
  createNewProtocolVersion: mocks.createNewProtocolVersion,
  getProtocol: mocks.getProtocol,
  getProtocolVersion: mocks.getProtocolVersion,
  publishProtocolVersion: mocks.publishProtocolVersion,
}));

const versionBase: ProtocolVersion = {
  id: "22222222-2222-4222-8222-222222222222",
  protocol_id: "11111111-1111-4111-8111-111111111111",
  version_number: 1,
  status: "draft",
  description: null,
  purpose: "Measure viability",
  precautions: null,
  change_summary: null,
  based_on_version_id: null,
  published_at: null,
  created_at: "2026-08-19T08:00:00Z",
  updated_at: "2026-08-19T08:00:00Z",
  revision: 2,
  steps: [{
    id: "33333333-3333-4333-8333-333333333333",
    stable_key: "44444444-4444-4444-8444-444444444444",
    position: 1,
    title: "Add reagent",
    instruction: "Add 10 µL reagent.",
    planned_duration_seconds: 60,
    timer_mode: "countdown",
    required: true,
    precautions: null,
    substeps: [],
  }],
};

function protocolFor(version: ProtocolVersion): Protocol {
  return {
    id: version.protocol_id,
    project_id: "55555555-5555-4555-8555-555555555555",
    title: "CCK-8 Protocol",
    status: "active",
    created_at: version.created_at,
    updated_at: version.updated_at,
    revision: 1,
    versions: [version],
  };
}

describe("ProtocolDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getProtocol.mockResolvedValue(protocolFor(versionBase));
    mocks.getProtocolVersion.mockResolvedValue(versionBase);
  });

  it("keeps a draft editable with ordered step controls", async () => {
    render(<ProtocolDetail projectId="55555555-5555-4555-8555-555555555555" protocolId={versionBase.protocol_id} />);
    expect(await screen.findByRole("heading", { name: "CCK-8 Protocol" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add step" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Edit Add reagent" })).toBeEnabled();
  });

  it("shows a published version as immutable and creates a separate draft", async () => {
    const user = userEvent.setup();
    const published = { ...versionBase, status: "published" as const, published_at: "2026-08-19T09:00:00Z" };
    const nextDraft = { ...versionBase, id: "66666666-6666-4666-8666-666666666666", version_number: 2, status: "draft" as const, change_summary: "Increase incubation" };
    mocks.getProtocol.mockResolvedValue(protocolFor(published));
    mocks.getProtocolVersion.mockResolvedValue(published);
    mocks.createNewProtocolVersion.mockResolvedValue(nextDraft);
    render(<ProtocolDetail projectId="55555555-5555-4555-8555-555555555555" protocolId={published.protocol_id} />);
    expect(await screen.findByText("Immutable record")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit Add reagent" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "New version" }));
    await user.type(screen.getByRole("textbox", { name: /Change summary/ }), "Increase incubation");
    await user.click(screen.getByRole("button", { name: "Create draft" }));
    await waitFor(() => expect(mocks.createNewProtocolVersion).toHaveBeenCalledWith(published.id, 1, "Increase incubation"));
  });
});
