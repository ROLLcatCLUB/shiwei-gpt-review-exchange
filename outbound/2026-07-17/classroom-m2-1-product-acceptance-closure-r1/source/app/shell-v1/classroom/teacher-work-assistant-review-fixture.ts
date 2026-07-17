import assistantFixtureJson from "../../../fixtures/classroom-assistant/COLOR_GRADIENT_TEACHER_WORK_ASSISTANT_R0_2.json" with { type: "json" };
import triageFixtureJson from "../../../fixtures/classroom-evidence/COLOR_GRADIENT_LIGHTWEIGHT_EVIDENCE_TRIAGE_V0_1.json" with { type: "json" };
import {
  coordinateClassroomAssistantFixture,
  type ClassroomAssistantJourneyState,
  type TeacherProfessionalContextChoice,
  type TeacherWorkDecision,
} from "../../../domain/classroom-assistant/teacher-work-assistant.ts";
import {
  triageLightweightClassroomEvidence,
  type LightweightEvidenceTriageInput,
} from "../../../domain/classroom-evidence/lightweight-evidence-triage.ts";

export type TeacherWorkAssistantReviewState =
  | "preparation"
  | "ready"
  | "live"
  | "live-expanded"
  | "marked"
  | "closing"
  | "postclass"
  | "question"
  | "recommendation"
  | "recommendation-material"
  | "recommendation-extension"
  | "recommendation-uncertain"
  | "not-a-problem"
  | "decision"
  | "no-findings"
  | "next-preparation"
  | "record";

export const teacherWorkAssistantReviewStates: readonly TeacherWorkAssistantReviewState[] = [
  "preparation",
  "ready",
  "live",
  "live-expanded",
  "marked",
  "closing",
  "postclass",
  "question",
  "recommendation",
  "recommendation-material",
  "recommendation-extension",
  "recommendation-uncertain",
  "not-a-problem",
  "decision",
  "no-findings",
  "next-preparation",
  "record",
] as const;

type AssistantFixtureData = {
  fixtureIdentity: {
    fixtureId: string;
    status: "SIMULATED_ONLY";
    containsRealTeacherOrStudentData: false;
    runtimeEffect: "NONE_READONLY_FIXTURE";
    hasClassroomSession: false;
    hasDatabase: false;
    hasModelCall: false;
    hasResearchProjection: false;
    hasFormalWriteback: false;
  };
  sourceClass: {
    occurrenceId: string;
    classLabel: string;
    lessonTitle: string;
    scheduleLabel: string;
    factTitle: string;
    factDetail: string;
    firstPassAssessment: string;
  };
  targetClass: {
    occurrenceId: string;
    classLabel: string;
    lessonTitle: string;
    scheduleLabel: string;
    contextDifference: string;
    preparationStatus: string;
    previewSummary: string;
  };
  todayLessons: Array<{
    time: string;
    period: string;
    classLabel: string;
    lessonTitle: string;
    status: string;
  }>;
  courseDirectory: Array<{
    unit: string;
    lessonTitle: string;
    grade: string;
    status: string;
  }>;
  oneLineClassroomNote: string;
  record: {
    teacherJudgment: string;
    teacherDecision: string;
    fullLog: string[];
  };
};

const assistantFixture = assistantFixtureJson as AssistantFixtureData;
const triageFixture = triageFixtureJson as unknown as {
  clearSignal: LightweightEvidenceTriageInput;
  normalClass: LightweightEvidenceTriageInput;
};
const clearTriage = triageLightweightClassroomEvidence(
  triageFixture.clearSignal,
);
const assessment = clearTriage.surfacedAssessments[0];
if (!assessment)
  throw new Error("TEACHER_WORK_ASSISTANT_FIXTURE_MISSING_ASSESSMENT");

const journeyStateByReviewState: Readonly<
  Record<TeacherWorkAssistantReviewState, ClassroomAssistantJourneyState>
> = {
  preparation: "PRE_CLASS_PREPARATION",
  ready: "READY_FOR_PREVIEW",
  live: "CLASSROOM_ACTIVE",
  "live-expanded": "CLASSROOM_ACTIVE",
  marked: "CLASSROOM_ACTIVE",
  closing: "CLASSROOM_CLOSING",
  postclass: "POSTCLASS_TRIAGE_READY",
  question: "AWAITING_TEACHER_JUDGMENT",
  recommendation: "RECOMMENDATION_READY",
  "recommendation-material": "RECOMMENDATION_READY",
  "recommendation-extension": "RECOMMENDATION_READY",
  "recommendation-uncertain": "RECOMMENDATION_READY",
  "not-a-problem": "TEACHER_DECISION_RECORDED",
  decision: "TEACHER_DECISION_RECORDED",
  "no-findings": "POSTCLASS_TRIAGE_READY",
  "next-preparation": "NEXT_OCCURRENCE_PREPARATION",
  record: "ARCHIVED",
};

const choiceByReviewState: Partial<
  Record<TeacherWorkAssistantReviewState, TeacherProfessionalContextChoice>
> = {
  recommendation: "STUDENTS_MISSED_KEY_STEP",
  "recommendation-material": "MATERIAL_HANDLING_SLOWED_PACE",
  "recommendation-extension": "TEACHER_EXTENDED_IN_MOMENT",
  "recommendation-uncertain": "UNCERTAIN",
  "not-a-problem": "NOT_A_PROBLEM",
  decision: "STUDENTS_MISSED_KEY_STEP",
  "next-preparation": "STUDENTS_MISSED_KEY_STEP",
  record: "STUDENTS_MISSED_KEY_STEP",
};

export function normalizeTeacherWorkAssistantReviewState(
  requested: string | null,
): TeacherWorkAssistantReviewState {
  return teacherWorkAssistantReviewStates.includes(
    requested as TeacherWorkAssistantReviewState,
  )
    ? (requested as TeacherWorkAssistantReviewState)
    : "preparation";
}

export function createTeacherWorkAssistantReviewFixture(
  reviewState: TeacherWorkAssistantReviewState,
  overrides: {
    selectedContextChoice?: TeacherProfessionalContextChoice;
    selectedContextNote?: string;
    selectedDecisionAction?: TeacherWorkDecision["action"];
  } = {},
) {
  const selectedContextChoice =
    overrides.selectedContextChoice ??
    choiceByReviewState[reviewState] ??
    "STUDENTS_MISSED_KEY_STEP";
  const selectedDecisionAction: TeacherWorkDecision["action"] =
    overrides.selectedDecisionAction ??
    (selectedContextChoice === "NOT_A_PROBLEM"
      ? "NO_CHANGE_REQUIRED"
      : selectedContextChoice === "STUDENTS_MISSED_KEY_STEP"
        ? "NEXT_CLASS_TRIAL"
        : "RECORD_ONLY");
  const snapshot = coordinateClassroomAssistantFixture(
    {
      sourceOccurrenceId: assistantFixture.sourceClass.occurrenceId,
      targetOccurrenceId: assistantFixture.targetClass.occurrenceId,
      assessment: reviewState === "no-findings" ? null : assessment,
      selectedContextChoice,
      ...(selectedContextChoice === "OTHER_CONTEXT"
        ? {
            selectedContextNote:
              overrides.selectedContextNote ?? "这次教室临时调整了座位。",
          }
        : {}),
      selectedDecisionAction,
      previousClassFact: assistantFixture.sourceClass.factTitle,
      currentClassDifference: assistantFixture.targetClass.contextDifference,
    },
    journeyStateByReviewState[reviewState],
  );
  return {
    reviewState,
    snapshot,
    data: assistantFixture,
    assessment,
    normalClassResult: triageLightweightClassroomEvidence(
      triageFixture.normalClass,
    ),
  };
}

export const teacherWorkAssistantReviewFixture =
  createTeacherWorkAssistantReviewFixture("recommendation");
