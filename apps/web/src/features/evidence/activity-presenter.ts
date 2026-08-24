import type { MessageKey, TranslationValues } from "@/locales";

import type { ActivityEvent } from "./types";

type Translator = (key: MessageKey, values?: TranslationValues) => string;

const activityKeys: Record<string, MessageKey> = {
  PROJECT_CREATED: "activity.projectCreated",
  EXPERIMENT_CREATED: "activity.experimentCreated",
  PROTOCOL_CREATED: "activity.protocolCreated",
  PROTOCOL_VERSION_PUBLISHED: "activity.protocolPublished",
  RUN_STARTED: "activity.runStarted",
  RUN_PAUSED: "activity.runPaused",
  RUN_RESUMED: "activity.runResumed",
  STEP_STARTED: "activity.stepStarted",
  STEP_COMPLETED: "activity.stepCompleted",
  NOTE_ADDED: "activity.noteAdded",
  NOTE_UPDATED: "activity.noteUpdated",
  ATTACHMENT_ADDED: "activity.attachmentAdded",
  RUN_COMPLETED: "activity.runCompleted",
  AMENDMENT_CREATED: "activity.amendmentCreated",
};

export function activityMessage(event: ActivityEvent, t: Translator) {
  const key = activityKeys[event.event_type];
  if (!key) return event.message;
  return t(key, { value: activityValue(event) });
}

function activityValue(event: ActivityEvent) {
  if (event.event_type === "PROTOCOL_VERSION_PUBLISHED") {
    return event.message.match(/v\d+/)?.[0] ?? "";
  }
  if (event.event_type === "AMENDMENT_CREATED") {
    return event.message.replace(/^Amendment recorded for /, "").replace(/\.$/, "");
  }
  if (event.message.includes(": ")) {
    return event.message.split(": ").slice(1).join(": ").replace(/\.$/, "");
  }
  return "";
}
