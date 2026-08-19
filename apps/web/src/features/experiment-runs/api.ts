import { buildApiUrl } from "@/lib/api/config";

import type {
  ExperimentRun,
  ExperimentRunListResponse,
  ExperimentRunStatus,
  ExperimentRunWriteInput,
} from "./types";

type ErrorPayload = {
  detail?: Array<{ msg?: string }> | { code?: string; message?: string } | string;
};

export class ExperimentRunApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code = "experiment_run_request_failed",
  ) {
    super(message);
    this.name = "ExperimentRunApiError";
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
    throw new ExperimentRunApiError(
      "The Experiment API is unavailable. Check that the local API is running and try again.",
      0,
      "experiment_run_api_unavailable",
    );
  }
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ErrorPayload;
    const detail = payload.detail;
    const structured = detail && typeof detail === "object" && !Array.isArray(detail) ? detail : undefined;
    const validation = Array.isArray(detail)
      ? detail.map((item) => item.msg).filter(Boolean).join(" ")
      : undefined;
    const message =
      structured?.message ??
      validation ??
      (typeof detail === "string" ? detail : undefined) ??
      `Experiment request failed with status ${response.status}.`;
    throw new ExperimentRunApiError(
      message,
      response.status,
      structured?.code ?? "experiment_run_request_failed",
    );
  }
  return (await response.json()) as T;
}

export type ExperimentRunFilters = {
  archived?: boolean;
  projectId?: string;
  search?: string;
  status?: Exclude<ExperimentRunStatus, "archived"> | "";
  plannedFrom?: string;
  plannedTo?: string;
};

export function listExperimentRuns(
  filters: ExperimentRunFilters = {},
): Promise<ExperimentRunListResponse> {
  const query = new URLSearchParams();
  if (filters.archived) query.set("archived", "true");
  if (filters.projectId) query.set("project_id", filters.projectId);
  if (filters.search) query.set("search", filters.search);
  if (filters.status) query.set("status", filters.status);
  if (filters.plannedFrom) query.set("planned_from", filters.plannedFrom);
  if (filters.plannedTo) query.set("planned_to", filters.plannedTo);
  return request<ExperimentRunListResponse>(
    `/experiment-runs${query.size ? `?${query.toString()}` : ""}`,
  );
}

export function getExperimentRun(runId: string): Promise<ExperimentRun> {
  return request<ExperimentRun>(`/experiment-runs/${runId}`);
}

export function createExperimentRun(input: ExperimentRunWriteInput): Promise<ExperimentRun> {
  return request<ExperimentRun>("/experiment-runs", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateExperimentRun(
  runId: string,
  expectedRevision: number,
  input: Omit<ExperimentRunWriteInput, "project_id">,
): Promise<ExperimentRun> {
  return request<ExperimentRun>(`/experiment-runs/${runId}`, {
    method: "PATCH",
    body: JSON.stringify({ ...input, expected_revision: expectedRevision }),
  });
}

export function archiveExperimentRun(
  runId: string,
  expectedRevision: number,
): Promise<ExperimentRun> {
  return request<ExperimentRun>(`/experiment-runs/${runId}/archive`, {
    method: "POST",
    body: JSON.stringify({ expected_revision: expectedRevision }),
  });
}

