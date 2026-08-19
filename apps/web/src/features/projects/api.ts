import { buildApiUrl } from "@/lib/api/config";

import type { Project, ProjectListResponse, ProjectStatus, ProjectWriteInput } from "./types";

type ErrorPayload = {
  detail?: Array<{ msg?: string }> | { code?: string; message?: string } | string;
  error?: { code?: string; message?: string };
};

export class ProjectApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code = "project_request_failed",
  ) {
    super(message);
    this.name = "ProjectApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(buildApiUrl(path), {
      cache: "no-store",
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
  } catch {
    throw new ProjectApiError(
      "The Project API is unavailable. Check that the local API is running and try again.",
      0,
      "project_api_unavailable",
    );
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ErrorPayload;
    const structuredDetail =
      typeof payload.detail === "object" && !Array.isArray(payload.detail)
        ? payload.detail
        : undefined;
    const validationMessage = Array.isArray(payload.detail)
      ? payload.detail.map((item) => item.msg).filter(Boolean).join(" ")
      : undefined;
    const message =
      payload.error?.message ??
      structuredDetail?.message ??
      validationMessage ??
      (typeof payload.detail === "string" ? payload.detail : undefined) ??
      `Project request failed with status ${response.status}.`;
    const code = payload.error?.code ?? structuredDetail?.code ?? "project_request_failed";
    throw new ProjectApiError(message, response.status, code);
  }

  return (await response.json()) as T;
}

export type ProjectListFilters = {
  archived?: boolean;
  search?: string;
  status?: Exclude<ProjectStatus, "archived"> | "";
};

export function listProjects(filters: ProjectListFilters = {}): Promise<ProjectListResponse> {
  const query = new URLSearchParams();
  if (filters.archived) query.set("archived", "true");
  if (filters.search) query.set("search", filters.search);
  if (filters.status) query.set("status", filters.status);
  const suffix = query.size ? `?${query.toString()}` : "";
  return request<ProjectListResponse>(`/projects${suffix}`);
}

export function getProject(projectId: string): Promise<Project> {
  return request<Project>(`/projects/${projectId}`);
}

export function createProject(input: ProjectWriteInput): Promise<Project> {
  return request<Project>("/projects", { method: "POST", body: JSON.stringify(input) });
}

export function updateProject(
  projectId: string,
  expectedRevision: number,
  input: ProjectWriteInput,
): Promise<Project> {
  return request<Project>(`/projects/${projectId}`, {
    method: "PATCH",
    body: JSON.stringify({ ...input, expected_revision: expectedRevision }),
  });
}

export function archiveProject(projectId: string, expectedRevision: number): Promise<Project> {
  return request<Project>(`/projects/${projectId}/archive`, {
    method: "POST",
    body: JSON.stringify({ expected_revision: expectedRevision }),
  });
}
