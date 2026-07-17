import type { ClassroomQuickMark } from "../classroom-evidence/lightweight-evidence-triage.ts";
import {
  classroomAssistantJourneyStates,
  type ClassroomAssistantJourneyState,
} from "./teacher-work-assistant.ts";

export const classroomAgentCapabilityStatuses = [
  "AVAILABLE_FIXTURE",
  "FIXTURE_ONLY",
  "PLANNED",
  "HOLD",
] as const;

export type ClassroomAgentCapabilityStatus =
  (typeof classroomAgentCapabilityStatuses)[number];

export const classroomAgentRiskLevels = ["L0", "L1", "L2", "L3"] as const;

export type ClassroomAgentRiskLevel =
  (typeof classroomAgentRiskLevels)[number];

export const classroomAgentCapabilityCategories = [
  "CLASSROOM_CONTROL",
  "INFORMATION_RETRIEVAL",
  "STUDENT_SUPPORT",
  "ASSESSMENT",
  "NOTE_CAPTURE",
  "SESSION_SUMMARY",
] as const;

export type ClassroomAgentCapabilityCategory =
  (typeof classroomAgentCapabilityCategories)[number];

export type ClassroomAgentSupportedSurface =
  | "PRE_CLASS_PREPARATION"
  | "CURRENT_CLASSROOM"
  | "CLASSROOM_RECORD";

export type ClassroomAgentCandidateProducer =
  | "NONE"
  | "WEB_APP"
  | "DETERMINISTIC_FIXTURE"
  | "CLOUD_AGENT";

export type ClassroomAgentExecutionOwner =
  | "NONE"
  | "EXISTING_WEB_FIXTURE"
  | "LOCAL_CLASSROOM_RUNTIME"
  | "REVIEW_ROOM"
  | "HOLD";

export type ClassroomAgentDestinationSurface =
  | ClassroomAgentSupportedSurface
  | "REVIEW_ROOM"
  | "NONE";

export type ClassroomAgentR0Executor = "NONE" | "EXISTING_WEB_FIXTURE";

export type ClassroomAgentConfirmationPolicy =
  | "NONE_READ_ONLY"
  | "VISIBLE_FEEDBACK_AND_EVENT_LOG"
  | "EXPLICIT_TEACHER_CONFIRMATION"
  | "PROHIBITED_IN_R0";

export const classroomAgentProductLine = Object.freeze({
  productLineName: "小教·课堂助手",
  internalDomainName: "ClassroomAgentAssistant",
  unifiedFrontAgent: "小教智能体",
  identity: "UNIFIED_AGENT_CLASSROOM_CAPABILITY_MODE" as const,
  isIndependentFrontAgent: false,
  primaryInformationArchitecture: [
    "课前准备",
    "当前课堂",
    "课堂记录",
  ] as const,
  r0RuntimeEffect: "NONE_CONTRACT_AND_FIXTURE_REGISTRATION_ONLY" as const,
});

export const classroomAgentRiskContracts: Readonly<
  Record<
    ClassroomAgentRiskLevel,
    {
      title: string;
      requiresConfirmation: boolean;
      confirmationPolicy: ClassroomAgentConfirmationPolicy;
      r0Execution: "NON_EXECUTABLE";
    }
  >
> = Object.freeze({
  L0: {
    title: "只读信息",
    requiresConfirmation: false,
    confirmationPolicy: "NONE_READ_ONLY",
    r0Execution: "NON_EXECUTABLE",
  },
  L1: {
    title: "低风险、可逆操作",
    requiresConfirmation: false,
    confirmationPolicy: "VISIBLE_FEEDBACK_AND_EVENT_LOG",
    r0Execution: "NON_EXECUTABLE",
  },
  L2: {
    title: "涉及学生个体或产生课堂后果",
    requiresConfirmation: true,
    confirmationPolicy: "EXPLICIT_TEACHER_CONFIRMATION",
    r0Execution: "NON_EXECUTABLE",
  },
  L3: {
    title: "正式写回或不可逆操作",
    requiresConfirmation: true,
    confirmationPolicy: "PROHIBITED_IN_R0",
    r0Execution: "NON_EXECUTABLE",
  },
});

export interface ClassroomAgentCapabilityDefinition {
  capabilityId: string;
  title: string;
  description: string;
  category: ClassroomAgentCapabilityCategory;
  status: ClassroomAgentCapabilityStatus;
  /** The maximum risk used by the R0 permission gate. */
  riskLevel: ClassroomAgentRiskLevel;
  /** Preserves task-package cases whose risk changes with student scope. */
  conditionalRiskLevels?: readonly ClassroomAgentRiskLevel[];
  supportedSurfaces: readonly ClassroomAgentSupportedSurface[];
  prerequisites: readonly string[];
  requiresConfirmation: boolean;
  executionOwner: ClassroomAgentExecutionOwner;
  r0Executor: ClassroomAgentR0Executor;
}

const defineCapability = <const T extends ClassroomAgentCapabilityDefinition>(
  definition: T,
) => Object.freeze(definition);

export const classroomAgentCapabilityRegistry = [
  defineCapability({
    capabilityId: "classroom.screen.next",
    title: "下一屏",
    description: "在 M1 Web fixture 中切换到下一张已绑定大屏；真实运行时仍未接入。",
    category: "CLASSROOM_CONTROL",
    status: "FIXTURE_ONLY",
    riskLevel: "L1",
    supportedSurfaces: ["CURRENT_CLASSROOM"],
    prerequisites: ["FixtureClassroomState", "ClassroomWebFixtureAdapter", "FixtureEventLog"],
    requiresConfirmation: false,
    executionOwner: "EXISTING_WEB_FIXTURE",
    r0Executor: "EXISTING_WEB_FIXTURE",
  }),
  defineCapability({
    capabilityId: "classroom.screen.previous",
    title: "上一屏",
    description: "在 M1 Web fixture 中切换到上一张已绑定大屏；真实运行时仍未接入。",
    category: "CLASSROOM_CONTROL",
    status: "FIXTURE_ONLY",
    riskLevel: "L1",
    supportedSurfaces: ["CURRENT_CLASSROOM"],
    prerequisites: ["FixtureClassroomState", "ClassroomWebFixtureAdapter", "FixtureEventLog"],
    requiresConfirmation: false,
    executionOwner: "EXISTING_WEB_FIXTURE",
    r0Executor: "EXISTING_WEB_FIXTURE",
  }),
  defineCapability({
    capabilityId: "classroom.screen.open",
    title: "打开指定大屏",
    description: "在 M1 Web fixture 中打开当前课包中的指定 Binding 大屏；真实运行时仍未接入。",
    category: "CLASSROOM_CONTROL",
    status: "FIXTURE_ONLY",
    riskLevel: "L1",
    supportedSurfaces: ["CURRENT_CLASSROOM"],
    prerequisites: ["FixtureClassroomState", "ClassroomWebFixtureAdapter", "FixtureEventLog"],
    requiresConfirmation: false,
    executionOwner: "EXISTING_WEB_FIXTURE",
    r0Executor: "EXISTING_WEB_FIXTURE",
  }),
  defineCapability({
    capabilityId: "classroom.episode.next",
    title: "进入下一环节",
    description: "生成进入下一教学环节的候选命令，由教师确认后执行。",
    category: "CLASSROOM_CONTROL",
    status: "PLANNED",
    riskLevel: "L2",
    supportedSurfaces: ["CURRENT_CLASSROOM"],
    prerequisites: [
      "ClassroomSession",
      "ClassroomCommand",
      "ConfirmationGate",
      "AuditLog",
    ],
    requiresConfirmation: true,
    executionOwner: "LOCAL_CLASSROOM_RUNTIME",
    r0Executor: "NONE",
  }),
  defineCapability({
    capabilityId: "classroom.timer.start",
    title: "启动计时或倒计时",
    description: "在 M1 Web fixture 中启动正计时或倒计时。",
    category: "CLASSROOM_CONTROL",
    status: "FIXTURE_ONLY",
    riskLevel: "L1",
    supportedSurfaces: ["CURRENT_CLASSROOM"],
    prerequisites: ["FixtureClassroomState", "ClassroomWebFixtureAdapter", "FixtureEventLog"],
    requiresConfirmation: false,
    executionOwner: "EXISTING_WEB_FIXTURE",
    r0Executor: "EXISTING_WEB_FIXTURE",
  }),
  defineCapability({
    capabilityId: "classroom.timer.pause",
    title: "暂停课堂计时",
    description: "暂停 M1 Web fixture 中当前可见计时。",
    category: "CLASSROOM_CONTROL",
    status: "FIXTURE_ONLY",
    riskLevel: "L1",
    supportedSurfaces: ["CURRENT_CLASSROOM"],
    prerequisites: ["FixtureClassroomState", "ClassroomWebFixtureAdapter", "FixtureEventLog"],
    requiresConfirmation: false,
    executionOwner: "EXISTING_WEB_FIXTURE",
    r0Executor: "EXISTING_WEB_FIXTURE",
  }),
  defineCapability({
    capabilityId: "classroom.timer.reset",
    title: "重置课堂计时",
    description: "重置 M1 Web fixture 中当前可见计时。",
    category: "CLASSROOM_CONTROL",
    status: "FIXTURE_ONLY",
    riskLevel: "L1",
    supportedSurfaces: ["CURRENT_CLASSROOM"],
    prerequisites: ["FixtureClassroomState", "ClassroomWebFixtureAdapter", "FixtureEventLog"],
    requiresConfirmation: false,
    executionOwner: "EXISTING_WEB_FIXTURE",
    r0Executor: "EXISTING_WEB_FIXTURE",
  }),
  defineCapability({
    capabilityId: "classroom.display.blackout",
    title: "黑屏或恢复",
    description: "在 M1 Web fixture 中切换黑屏展示状态。",
    category: "CLASSROOM_CONTROL",
    status: "FIXTURE_ONLY",
    riskLevel: "L1",
    supportedSurfaces: ["CURRENT_CLASSROOM"],
    prerequisites: ["FixtureClassroomState", "ClassroomWebFixtureAdapter", "FixtureEventLog"],
    requiresConfirmation: false,
    executionOwner: "EXISTING_WEB_FIXTURE",
    r0Executor: "EXISTING_WEB_FIXTURE",
  }),
  defineCapability({
    capabilityId: "classroom.display.spotlight",
    title: "聚光灯",
    description: "在 M1 Web fixture 中突出当前展示区域。",
    category: "CLASSROOM_CONTROL",
    status: "FIXTURE_ONLY",
    riskLevel: "L1",
    supportedSurfaces: ["CURRENT_CLASSROOM"],
    prerequisites: ["FixtureClassroomState", "ClassroomWebFixtureAdapter", "FixtureEventLog"],
    requiresConfirmation: false,
    executionOwner: "EXISTING_WEB_FIXTURE",
    r0Executor: "EXISTING_WEB_FIXTURE",
  }),
  defineCapability({
    capabilityId: "classroom.display.fullscreen",
    title: "全屏展示",
    description: "请求本地课堂运行时进入或退出全屏展示。",
    category: "CLASSROOM_CONTROL",
    status: "PLANNED",
    riskLevel: "L1",
    supportedSurfaces: ["CURRENT_CLASSROOM"],
    prerequisites: ["ClassroomSession", "CapabilityAdapter", "AuditLog"],
    requiresConfirmation: false,
    executionOwner: "LOCAL_CLASSROOM_RUNTIME",
    r0Executor: "NONE",
  }),
  defineCapability({
    capabilityId: "classroom.info.lesson_context",
    title: "查看本课上下文",
    description: "读取本课目标、流程、材料和来源。",
    category: "INFORMATION_RETRIEVAL",
    status: "PLANNED",
    riskLevel: "L0",
    supportedSurfaces: ["PRE_CLASS_PREPARATION", "CURRENT_CLASSROOM"],
    prerequisites: ["ClassroomSession", "CapabilityAdapter"],
    requiresConfirmation: false,
    executionOwner: "LOCAL_CLASSROOM_RUNTIME",
    r0Executor: "NONE",
  }),
  defineCapability({
    capabilityId: "classroom.info.current_state",
    title: "查看当前课堂状态",
    description: "读取当前环节、屏幕、计时和进度。",
    category: "INFORMATION_RETRIEVAL",
    status: "PLANNED",
    riskLevel: "L0",
    supportedSurfaces: ["CURRENT_CLASSROOM"],
    prerequisites: ["ClassroomSession", "CapabilityAdapter"],
    requiresConfirmation: false,
    executionOwner: "LOCAL_CLASSROOM_RUNTIME",
    r0Executor: "NONE",
  }),
  defineCapability({
    capabilityId: "classroom.info.student_record",
    title: "打开指定学生课堂记录",
    description: "只读调取指定学生记录；涉及可识别学生时按 L2 门控。",
    category: "INFORMATION_RETRIEVAL",
    status: "PLANNED",
    riskLevel: "L2",
    conditionalRiskLevels: ["L0", "L2"],
    supportedSurfaces: ["CURRENT_CLASSROOM", "CLASSROOM_RECORD"],
    prerequisites: [
      "ClassroomSession",
      "StudentScopePolicy",
      "ConfirmationGate",
      "AuditLog",
    ],
    requiresConfirmation: true,
    executionOwner: "LOCAL_CLASSROOM_RUNTIME",
    r0Executor: "NONE",
  }),
  defineCapability({
    capabilityId: "classroom.info.student_evidence",
    title: "调取指定学生课堂证据",
    description: "只读调取指定学生当前课堂证据；涉及可识别学生时按 L2 门控。",
    category: "INFORMATION_RETRIEVAL",
    status: "PLANNED",
    riskLevel: "L2",
    conditionalRiskLevels: ["L0", "L2"],
    supportedSurfaces: ["CURRENT_CLASSROOM", "CLASSROOM_RECORD"],
    prerequisites: [
      "ClassroomSession",
      "StudentScopePolicy",
      "ConfirmationGate",
      "AuditLog",
    ],
    requiresConfirmation: true,
    executionOwner: "LOCAL_CLASSROOM_RUNTIME",
    r0Executor: "NONE",
  }),
  defineCapability({
    capabilityId: "classroom.info.previous_class_note",
    title: "调取上一班确认提醒",
    description: "只读查看由教师决定派生的上一班提醒。",
    category: "INFORMATION_RETRIEVAL",
    status: "PLANNED",
    riskLevel: "L0",
    supportedSurfaces: ["PRE_CLASS_PREPARATION"],
    prerequisites: ["ClassroomSession", "CapabilityAdapter"],
    requiresConfirmation: false,
    executionOwner: "LOCAL_CLASSROOM_RUNTIME",
    r0Executor: "NONE",
  }),
  defineCapability({
    capabilityId: "classroom.student.mark_help",
    title: "标记学生需要帮助",
    description: "创建一条可撤销的课堂帮助标记。",
    category: "STUDENT_SUPPORT",
    status: "PLANNED",
    riskLevel: "L1",
    supportedSurfaces: ["CURRENT_CLASSROOM"],
    prerequisites: ["ClassroomSession", "ClassroomEvent", "AuditLog"],
    requiresConfirmation: false,
    executionOwner: "LOCAL_CLASSROOM_RUNTIME",
    r0Executor: "NONE",
  }),
  defineCapability({
    capabilityId: "classroom.student.open_response",
    title: "打开学生回答或作品",
    description: "只读打开教师当前有权查看的学生回答或作品。",
    category: "STUDENT_SUPPORT",
    status: "PLANNED",
    riskLevel: "L0",
    supportedSurfaces: ["CURRENT_CLASSROOM"],
    prerequisites: ["ClassroomSession", "StudentScopePolicy"],
    requiresConfirmation: false,
    executionOwner: "LOCAL_CLASSROOM_RUNTIME",
    r0Executor: "NONE",
  }),
  defineCapability({
    capabilityId: "classroom.student.project_work",
    title: "投屏指定学生作品",
    description: "生成投屏学生作品的候选命令，必须由教师确认。",
    category: "STUDENT_SUPPORT",
    status: "PLANNED",
    riskLevel: "L2",
    supportedSurfaces: ["CURRENT_CLASSROOM"],
    prerequisites: [
      "ClassroomSession",
      "StudentScopePolicy",
      "ConfirmationGate",
      "AuditLog",
    ],
    requiresConfirmation: true,
    executionOwner: "LOCAL_CLASSROOM_RUNTIME",
    r0Executor: "NONE",
  }),
  defineCapability({
    capabilityId: "classroom.student.quick_feedback",
    title: "记录一次快速反馈",
    description: "生成面向学生的快速反馈候选，不形成正式评价。",
    category: "STUDENT_SUPPORT",
    status: "PLANNED",
    riskLevel: "L2",
    supportedSurfaces: ["CURRENT_CLASSROOM"],
    prerequisites: [
      "ClassroomSession",
      "ConfirmationGate",
      "ClassroomEvent",
      "AuditLog",
    ],
    requiresConfirmation: true,
    executionOwner: "LOCAL_CLASSROOM_RUNTIME",
    r0Executor: "NONE",
  }),
  defineCapability({
    capabilityId: "classroom.student.random_select",
    title: "随机点名",
    description: "从当前课堂授权范围生成一次可见的随机选择。",
    category: "STUDENT_SUPPORT",
    status: "FIXTURE_ONLY",
    riskLevel: "L1",
    supportedSurfaces: ["CURRENT_CLASSROOM"],
    prerequisites: ["FixtureClassroomState", "ClassroomWebFixtureAdapter", "FixtureEventLog"],
    requiresConfirmation: false,
    executionOwner: "EXISTING_WEB_FIXTURE",
    r0Executor: "EXISTING_WEB_FIXTURE",
  }),
  defineCapability({
    capabilityId: "classroom.reminder.dismiss",
    title: "关闭小教提醒",
    description: "关闭当前 M1 fixture 小教提醒，不改变课堂事实。",
    category: "CLASSROOM_CONTROL",
    status: "FIXTURE_ONLY",
    riskLevel: "L1",
    supportedSurfaces: ["CURRENT_CLASSROOM"],
    prerequisites: ["FixtureClassroomState", "ClassroomWebFixtureAdapter", "FixtureEventLog"],
    requiresConfirmation: false,
    executionOwner: "EXISTING_WEB_FIXTURE",
    r0Executor: "EXISTING_WEB_FIXTURE",
  }),
  defineCapability({
    capabilityId: "classroom.reminder.defer",
    title: "稍后提醒",
    description: "将当前 M1 fixture 小教提醒标记为稍后再看。",
    category: "CLASSROOM_CONTROL",
    status: "FIXTURE_ONLY",
    riskLevel: "L1",
    supportedSurfaces: ["CURRENT_CLASSROOM"],
    prerequisites: ["FixtureClassroomState", "ClassroomWebFixtureAdapter", "FixtureEventLog"],
    requiresConfirmation: false,
    executionOwner: "EXISTING_WEB_FIXTURE",
    r0Executor: "EXISTING_WEB_FIXTURE",
  }),
  defineCapability({
    capabilityId: "classroom.assessment.open_student",
    title: "打开学生评价记录",
    description: "只读打开学生评价记录，不自动生成评价。",
    category: "ASSESSMENT",
    status: "PLANNED",
    riskLevel: "L0",
    supportedSurfaces: ["CURRENT_CLASSROOM", "CLASSROOM_RECORD"],
    prerequisites: ["StudentScopePolicy", "CapabilityAdapter"],
    requiresConfirmation: false,
    executionOwner: "REVIEW_ROOM",
    r0Executor: "NONE",
  }),
  defineCapability({
    capabilityId: "classroom.assessment.open_batch",
    title: "打开当前批次作业",
    description: "只读打开当前课堂关联的作业批次。",
    category: "ASSESSMENT",
    status: "PLANNED",
    riskLevel: "L0",
    supportedSurfaces: ["CURRENT_CLASSROOM", "CLASSROOM_RECORD"],
    prerequisites: ["CapabilityAdapter"],
    requiresConfirmation: false,
    executionOwner: "REVIEW_ROOM",
    r0Executor: "NONE",
  }),
  defineCapability({
    capabilityId: "classroom.assessment.start_review",
    title: "进入作业批阅流程",
    description: "生成进入批阅工作流的候选命令，不自动批阅。",
    category: "ASSESSMENT",
    status: "PLANNED",
    riskLevel: "L2",
    supportedSurfaces: ["CURRENT_CLASSROOM", "CLASSROOM_RECORD"],
    prerequisites: ["ConfirmationGate", "ReviewRoomRouting", "AuditLog"],
    requiresConfirmation: true,
    executionOwner: "REVIEW_ROOM",
    r0Executor: "NONE",
  }),
  defineCapability({
    capabilityId: "classroom.assessment.suggest_feedback",
    title: "生成反馈候选",
    description: "生成供教师检查的反馈候选，不形成正式反馈。",
    category: "ASSESSMENT",
    status: "PLANNED",
    riskLevel: "L2",
    supportedSurfaces: ["CURRENT_CLASSROOM", "CLASSROOM_RECORD"],
    prerequisites: ["ConfirmationGate", "ModelGovernance", "AuditLog"],
    requiresConfirmation: true,
    executionOwner: "NONE",
    r0Executor: "NONE",
  }),
  defineCapability({
    capabilityId: "classroom.assessment.confirm_feedback",
    title: "确认正式反馈",
    description: "确认正式反馈属于 L3 写回，本阶段保持禁止。",
    category: "ASSESSMENT",
    status: "HOLD",
    riskLevel: "L3",
    supportedSurfaces: ["CLASSROOM_RECORD"],
    prerequisites: ["FormalWritebackAuthorization", "AuditLog"],
    requiresConfirmation: true,
    executionOwner: "HOLD",
    r0Executor: "NONE",
  }),
  defineCapability({
    capabilityId: "classroom.note.capture",
    title: "课堂随手记",
    description: "快速接住课堂事实并绑定当前位置；它只是课堂助手能力之一。",
    category: "NOTE_CAPTURE",
    status: "AVAILABLE_FIXTURE",
    riskLevel: "L1",
    supportedSurfaces: ["CURRENT_CLASSROOM"],
    prerequisites: ["R1FixtureJourney", "ActiveClassroomPosition"],
    requiresConfirmation: false,
    executionOwner: "LOCAL_CLASSROOM_RUNTIME",
    r0Executor: "EXISTING_WEB_FIXTURE",
  }),
  defineCapability({
    capabilityId: "classroom.note.voice_capture",
    title: "语音随手记",
    description: "登记未来语音转文字随手记，R0 不接入语音 SDK。",
    category: "NOTE_CAPTURE",
    status: "PLANNED",
    riskLevel: "L1",
    supportedSurfaces: ["CURRENT_CLASSROOM"],
    prerequisites: ["ClassroomSession", "SpeechInputGovernance", "AuditLog"],
    requiresConfirmation: false,
    executionOwner: "LOCAL_CLASSROOM_RUNTIME",
    r0Executor: "NONE",
  }),
  defineCapability({
    capabilityId: "classroom.note.link_student",
    title: "随手记关联学生",
    description: "登记把课堂事实关联到指定学生的未来能力。",
    category: "NOTE_CAPTURE",
    status: "PLANNED",
    riskLevel: "L2",
    supportedSurfaces: ["CURRENT_CLASSROOM"],
    prerequisites: [
      "ClassroomSession",
      "StudentScopePolicy",
      "ConfirmationGate",
      "AuditLog",
    ],
    requiresConfirmation: true,
    executionOwner: "LOCAL_CLASSROOM_RUNTIME",
    r0Executor: "NONE",
  }),
  defineCapability({
    capabilityId: "classroom.note.link_episode",
    title: "随手记关联课堂环节",
    description: "登记由 Runtime 把记录关联到稳定 Episode 的未来能力。",
    category: "NOTE_CAPTURE",
    status: "PLANNED",
    riskLevel: "L1",
    supportedSurfaces: ["CURRENT_CLASSROOM"],
    prerequisites: ["ClassroomSession", "ClassroomEvent", "AuditLog"],
    requiresConfirmation: false,
    executionOwner: "LOCAL_CLASSROOM_RUNTIME",
    r0Executor: "NONE",
  }),
  defineCapability({
    capabilityId: "classroom.summary.fact_view",
    title: "查看课堂事实摘要",
    description: "查看现有 fixture 事实摘要，不生成教师评价。",
    category: "SESSION_SUMMARY",
    status: "AVAILABLE_FIXTURE",
    riskLevel: "L0",
    supportedSurfaces: ["CURRENT_CLASSROOM", "CLASSROOM_RECORD"],
    prerequisites: ["R1FixtureJourney"],
    requiresConfirmation: false,
    executionOwner: "EXISTING_WEB_FIXTURE",
    r0Executor: "EXISTING_WEB_FIXTURE",
  }),
  defineCapability({
    capabilityId: "classroom.summary.context_question",
    title: "回答现实情境问题",
    description: "由教师回答一个现实情境问题，系统不替教师解释课堂。",
    category: "SESSION_SUMMARY",
    status: "AVAILABLE_FIXTURE",
    riskLevel: "L1",
    supportedSurfaces: ["CURRENT_CLASSROOM"],
    prerequisites: [
      "R1FixtureJourney",
      "FirstPassAssessment",
      "ContextQuestionReady",
    ],
    requiresConfirmation: false,
    executionOwner: "EXISTING_WEB_FIXTURE",
    r0Executor: "EXISTING_WEB_FIXTURE",
  }),
  defineCapability({
    capabilityId: "classroom.summary.suggest_next_action",
    title: "生成下一班建议候选",
    description: "根据教师情境回答生成建议候选，不自动修改课包。",
    category: "SESSION_SUMMARY",
    status: "AVAILABLE_FIXTURE",
    riskLevel: "L1",
    supportedSurfaces: ["CURRENT_CLASSROOM", "PRE_CLASS_PREPARATION"],
    prerequisites: ["R1FixtureJourney", "TeacherResponse"],
    requiresConfirmation: false,
    executionOwner: "EXISTING_WEB_FIXTURE",
    r0Executor: "EXISTING_WEB_FIXTURE",
  }),
  defineCapability({
    capabilityId: "classroom.summary.accept_next_class_trial",
    title: "确认下一班试用",
    description:
      "由教师确认采纳建议并记录下一班试用决定；它与建议候选生成保持分离。",
    category: "SESSION_SUMMARY",
    status: "AVAILABLE_FIXTURE",
    riskLevel: "L2",
    supportedSurfaces: ["CURRENT_CLASSROOM", "PRE_CLASS_PREPARATION"],
    prerequisites: ["R1FixtureJourney", "TeacherResponse", "Recommendation"],
    requiresConfirmation: true,
    executionOwner: "EXISTING_WEB_FIXTURE",
    r0Executor: "EXISTING_WEB_FIXTURE",
  }),
  defineCapability({
    capabilityId: "classroom.summary.save_record",
    title: "保存课堂记录",
    description: "现有页面只保存本次前端 fixture 记录，刷新即重置。",
    category: "SESSION_SUMMARY",
    status: "FIXTURE_ONLY",
    riskLevel: "L2",
    supportedSurfaces: ["CURRENT_CLASSROOM", "CLASSROOM_RECORD"],
    prerequisites: ["R1FixtureJourney", "TeacherDecision"],
    requiresConfirmation: true,
    executionOwner: "LOCAL_CLASSROOM_RUNTIME",
    r0Executor: "EXISTING_WEB_FIXTURE",
  }),
  defineCapability({
    capabilityId: "classroom.summary.writeback_prep",
    title: "回流备课室",
    description: "正式回流备课室属于 L3 写回，本阶段保持禁止。",
    category: "SESSION_SUMMARY",
    status: "HOLD",
    riskLevel: "L3",
    supportedSurfaces: ["CLASSROOM_RECORD", "PRE_CLASS_PREPARATION"],
    prerequisites: ["FormalWritebackAuthorization", "AuditLog"],
    requiresConfirmation: true,
    executionOwner: "HOLD",
    r0Executor: "NONE",
  }),
] as const satisfies readonly ClassroomAgentCapabilityDefinition[];

export type ClassroomAgentCapabilityId =
  (typeof classroomAgentCapabilityRegistry)[number]["capabilityId"];

export interface ClassroomAgentCapabilityRoutingContract {
  candidateProducer: ClassroomAgentCandidateProducer;
  executionOwner: ClassroomAgentExecutionOwner;
  destinationSurface: ClassroomAgentDestinationSurface;
}

const candidateProducerOverrides: Partial<
  Record<ClassroomAgentCapabilityId, ClassroomAgentCandidateProducer>
> = {
  "classroom.assessment.suggest_feedback": "CLOUD_AGENT",
};

const destinationSurfaceOverrides: Partial<
  Record<ClassroomAgentCapabilityId, ClassroomAgentDestinationSurface>
> = {
  "classroom.assessment.open_student": "REVIEW_ROOM",
  "classroom.assessment.open_batch": "REVIEW_ROOM",
  "classroom.assessment.start_review": "REVIEW_ROOM",
  "classroom.assessment.suggest_feedback": "REVIEW_ROOM",
  "classroom.assessment.confirm_feedback": "REVIEW_ROOM",
};

export const classroomAgentCapabilityRoutingContracts = Object.freeze(
  Object.fromEntries(
    classroomAgentCapabilityRegistry.map((capability) => [
      capability.capabilityId,
      Object.freeze({
        candidateProducer:
          candidateProducerOverrides[capability.capabilityId] ??
          (capability.status === "HOLD"
            ? "NONE"
            : ["AVAILABLE_FIXTURE", "FIXTURE_ONLY"].includes(capability.status)
              ? "DETERMINISTIC_FIXTURE"
              : "WEB_APP"),
        executionOwner: capability.executionOwner,
        destinationSurface:
          destinationSurfaceOverrides[capability.capabilityId] ??
          capability.supportedSurfaces[0] ??
          "NONE",
      }),
    ]),
  ) as Readonly<
    Record<ClassroomAgentCapabilityId, ClassroomAgentCapabilityRoutingContract>
  >,
);

export type ClassroomAgentParameterValueType =
  | "string"
  | "number"
  | "boolean";

export interface ClassroomAgentParameterFieldContract {
  valueType: ClassroomAgentParameterValueType;
  required: boolean;
  nonEmpty?: boolean;
  minimum?: number;
  allowedValues?: readonly unknown[];
}

export interface ClassroomAgentCapabilityParameterContract {
  allowAdditional: false;
  fields: Readonly<Record<string, ClassroomAgentParameterFieldContract>>;
}

const parameterContractOverrides: Partial<
  Record<ClassroomAgentCapabilityId, ClassroomAgentCapabilityParameterContract>
> = {
  "classroom.screen.open": {
    allowAdditional: false,
    fields: {
      bindingId: { valueType: "string", required: true, nonEmpty: true },
    },
  },
  "classroom.episode.next": {
    allowAdditional: false,
    fields: {
      episodeId: { valueType: "string", required: false, nonEmpty: true },
    },
  },
  "classroom.timer.start": {
    allowAdditional: false,
    fields: {
      mode: {
        valueType: "string",
        required: true,
        allowedValues: ["COUNT_UP", "COUNT_DOWN"],
      },
      durationSeconds: {
        valueType: "number",
        required: false,
        minimum: 1,
      },
    },
  },
  "classroom.reminder.dismiss": {
    allowAdditional: false,
    fields: {
      reminderId: { valueType: "string", required: true, nonEmpty: true },
    },
  },
  "classroom.reminder.defer": {
    allowAdditional: false,
    fields: {
      reminderId: { valueType: "string", required: true, nonEmpty: true },
    },
  },
  "classroom.display.blackout": {
    allowAdditional: false,
    fields: {
      enabled: { valueType: "boolean", required: true },
    },
  },
  "classroom.display.spotlight": {
    allowAdditional: false,
    fields: {
      enabled: { valueType: "boolean", required: true },
    },
  },
  "classroom.display.fullscreen": {
    allowAdditional: false,
    fields: {
      enabled: { valueType: "boolean", required: true },
    },
  },
  "classroom.info.student_record": {
    allowAdditional: false,
    fields: {
      studentId: { valueType: "string", required: true, nonEmpty: true },
      classId: { valueType: "string", required: true, nonEmpty: true },
      accessMode: {
        valueType: "string",
        required: true,
        allowedValues: ["READ_ONLY"],
      },
      studentIdentifiability: {
        valueType: "string",
        required: true,
        allowedValues: ["PSEUDONYMIZED", "IDENTIFIABLE"],
      },
    },
  },
  "classroom.info.student_evidence": {
    allowAdditional: false,
    fields: {
      studentId: { valueType: "string", required: true, nonEmpty: true },
      classId: { valueType: "string", required: true, nonEmpty: true },
      accessMode: {
        valueType: "string",
        required: true,
        allowedValues: ["READ_ONLY"],
      },
      studentIdentifiability: {
        valueType: "string",
        required: true,
        allowedValues: ["PSEUDONYMIZED", "IDENTIFIABLE"],
      },
    },
  },
  "classroom.student.mark_help": {
    allowAdditional: false,
    fields: {
      studentId: { valueType: "string", required: true, nonEmpty: true },
    },
  },
  "classroom.student.open_response": {
    allowAdditional: false,
    fields: {
      studentId: { valueType: "string", required: true, nonEmpty: true },
      responseId: { valueType: "string", required: true, nonEmpty: true },
    },
  },
  "classroom.student.project_work": {
    allowAdditional: false,
    fields: {
      studentId: { valueType: "string", required: true, nonEmpty: true },
      classId: { valueType: "string", required: true, nonEmpty: true },
      projectToStudentDisplay: {
        valueType: "boolean",
        required: true,
        allowedValues: [true],
      },
    },
  },
  "classroom.student.quick_feedback": {
    allowAdditional: false,
    fields: {
      studentId: { valueType: "string", required: true, nonEmpty: true },
      feedbackText: { valueType: "string", required: true, nonEmpty: true },
    },
  },
  "classroom.assessment.open_student": {
    allowAdditional: false,
    fields: {
      studentId: { valueType: "string", required: true, nonEmpty: true },
    },
  },
  "classroom.assessment.open_batch": {
    allowAdditional: false,
    fields: {
      batchId: { valueType: "string", required: true, nonEmpty: true },
    },
  },
  "classroom.assessment.start_review": {
    allowAdditional: false,
    fields: {
      batchId: { valueType: "string", required: true, nonEmpty: true },
    },
  },
  "classroom.assessment.suggest_feedback": {
    allowAdditional: false,
    fields: {
      evidenceRef: { valueType: "string", required: true, nonEmpty: true },
    },
  },
  "classroom.assessment.confirm_feedback": {
    allowAdditional: false,
    fields: {
      feedbackId: { valueType: "string", required: true, nonEmpty: true },
      formalWriteback: {
        valueType: "boolean",
        required: true,
        allowedValues: [true],
      },
    },
  },
  "classroom.note.capture": {
    allowAdditional: false,
    fields: {
      quickMark: {
        valueType: "string",
        required: true,
        allowedValues: [
          "NOT_UNDERSTOOD",
          "TIME_SHORT",
          "MATERIAL_ISSUE",
          "EFFECTIVE",
          "LATER",
        ],
      },
      note: { valueType: "string", required: false, nonEmpty: true },
    },
  },
  "classroom.note.voice_capture": {
    allowAdditional: false,
    fields: {
      transcript: { valueType: "string", required: true, nonEmpty: true },
    },
  },
  "classroom.note.link_student": {
    allowAdditional: false,
    fields: {
      studentId: { valueType: "string", required: true, nonEmpty: true },
    },
  },
  "classroom.note.link_episode": {
    allowAdditional: false,
    fields: {
      episodeId: { valueType: "string", required: true, nonEmpty: true },
    },
  },
  "classroom.summary.context_question": {
    allowAdditional: false,
    fields: {
      choice: { valueType: "string", required: true, nonEmpty: true },
      contextNote: { valueType: "string", required: false, nonEmpty: true },
    },
  },
  "classroom.summary.suggest_next_action": {
    allowAdditional: false,
    fields: {
      responseId: { valueType: "string", required: true, nonEmpty: true },
    },
  },
  "classroom.summary.accept_next_class_trial": {
    allowAdditional: false,
    fields: {
      recommendationId: { valueType: "string", required: true, nonEmpty: true },
      action: {
        valueType: "string",
        required: true,
        allowedValues: ["NEXT_CLASS_TRIAL"],
      },
    },
  },
  "classroom.summary.save_record": {
    allowAdditional: false,
    fields: {
      decisionId: { valueType: "string", required: true, nonEmpty: true },
    },
  },
  "classroom.summary.writeback_prep": {
    allowAdditional: false,
    fields: {
      recordId: { valueType: "string", required: true, nonEmpty: true },
      formalWriteback: {
        valueType: "boolean",
        required: true,
        allowedValues: [true],
      },
    },
  },
};

const emptyParameterContract: ClassroomAgentCapabilityParameterContract =
  Object.freeze({ allowAdditional: false, fields: Object.freeze({}) });

export const classroomAgentCapabilityParameterContracts = Object.freeze(
  Object.fromEntries(
    classroomAgentCapabilityRegistry.map((capability) => [
      capability.capabilityId,
      parameterContractOverrides[capability.capabilityId] ??
        emptyParameterContract,
    ]),
  ) as Readonly<
    Record<
      ClassroomAgentCapabilityId,
      ClassroomAgentCapabilityParameterContract
    >
  >,
);

export interface ClassroomAgentCapabilityOutputContract {
  produces: readonly string[];
  idFields: readonly string[];
  r0Effect: "FIXTURE_OBJECT_ONLY" | "NONE_CONTRACT_ONLY";
}

const outputContractOverrides: Partial<
  Record<ClassroomAgentCapabilityId, ClassroomAgentCapabilityOutputContract>
> = {
  "classroom.summary.context_question": {
    produces: ["TeacherResponse"],
    idFields: ["responseId"],
    r0Effect: "FIXTURE_OBJECT_ONLY",
  },
  "classroom.summary.suggest_next_action": {
    produces: ["ActionRecommendation"],
    idFields: ["recommendationId"],
    r0Effect: "FIXTURE_OBJECT_ONLY",
  },
  "classroom.summary.accept_next_class_trial": {
    produces: ["TeacherDecision"],
    idFields: ["decisionId"],
    r0Effect: "FIXTURE_OBJECT_ONLY",
  },
};

const emptyOutputContract: ClassroomAgentCapabilityOutputContract =
  Object.freeze({
    produces: Object.freeze([]),
    idFields: Object.freeze([]),
    r0Effect: "NONE_CONTRACT_ONLY",
  });

export const classroomAgentCapabilityOutputContracts = Object.freeze(
  Object.fromEntries(
    classroomAgentCapabilityRegistry.map((capability) => [
      capability.capabilityId,
      Object.freeze(
        outputContractOverrides[capability.capabilityId] ?? emptyOutputContract,
      ),
    ]),
  ) as Readonly<
    Record<ClassroomAgentCapabilityId, ClassroomAgentCapabilityOutputContract>
  >,
);

export const classroomAgentStatefulCapabilityIds = [
  "classroom.screen.next",
  "classroom.screen.previous",
  "classroom.screen.open",
  "classroom.episode.next",
  "classroom.timer.start",
  "classroom.timer.pause",
  "classroom.timer.reset",
  "classroom.display.blackout",
  "classroom.display.spotlight",
  "classroom.display.fullscreen",
  "classroom.student.mark_help",
  "classroom.student.project_work",
  "classroom.student.quick_feedback",
  "classroom.student.random_select",
  "classroom.reminder.dismiss",
  "classroom.reminder.defer",
  "classroom.assessment.start_review",
  "classroom.note.capture",
  "classroom.note.voice_capture",
  "classroom.note.link_student",
  "classroom.note.link_episode",
  "classroom.summary.context_question",
  "classroom.summary.suggest_next_action",
  "classroom.summary.accept_next_class_trial",
  "classroom.summary.save_record",
] as const satisfies readonly ClassroomAgentCapabilityId[];

export type ClassroomAgentStatefulCapabilityId =
  (typeof classroomAgentStatefulCapabilityIds)[number];

export const allowedSessionStatesByCapability = Object.freeze({
  "classroom.screen.next": ["CLASSROOM_ACTIVE"],
  "classroom.screen.previous": ["CLASSROOM_ACTIVE"],
  "classroom.screen.open": ["CLASSROOM_ACTIVE"],
  "classroom.episode.next": ["CLASSROOM_ACTIVE"],
  "classroom.timer.start": ["CLASSROOM_ACTIVE"],
  "classroom.timer.pause": ["CLASSROOM_ACTIVE"],
  "classroom.timer.reset": ["CLASSROOM_ACTIVE"],
  "classroom.display.blackout": ["CLASSROOM_ACTIVE"],
  "classroom.display.spotlight": ["CLASSROOM_ACTIVE"],
  "classroom.display.fullscreen": ["CLASSROOM_ACTIVE"],
  "classroom.student.mark_help": ["CLASSROOM_ACTIVE"],
  "classroom.student.project_work": ["CLASSROOM_ACTIVE"],
  "classroom.student.quick_feedback": ["CLASSROOM_ACTIVE"],
  "classroom.student.random_select": ["CLASSROOM_ACTIVE"],
  "classroom.reminder.dismiss": ["CLASSROOM_ACTIVE"],
  "classroom.reminder.defer": ["CLASSROOM_ACTIVE"],
  "classroom.assessment.start_review": [
    "CLASSROOM_ACTIVE",
    "CLASSROOM_CLOSING",
  ],
  "classroom.note.capture": ["CLASSROOM_ACTIVE"],
  "classroom.note.voice_capture": ["CLASSROOM_ACTIVE"],
  "classroom.note.link_student": ["CLASSROOM_ACTIVE"],
  "classroom.note.link_episode": ["CLASSROOM_ACTIVE"],
  "classroom.summary.context_question": ["AWAITING_TEACHER_JUDGMENT"],
  "classroom.summary.suggest_next_action": ["AWAITING_TEACHER_JUDGMENT"],
  "classroom.summary.accept_next_class_trial": ["RECOMMENDATION_READY"],
  "classroom.summary.save_record": [
    "TEACHER_DECISION_RECORDED",
    "NEXT_OCCURRENCE_PREPARATION",
  ],
} as const satisfies Readonly<
  Record<
    ClassroomAgentStatefulCapabilityId,
    readonly ClassroomAssistantJourneyState[]
  >
>);

const classroomAgentStatefulCapabilitySet = new Set<string>(
  classroomAgentStatefulCapabilityIds,
);

const classroomAssistantJourneyStateSet = new Set<string>(
  classroomAssistantJourneyStates,
);

export interface ClassroomAgentTeacherScope {
  authorizedClassIds: readonly string[];
  canAccessIdentifiableStudentData: boolean;
  canProjectStudentWork: boolean;
}

export interface ClassroomAgentRiskResolution {
  riskLevel: ClassroomAgentRiskLevel;
  requiresConfirmation: boolean;
  reasons: readonly string[];
}

const riskRank: Readonly<Record<ClassroomAgentRiskLevel, number>> = {
  L0: 0,
  L1: 1,
  L2: 2,
  L3: 3,
};

function higherRisk(
  left: ClassroomAgentRiskLevel,
  right: ClassroomAgentRiskLevel,
): ClassroomAgentRiskLevel {
  return riskRank[left] >= riskRank[right] ? left : right;
}

export function resolveCapabilityRisk(
  capabilityId: ClassroomAgentCapabilityId,
  parameters: Readonly<Record<string, unknown>>,
  teacherScope: ClassroomAgentTeacherScope,
  sessionState?: string,
): Readonly<ClassroomAgentRiskResolution> {
  const capability = getClassroomAgentCapability(capabilityId);
  let riskLevel = capability.riskLevel;
  const reasons = [`REGISTERED_BASELINE:${capability.riskLevel}`];

  if (
    ["classroom.info.student_record", "classroom.info.student_evidence"].includes(
      capabilityId,
    )
  ) {
    const classId = parameters.classId;
    const readOnly = parameters.accessMode === "READ_ONLY";
    const identifiable = parameters.studentIdentifiability === "IDENTIFIABLE";
    const authorizedClass =
      typeof classId === "string" && teacherScope.authorizedClassIds.includes(classId);
    const identifiableAllowed =
      !identifiable || teacherScope.canAccessIdentifiableStudentData;
    if (authorizedClass && readOnly && identifiableAllowed) {
      riskLevel = "L0";
      reasons.push("AUTHORIZED_CLASS_READ_ONLY");
    } else {
      riskLevel = "L2";
      reasons.push("STUDENT_SCOPE_REQUIRES_CONFIRMATION");
    }
  }

  if (parameters.projectToStudentDisplay === true) {
    riskLevel = higherRisk(riskLevel, "L2");
    reasons.push(
      teacherScope.canProjectStudentWork
        ? "STUDENT_DISPLAY_CONSEQUENCE"
        : "STUDENT_DISPLAY_SCOPE_NOT_PREAUTHORIZED",
    );
  }
  if (parameters.formalWriteback === true) {
    riskLevel = "L3";
    reasons.push("FORMAL_WRITEBACK_PROHIBITED_IN_R0");
  }
  if (sessionState)
    reasons.push(`EXPECTED_SESSION_STATE:${sessionState}`);

  return Object.freeze({
    riskLevel,
    requiresConfirmation:
      classroomAgentRiskContracts[riskLevel].requiresConfirmation,
    reasons: Object.freeze(reasons),
  });
}

export const existingClassroomFixtureCapabilityBindings = Object.freeze({
  "classroom.screen.next": {
    sourceContract: "ClassroomWebFixtureAdapter.nextScreen",
    runtimeEffect: "EXISTING_FRONTEND_FIXTURE_ONLY",
  },
  "classroom.screen.previous": {
    sourceContract: "ClassroomWebFixtureAdapter.previousScreen",
    runtimeEffect: "EXISTING_FRONTEND_FIXTURE_ONLY",
  },
  "classroom.screen.open": {
    sourceContract: "ClassroomWebFixtureAdapter.openBinding",
    runtimeEffect: "EXISTING_FRONTEND_FIXTURE_ONLY",
  },
  "classroom.timer.start": {
    sourceContract: "ClassroomWebFixtureAdapter.startTimer/startCountdown",
    runtimeEffect: "EXISTING_FRONTEND_FIXTURE_ONLY",
  },
  "classroom.timer.pause": {
    sourceContract: "ClassroomWebFixtureAdapter.pauseTimer",
    runtimeEffect: "EXISTING_FRONTEND_FIXTURE_ONLY",
  },
  "classroom.timer.reset": {
    sourceContract: "ClassroomWebFixtureAdapter.resetTimer",
    runtimeEffect: "EXISTING_FRONTEND_FIXTURE_ONLY",
  },
  "classroom.display.blackout": {
    sourceContract: "ClassroomWebFixtureAdapter.toggleBlackout",
    runtimeEffect: "EXISTING_FRONTEND_FIXTURE_ONLY",
  },
  "classroom.display.spotlight": {
    sourceContract: "ClassroomWebFixtureAdapter.toggleSpotlight",
    runtimeEffect: "EXISTING_FRONTEND_FIXTURE_ONLY",
  },
  "classroom.student.random_select": {
    sourceContract: "ClassroomWebFixtureAdapter.randomSelectStudent",
    runtimeEffect: "EXISTING_FRONTEND_FIXTURE_ONLY",
  },
  "classroom.reminder.dismiss": {
    sourceContract: "ClassroomWebFixtureAdapter.dismissXiaojiaoReminder",
    runtimeEffect: "EXISTING_FRONTEND_FIXTURE_ONLY",
  },
  "classroom.reminder.defer": {
    sourceContract: "ClassroomWebFixtureAdapter.deferXiaojiaoReminder",
    runtimeEffect: "EXISTING_FRONTEND_FIXTURE_ONLY",
  },
  "classroom.note.capture": {
    sourceContract: "createAssistantQuickMark",
    runtimeEffect: "EXISTING_FRONTEND_FIXTURE_ONLY",
  },
  "classroom.summary.fact_view": {
    sourceContract: "FirstPassAssessment + teacher-work-assistant review",
    runtimeEffect: "EXISTING_FRONTEND_FIXTURE_ONLY",
  },
  "classroom.summary.context_question": {
    sourceContract: "TeacherProfessionalContextResponse",
    runtimeEffect: "EXISTING_FRONTEND_FIXTURE_ONLY",
  },
  "classroom.summary.suggest_next_action": {
    sourceContract: "createTeacherWorkRecommendation",
    runtimeEffect: "EXISTING_FRONTEND_FIXTURE_ONLY",
  },
  "classroom.summary.accept_next_class_trial": {
    sourceContract: "createTeacherWorkDecision:NEXT_CLASS_TRIAL",
    runtimeEffect: "EXISTING_FRONTEND_FIXTURE_ONLY",
  },
  "classroom.summary.save_record": {
    sourceContract: "coordinateClassroomAssistantFixture:ARCHIVED",
    runtimeEffect: "EXISTING_FRONTEND_FIXTURE_ONLY",
  },
} as const);

export function getClassroomAgentCapability(
  capabilityId: ClassroomAgentCapabilityId,
): (typeof classroomAgentCapabilityRegistry)[number] {
  const definition = classroomAgentCapabilityRegistry.find(
    (candidate) => candidate.capabilityId === capabilityId,
  );
  if (!definition)
    throw new Error(`CLASSROOM_AGENT_CAPABILITY_NOT_REGISTERED:${capabilityId}`);
  return definition;
}

export type ClassroomNoteCaptureFixtureMapping = Readonly<{
  capabilityId: "classroom.note.capture";
  sourceContract: "createAssistantQuickMark";
  runtimeEffect: "EXISTING_FRONTEND_FIXTURE_ONLY";
  quickMark: ClassroomQuickMark;
}>;

export function mapClassroomQuickMarkToCapability(
  quickMark: ClassroomQuickMark,
): ClassroomNoteCaptureFixtureMapping {
  return Object.freeze({
    capabilityId: "classroom.note.capture",
    sourceContract: "createAssistantQuickMark",
    runtimeEffect: "EXISTING_FRONTEND_FIXTURE_ONLY",
    quickMark,
  });
}

export type ClassroomAgentCommandIssuer = "TEACHER" | "AGENT_SUGGESTION";

export type ClassroomAgentConfirmationStatus =
  | "NOT_REQUIRED"
  | "REQUIRED"
  | "CONFIRMED"
  | "REJECTED";

export interface ClassroomAgentCommandCandidate {
  commandId: string;
  capabilityId: ClassroomAgentCapabilityId;
  sessionId?: string;
  issuedBy: ClassroomAgentCommandIssuer;
  parameters: Readonly<Record<string, unknown>>;
  expectedSessionState?: ClassroomAssistantJourneyState;
  expectedSessionRevision?: number;
  resolvedRiskLevel: ClassroomAgentRiskLevel;
  confirmationStatus: ClassroomAgentConfirmationStatus;
  executionStatus: "NOT_EXECUTABLE_IN_R0";
  r0NonExecutionReason: "CONTRACT_REGISTRATION_ONLY";
}

export interface ClassroomAgentTrustedStateContext {
  trustSource: "TRUSTED_CLASSROOM_STATE_COORDINATOR";
  actualSessionState: ClassroomAssistantJourneyState;
  actualSessionRevision: number;
}

export function createClassroomAgentTrustedStateContext(input: {
  actualSessionState: ClassroomAssistantJourneyState;
  actualSessionRevision: number;
}): Readonly<ClassroomAgentTrustedStateContext> {
  if (!classroomAssistantJourneyStates.includes(input.actualSessionState))
    throw new Error("CLASSROOM_AGENT_ACTUAL_SESSION_STATE_INVALID");
  if (
    !Number.isInteger(input.actualSessionRevision) ||
    input.actualSessionRevision < 0
  )
    throw new Error("CLASSROOM_AGENT_ACTUAL_SESSION_REVISION_INVALID");
  return Object.freeze({
    trustSource: "TRUSTED_CLASSROOM_STATE_COORDINATOR",
    actualSessionState: input.actualSessionState,
    actualSessionRevision: input.actualSessionRevision,
  });
}

const restrictiveTeacherScope: ClassroomAgentTeacherScope = Object.freeze({
  authorizedClassIds: Object.freeze([]),
  canAccessIdentifiableStudentData: false,
  canProjectStudentWork: false,
});

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function validateClassroomAgentCapabilityParameters(
  capabilityId: ClassroomAgentCapabilityId,
  parameters: unknown,
): string[] {
  const issues: string[] = [];
  if (!isPlainRecord(parameters)) return ["COMMAND_PARAMETERS_NOT_OBJECT"];
  const contract = classroomAgentCapabilityParameterContracts[capabilityId];
  if (!contract) return ["COMMAND_PARAMETER_CONTRACT_MISSING"];

  for (const [fieldName, fieldContract] of Object.entries(contract.fields)) {
    const value = parameters[fieldName];
    if (fieldContract.required && value === undefined) {
      issues.push(`COMMAND_PARAMETER_REQUIRED:${fieldName}`);
      continue;
    }
    if (value === undefined) continue;
    if (typeof value !== fieldContract.valueType) {
      issues.push(`COMMAND_PARAMETER_TYPE:${fieldName}`);
      continue;
    }
    if (
      fieldContract.nonEmpty &&
      typeof value === "string" &&
      !value.trim()
    )
      issues.push(`COMMAND_PARAMETER_EMPTY:${fieldName}`);
    if (
      fieldContract.minimum !== undefined &&
      typeof value === "number" &&
      value < fieldContract.minimum
    )
      issues.push(`COMMAND_PARAMETER_MINIMUM:${fieldName}`);
    if (
      fieldContract.allowedValues &&
      !fieldContract.allowedValues.includes(value)
    )
      issues.push(`COMMAND_PARAMETER_VALUE:${fieldName}`);
  }

  for (const fieldName of Object.keys(parameters))
    if (!(fieldName in contract.fields))
      issues.push(`COMMAND_PARAMETER_UNDECLARED:${fieldName}`);
  return issues;
}

export function createClassroomAgentCommandCandidateR0(input: {
  commandId: string;
  capabilityId: ClassroomAgentCapabilityId;
  sessionId?: string;
  issuedBy: ClassroomAgentCommandIssuer;
  parameters?: Readonly<Record<string, unknown>>;
  trustedStateContext?: Readonly<ClassroomAgentTrustedStateContext>;
  teacherScope?: ClassroomAgentTeacherScope;
}): Readonly<ClassroomAgentCommandCandidate> {
  const parameters = Object.freeze({ ...(input.parameters ?? {}) });
  const stateful = classroomAgentStatefulCapabilitySet.has(input.capabilityId);
  const trustedStateContext = input.trustedStateContext;
  if (stateful && !trustedStateContext)
    throw new Error(
      "CLASSROOM_AGENT_COMMAND_CANDIDATE_INVALID:COMMAND_TRUSTED_STATE_CONTEXT_REQUIRED",
    );
  const riskResolution = resolveCapabilityRisk(
    input.capabilityId,
    parameters,
    input.teacherScope ?? restrictiveTeacherScope,
    trustedStateContext?.actualSessionState,
  );
  const candidate = Object.freeze({
    commandId: input.commandId,
    capabilityId: input.capabilityId,
    ...(input.sessionId ? { sessionId: input.sessionId } : {}),
    issuedBy: input.issuedBy,
    parameters,
    ...(trustedStateContext
      ? {
          expectedSessionState: trustedStateContext.actualSessionState,
          expectedSessionRevision: trustedStateContext.actualSessionRevision,
        }
      : {}),
    resolvedRiskLevel: riskResolution.riskLevel,
    confirmationStatus: riskResolution.requiresConfirmation
      ? "REQUIRED"
      : "NOT_REQUIRED",
    executionStatus: "NOT_EXECUTABLE_IN_R0",
    r0NonExecutionReason: "CONTRACT_REGISTRATION_ONLY",
  });
  const issues = validateClassroomAgentCommandCandidateR0(candidate, {
    teacherScope: input.teacherScope ?? restrictiveTeacherScope,
    trustedStateContext,
  });
  if (issues.length)
    throw new Error(`CLASSROOM_AGENT_COMMAND_CANDIDATE_INVALID:${issues.join("|")}`);
  return candidate;
}

export function validateClassroomAgentCapabilityRegistry(): string[] {
  const issues: string[] = [];
  const ids = new Set<string>();
  for (
    const capability of classroomAgentCapabilityRegistry as readonly ClassroomAgentCapabilityDefinition[]
  ) {
    if (ids.has(capability.capabilityId))
      issues.push(`DUPLICATE_CAPABILITY_ID:${capability.capabilityId}`);
    ids.add(capability.capabilityId);
    if (!capability.supportedSurfaces.length)
      issues.push(`MISSING_SUPPORTED_SURFACE:${capability.capabilityId}`);
    if (!capability.prerequisites.length)
      issues.push(`MISSING_PREREQUISITES:${capability.capabilityId}`);
    if (!(capability.capabilityId in classroomAgentCapabilityRoutingContracts))
      issues.push(`ROUTING_CONTRACT_MISSING:${capability.capabilityId}`);
    if (!(capability.capabilityId in classroomAgentCapabilityParameterContracts))
      issues.push(`PARAMETER_CONTRACT_MISSING:${capability.capabilityId}`);
    if (!(capability.capabilityId in classroomAgentCapabilityOutputContracts))
      issues.push(`OUTPUT_CONTRACT_MISSING:${capability.capabilityId}`);
    if (classroomAgentStatefulCapabilitySet.has(capability.capabilityId)) {
      const allowedStates = allowedSessionStatesByCapability[
        capability.capabilityId as ClassroomAgentStatefulCapabilityId
      ] as readonly ClassroomAssistantJourneyState[];
      if (!allowedStates?.length)
        issues.push(`ALLOWED_SESSION_STATES_MISSING:${capability.capabilityId}`);
      else if (
        allowedStates.some(
          (state) => !classroomAssistantJourneyStateSet.has(state),
        )
      )
        issues.push(`ALLOWED_SESSION_STATE_INVALID:${capability.capabilityId}`);
    }
    if (
      classroomAgentRiskContracts[capability.riskLevel]
        .requiresConfirmation !== capability.requiresConfirmation
    )
      issues.push(`CONFIRMATION_POLICY_MISMATCH:${capability.capabilityId}`);
    if (
      ["PLANNED", "HOLD"].includes(capability.status) &&
      capability.r0Executor !== "NONE"
    )
      issues.push(`FUTURE_CAPABILITY_HAS_R0_EXECUTOR:${capability.capabilityId}`);
    if (
      capability.riskLevel === "L3" &&
      (capability.status !== "HOLD" || capability.r0Executor !== "NONE")
    )
      issues.push(`L3_NOT_HELD:${capability.capabilityId}`);
    if (
      ["AVAILABLE_FIXTURE", "FIXTURE_ONLY"].includes(capability.status) &&
      !(capability.capabilityId in existingClassroomFixtureCapabilityBindings)
    )
      issues.push(`FIXTURE_CAPABILITY_WITHOUT_BINDING:${capability.capabilityId}`);
  }
  const quickNoteMatches = classroomAgentCapabilityRegistry.filter(
    (capability) => capability.capabilityId === "classroom.note.capture",
  );
  if (quickNoteMatches.length !== 1)
    issues.push("QUICK_NOTE_CAPABILITY_CARDINALITY_INVALID");
  if (
    quickNoteMatches[0]?.status !== "AVAILABLE_FIXTURE" ||
    quickNoteMatches[0]?.category !== "NOTE_CAPTURE"
  )
    issues.push("QUICK_NOTE_CAPABILITY_CLASSIFICATION_INVALID");
  if (classroomAgentCapabilityRegistry.length <= 1)
    issues.push("QUICK_NOTE_WRONGLY_DEFINES_WHOLE_ASSISTANT");
  if (
    classroomAgentProductLine.isIndependentFrontAgent ||
    classroomAgentProductLine.unifiedFrontAgent !== "小教智能体"
  )
    issues.push("INDEPENDENT_CLASSROOM_AGENT_IDENTITY_FORBIDDEN");
  const suggestionCapability = getClassroomAgentCapability(
    "classroom.summary.suggest_next_action",
  );
  const suggestionPrerequisites =
    suggestionCapability.prerequisites as readonly string[];
  if (
    suggestionPrerequisites.includes("TeacherDecision") ||
    !suggestionPrerequisites.includes("TeacherResponse")
  )
    issues.push("SUGGESTION_PREREQUISITE_ORDER_INVALID");
  const contextQuestionCapability = getClassroomAgentCapability(
    "classroom.summary.context_question",
  );
  const contextQuestionPrerequisites =
    contextQuestionCapability.prerequisites as readonly string[];
  const contextQuestionOutput =
    classroomAgentCapabilityOutputContracts[
      "classroom.summary.context_question"
    ];
  if (
    contextQuestionPrerequisites.includes("TeacherResponse") ||
    !contextQuestionPrerequisites.includes("FirstPassAssessment") ||
    !contextQuestionPrerequisites.includes("ContextQuestionReady") ||
    !contextQuestionOutput.produces.includes("TeacherResponse") ||
    !contextQuestionOutput.idFields.includes("responseId")
  )
    issues.push("CONTEXT_QUESTION_INPUT_OUTPUT_ORDER_INVALID");
  const acceptanceCapability = getClassroomAgentCapability(
    "classroom.summary.accept_next_class_trial",
  );
  const acceptancePrerequisites =
    acceptanceCapability.prerequisites as readonly string[];
  const acceptanceParameters =
    classroomAgentCapabilityParameterContracts[
      "classroom.summary.accept_next_class_trial"
    ];
  const acceptanceOutput =
    classroomAgentCapabilityOutputContracts[
      "classroom.summary.accept_next_class_trial"
    ];
  if (
    acceptanceCapability.riskLevel !== "L2" ||
    !acceptancePrerequisites.includes("Recommendation") ||
    !acceptancePrerequisites.includes("TeacherResponse") ||
    acceptancePrerequisites.includes("TeacherDecision") ||
    "decisionId" in acceptanceParameters.fields ||
    !acceptanceParameters.fields.recommendationId?.required ||
    !acceptanceParameters.fields.action?.allowedValues?.includes(
      "NEXT_CLASS_TRIAL",
    ) ||
    !acceptanceOutput.produces.includes("TeacherDecision") ||
    !acceptanceOutput.idFields.includes("decisionId")
  )
    issues.push("NEXT_CLASS_ACCEPTANCE_CONTRACT_INVALID");
  return issues;
}

export function validateClassroomAgentCommandCandidateR0(
  candidate: Readonly<Record<string, unknown>>,
  context: {
    teacherScope?: ClassroomAgentTeacherScope;
    trustedStateContext?: Readonly<ClassroomAgentTrustedStateContext>;
  } = {},
): string[] {
  const issues: string[] = [];
  if (typeof candidate.commandId !== "string" || !candidate.commandId.trim())
    issues.push("COMMAND_ID_REQUIRED");
  if (!(["TEACHER", "AGENT_SUGGESTION"] as const).includes(
    candidate.issuedBy as ClassroomAgentCommandIssuer,
  ))
    issues.push("COMMAND_ISSUER_INVALID");
  const capabilityId = candidate.capabilityId;
  const capability =
    typeof capabilityId === "string"
      ? classroomAgentCapabilityRegistry.find(
          (item) => item.capabilityId === capabilityId,
        )
      : undefined;
  if (
    typeof capabilityId !== "string" ||
    !capability
  )
    issues.push("COMMAND_CAPABILITY_NOT_REGISTERED");
  if (capability) {
    const parameters = isPlainRecord(candidate.parameters)
      ? candidate.parameters
      : {};
    issues.push(
      ...validateClassroomAgentCapabilityParameters(
        capability.capabilityId,
        candidate.parameters,
      ),
    );
    const stateful = classroomAgentStatefulCapabilitySet.has(
      capability.capabilityId,
    );
    if (stateful) {
      const expectedState = candidate.expectedSessionState;
      const expectedRevision = candidate.expectedSessionRevision;
      const trustedState = context.trustedStateContext;
      const allowedStates = allowedSessionStatesByCapability[
        capability.capabilityId as ClassroomAgentStatefulCapabilityId
      ] as readonly ClassroomAssistantJourneyState[];
      if (typeof expectedState !== "string" || !expectedState.trim())
        issues.push("COMMAND_EXPECTED_SESSION_STATE_REQUIRED");
      else if (!classroomAssistantJourneyStateSet.has(expectedState))
        issues.push("COMMAND_EXPECTED_SESSION_STATE_INVALID");
      else if (
        !allowedStates.includes(expectedState as ClassroomAssistantJourneyState)
      )
        issues.push("COMMAND_EXPECTED_SESSION_STATE_NOT_ALLOWED");
      if (!Number.isInteger(expectedRevision) || (expectedRevision as number) < 0)
        issues.push("COMMAND_EXPECTED_SESSION_REVISION_REQUIRED");
      if (!trustedState) {
        issues.push("COMMAND_TRUSTED_STATE_CONTEXT_REQUIRED");
      } else {
        if (
          trustedState.trustSource !==
          "TRUSTED_CLASSROOM_STATE_COORDINATOR"
        )
          issues.push("COMMAND_TRUSTED_STATE_SOURCE_INVALID");
        if (
          !classroomAssistantJourneyStateSet.has(
            trustedState.actualSessionState,
          )
        )
          issues.push("COMMAND_ACTUAL_SESSION_STATE_INVALID");
        else if (!allowedStates.includes(trustedState.actualSessionState))
          issues.push("COMMAND_ACTUAL_SESSION_STATE_NOT_ALLOWED");
        if (
          !Number.isInteger(trustedState.actualSessionRevision) ||
          trustedState.actualSessionRevision < 0
        )
          issues.push("COMMAND_ACTUAL_SESSION_REVISION_INVALID");
        if (expectedState !== trustedState.actualSessionState)
          issues.push("COMMAND_EXPECTED_ACTUAL_STATE_MISMATCH");
        if (expectedRevision !== trustedState.actualSessionRevision)
          issues.push("COMMAND_STALE_SESSION_REVISION");
      }
    }
    const riskResolution = resolveCapabilityRisk(
      capability.capabilityId,
      parameters,
      context.teacherScope ?? restrictiveTeacherScope,
      context.trustedStateContext?.actualSessionState,
    );
    if (candidate.resolvedRiskLevel !== riskResolution.riskLevel)
      issues.push("COMMAND_RESOLVED_RISK_MISMATCH");
    const confirmationStatus = candidate.confirmationStatus;
    if (
      riskResolution.requiresConfirmation
        ? !["REQUIRED", "CONFIRMED", "REJECTED"].includes(
            confirmationStatus as string,
          )
        : confirmationStatus !== "NOT_REQUIRED"
    )
      issues.push("COMMAND_CONFIRMATION_POLICY_MISMATCH");
  }
  if (candidate.executionStatus !== "NOT_EXECUTABLE_IN_R0")
    issues.push("R0_COMMAND_EXECUTION_FORBIDDEN");
  if (candidate.r0NonExecutionReason !== "CONTRACT_REGISTRATION_ONLY")
    issues.push("R0_NON_EXECUTION_REASON_MISSING");
  return issues;
}
