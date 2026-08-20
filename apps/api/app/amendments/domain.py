from enum import StrEnum


class AmendmentTargetType(StrEnum):
    EXPERIMENT_RUN = "experiment_run"
    RUN_STEP_RECORD = "run_step_record"


AMENDABLE_RUN_FIELDS = frozenset(
    {
        "title",
        "description",
        "purpose",
        "completion_note",
        "actual_start_at",
        "actual_end_at",
    }
)
AMENDABLE_STEP_FIELDS = frozenset({"actual_start_at", "actual_end_at"})
