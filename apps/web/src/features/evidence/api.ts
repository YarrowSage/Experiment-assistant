import { buildApiUrl } from "@/lib/api/config";

import type { Attachment, EvidenceBundle, Note } from "./types";

type ErrorPayload = {
  detail?: Array<{ msg?: string }> | { code?: string; message?: string } | string;
};

export class EvidenceApiError extends Error {
  constructor(message: string, readonly status: number, readonly code = "evidence_request_failed") {
    super(message);
    this.name = "EvidenceApiError";
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ErrorPayload;
    const detail = payload.detail;
    const structured = detail && typeof detail === "object" && !Array.isArray(detail) ? detail : undefined;
    const validation = Array.isArray(detail) ? detail.map((item) => item.msg).filter(Boolean).join(" ") : undefined;
    throw new EvidenceApiError(
      structured?.message ?? validation ?? (typeof detail === "string" ? detail : undefined) ?? `Evidence request failed with status ${response.status}.`,
      response.status,
      structured?.code,
    );
  }
  return (await response.json()) as T;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    const response = await fetch(buildApiUrl(path), {
      cache: "no-store",
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
    return await parseResponse<T>(response);
  } catch (error) {
    if (error instanceof EvidenceApiError) throw error;
    throw new EvidenceApiError("The evidence API is unavailable. Check the local API and try again.", 0);
  }
}

export function getEvidence(runId: string) {
  return request<EvidenceBundle>(`/experiment-runs/${runId}/evidence`);
}

export function createNote(runId: string, content: string, runStepId: string | null) {
  return request<Note>(`/experiment-runs/${runId}/notes`, {
    method: "POST",
    body: JSON.stringify({ content, run_step_record_id: runStepId }),
  });
}

export async function uploadAttachment(runId: string, file: File, runStepId: string | null, description: string) {
  const query = new URLSearchParams({ filename: file.name });
  if (runStepId) query.set("run_step_id", runStepId);
  if (description.trim()) query.set("description", description.trim());
  try {
    const response = await fetch(buildApiUrl(`/experiment-runs/${runId}/attachments?${query.toString()}`), {
      method: "POST",
      body: file,
      headers: { "Content-Type": file.type || "application/octet-stream" },
    });
    return await parseResponse<Attachment>(response);
  } catch (error) {
    if (error instanceof EvidenceApiError) throw error;
    throw new EvidenceApiError("The attachment upload failed before it reached the API.", 0);
  }
}

export function attachmentDownloadUrl(attachment: Attachment) {
  return buildApiUrl(attachment.download_url);
}
