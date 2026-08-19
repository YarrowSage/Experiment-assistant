import { buildApiUrl } from "@/lib/api/config";

import type { RunExecution } from "./types";

type ErrorPayload = {
  detail?: Array<{ msg?: string }> | { code?: string; message?: string } | string;
};

export class ExecutionApiError extends Error {
  constructor(message: string, readonly status: number, readonly code = "execution_request_failed") {
    super(message);
    this.name = "ExecutionApiError";
  }
}

async function request(path: string, init?: RequestInit): Promise<RunExecution> {
  let response: Response;
  try {
    response = await fetch(buildApiUrl(path), {
      cache: "no-store",
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ExecutionApiError("The execution API is unavailable. Check the local API and try again.", 0);
  }
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ErrorPayload;
    const detail = payload.detail;
    const structured = detail && typeof detail === "object" && !Array.isArray(detail) ? detail : undefined;
    const validation = Array.isArray(detail) ? detail.map((item) => item.msg).filter(Boolean).join(" ") : undefined;
    throw new ExecutionApiError(
      structured?.message ?? validation ?? (typeof detail === "string" ? detail : undefined) ?? `Execution request failed with status ${response.status}.`,
      response.status,
      structured?.code,
    );
  }
  return (await response.json()) as RunExecution;
}

function action(path: string, payload: object) {
  return request(path, { method: "POST", body: JSON.stringify(payload) });
}

export function getRunExecution(runId: string) {
  return request(`/experiment-runs/${runId}/execution`);
}

export function startRunExecution(runId: string, expectedRunRevision: number) {
  return action(`/experiment-runs/${runId}/execution/start`, { expected_run_revision: expectedRunRevision });
}

export function pauseRunExecution(runId: string, expectedRunRevision: number) {
  return action(`/experiment-runs/${runId}/execution/pause`, { expected_run_revision: expectedRunRevision });
}

export function resumeRunExecution(runId: string, expectedRunRevision: number) {
  return action(`/experiment-runs/${runId}/execution/resume`, { expected_run_revision: expectedRunRevision });
}

export function startRunStep(stepId: string, expectedRunRevision: number, expectedStepRevision: number) {
  return action(`/run-steps/${stepId}/start`, { expected_run_revision: expectedRunRevision, expected_step_revision: expectedStepRevision });
}

export function completeRunStep(stepId: string, expectedRunRevision: number, expectedStepRevision: number) {
  return action(`/run-steps/${stepId}/complete`, { expected_run_revision: expectedRunRevision, expected_step_revision: expectedStepRevision });
}
