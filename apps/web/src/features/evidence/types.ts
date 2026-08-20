export type Note = {
  id: string;
  experiment_run_id: string;
  run_step_record_id: string | null;
  content: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  revision: number;
};

export type Attachment = {
  id: string;
  original_filename: string;
  media_type: string;
  size_bytes: number;
  checksum_sha256: string;
  storage_provider: string;
  state: "pending" | "available" | "failed" | "quarantined" | "deleted";
  description: string | null;
  captured_at: string | null;
  uploaded_at: string | null;
  created_at: string;
  updated_at: string;
  experiment_run_id: string;
  run_step_record_id: string | null;
  download_url: string;
};

export type ActivityEvent = {
  id: string;
  workspace_id: string;
  project_id: string | null;
  protocol_id: string | null;
  experiment_run_id: string | null;
  run_step_record_id: string | null;
  note_id: string | null;
  attachment_id: string | null;
  event_type: string;
  message: string;
  actor_id: string | null;
  created_at: string;
};

export type EvidenceBundle = {
  notes: Note[];
  attachments: Attachment[];
  activity: ActivityEvent[];
};
