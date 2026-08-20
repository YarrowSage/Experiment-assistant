export type ProtocolStatus = "active" | "retired" | "archived";
export type ProtocolVersionStatus = "draft" | "published" | "superseded" | "retired";
export type ProtocolTimerMode = "none" | "count_up" | "countdown";

export type ProtocolVersionSummary = {
  id: string;
  protocol_id: string;
  version_number: number;
  status: ProtocolVersionStatus;
  change_summary: string | null;
  based_on_version_id: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  revision: number;
};

export type Protocol = {
  id: string;
  project_id: string;
  title: string;
  status: ProtocolStatus;
  created_at: string;
  updated_at: string;
  revision: number;
  versions: ProtocolVersionSummary[];
};

export type ProtocolSubStep = {
  id: string;
  position: number;
  title: string;
  instruction: string;
};

export type ProtocolStep = {
  id: string;
  stable_key: string;
  position: number;
  title: string;
  instruction: string;
  planned_duration_seconds: number | null;
  timer_mode: ProtocolTimerMode;
  required: boolean;
  precautions: string | null;
  substeps: ProtocolSubStep[];
};

export type ProtocolVersion = ProtocolVersionSummary & {
  description: string | null;
  purpose: string | null;
  precautions: string | null;
  steps: ProtocolStep[];
};

export type ProtocolListResponse = {
  items: Protocol[];
  total: number;
  limit: number;
  offset: number;
};

export type ProtocolStepWriteInput = {
  expected_version_revision: number;
  title: string;
  instruction: string;
  planned_duration_seconds: number | null;
  timer_mode: ProtocolTimerMode;
  required: boolean;
  precautions: string | null;
  substeps: Array<{ title: string; instruction: string }>;
};

export function latestProtocolVersion(protocol: Protocol) {
  return [...protocol.versions].sort((left, right) => right.version_number - left.version_number)[0];
}

export function protocolVersionLabel(protocol: Protocol, version: ProtocolVersionSummary) {
  return `${protocol.title} v${version.version_number}`;
}
