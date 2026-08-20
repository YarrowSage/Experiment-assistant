import type { ExperimentRun } from "@/features/experiment-runs/types";

export type RunStepStatus = "pending" | "active" | "completed";

export type RunSubStepRecord = {
  id: string;
  source_protocol_substep_id: string;
  position: number;
  title_snapshot: string;
  instruction_snapshot: string;
};

export type RunStepRecord = {
  id: string;
  experiment_run_id: string;
  source_protocol_version_id: string;
  source_protocol_step_id: string;
  source_stable_key: string;
  position: number;
  title_snapshot: string;
  instruction_snapshot: string;
  planned_duration_seconds_snapshot: number | null;
  timer_mode_snapshot: "none" | "count_up" | "countdown";
  required_snapshot: boolean;
  precautions_snapshot: string | null;
  status: RunStepStatus;
  actual_start_at: string | null;
  actual_end_at: string | null;
  completed_at: string | null;
  duration_seconds: number | null;
  created_at: string;
  updated_at: string;
  revision: number;
  substeps: RunSubStepRecord[];
};

export type RunExecution = {
  run: ExperimentRun;
  steps: RunStepRecord[];
};
