import type { ActivityEvent } from "@/features/evidence/types";
import type { RunExecution } from "@/features/execution/types";

export type AmendmentTargetType = "experiment_run" | "run_step_record";

export type Amendment = {
  id: string;
  experiment_run_id: string;
  target_type: AmendmentTargetType;
  target_id: string;
  target_field: string;
  original_value: string | null;
  corrected_value: string | null;
  reason: string;
  prior_revision: number;
  resulting_revision: number;
  created_by: string | null;
  created_at: string;
};

export type AmendmentResult = {
  amendment: Amendment;
  execution: RunExecution;
  activity: ActivityEvent;
};

export type AmendmentInput = {
  target_type: AmendmentTargetType;
  target_id: string;
  target_field: string;
  corrected_value: string | null;
  reason: string;
  expected_target_revision: number;
};
