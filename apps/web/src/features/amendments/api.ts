import { buildApiUrl } from "@/lib/api/config";

import type { RunExecution } from "@/features/execution/types";

import type { Amendment, AmendmentInput, AmendmentResult } from "./types";

type ErrorPayload = {
  detail?: Array<{ msg?: string }> | { code?: string; message?: string } | string;
};

export class AmendmentApiError extends Error {
  constructor(message: string, readonly status: number, readonly code = "amendment_request_failed") {
    super(message);
    this.name = "AmendmentApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(buildApiUrl(path), {
      cache: "no-store",
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new AmendmentApiError("The amendment API is unavailable. Check the local API and try again.", 0);
  }
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ErrorPayload;
    const detail = payload.detail;
    const structured = detail && typeof detail === "object" && !Array.isArray(detail) ? detail : undefined;
    const validation = Array.isArray(detail) ? detail.map((item) => item.msg).filter(Boolean).join(" ") : undefined;
    throw new AmendmentApiError(
      structured?.message ?? validation ?? (typeof detail === "string" ? detail : undefined) ?? `Amendment request failed with status ${response.status}.`,
      response.status,
      structured?.code,
    );
  }
  return (await response.json()) as T;
}

export function completeExperiment(
  runId: string,
  expectedRunRevision: number,
  completionNote: string,
  acknowledgeIncompleteRequiredSteps: boolean,
) {
  return request<RunExecution>(`/experiment-runs/${runId}/complete`, {
    method: "POST",
    body: JSON.stringify({
      expected_run_revision: expectedRunRevision,
      completion_note: completionNote.trim() || null,
      acknowledge_incomplete_required_steps: acknowledgeIncompleteRequiredSteps,
    }),
  });
}

export function listAmendments(runId: string) {
  return request<Amendment[]>(`/experiment-runs/${runId}/amendments`);
}

export function createAmendment(runId: string, input: AmendmentInput) {
  return request<AmendmentResult>(`/experiment-runs/${runId}/amendments`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
