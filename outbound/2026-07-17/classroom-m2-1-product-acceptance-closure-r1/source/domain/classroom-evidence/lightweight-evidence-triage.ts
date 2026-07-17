export type ClassroomQuickMark =
  | "NOT_UNDERSTOOD"
  | "TIME_SHORT"
  | "MATERIAL_ISSUE"
  | "EFFECTIVE"
  | "LATER";

export type ClassroomFactEventType =
  | "OCCURRENCE_ENTERED"
  | "OCCURRENCE_ENDED"
  | "BINDING_ENTERED"
  | "BINDING_EXITED"
  | "BINDING_SWITCHED"
  | "BINDING_SKIPPED"
  | "BINDING_REVISITED"
  | "DURATION_RECORDED"
  | "QUICK_MARK_ADDED"
  | "ONE_LINE_NOTE_ADDED";

export type ClassroomActivityKind =
  | "INTRODUCTION"
  | "OBSERVATION"
  | "DEMONSTRATION"
  | "PRACTICE"
  | "SHARING"
  | "CLOSURE";

export type ClassroomFactEvent = {
  factId: string;
  occurrenceId: string;
  eventType: ClassroomFactEventType;
  happenedAtOffsetSeconds: number;
  episodeId?: string;
  bindingId?: string;
  screenId?: string;
  fromBindingId?: string;
  toBindingId?: string;
  activityKind?: ClassroomActivityKind;
  plannedDurationSeconds?: number;
  actualDurationSeconds?: number;
  quickMark?: ClassroomQuickMark;
  note?: string;
  source: "SIMULATED_TEACHER_ACTION" | "DETERMINISTIC_FIXTURE";
};

export type ClassroomSignalType =
  | "RISK"
  | "POSITIVE"
  | "CONTEXT_DIFFERENCE";

export type ClassroomSignalCategory =
  | "DEMONSTRATION_PACING"
  | "UNDERSTANDING"
  | "MATERIAL_CONDITION"
  | "ACTIVITY_FLOW";

export type ClassroomSignal = {
  signalId: string;
  occurrenceId: string;
  type: ClassroomSignalType;
  category: ClassroomSignalCategory;
  factRefs: string[];
  summary: string;
  confidence: "LOW" | "MEDIUM" | "HIGH";
  repeatKey: string;
  priorSimilarOccurrenceCount: number;
};

export type FirstPassAssessment = {
  assessmentId: string;
  occurrenceId: string;
  signalId: string;
  factRefs: string[];
  factualSummary: string;
  signalSummary: string;
  candidateExplanations: Array<{
    text: string;
    status: "HYPOTHESIS_NOT_FACT";
  }>;
  teacherQuestion: string;
  confidence: "LOW" | "MEDIUM" | "HIGH";
  status: "AWAITING_TEACHER_CONTEXT";
};

export type TeacherContextResponseValue =
  | "CONFIRMED"
  | "PARTIALLY_CONFIRMED"
  | "REJECTED"
  | "NOT_A_PROBLEM"
  | "UNCERTAIN"
  | "LATER"
  | "SKIPPED";

export type TeacherContextResponse = {
  responseId: string;
  assessmentId: string;
  value: TeacherContextResponseValue;
  contextNote?: string;
  respondedAtOffsetSeconds: number;
};

export type TeacherActionScope =
  | "RECORD_ONLY"
  | "NEXT_CLASS_TRIAL"
  | "EDIT_BEFORE_TRIAL"
  | "MATCHING_CONTEXTS"
  | "SEND_TO_PREP_ROOM"
  | "IGNORE";

export type ActionRecommendation = {
  recommendationId: string;
  assessmentId: string;
  responseId: string;
  summary: string;
  applicabilityConditions: string[];
  nextObservation: string;
  allowedTeacherActions: TeacherActionScope[];
  generatedAfterTeacherResponse: true;
};

export type TeacherActionDecision = {
  decisionId: string;
  recommendationId: string;
  action: TeacherActionScope;
  teacherConfirmed: true;
  runtimeEffect: "NONE_READONLY_FIXTURE";
};

export type ReflectionBurdenBudget = {
  maxSurfacedSignalsPerOccurrence: 2;
  maxPrimaryQuestionsPerSignal: 1;
  allowSkipAll: true;
  rawEvidenceCollapsedByDefault: true;
  noMandatoryNarrativeReflection: true;
};

export const reflectionBurdenBudget: ReflectionBurdenBudget = {
  maxSurfacedSignalsPerOccurrence: 2,
  maxPrimaryQuestionsPerSignal: 1,
  allowSkipAll: true,
  rawEvidenceCollapsedByDefault: true,
  noMandatoryNarrativeReflection: true,
} as const;

export type ActiveClassroomPosition = {
  occurrenceId: string;
  episodeId: string;
  bindingId: string;
  screenId: string;
  elapsedSeconds: number;
};

export function createQuickMarkFact(
  position: ActiveClassroomPosition,
  quickMark: ClassroomQuickMark,
): ClassroomFactEvent {
  if (!position.bindingId || !position.episodeId || !position.screenId)
    throw new Error("QUICK_MARK_ACTIVE_BINDING_CONTEXT_REQUIRED");
  if (position.elapsedSeconds < 0)
    throw new Error("QUICK_MARK_NEGATIVE_OFFSET");
  return {
    factId: `fact:${position.occurrenceId}:${position.bindingId}:${position.elapsedSeconds}:${quickMark}`,
    occurrenceId: position.occurrenceId,
    eventType: "QUICK_MARK_ADDED",
    happenedAtOffsetSeconds: position.elapsedSeconds,
    episodeId: position.episodeId,
    bindingId: position.bindingId,
    screenId: position.screenId,
    quickMark,
    source: "SIMULATED_TEACHER_ACTION",
  };
}

export type PriorSimilarSignal = {
  repeatKey: string;
  occurrenceId: string;
  teacherResponse?: TeacherContextResponseValue;
};

export type LightweightEvidenceTriageInput = {
  occurrenceId: string;
  facts: ClassroomFactEvent[];
  priorSimilarSignals: PriorSimilarSignal[];
};

export type LightweightEvidenceTriageResult = {
  occurrenceId: string;
  surfacedAssessments: FirstPassAssessment[];
  archivedSignals: ClassroomSignal[];
  noFindingsReason?: "NO_ACTIONABLE_SIGNAL";
  burdenBudget: typeof reflectionBurdenBudget;
};

const demoRepeatKey = "DEMONSTRATION_OVERTIME_AND_REVISIT";

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function createAssessment(signal: ClassroomSignal): FirstPassAssessment {
  const copyByCategory: Record<
    ClassroomSignalCategory,
    {
      factualSummary: string;
      signalSummary: string;
      explanation: string;
      question: string;
    }
  > = {
    DEMONSTRATION_PACING: {
      factualSummary: "示范环节超过原定时间，并出现回看或理解标记。",
      signalSummary: "示范节奏可能影响了学生跟上关键步骤。",
      explanation: "也可能是这次材料操作或课堂节奏造成，尚不能只归因于教学设计。",
      question: "你觉得学生主要是没看懂关键一步，还是这次操作时间不够？",
    },
    UNDERSTANDING: {
      factualSummary: "当前环节出现了“没理解”的课堂标记。",
      signalSummary: "这里可能需要再确认学生卡在什么位置。",
      explanation: "单次标记只能说明需要回看，不能证明全班都未理解。",
      question: "这更像是个别学生没跟上，还是多数学生都卡在同一步？",
    },
    MATERIAL_CONDITION: {
      factualSummary: "当前环节记录了材料使用问题。",
      signalSummary: "材料条件可能改变了原计划的课堂节奏。",
      explanation: "也可能是本次准备或分发情况造成，不一定需要修改课包。",
      question: "这是这一次的材料情况，还是后面班级也可能遇到？",
    },
    ACTIVITY_FLOW: {
      factualSummary: "当前环节记录了一个有效做法。",
      signalSummary: "这一做法可能值得在下一班继续观察。",
      explanation: "一次顺利表现仍只是初步信号，不能直接推广到全部班级。",
      question: "你觉得这次有效主要来自设计本身，还是这个班当时的状态？",
    },
  };
  const copy = copyByCategory[signal.category];
  return {
    assessmentId: `assessment:${signal.signalId}`,
    occurrenceId: signal.occurrenceId,
    signalId: signal.signalId,
    factRefs: [...signal.factRefs],
    factualSummary: copy.factualSummary,
    signalSummary: copy.signalSummary,
    candidateExplanations: [
      { text: copy.explanation, status: "HYPOTHESIS_NOT_FACT" },
    ],
    teacherQuestion: copy.question,
    confidence: signal.confidence,
    status: "AWAITING_TEACHER_CONTEXT",
  };
}

export function triageLightweightClassroomEvidence(
  input: LightweightEvidenceTriageInput,
): LightweightEvidenceTriageResult {
  const inputIssues = validateClassroomFactEvents(input.facts);
  if (inputIssues.length) throw new Error(inputIssues.join("|"));
  if (input.facts.some((fact) => fact.occurrenceId !== input.occurrenceId))
    throw new Error("FACT_OCCURRENCE_MISMATCH");

  const signals: ClassroomSignal[] = [];
  const demoFacts = input.facts.filter(
    (fact) => fact.activityKind === "DEMONSTRATION",
  );
  const duration = demoFacts.find(
    (fact) => fact.eventType === "DURATION_RECORDED",
  );
  const overtimeSeconds = Math.max(
    0,
    (duration?.actualDurationSeconds ?? 0) -
      (duration?.plannedDurationSeconds ?? 0),
  );
  const revisitFacts = demoFacts.filter(
    (fact) => fact.eventType === "BINDING_REVISITED",
  );
  const notUnderstoodFacts = demoFacts.filter(
    (fact) =>
      fact.eventType === "QUICK_MARK_ADDED" &&
      fact.quickMark === "NOT_UNDERSTOOD",
  );
  const priorDemoCount = input.priorSimilarSignals.filter(
    (item) => item.repeatKey === demoRepeatKey,
  ).length;

  if (overtimeSeconds >= 180) {
    const hasSupportingFact =
      revisitFacts.length > 0 || notUnderstoodFacts.length > 0;
    signals.push({
      signalId: `signal:${input.occurrenceId}:demo-pacing`,
      occurrenceId: input.occurrenceId,
      type: "RISK",
      category: "DEMONSTRATION_PACING",
      factRefs: unique([
        ...(duration ? [duration.factId] : []),
        ...revisitFacts.map((fact) => fact.factId),
        ...notUnderstoodFacts.map((fact) => fact.factId),
      ]),
      summary: hasSupportingFact
        ? "示范超时，同时出现回看或没理解标记。"
        : "示范单次超时，暂时只保留为弱信号。",
      confidence: hasSupportingFact ? "HIGH" : priorDemoCount ? "MEDIUM" : "LOW",
      repeatKey: demoRepeatKey,
      priorSimilarOccurrenceCount: priorDemoCount,
    });
  } else if (notUnderstoodFacts.length) {
    signals.push({
      signalId: `signal:${input.occurrenceId}:understanding`,
      occurrenceId: input.occurrenceId,
      type: "RISK",
      category: "UNDERSTANDING",
      factRefs: notUnderstoodFacts.map((fact) => fact.factId),
      summary: "当前环节出现没理解标记，需要教师补充情境。",
      confidence: "MEDIUM",
      repeatKey: "QUICK_MARK_NOT_UNDERSTOOD",
      priorSimilarOccurrenceCount: input.priorSimilarSignals.filter(
        (item) => item.repeatKey === "QUICK_MARK_NOT_UNDERSTOOD",
      ).length,
    });
  }

  const materialFacts = input.facts.filter(
    (fact) =>
      fact.eventType === "QUICK_MARK_ADDED" &&
      fact.quickMark === "MATERIAL_ISSUE",
  );
  if (materialFacts.length)
    signals.push({
      signalId: `signal:${input.occurrenceId}:material`,
      occurrenceId: input.occurrenceId,
      type: "CONTEXT_DIFFERENCE",
      category: "MATERIAL_CONDITION",
      factRefs: materialFacts.map((fact) => fact.factId),
      summary: "本场次出现材料条件差异。",
      confidence: "MEDIUM",
      repeatKey: "MATERIAL_CONDITION_DIFFERENCE",
      priorSimilarOccurrenceCount: input.priorSimilarSignals.filter(
        (item) => item.repeatKey === "MATERIAL_CONDITION_DIFFERENCE",
      ).length,
    });

  const effectiveFacts = input.facts.filter(
    (fact) =>
      fact.eventType === "QUICK_MARK_ADDED" && fact.quickMark === "EFFECTIVE",
  );
  if (effectiveFacts.length)
    signals.push({
      signalId: `signal:${input.occurrenceId}:effective`,
      occurrenceId: input.occurrenceId,
      type: "POSITIVE",
      category: "ACTIVITY_FLOW",
      factRefs: effectiveFacts.map((fact) => fact.factId),
      summary: "教师标记了一个本场次有效的课堂做法。",
      confidence: "MEDIUM",
      repeatKey: "TEACHER_MARKED_EFFECTIVE",
      priorSimilarOccurrenceCount: input.priorSimilarSignals.filter(
        (item) => item.repeatKey === "TEACHER_MARKED_EFFECTIVE",
      ).length,
    });

  const surfacedSignals = signals.filter(
    (signal) => signal.confidence !== "LOW" || signal.priorSimilarOccurrenceCount > 0,
  );
  const archivedSignals = signals.filter(
    (signal) => !surfacedSignals.includes(signal),
  );
  const surfacedAssessments = surfacedSignals
    .sort((left, right) => {
      const rank = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      return rank[right.confidence] - rank[left.confidence];
    })
    .slice(0, reflectionBurdenBudget.maxSurfacedSignalsPerOccurrence)
    .map(createAssessment);

  return {
    occurrenceId: input.occurrenceId,
    surfacedAssessments,
    archivedSignals: [
      ...archivedSignals,
      ...surfacedSignals.slice(
        reflectionBurdenBudget.maxSurfacedSignalsPerOccurrence,
      ),
    ],
    ...(surfacedAssessments.length === 0 && archivedSignals.length === 0
      ? { noFindingsReason: "NO_ACTIONABLE_SIGNAL" as const }
      : {}),
    burdenBudget: reflectionBurdenBudget,
  };
}

export function createActionRecommendation(
  assessment: FirstPassAssessment,
  response: TeacherContextResponse,
): ActionRecommendation | null {
  if (assessment.assessmentId !== response.assessmentId)
    throw new Error("TEACHER_RESPONSE_ASSESSMENT_MISMATCH");
  if (["REJECTED", "NOT_A_PROBLEM", "LATER", "SKIPPED"].includes(response.value))
    return null;

  const cautious = response.value === "UNCERTAIN";
  return {
    recommendationId: `recommendation:${assessment.assessmentId}:${response.responseId}`,
    assessmentId: assessment.assessmentId,
    responseId: response.responseId,
    summary: cautious
      ? "先保留本次记录，在条件相近的下一班继续观察。"
      : "可以在下一班做一次小范围试用，再根据课堂事实决定是否保留。",
    applicabilityConditions: [
      "只适用于教师确认过的相近课堂情境",
      "不自动扩散到全部班级",
    ],
    nextObservation: "观察同一环节是否仍出现相同事实。",
    allowedTeacherActions: cautious
      ? ["RECORD_ONLY", "IGNORE"]
      : [
          "RECORD_ONLY",
          "NEXT_CLASS_TRIAL",
          "EDIT_BEFORE_TRIAL",
          "MATCHING_CONTEXTS",
          "SEND_TO_PREP_ROOM",
          "IGNORE",
        ],
    generatedAfterTeacherResponse: true,
  };
}

export function createTeacherActionDecision(
  recommendation: ActionRecommendation,
  action: TeacherActionScope,
): TeacherActionDecision {
  if (!recommendation.allowedTeacherActions.includes(action))
    throw new Error("TEACHER_ACTION_OUTSIDE_RECOMMENDATION_BOUNDARY");
  return {
    decisionId: `decision:${recommendation.recommendationId}:${action}`,
    recommendationId: recommendation.recommendationId,
    action,
    teacherConfirmed: true,
    runtimeEffect: "NONE_READONLY_FIXTURE",
  };
}

export function validateClassroomFactEvents(
  facts: ClassroomFactEvent[],
): string[] {
  const issues: string[] = [];
  const ids = new Set<string>();
  for (const fact of facts) {
    if (ids.has(fact.factId)) issues.push(`DUPLICATE_FACT_ID:${fact.factId}`);
    ids.add(fact.factId);
    if (fact.happenedAtOffsetSeconds < 0)
      issues.push(`NEGATIVE_FACT_OFFSET:${fact.factId}`);
    if (
      fact.eventType === "DURATION_RECORDED" &&
      (fact.plannedDurationSeconds === undefined ||
        fact.actualDurationSeconds === undefined)
    )
      issues.push(`DURATION_FACT_INCOMPLETE:${fact.factId}`);
    if (fact.eventType === "QUICK_MARK_ADDED" && !fact.quickMark)
      issues.push(`QUICK_MARK_VALUE_MISSING:${fact.factId}`);
    if (
      fact.eventType === "ONE_LINE_NOTE_ADDED" &&
      (!fact.note || fact.note.length > 80)
    )
      issues.push(`ONE_LINE_NOTE_INVALID:${fact.factId}`);
    if (
      [
        "BINDING_ENTERED",
        "BINDING_EXITED",
        "BINDING_SKIPPED",
        "BINDING_REVISITED",
        "DURATION_RECORDED",
        "QUICK_MARK_ADDED",
        "ONE_LINE_NOTE_ADDED",
      ].includes(fact.eventType) &&
      (!fact.episodeId || !fact.bindingId || !fact.screenId)
    )
      issues.push(`BINDING_CONTEXT_MISSING:${fact.factId}`);
  }
  return issues;
}

export function validateLightweightEvidenceTriageResult(
  result: LightweightEvidenceTriageResult,
): string[] {
  const issues: string[] = [];
  if (
    result.surfacedAssessments.length >
    reflectionBurdenBudget.maxSurfacedSignalsPerOccurrence
  )
    issues.push("REFLECTION_BURDEN_FINDING_LIMIT_EXCEEDED");
  for (const assessment of result.surfacedAssessments) {
    if (!assessment.teacherQuestion.trim())
      issues.push(`TEACHER_QUESTION_MISSING:${assessment.assessmentId}`);
    if ("actionRecommendation" in assessment)
      issues.push(`PREMATURE_ACTION_RECOMMENDATION:${assessment.assessmentId}`);
    if (
      assessment.candidateExplanations.some(
        (item) => item.status !== "HYPOTHESIS_NOT_FACT",
      )
    )
      issues.push(`HYPOTHESIS_PRESENTED_AS_FACT:${assessment.assessmentId}`);
  }
  if (!result.burdenBudget.allowSkipAll)
    issues.push("SKIP_ALL_NOT_ALLOWED");
  if (!result.burdenBudget.rawEvidenceCollapsedByDefault)
    issues.push("RAW_EVIDENCE_NOT_COLLAPSED");
  if (!result.burdenBudget.noMandatoryNarrativeReflection)
    issues.push("MANDATORY_NARRATIVE_FORBIDDEN");
  return issues;
}
