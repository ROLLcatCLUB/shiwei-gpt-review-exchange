import {
  createQuickMarkFact,
  type ActiveClassroomPosition,
  type ClassroomFactEvent,
  type ClassroomQuickMark,
  type FirstPassAssessment,
  type TeacherActionScope,
} from "../classroom-evidence/lightweight-evidence-triage.ts";

export const classroomAssistantJourneyStates = [
  "PRE_CLASS_PREPARATION",
  "READY_FOR_PREVIEW",
  "CLASSROOM_ACTIVE",
  "CLASSROOM_CLOSING",
  "POSTCLASS_TRIAGE_READY",
  "AWAITING_TEACHER_JUDGMENT",
  "RECOMMENDATION_READY",
  "TEACHER_DECISION_RECORDED",
  "NEXT_OCCURRENCE_PREPARATION",
  "ARCHIVED",
] as const;

export type ClassroomAssistantJourneyState =
  (typeof classroomAssistantJourneyStates)[number];

export const classroomAssistantJourneyTransitions: Readonly<
  Record<ClassroomAssistantJourneyState, readonly ClassroomAssistantJourneyState[]>
> = {
  PRE_CLASS_PREPARATION: ["READY_FOR_PREVIEW"],
  READY_FOR_PREVIEW: ["CLASSROOM_ACTIVE"],
  CLASSROOM_ACTIVE: ["CLASSROOM_CLOSING"],
  CLASSROOM_CLOSING: ["POSTCLASS_TRIAGE_READY"],
  POSTCLASS_TRIAGE_READY: ["AWAITING_TEACHER_JUDGMENT", "ARCHIVED"],
  AWAITING_TEACHER_JUDGMENT: [
    "RECOMMENDATION_READY",
    "TEACHER_DECISION_RECORDED",
  ],
  RECOMMENDATION_READY: ["TEACHER_DECISION_RECORDED"],
  TEACHER_DECISION_RECORDED: ["NEXT_OCCURRENCE_PREPARATION", "ARCHIVED"],
  NEXT_OCCURRENCE_PREPARATION: ["ARCHIVED"],
  ARCHIVED: [],
};

export function assertClassroomAssistantJourneyTransition(
  current: ClassroomAssistantJourneyState,
  next: ClassroomAssistantJourneyState,
): ClassroomAssistantJourneyState {
  if (!classroomAssistantJourneyTransitions[current].includes(next))
    throw new Error(`CLASSROOM_ASSISTANT_INVALID_TRANSITION:${current}:${next}`);
  return next;
}

export type TeacherProfessionalContextChoice =
  | "STUDENTS_MISSED_KEY_STEP"
  | "MATERIAL_HANDLING_SLOWED_PACE"
  | "TEACHER_EXTENDED_IN_MOMENT"
  | "CLASSROOM_INTERRUPTION"
  | "NOT_A_PROBLEM"
  | "UNCERTAIN"
  | "OTHER_CONTEXT";

export const teacherProfessionalContextOptions: ReadonlyArray<{
  value: TeacherProfessionalContextChoice;
  label: string;
}> = [
  { value: "STUDENTS_MISSED_KEY_STEP", label: "学生没看懂关键一步" },
  { value: "MATERIAL_HANDLING_SLOWED_PACE", label: "材料操作拖慢了节奏" },
  { value: "TEACHER_EXTENDED_IN_MOMENT", label: "我临时做了拓展" },
  { value: "CLASSROOM_INTERRUPTION", label: "班级有偶发情况" },
  { value: "NOT_A_PROBLEM", label: "这不是问题" },
  { value: "UNCERTAIN", label: "暂时说不准" },
  { value: "OTHER_CONTEXT", label: "说一句其他情况" },
] as const;

export type TeacherProfessionalContextResponse = {
  responseId: string;
  assessmentId: string;
  choice: TeacherProfessionalContextChoice;
  label: string;
  contextNote?: string;
  respondedAtOffsetSeconds: number;
};

export type TeacherWorkRecommendationOutcome =
  | "ACTIONABLE_TRIAL"
  | "RECORD_ONLY"
  | "RECORD_AND_OBSERVE";

export type TeacherWorkRecommendation = {
  recommendationId: string;
  assessmentId: string;
  responseId: string;
  sourceChoice: TeacherProfessionalContextChoice;
  title: string;
  summary: string;
  applicabilityConditions: string[];
  nextObservation: string;
  outcome: TeacherWorkRecommendationOutcome;
  allowedTeacherActions: TeacherActionScope[];
  defaultActionLabels: readonly [string, string?, string?];
  generatedAfterTeacherResponse: true;
};

const recommendationByChoice: Readonly<
  Record<
    Exclude<TeacherProfessionalContextChoice, "NOT_A_PROBLEM">,
    Omit<
      TeacherWorkRecommendation,
      | "recommendationId"
      | "assessmentId"
      | "responseId"
      | "sourceChoice"
      | "generatedAfterTeacherResponse"
    >
  >
> = {
  STUDENTS_MISSED_KEY_STEP: {
    title: "下一班增加一张关键对比画面",
    summary:
      "下一班在调色示范前，先增加一张“缺少中间色—加入中间色”的对比画面，观察学生是否能更快说出过渡关系。",
    applicabilityConditions: [
      "只用于教师确认需要看清中间步骤的课堂",
      "不自动修改当前课包或扩散到其他班级",
    ],
    nextObservation: "观察学生能否在示范前说出缺少的中间色。",
    outcome: "ACTIONABLE_TRIAL",
    allowedTeacherActions: [
      "NEXT_CLASS_TRIAL",
      "RECORD_ONLY",
      "EDIT_BEFORE_TRIAL",
      "MATCHING_CONTEXTS",
      "SEND_TO_PREP_ROOM",
      "IGNORE",
    ],
    defaultActionLabels: ["下一班试用", "仅记录", "更多处理"],
  },
  MATERIAL_HANDLING_SLOWED_PACE: {
    title: "下一班先处理材料准备",
    summary:
      "保持当前教学设计不变，下一班提前分装颜料，并在示范前完成一次清水和调色盘检查。",
    applicabilityConditions: [
      "只用于材料条件相近的课堂",
      "不把一次材料情况解释为教学设计问题",
    ],
    nextObservation: "观察材料准备完成后，示范是否仍比计划多用时间。",
    outcome: "ACTIONABLE_TRIAL",
    allowedTeacherActions: [
      "NEXT_CLASS_TRIAL",
      "RECORD_ONLY",
      "EDIT_BEFORE_TRIAL",
      "MATCHING_CONTEXTS",
      "IGNORE",
    ],
    defaultActionLabels: ["下一班试用", "仅记录", "更多处理"],
  },
  TEACHER_EXTENDED_IN_MOMENT: {
    title: "仅记录本次临时拓展",
    summary: "本次超时来自教师临时拓展，不建议据此修改后续课堂。",
    applicabilityConditions: ["保留本次课堂情境，不外推为课包缺陷"],
    nextObservation: "后续课堂如再次主动拓展，再由教师决定是否形成备课候选。",
    outcome: "RECORD_ONLY",
    allowedTeacherActions: ["RECORD_ONLY", "IGNORE"],
    defaultActionLabels: ["仅记录", "更多处理"],
  },
  CLASSROOM_INTERRUPTION: {
    title: "仅记录本次偶发情况",
    summary: "把本次班级偶发情况留在课堂记录中，不据此修改下一班安排。",
    applicabilityConditions: ["不把偶发情况扩展为班级或教师评价"],
    nextObservation: "若相近情况再次出现，再交由教师判断是否需要处理。",
    outcome: "RECORD_ONLY",
    allowedTeacherActions: ["RECORD_ONLY", "IGNORE"],
    defaultActionLabels: ["仅记录", "更多处理"],
  },
  UNCERTAIN: {
    title: "先记录，继续观察",
    summary: "暂不判断原因，只保留本次事实，在条件相近的下一班继续观察。",
    applicabilityConditions: ["不把暂时无法判断改写为已确认问题"],
    nextObservation: "观察同一示范环节是否仍出现超时或回看。",
    outcome: "RECORD_AND_OBSERVE",
    allowedTeacherActions: ["RECORD_ONLY", "IGNORE"],
    defaultActionLabels: ["仅记录", "更多处理"],
  },
  OTHER_CONTEXT: {
    title: "先保留教师补充的情境",
    summary: "只记录教师补充的一句话，不自动把它转换成课包修改建议。",
    applicabilityConditions: ["自由文本仅留在本次只读 fixture 记录中"],
    nextObservation: "如相近事实再次出现，再请教师决定是否处理。",
    outcome: "RECORD_AND_OBSERVE",
    allowedTeacherActions: ["RECORD_ONLY", "IGNORE"],
    defaultActionLabels: ["仅记录", "更多处理"],
  },
};

export function createTeacherWorkRecommendation(
  assessment: FirstPassAssessment,
  response: TeacherProfessionalContextResponse,
): TeacherWorkRecommendation | null {
  if (assessment.assessmentId !== response.assessmentId)
    throw new Error("TEACHER_RESPONSE_ASSESSMENT_MISMATCH");
  if (response.choice === "NOT_A_PROBLEM") return null;
  const copy = recommendationByChoice[response.choice];
  return {
    recommendationId: `teacher-work-recommendation:${assessment.assessmentId}:${response.responseId}`,
    assessmentId: assessment.assessmentId,
    responseId: response.responseId,
    sourceChoice: response.choice,
    ...copy,
    applicabilityConditions: [...copy.applicabilityConditions],
    allowedTeacherActions: [...copy.allowedTeacherActions],
    generatedAfterTeacherResponse: true,
  };
}

export type TeacherWorkDecision = {
  decisionId: string;
  recommendationId: string | null;
  responseId: string;
  action: TeacherActionScope | "NO_CHANGE_REQUIRED";
  teacherConfirmed: true;
  runtimeEffect: "NONE_READONLY_FIXTURE";
};

export function createTeacherWorkDecision(
  response: TeacherProfessionalContextResponse,
  recommendation: TeacherWorkRecommendation | null,
  action: TeacherWorkDecision["action"],
): TeacherWorkDecision {
  if (!recommendation) {
    if (response.choice !== "NOT_A_PROBLEM" || action !== "NO_CHANGE_REQUIRED")
      throw new Error("TEACHER_DECISION_REQUIRES_RECOMMENDATION");
  } else if (
    action === "NO_CHANGE_REQUIRED" ||
    !recommendation.allowedTeacherActions.includes(action)
  ) {
    throw new Error("TEACHER_ACTION_OUTSIDE_RECOMMENDATION_BOUNDARY");
  }
  return {
    decisionId: `teacher-work-decision:${response.responseId}:${action}`,
    recommendationId: recommendation?.recommendationId ?? null,
    responseId: response.responseId,
    action,
    teacherConfirmed: true,
    runtimeEffect: "NONE_READONLY_FIXTURE",
  };
}

export type NextOccurrencePreparationReminder = {
  reminderId: string;
  sourceOccurrenceId: string;
  targetOccurrenceId: string;
  previousClassFact: string;
  teacherConfirmedContext: string;
  currentClassDifference: string;
  confirmedRecommendation: string;
  primaryActionLabel: "按当前版本准备";
  sourceDecisionId: string;
  runtimeEffect: "NONE_READONLY_FIXTURE";
};

export function createNextOccurrencePreparationReminder(input: {
  sourceOccurrenceId: string;
  targetOccurrenceId: string;
  previousClassFact: string;
  currentClassDifference: string;
  response: TeacherProfessionalContextResponse;
  recommendation: TeacherWorkRecommendation;
  decision: TeacherWorkDecision;
}): NextOccurrencePreparationReminder {
  if (
    input.decision.action !== "NEXT_CLASS_TRIAL" ||
    input.decision.recommendationId !== input.recommendation.recommendationId
  )
    throw new Error("NEXT_OCCURRENCE_REMINDER_REQUIRES_CONFIRMED_TRIAL_DECISION");
  return {
    reminderId: `next-occurrence-reminder:${input.decision.decisionId}`,
    sourceOccurrenceId: input.sourceOccurrenceId,
    targetOccurrenceId: input.targetOccurrenceId,
    previousClassFact: input.previousClassFact,
    teacherConfirmedContext: input.response.label,
    currentClassDifference: input.currentClassDifference,
    confirmedRecommendation: input.recommendation.summary,
    primaryActionLabel: "按当前版本准备",
    sourceDecisionId: input.decision.decisionId,
    runtimeEffect: "NONE_READONLY_FIXTURE",
  };
}

export function createAssistantQuickMark(
  state: ClassroomAssistantJourneyState,
  position: ActiveClassroomPosition,
  quickMark: ClassroomQuickMark,
): ClassroomFactEvent {
  if (state !== "CLASSROOM_ACTIVE")
    throw new Error("CLASSROOM_ASSISTANT_QUICK_MARK_AFTER_CLASS_FORBIDDEN");
  return createQuickMarkFact(position, quickMark);
}

export function createAssistantOneLineNote(
  state: ClassroomAssistantJourneyState,
  position: ActiveClassroomPosition,
  note: string,
): ClassroomFactEvent {
  if (state !== "CLASSROOM_ACTIVE")
    throw new Error("CLASSROOM_ASSISTANT_ONE_LINE_NOTE_AFTER_CLASS_FORBIDDEN");
  const trimmed = note.trim();
  if (!trimmed || trimmed.length > 80)
    throw new Error("CLASSROOM_ASSISTANT_ONE_LINE_NOTE_INVALID");
  return {
    factId: `fact:${position.occurrenceId}:${position.bindingId}:${position.elapsedSeconds}:one-line-note`,
    occurrenceId: position.occurrenceId,
    eventType: "ONE_LINE_NOTE_ADDED",
    happenedAtOffsetSeconds: position.elapsedSeconds,
    episodeId: position.episodeId,
    bindingId: position.bindingId,
    screenId: position.screenId,
    note: trimmed,
    source: "SIMULATED_TEACHER_ACTION",
  };
}

export type ClassroomAssistantFixtureSeed = {
  sourceOccurrenceId: string;
  targetOccurrenceId: string;
  assessment: FirstPassAssessment | null;
  selectedContextChoice: TeacherProfessionalContextChoice;
  selectedContextNote?: string;
  selectedDecisionAction: TeacherWorkDecision["action"];
  previousClassFact: string;
  currentClassDifference: string;
};

export type ClassroomAssistantJourneySnapshot = {
  state: ClassroomAssistantJourneyState;
  view:
    | "PRE_CLASS_PREPARATION"
    | "CURRENT_CLASSROOM"
    | "POSTCLASS_TRIAGE"
    | "CLASSROOM_RECORD";
  statusLabel: string;
  classroomOpenForQuickMarks: boolean;
  teacherResponse: TeacherProfessionalContextResponse | null;
  recommendation: TeacherWorkRecommendation | null;
  teacherDecision: TeacherWorkDecision | null;
  nextOccurrenceReminder: NextOccurrencePreparationReminder | null;
  historicalRecordLocked: boolean;
};

const stateView: Readonly<
  Record<ClassroomAssistantJourneyState, ClassroomAssistantJourneySnapshot["view"]>
> = {
  PRE_CLASS_PREPARATION: "PRE_CLASS_PREPARATION",
  READY_FOR_PREVIEW: "PRE_CLASS_PREPARATION",
  CLASSROOM_ACTIVE: "CURRENT_CLASSROOM",
  CLASSROOM_CLOSING: "CURRENT_CLASSROOM",
  POSTCLASS_TRIAGE_READY: "POSTCLASS_TRIAGE",
  AWAITING_TEACHER_JUDGMENT: "POSTCLASS_TRIAGE",
  RECOMMENDATION_READY: "POSTCLASS_TRIAGE",
  TEACHER_DECISION_RECORDED: "POSTCLASS_TRIAGE",
  NEXT_OCCURRENCE_PREPARATION: "PRE_CLASS_PREPARATION",
  ARCHIVED: "CLASSROOM_RECORD",
};

const statusLabelByState: Readonly<Record<ClassroomAssistantJourneyState, string>> = {
  PRE_CLASS_PREPARATION: "课前准备中",
  READY_FOR_PREVIEW: "课前预览已就绪",
  CLASSROOM_ACTIVE: "课堂进行中",
  CLASSROOM_CLOSING: "课堂已结束，正在收拢记录",
  POSTCLASS_TRIAGE_READY: "小教已完成初步整理",
  AWAITING_TEACHER_JUDGMENT: "等待教师判断",
  RECOMMENDATION_READY: "建议已就绪，等待教师决定",
  TEACHER_DECISION_RECORDED: "教师决定已记录",
  NEXT_OCCURRENCE_PREPARATION: "下一班课前准备",
  ARCHIVED: "课堂记录已归档",
};

const responseStates = new Set<ClassroomAssistantJourneyState>([
  "RECOMMENDATION_READY",
  "TEACHER_DECISION_RECORDED",
  "NEXT_OCCURRENCE_PREPARATION",
  "ARCHIVED",
]);
const decisionStates = new Set<ClassroomAssistantJourneyState>([
  "TEACHER_DECISION_RECORDED",
  "NEXT_OCCURRENCE_PREPARATION",
  "ARCHIVED",
]);

export function coordinateClassroomAssistantFixture(
  seed: ClassroomAssistantFixtureSeed,
  state: ClassroomAssistantJourneyState,
): ClassroomAssistantJourneySnapshot {
  const shouldCreateResponse = Boolean(seed.assessment && responseStates.has(state));
  const selectedOption = teacherProfessionalContextOptions.find(
    (option) => option.value === seed.selectedContextChoice,
  );
  if (!selectedOption) throw new Error("TEACHER_CONTEXT_OPTION_UNKNOWN");

  const teacherResponse =
    shouldCreateResponse && seed.assessment
      ? {
          responseId: `teacher-work-response:${seed.assessment.assessmentId}:${seed.selectedContextChoice}`,
          assessmentId: seed.assessment.assessmentId,
          choice: seed.selectedContextChoice,
          label: selectedOption.label,
          ...(seed.selectedContextNote
            ? { contextNote: seed.selectedContextNote }
            : {}),
          respondedAtOffsetSeconds: 2450,
        }
      : null;
  const recommendation =
    teacherResponse && seed.assessment
      ? createTeacherWorkRecommendation(seed.assessment, teacherResponse)
      : null;
  const teacherDecision =
    teacherResponse && decisionStates.has(state)
      ? createTeacherWorkDecision(
          teacherResponse,
          recommendation,
          seed.selectedDecisionAction,
        )
      : null;
  const nextOccurrenceReminder =
    teacherResponse && recommendation && teacherDecision &&
    teacherDecision.action === "NEXT_CLASS_TRIAL" &&
    ["NEXT_OCCURRENCE_PREPARATION", "ARCHIVED"].includes(state)
      ? createNextOccurrencePreparationReminder({
          sourceOccurrenceId: seed.sourceOccurrenceId,
          targetOccurrenceId: seed.targetOccurrenceId,
          previousClassFact: seed.previousClassFact,
          currentClassDifference: seed.currentClassDifference,
          response: teacherResponse,
          recommendation,
          decision: teacherDecision,
        })
      : null;

  return Object.freeze({
    state,
    view: stateView[state],
    statusLabel: statusLabelByState[state],
    classroomOpenForQuickMarks: state === "CLASSROOM_ACTIVE",
    teacherResponse,
    recommendation,
    teacherDecision,
    nextOccurrenceReminder,
    historicalRecordLocked: state === "ARCHIVED",
  });
}

export function validateClassroomAssistantJourneySnapshot(
  snapshot: ClassroomAssistantJourneySnapshot,
): string[] {
  const issues: string[] = [];
  if (
    snapshot.state !== "CLASSROOM_ACTIVE" &&
    snapshot.classroomOpenForQuickMarks
  )
    issues.push("ENDED_CLASSROOM_ACCEPTS_QUICK_MARK");
  if (
    ["POSTCLASS_TRIAGE", "CLASSROOM_RECORD"].includes(snapshot.view) &&
    snapshot.statusLabel === "课堂进行中"
  )
    issues.push("POSTCLASS_PRESENTED_AS_ACTIVE");
  if (snapshot.recommendation && !snapshot.teacherResponse)
    issues.push("RECOMMENDATION_BEFORE_TEACHER_RESPONSE");
  if (snapshot.teacherDecision && !snapshot.teacherResponse)
    issues.push("DECISION_BEFORE_TEACHER_RESPONSE");
  if (
    snapshot.nextOccurrenceReminder &&
    snapshot.nextOccurrenceReminder.sourceDecisionId !==
      snapshot.teacherDecision?.decisionId
  )
    issues.push("REMINDER_WITHOUT_SOURCE_DECISION");
  if (snapshot.state === "ARCHIVED" && !snapshot.historicalRecordLocked)
    issues.push("ARCHIVED_RECORD_MUTABLE");
  return issues;
}
