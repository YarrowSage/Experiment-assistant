import { buildApiUrl } from "@/lib/api/config";

import type {
  Protocol,
  ProtocolListResponse,
  ProtocolStepWriteInput,
  ProtocolVersion,
} from "./types";

type ErrorPayload = {
  detail?: Array<{ msg?: string }> | { code?: string; message?: string } | string;
};

export class ProtocolApiError extends Error {
  constructor(message: string, readonly status: number, readonly code = "protocol_request_failed") {
    super(message);
    this.name = "ProtocolApiError";
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
    throw new ProtocolApiError("The Protocol API is unavailable. Check the local API and try again.", 0);
  }
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ErrorPayload;
    const detail = payload.detail;
    const structured = detail && typeof detail === "object" && !Array.isArray(detail) ? detail : undefined;
    const validation = Array.isArray(detail) ? detail.map((item) => item.msg).filter(Boolean).join(" ") : undefined;
    throw new ProtocolApiError(
      structured?.message ?? validation ?? (typeof detail === "string" ? detail : undefined) ?? `Protocol request failed with status ${response.status}.`,
      response.status,
      structured?.code,
    );
  }
  return (await response.json()) as T;
}

export function listProtocols(projectId?: string): Promise<ProtocolListResponse> {
  const query = projectId ? `?project_id=${encodeURIComponent(projectId)}` : "";
  return request<ProtocolListResponse>(`/protocols${query}`);
}

export function getProtocol(protocolId: string): Promise<Protocol> {
  return request<Protocol>(`/protocols/${protocolId}`);
}

export function createProtocol(input: { project_id: string; title: string; description: string | null; purpose: string | null; precautions: string | null }): Promise<Protocol> {
  return request<Protocol>("/protocols", { method: "POST", body: JSON.stringify(input) });
}

export function getProtocolVersion(versionId: string): Promise<ProtocolVersion> {
  return request<ProtocolVersion>(`/protocol-versions/${versionId}`);
}

export function addProtocolStep(versionId: string, input: ProtocolStepWriteInput): Promise<ProtocolVersion> {
  return request<ProtocolVersion>(`/protocol-versions/${versionId}/steps`, { method: "POST", body: JSON.stringify(input) });
}

export function updateProtocolStep(stepId: string, input: ProtocolStepWriteInput): Promise<ProtocolVersion> {
  return request<ProtocolVersion>(`/protocol-steps/${stepId}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function removeProtocolStep(stepId: string, expectedRevision: number): Promise<ProtocolVersion> {
  return request<ProtocolVersion>(`/protocol-steps/${stepId}?expected_version_revision=${expectedRevision}`, { method: "DELETE" });
}

export function moveProtocolStep(stepId: string, expectedRevision: number, direction: "up" | "down"): Promise<ProtocolVersion> {
  return request<ProtocolVersion>(`/protocol-steps/${stepId}/move`, { method: "POST", body: JSON.stringify({ expected_version_revision: expectedRevision, direction }) });
}

export function publishProtocolVersion(versionId: string, expectedRevision: number): Promise<ProtocolVersion> {
  return request<ProtocolVersion>(`/protocol-versions/${versionId}/publish`, { method: "POST", body: JSON.stringify({ expected_revision: expectedRevision }) });
}

export function createNewProtocolVersion(versionId: string, expectedProtocolRevision: number, changeSummary: string): Promise<ProtocolVersion> {
  return request<ProtocolVersion>(`/protocol-versions/${versionId}/new-version`, { method: "POST", body: JSON.stringify({ expected_protocol_revision: expectedProtocolRevision, change_summary: changeSummary }) });
}
