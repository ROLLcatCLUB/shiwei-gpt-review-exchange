import { readFileSync, writeFileSync } from "node:fs";

import {
  classroomAgentCapabilityCategories,
  classroomAgentCapabilityParameterContracts,
  classroomAgentCapabilityOutputContracts,
  classroomAgentCapabilityRegistry,
  classroomAgentCapabilityRoutingContracts,
  classroomAgentProductLine,
  classroomAgentRiskContracts,
  classroomAgentStatefulCapabilityIds,
  allowedSessionStatesByCapability,
  createClassroomAgentCommandCandidateR0,
  createClassroomAgentTrustedStateContext,
  existingClassroomFixtureCapabilityBindings,
  getClassroomAgentCapability,
  resolveCapabilityRisk,
  validateClassroomAgentCapabilityRegistry,
  validateClassroomAgentCommandCandidateR0,
} from "../domain/classroom-assistant/classroom-agent-capability-registry.ts";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const checks = [];
const check = (id, condition, evidence = undefined) =>
  checks.push({ id, status: condition ? "PASS" : "FAIL", ...(evidence ? { evidence } : {}) });

const source = read(
  "domain/classroom-assistant/classroom-agent-capability-registry.ts",
);
const surface = read("app/shell-v1/classroom/classroom-surface.tsx");
const assistant = read("app/shell-v1/classroom/teacher-work-assistant-review.tsx");
const packageJson = read("package.json");
const activeState = createClassroomAgentTrustedStateContext({
  actualSessionState: "CLASSROOM_ACTIVE",
  actualSessionRevision: 11,
});

check("UNIFIED_FRONT_AGENT_XIAOJIAO", classroomAgentProductLine.unifiedFrontAgent === "小教智能体");
check("CLASSROOM_MODE_NOT_NEW_AGENT", classroomAgentProductLine.isIndependentFrontAgent === false);
check("PRODUCT_LINE_REGISTERED", classroomAgentProductLine.productLineName === "小教·课堂助手");
check("INTERNAL_DOMAIN_REGISTERED", classroomAgentProductLine.internalDomainName === "ClassroomAgentAssistant");
check(
  "R1_DEFAULT_INFORMATION_ARCHITECTURE_UNCHANGED",
  classroomAgentProductLine.primaryInformationArchitecture.join("/") ===
    "课前准备/当前课堂/课堂记录" &&
    ["课前准备", "当前课堂", "课堂记录"].every((label) => assistant.includes(label)),
);
check("CAPABILITY_COUNT_37_AFTER_M1_FIXTURE_TOOLS", classroomAgentCapabilityRegistry.length === 37);
check(
  "ALL_SIX_CAPABILITY_FAMILIES_REGISTERED",
  classroomAgentCapabilityCategories.every((category) =>
    classroomAgentCapabilityRegistry.some((item) => item.category === category),
  ),
);
check(
  "CAPABILITY_IDS_UNIQUE",
  new Set(classroomAgentCapabilityRegistry.map((item) => item.capabilityId)).size ===
    classroomAgentCapabilityRegistry.length,
);
check(
  "REGISTRY_DOMAIN_VALID",
  validateClassroomAgentCapabilityRegistry().length === 0,
  validateClassroomAgentCapabilityRegistry(),
);
check(
  "QUICK_NOTE_RECLASSIFIED_AS_CAPABILITY",
  getClassroomAgentCapability("classroom.note.capture").status === "AVAILABLE_FIXTURE" &&
    getClassroomAgentCapability("classroom.note.capture").category === "NOTE_CAPTURE",
);
check("QUICK_NOTE_NOT_PRODUCT_IDENTITY", classroomAgentCapabilityRegistry.length > 1);
check(
  "EXISTING_QUICK_NOTE_BOUND",
  existingClassroomFixtureCapabilityBindings["classroom.note.capture"]?.sourceContract ===
    "createAssistantQuickMark",
);
check(
  "SUMMARY_FIXTURE_CAPABILITIES_BOUND",
  [
    "classroom.summary.fact_view",
    "classroom.summary.context_question",
    "classroom.summary.suggest_next_action",
    "classroom.summary.accept_next_class_trial",
    "classroom.summary.save_record",
  ].every((id) => id in existingClassroomFixtureCapabilityBindings),
);
check(
  "L0_L3_RISK_CONTRACT_COMPLETE",
  ["L0", "L1", "L2", "L3"].every((level) => level in classroomAgentRiskContracts),
);
check(
  "L2_REQUIRES_CONFIRMATION",
  classroomAgentRiskContracts.L2.requiresConfirmation &&
    classroomAgentCapabilityRegistry
      .filter((item) => item.riskLevel === "L2")
      .every((item) => item.requiresConfirmation),
);
check(
  "L3_HOLD_ONLY",
  classroomAgentCapabilityRegistry
    .filter((item) => item.riskLevel === "L3")
    .every((item) => item.status === "HOLD" && item.r0Executor === "NONE"),
);
check(
  "PLANNED_AND_HOLD_NON_EXECUTABLE",
  classroomAgentCapabilityRegistry
    .filter((item) => ["PLANNED", "HOLD"].includes(item.status))
    .every((item) => item.r0Executor === "NONE"),
);
const suggestionCapability = getClassroomAgentCapability(
  "classroom.summary.suggest_next_action",
);
const acceptanceCapability = getClassroomAgentCapability(
  "classroom.summary.accept_next_class_trial",
);
const contextQuestionCapability = getClassroomAgentCapability(
  "classroom.summary.context_question",
);
check(
  "SUGGESTION_REQUIRES_RESPONSE_NOT_DECISION",
  suggestionCapability.prerequisites.includes("TeacherResponse") &&
    !suggestionCapability.prerequisites.includes("TeacherDecision") &&
    suggestionCapability.riskLevel === "L1",
);
check(
  "NEXT_CLASS_ACCEPTANCE_SEPARATE_L2_CAPABILITY",
  acceptanceCapability.prerequisites.includes("Recommendation") &&
    acceptanceCapability.prerequisites.includes("TeacherResponse") &&
    !acceptanceCapability.prerequisites.includes("TeacherDecision") &&
    acceptanceCapability.riskLevel === "L2",
);
check(
  "CONTEXT_QUESTION_CREATES_TEACHER_RESPONSE",
  contextQuestionCapability.prerequisites.includes("FirstPassAssessment") &&
    contextQuestionCapability.prerequisites.includes("ContextQuestionReady") &&
    !contextQuestionCapability.prerequisites.includes("TeacherResponse") &&
    classroomAgentCapabilityOutputContracts[
      "classroom.summary.context_question"
    ].produces.includes("TeacherResponse"),
);
check(
  "NEXT_CLASS_ACCEPTANCE_CREATES_TEACHER_DECISION",
  !(
    "decisionId" in
    classroomAgentCapabilityParameterContracts[
      "classroom.summary.accept_next_class_trial"
    ].fields
  ) &&
    classroomAgentCapabilityParameterContracts[
      "classroom.summary.accept_next_class_trial"
    ].fields.action.allowedValues.includes("NEXT_CLASS_TRIAL") &&
    classroomAgentCapabilityOutputContracts[
      "classroom.summary.accept_next_class_trial"
    ].produces.includes("TeacherDecision"),
);
check(
  "FUTURE_EXECUTOR_SEMANTICS_REMOVED",
  !source.includes("futureExecutor") &&
    source.includes("candidateProducer") &&
    source.includes("executionOwner") &&
    source.includes("destinationSurface"),
);
check(
  "CLOUD_CANDIDATE_PRODUCER_NOT_CLASSROOM_EXECUTOR",
  classroomAgentCapabilityRoutingContracts[
    "classroom.assessment.suggest_feedback"
  ].candidateProducer === "CLOUD_AGENT" &&
    classroomAgentCapabilityRoutingContracts[
      "classroom.assessment.suggest_feedback"
    ].executionOwner === "NONE" &&
    classroomAgentCapabilityRoutingContracts[
      "classroom.assessment.suggest_feedback"
    ].destinationSurface === "REVIEW_ROOM",
);
check(
  "PARAMETER_CONTRACT_FOR_EVERY_CAPABILITY",
  Object.keys(classroomAgentCapabilityParameterContracts).length ===
    classroomAgentCapabilityRegistry.length,
);
check(
  "OUTPUT_CONTRACT_FOR_EVERY_CAPABILITY",
  Object.keys(classroomAgentCapabilityOutputContracts).length ===
    classroomAgentCapabilityRegistry.length,
);
check(
  "ALLOWED_STATE_CONTRACT_FOR_EVERY_STATEFUL_CAPABILITY",
  Object.keys(allowedSessionStatesByCapability).length ===
    classroomAgentStatefulCapabilityIds.length &&
    Object.values(allowedSessionStatesByCapability).every(
      (states) => states.length > 0,
    ),
);

const teacherScope = {
  authorizedClassIds: ["class-05"],
  canAccessIdentifiableStudentData: true,
  canProjectStudentWork: false,
};
const ownClassRisk = resolveCapabilityRisk(
  "classroom.info.student_record",
  {
    studentId: "student-01",
    classId: "class-05",
    accessMode: "READ_ONLY",
    studentIdentifiability: "IDENTIFIABLE",
  },
  teacherScope,
  "CLASSROOM_ACTIVE",
);
const crossClassRisk = resolveCapabilityRisk(
  "classroom.info.student_record",
  {
    studentId: "student-02",
    classId: "class-other",
    accessMode: "READ_ONLY",
    studentIdentifiability: "IDENTIFIABLE",
  },
  teacherScope,
  "CLASSROOM_ACTIVE",
);
check(
  "CONDITIONAL_RISK_RESOLVER",
  ownClassRisk.riskLevel === "L0" &&
    crossClassRisk.riskLevel === "L2" &&
    crossClassRisk.requiresConfirmation,
);

const l0Candidate = createClassroomAgentCommandCandidateR0({
  commandId: "validator:l0",
  capabilityId: "classroom.info.current_state",
  issuedBy: "TEACHER",
});
const l2Candidate = createClassroomAgentCommandCandidateR0({
  commandId: "validator:l2",
  capabilityId: "classroom.student.project_work",
  issuedBy: "AGENT_SUGGESTION",
  parameters: {
    studentId: "student-01",
    classId: "class-05",
    projectToStudentDisplay: true,
  },
  trustedStateContext: activeState,
});
check("R0_CANDIDATE_NON_EXECUTABLE", [l0Candidate, l2Candidate].every((item) => item.executionStatus === "NOT_EXECUTABLE_IN_R0"));
check("R0_CANDIDATE_CONFIRMATION_DERIVED", l0Candidate.confirmationStatus === "NOT_REQUIRED" && l2Candidate.confirmationStatus === "REQUIRED");
check(
  "R0_CANDIDATE_VALIDATOR_PASS",
  validateClassroomAgentCommandCandidateR0(l0Candidate).length === 0 &&
    validateClassroomAgentCommandCandidateR0(l2Candidate, {
      trustedStateContext: activeState,
    }).length === 0,
);
check(
  "L2_CONFIRMATION_TAMPER_REJECTED",
  validateClassroomAgentCommandCandidateR0({
    ...l2Candidate,
    confirmationStatus: "NOT_REQUIRED",
  }, { trustedStateContext: activeState }).includes(
    "COMMAND_CONFIRMATION_POLICY_MISMATCH",
  ),
);
const staleState = createClassroomAgentTrustedStateContext({
  actualSessionState: "CLASSROOM_ACTIVE",
  actualSessionRevision: 12,
});
check(
  "STALE_COMMAND_REVISION_REJECTED",
  validateClassroomAgentCommandCandidateR0(l2Candidate, {
    trustedStateContext: staleState,
  }).includes("COMMAND_STALE_SESSION_REVISION"),
);
check(
  "FORGED_EXPECTED_STATE_REJECTED",
  validateClassroomAgentCommandCandidateR0(
    { ...l2Candidate, expectedSessionState: "ARCHIVED" },
    { trustedStateContext: activeState },
  ).includes("COMMAND_EXPECTED_ACTUAL_STATE_MISMATCH"),
);
const malformedCandidateIssues = validateClassroomAgentCommandCandidateR0({
  commandId: " ",
  capabilityId: "classroom.screen.open",
  issuedBy: "MODEL",
  parameters: { unexpected: true },
  resolvedRiskLevel: "L1",
  confirmationStatus: "NOT_REQUIRED",
  executionStatus: "NOT_EXECUTABLE_IN_R0",
  r0NonExecutionReason: "CONTRACT_REGISTRATION_ONLY",
});
check("EMPTY_COMMAND_ID_REJECTED", malformedCandidateIssues.includes("COMMAND_ID_REQUIRED"));
check("INVALID_ISSUER_REJECTED", malformedCandidateIssues.includes("COMMAND_ISSUER_INVALID"));
check("MISSING_SESSION_STATE_REJECTED", malformedCandidateIssues.includes("COMMAND_EXPECTED_SESSION_STATE_REQUIRED"));
check(
  "PARAMETER_CONTRACT_ENFORCED",
  malformedCandidateIssues.includes("COMMAND_PARAMETER_REQUIRED:bindingId") &&
    malformedCandidateIssues.includes("COMMAND_PARAMETER_UNDECLARED:unexpected"),
);
check(
  "R0_EXECUTION_TAMPER_REJECTED",
  validateClassroomAgentCommandCandidateR0({
    commandId: "tampered:execution",
    capabilityId: "classroom.screen.next",
    issuedBy: "TEACHER",
    parameters: {},
    expectedSessionState: "CLASSROOM_ACTIVE",
    expectedSessionRevision: 11,
    resolvedRiskLevel: "L1",
    confirmationStatus: "NOT_REQUIRED",
    executionStatus: "EXECUTED",
    r0NonExecutionReason: "CONTRACT_REGISTRATION_ONLY",
  }, { trustedStateContext: activeState }).includes(
    "R0_COMMAND_EXECUTION_FORBIDDEN",
  ),
);
check("NEW_CLASSROOM_AGENT_PAGE_COUNT_ZERO", !surface.includes("ClassroomAgentAssistantPage"));
check("R1_NAV_IMPLEMENTATION_RETAINED", surface.includes("TeacherWorkAssistantNavigation"));
check("NO_MODEL_SDK_ADDED", !/openai|anthropic|model\.generate/i.test(source));
check("NO_VOICE_SDK_ADDED", !/speechsdk|mediarecorder|getusermedia/i.test(source));
check("NO_WEBSOCKET_OR_ELECTRON_ADDED", !/WebSocket|electron/i.test(source + packageJson));
check("NO_DATABASE_WRITE_ADDED", !/drizzle|database|db\./i.test(source));
check("NO_FORMAL_WRITEBACK_EXECUTION", getClassroomAgentCapability("classroom.summary.writeback_prep").status === "HOLD");

const failed = checks.filter((item) => item.status === "FAIL");
const report = {
  validator: "CLASSROOM_AGENT_ASSISTANT_R0_2_COMMAND_LIFECYCLE_AND_TRUSTED_STATE_CONTRACT_CLOSURE",
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  status: failed.length ? "FAIL" : "PASS",
  acceptance: {
    unifiedFrontAgent: "小教智能体",
    classroomAgentModeRegistered: failed.length ? "FAIL" : "PASS",
    quickNoteReclassifiedAsCapability: failed.length ? "FAIL" : "PASS",
    recommendationAndAcceptanceSplit: failed.length ? "FAIL" : "PASS",
    commandValidatorHardened: failed.length ? "FAIL" : "PASS",
    trustedStateAndRevisionContract: failed.length ? "FAIL" : "PASS",
    capabilityCount: classroomAgentCapabilityRegistry.length,
    r1Default: "UNCHANGED",
    newPageCount: 0,
  },
  boundaries: {
    realSession: "HOLD",
    database: "HOLD",
    model: "HOLD",
    voice: "HOLD",
    electron: "HOLD",
    websocket: "HOLD",
    formalWriteback: "HOLD",
  },
  results: checks,
};

writeFileSync(
  new URL("CLASSROOM_AGENT_ASSISTANT_R0_2_COMMAND_LIFECYCLE_AND_TRUSTED_STATE_CONTRACT_CLOSURE_VALIDATION_REPORT.json", root),
  `${JSON.stringify(report, null, 2)}\n`,
);
console.log(JSON.stringify(report, null, 2));
process.exitCode = failed.length ? 1 : 0;
