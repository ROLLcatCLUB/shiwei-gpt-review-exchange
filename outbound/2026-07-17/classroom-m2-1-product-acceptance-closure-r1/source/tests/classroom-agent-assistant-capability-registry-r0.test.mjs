import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

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
  mapClassroomQuickMarkToCapability,
  resolveCapabilityRisk,
  validateClassroomAgentCapabilityRegistry,
  validateClassroomAgentCommandCandidateR0,
} from "../domain/classroom-assistant/classroom-agent-capability-registry.ts";

const read = async (relativePath) =>
  readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");

const activeState = createClassroomAgentTrustedStateContext({
  actualSessionState: "CLASSROOM_ACTIVE",
  actualSessionRevision: 7,
});

test("课堂助手登记为统一小教智能体的课堂能力模式", () => {
  assert.equal(classroomAgentProductLine.productLineName, "小教·课堂助手");
  assert.equal(classroomAgentProductLine.internalDomainName, "ClassroomAgentAssistant");
  assert.equal(classroomAgentProductLine.unifiedFrontAgent, "小教智能体");
  assert.equal(classroomAgentProductLine.isIndependentFrontAgent, false);
  assert.deepEqual(classroomAgentProductLine.primaryInformationArchitecture, [
    "课前准备",
    "当前课堂",
    "课堂记录",
  ]);
});

test("六个能力族和 M1 fixture 工具后的37项能力全部注册", () => {
  assert.equal(classroomAgentCapabilityRegistry.length, 37);
  assert.deepEqual(
    new Set(classroomAgentCapabilityRegistry.map((item) => item.category)),
    new Set(classroomAgentCapabilityCategories),
  );
  for (const capabilityId of [
    "classroom.screen.next",
    "classroom.timer.pause",
    "classroom.reminder.dismiss",
    "classroom.info.lesson_context",
    "classroom.student.mark_help",
    "classroom.assessment.start_review",
    "classroom.note.capture",
    "classroom.summary.fact_view",
    "classroom.summary.accept_next_class_trial",
  ])
    assert.equal(getClassroomAgentCapability(capabilityId).capabilityId, capabilityId);
});

test("注册表满足唯一性、确认门和fixture绑定规则", () => {
  assert.deepEqual(validateClassroomAgentCapabilityRegistry(), []);
  assert.equal(
    new Set(classroomAgentCapabilityRegistry.map((item) => item.capabilityId)).size,
    classroomAgentCapabilityRegistry.length,
  );
});

test("L0到L3权限合同保持教师控制权", () => {
  assert.equal(classroomAgentRiskContracts.L0.requiresConfirmation, false);
  assert.equal(classroomAgentRiskContracts.L1.requiresConfirmation, false);
  assert.equal(classroomAgentRiskContracts.L2.requiresConfirmation, true);
  assert.equal(classroomAgentRiskContracts.L3.requiresConfirmation, true);
  assert.equal(
    classroomAgentRiskContracts.L3.confirmationPolicy,
    "PROHIBITED_IN_R0",
  );
  for (const capability of classroomAgentCapabilityRegistry)
    assert.equal(
      capability.requiresConfirmation,
      classroomAgentRiskContracts[capability.riskLevel].requiresConfirmation,
      capability.capabilityId,
    );
});

test("L3保持HOLD且所有未来能力在R0没有执行器", () => {
  for (const capability of classroomAgentCapabilityRegistry) {
    if (capability.riskLevel === "L3") {
      assert.equal(capability.status, "HOLD", capability.capabilityId);
      assert.equal(capability.r0Executor, "NONE", capability.capabilityId);
    }
    if (["PLANNED", "HOLD"].includes(capability.status))
      assert.equal(capability.r0Executor, "NONE", capability.capabilityId);
  }
});

test("现有随手记映射为一个能力而非完整课堂助手", () => {
  const definition = getClassroomAgentCapability("classroom.note.capture");
  assert.equal(definition.status, "AVAILABLE_FIXTURE");
  assert.equal(definition.category, "NOTE_CAPTURE");
  assert.ok(classroomAgentCapabilityRegistry.length > 1);
  assert.equal(
    existingClassroomFixtureCapabilityBindings["classroom.note.capture"]
      .sourceContract,
    "createAssistantQuickMark",
  );
  const mapped = mapClassroomQuickMarkToCapability("TIME_SHORT");
  assert.deepEqual(mapped, {
    capabilityId: "classroom.note.capture",
    sourceContract: "createAssistantQuickMark",
    runtimeEffect: "EXISTING_FRONTEND_FIXTURE_ONLY",
    quickMark: "TIME_SHORT",
  });
});

test("建议候选生成与教师采纳下一班试用保持分离", () => {
  for (const capabilityId of [
    "classroom.summary.fact_view",
    "classroom.summary.context_question",
    "classroom.summary.suggest_next_action",
    "classroom.summary.accept_next_class_trial",
    "classroom.summary.save_record",
  ])
    assert.ok(capabilityId in existingClassroomFixtureCapabilityBindings, capabilityId);
  const suggestion = getClassroomAgentCapability(
    "classroom.summary.suggest_next_action",
  );
  assert.deepEqual(suggestion.prerequisites, [
    "R1FixtureJourney",
    "TeacherResponse",
  ]);
  assert.equal(suggestion.riskLevel, "L1");
  const contextQuestion = getClassroomAgentCapability(
    "classroom.summary.context_question",
  );
  assert.deepEqual(contextQuestion.prerequisites, [
    "R1FixtureJourney",
    "FirstPassAssessment",
    "ContextQuestionReady",
  ]);
  assert.deepEqual(
    classroomAgentCapabilityOutputContracts[
      "classroom.summary.context_question"
    ].produces,
    ["TeacherResponse"],
  );
  const acceptance = getClassroomAgentCapability(
    "classroom.summary.accept_next_class_trial",
  );
  assert.equal(acceptance.riskLevel, "L2");
  assert.ok(acceptance.prerequisites.includes("Recommendation"));
  assert.ok(acceptance.prerequisites.includes("TeacherResponse"));
  assert.ok(!acceptance.prerequisites.includes("TeacherDecision"));
  assert.deepEqual(
    Object.keys(
      classroomAgentCapabilityParameterContracts[
        "classroom.summary.accept_next_class_trial"
      ].fields,
    ),
    ["recommendationId", "action"],
  );
  assert.deepEqual(
    classroomAgentCapabilityOutputContracts[
      "classroom.summary.accept_next_class_trial"
    ].produces,
    ["TeacherDecision"],
  );
  assert.equal(
    getClassroomAgentCapability("classroom.summary.writeback_prep").status,
    "HOLD",
  );
});

test("候选生成者、执行所有者和目标功能面已经拆分", () => {
  const feedback =
    classroomAgentCapabilityRoutingContracts[
      "classroom.assessment.suggest_feedback"
    ];
  assert.equal(feedback.candidateProducer, "CLOUD_AGENT");
  assert.equal(feedback.executionOwner, "NONE");
  assert.equal(feedback.destinationSurface, "REVIEW_ROOM");
  const nextScreen =
    classroomAgentCapabilityRoutingContracts["classroom.screen.next"];
  assert.equal(nextScreen.candidateProducer, "DETERMINISTIC_FIXTURE");
  assert.equal(nextScreen.executionOwner, "EXISTING_WEB_FIXTURE");
  assert.equal(nextScreen.destinationSurface, "CURRENT_CLASSROOM");
});

test("条件风险解析区分本班只读和越界学生信息", () => {
  const teacherScope = {
    authorizedClassIds: ["class-05"],
    canAccessIdentifiableStudentData: true,
    canProjectStudentWork: false,
  };
  const ownClass = resolveCapabilityRisk(
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
  const crossClass = resolveCapabilityRisk(
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
  assert.equal(ownClass.riskLevel, "L0");
  assert.equal(ownClass.requiresConfirmation, false);
  assert.equal(crossClass.riskLevel, "L2");
  assert.equal(crossClass.requiresConfirmation, true);
});

test("R0候选命令始终不可执行并按风险生成确认状态", () => {
  const readOnly = createClassroomAgentCommandCandidateR0({
    commandId: "candidate:lesson-context",
    capabilityId: "classroom.info.lesson_context",
    issuedBy: "TEACHER",
  });
  const studentConsequence = createClassroomAgentCommandCandidateR0({
    commandId: "candidate:project-work",
    capabilityId: "classroom.student.project_work",
    issuedBy: "AGENT_SUGGESTION",
    parameters: {
      studentId: "fixture-student-01",
      classId: "class-05",
      projectToStudentDisplay: true,
    },
    trustedStateContext: activeState,
  });
  assert.equal(readOnly.confirmationStatus, "NOT_REQUIRED");
  assert.equal(studentConsequence.confirmationStatus, "REQUIRED");
  assert.equal(readOnly.executionStatus, "NOT_EXECUTABLE_IN_R0");
  assert.deepEqual(validateClassroomAgentCommandCandidateR0(readOnly), []);
  assert.equal(studentConsequence.executionStatus, "NOT_EXECUTABLE_IN_R0");
  assert.equal(studentConsequence.expectedSessionState, "CLASSROOM_ACTIVE");
  assert.equal(studentConsequence.expectedSessionRevision, 7);
  assert.deepEqual(
    validateClassroomAgentCommandCandidateR0(studentConsequence, {
      trustedStateContext: activeState,
    }),
    [],
  );
});

test("每项状态型能力登记允许状态且拒绝伪造状态和过期revision", () => {
  assert.equal(
    Object.keys(allowedSessionStatesByCapability).length,
    classroomAgentStatefulCapabilityIds.length,
  );
  const candidate = createClassroomAgentCommandCandidateR0({
    commandId: "candidate:next-screen",
    capabilityId: "classroom.screen.next",
    issuedBy: "TEACHER",
    trustedStateContext: activeState,
  });
  const laterState = createClassroomAgentTrustedStateContext({
    actualSessionState: "CLASSROOM_ACTIVE",
    actualSessionRevision: 8,
  });
  assert.ok(
    validateClassroomAgentCommandCandidateR0(candidate, {
      trustedStateContext: laterState,
    }).includes("COMMAND_STALE_SESSION_REVISION"),
  );
  const forgedState = {
    ...candidate,
    expectedSessionState: "ARCHIVED",
  };
  const forgedIssues = validateClassroomAgentCommandCandidateR0(forgedState, {
    trustedStateContext: activeState,
  });
  assert.ok(forgedIssues.includes("COMMAND_EXPECTED_SESSION_STATE_NOT_ALLOWED"));
  assert.ok(forgedIssues.includes("COMMAND_EXPECTED_ACTUAL_STATE_MISMATCH"));
});

test("validator拒绝L2确认门篡改", () => {
  const issues = validateClassroomAgentCommandCandidateR0({
    commandId: "tampered:l2",
    capabilityId: "classroom.student.project_work",
    issuedBy: "AGENT_SUGGESTION",
    parameters: {
      studentId: "student-01",
      classId: "class-05",
      projectToStudentDisplay: true,
    },
    expectedSessionState: "CLASSROOM_ACTIVE",
    expectedSessionRevision: 7,
    resolvedRiskLevel: "L2",
    confirmationStatus: "NOT_REQUIRED",
    executionStatus: "NOT_EXECUTABLE_IN_R0",
    r0NonExecutionReason: "CONTRACT_REGISTRATION_ONLY",
  }, { trustedStateContext: activeState });
  assert.ok(issues.includes("COMMAND_CONFIRMATION_POLICY_MISMATCH"));
});

test("validator拒绝空命令、非法签发者、缺失状态和错误参数", () => {
  const issues = validateClassroomAgentCommandCandidateR0({
    commandId: " ",
    capabilityId: "classroom.screen.open",
    issuedBy: "MODEL",
    parameters: { unexpected: true },
    resolvedRiskLevel: "L1",
    confirmationStatus: "NOT_REQUIRED",
    executionStatus: "NOT_EXECUTABLE_IN_R0",
    r0NonExecutionReason: "CONTRACT_REGISTRATION_ONLY",
  });
  for (const expected of [
    "COMMAND_ID_REQUIRED",
    "COMMAND_ISSUER_INVALID",
    "COMMAND_PARAMETER_REQUIRED:bindingId",
    "COMMAND_PARAMETER_UNDECLARED:unexpected",
    "COMMAND_EXPECTED_SESSION_STATE_REQUIRED",
  ])
    assert.ok(issues.includes(expected), expected);
});

test("每项能力都有参数合同且validator拒绝伪造执行结果", () => {
  assert.equal(
    Object.keys(classroomAgentCapabilityParameterContracts).length,
    classroomAgentCapabilityRegistry.length,
  );
  assert.equal(
    Object.keys(classroomAgentCapabilityOutputContracts).length,
    classroomAgentCapabilityRegistry.length,
  );
  const issues = validateClassroomAgentCommandCandidateR0({
      commandId: "tampered:execution",
      capabilityId: "classroom.screen.next",
      issuedBy: "TEACHER",
      parameters: {},
      expectedSessionState: "CLASSROOM_ACTIVE",
      expectedSessionRevision: 7,
      resolvedRiskLevel: "L1",
      confirmationStatus: "NOT_REQUIRED",
      executionStatus: "EXECUTED",
      r0NonExecutionReason: "CONTRACT_REGISTRATION_ONLY",
    }, { trustedStateContext: activeState });
  assert.ok(issues.includes("R0_COMMAND_EXECUTION_FORBIDDEN"));
});

test("R1默认信息架构未改且没有新增课堂助手页面", async () => {
  const surface = await read("app/shell-v1/classroom/classroom-surface.tsx");
  const assistant = await read(
    "app/shell-v1/classroom/teacher-work-assistant-review.tsx",
  );
  assert.ok(surface.includes("TeacherWorkAssistantNavigation"));
  for (const label of ["课前准备", "当前课堂", "课堂记录"])
    assert.ok(assistant.includes(label), label);
  assert.ok(!surface.includes("ClassroomAgentAssistantPage"));
});
