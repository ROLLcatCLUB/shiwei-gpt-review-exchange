export const classroomComponentHostIds = [
  "CLASSROOM_STAGE",
  "CLASSROOM_SIDECAR",
  "CLASSROOM_OVERLAY",
  "CLASSROOM_DOCK",
  "STUDENT_DISPLAY",
  "GLOBAL_AGENT_DOCK",
] as const;

export type ClassroomComponentHostId =
  (typeof classroomComponentHostIds)[number];

export const classroomComponentAudiences = [
  "TEACHER_ONLY",
  "STUDENT_ONLY",
  "SHARED_SAFE",
] as const;

export type ClassroomComponentAudience =
  (typeof classroomComponentAudiences)[number];

export type ClassroomComponentViewer = "TEACHER" | "STUDENT";

export type ClassroomComponentProjectionPolicy =
  | "HOST_LOCAL_ONLY"
  | "SAFE_STUDENT_PROJECTION_REQUIRED";

export interface ClassroomComponentTrustedViewerContext {
  trustSource: "TRUSTED_COMPONENT_HOST";
  hostId: ClassroomComponentHostId;
  viewer: ClassroomComponentViewer;
  contextRevision: number;
}

export interface SafeStudentProjection {
  projectionId: string;
  sourceComponentId: string;
  audience: "STUDENT";
  reviewStatus: "SAFE_FOR_STUDENT_DISPLAY";
  contentClass: "PUBLIC_LESSON_CONTENT";
}

export const classroomComponentTypes = [
  "DISPLAY",
  "CONTEXT",
  "OBSERVATION",
  "CONTROL",
  "NOTE_CAPTURE",
  "AGENT_INPUT",
  "AGENT_OUTPUT",
  "FEEDBACK",
] as const;

export type ClassroomComponentType =
  (typeof classroomComponentTypes)[number];

export type ClassroomComponentImplementationStatus =
  | "EXISTING_R1"
  | "EXISTING_R1_PARTIAL"
  | "IMPLEMENTED_M1_FIXTURE"
  | "CONTRACT_ONLY";

export type ClassroomComponentDataSensitivity =
  | "PUBLIC_LESSON_CONTENT"
  | "TEACHER_WORK_CONTEXT"
  | "STUDENT_AGGREGATE_FIXTURE"
  | "STUDENT_IDENTIFIABLE_FIXTURE";

export interface ClassroomComponentHostContract {
  hostId: ClassroomComponentHostId;
  title: string;
  description: string;
  allowedAudiences: readonly ClassroomComponentAudience[];
  allowedViewers: readonly ClassroomComponentViewer[];
  projectionPolicy: ClassroomComponentProjectionPolicy;
  trustedViewerContext: "REQUIRED_HOST_INJECTION";
  ownsStudentFacingPixels: boolean;
  r0RuntimeEffect: "NONE_CONTRACT_ONLY";
}

export const classroomComponentHostRegistry: readonly ClassroomComponentHostContract[] =
  Object.freeze([
    {
      hostId: "CLASSROOM_STAGE",
      title: "课堂主舞台",
      description: "教师端中央舞台；只承接本课主要展示和教师可见的安全预览。",
      allowedAudiences: ["TEACHER_ONLY", "SHARED_SAFE"],
      allowedViewers: ["TEACHER"],
      projectionPolicy: "HOST_LOCAL_ONLY",
      trustedViewerContext: "REQUIRED_HOST_INJECTION",
      ownsStudentFacingPixels: false,
      r0RuntimeEffect: "NONE_CONTRACT_ONLY",
    },
    {
      hostId: "CLASSROOM_SIDECAR",
      title: "课堂侧栏",
      description: "承接流程、学生状态和教师课堂上下文。",
      allowedAudiences: ["TEACHER_ONLY", "SHARED_SAFE"],
      allowedViewers: ["TEACHER"],
      projectionPolicy: "HOST_LOCAL_ONLY",
      trustedViewerContext: "REQUIRED_HOST_INJECTION",
      ownsStudentFacingPixels: false,
      r0RuntimeEffect: "NONE_CONTRACT_ONLY",
    },
    {
      hostId: "CLASSROOM_OVERLAY",
      title: "教师浮层",
      description: "承接随手记、轻提示和教师临时工具。",
      allowedAudiences: ["TEACHER_ONLY"],
      allowedViewers: ["TEACHER"],
      projectionPolicy: "HOST_LOCAL_ONLY",
      trustedViewerContext: "REQUIRED_HOST_INJECTION",
      ownsStudentFacingPixels: false,
      r0RuntimeEffect: "NONE_CONTRACT_ONLY",
    },
    {
      hostId: "CLASSROOM_DOCK",
      title: "课堂控制栏",
      description: "承接可逆课堂控制；真实执行仍由未来本地运行时负责。",
      allowedAudiences: ["TEACHER_ONLY"],
      allowedViewers: ["TEACHER"],
      projectionPolicy: "HOST_LOCAL_ONLY",
      trustedViewerContext: "REQUIRED_HOST_INJECTION",
      ownsStudentFacingPixels: false,
      r0RuntimeEffect: "NONE_CONTRACT_ONLY",
    },
    {
      hostId: "STUDENT_DISPLAY",
      title: "学生显示端",
      description: "只允许学生内容或完成安全投影的共享内容进入。",
      allowedAudiences: ["STUDENT_ONLY", "SHARED_SAFE"],
      allowedViewers: ["STUDENT"],
      projectionPolicy: "SAFE_STUDENT_PROJECTION_REQUIRED",
      trustedViewerContext: "REQUIRED_HOST_INJECTION",
      ownsStudentFacingPixels: true,
      r0RuntimeEffect: "NONE_CONTRACT_ONLY",
    },
    {
      hostId: "GLOBAL_AGENT_DOCK",
      title: "全局小教输入停靠层",
      description: "系统级统一小教入口；不属于某个课堂组件的私有 Agent。",
      allowedAudiences: ["TEACHER_ONLY"],
      allowedViewers: ["TEACHER"],
      projectionPolicy: "HOST_LOCAL_ONLY",
      trustedViewerContext: "REQUIRED_HOST_INJECTION",
      ownsStudentFacingPixels: false,
      r0RuntimeEffect: "NONE_CONTRACT_ONLY",
    },
  ]);

export interface ClassroomComponentDefinition {
  componentId: string;
  title: string;
  componentType: ClassroomComponentType;
  implementationStatus: ClassroomComponentImplementationStatus;
  audience: ClassroomComponentAudience;
  defaultHost: ClassroomComponentHostId;
  allowedHosts: readonly ClassroomComponentHostId[];
  dataSensitivity: ClassroomComponentDataSensitivity;
  sourceReferences: readonly string[];
  capabilityIds: readonly string[];
  degradesTo: string;
  isIndependentAgent: boolean;
  r0RuntimeEffect: "NONE_REGISTRATION_ONLY";
}

const defineComponent = <const T extends ClassroomComponentDefinition>(
  definition: T,
) => Object.freeze(definition);

/**
 * R0 inventories only components already visible in the R1 shell. It does not
 * mount hosts, move JSX, connect a student device, or introduce an executor.
 */
export const classroomComponentRegistry: readonly ClassroomComponentDefinition[] =
  Object.freeze([
  defineComponent({
    componentId: "classroom.stage.structured-screen",
    title: "结构化学生大屏",
    componentType: "DISPLAY",
    implementationStatus: "EXISTING_R1",
    audience: "SHARED_SAFE",
    defaultHost: "CLASSROOM_STAGE",
    allowedHosts: ["CLASSROOM_STAGE", "STUDENT_DISPLAY"],
    dataSensitivity: "PUBLIC_LESSON_CONTENT",
    sourceReferences: [
      "app/shell-v1/classroom/components/classroom-live-components.tsx#StructuredClassroomStage",
    ],
    capabilityIds: [
      "classroom.screen.next",
      "classroom.screen.previous",
      "classroom.screen.open",
    ],
    degradesTo: "保留结构化文字与教师提示，不伪造缺失媒体。",
    isIndependentAgent: false,
    r0RuntimeEffect: "NONE_REGISTRATION_ONLY",
  }),
  defineComponent({
    componentId: "classroom.display.image-compare",
    title: "图片对比",
    componentType: "DISPLAY",
    implementationStatus: "IMPLEMENTED_M1_FIXTURE",
    audience: "SHARED_SAFE",
    defaultHost: "CLASSROOM_STAGE",
    allowedHosts: ["CLASSROOM_STAGE", "STUDENT_DISPLAY"],
    dataSensitivity: "PUBLIC_LESSON_CONTENT",
    sourceReferences: [
      "app/shell-v1/classroom/components/internal/classroom-internal-components.tsx#ClassroomImageCompare",
    ],
    capabilityIds: [],
    degradesTo: "保留观察问题和空图占位，不伪造媒体。",
    isIndependentAgent: false,
    r0RuntimeEffect: "NONE_REGISTRATION_ONLY",
  }),
  defineComponent({
    componentId: "classroom.art.material-checklist",
    title: "材料清单",
    componentType: "CONTEXT",
    implementationStatus: "IMPLEMENTED_M1_FIXTURE",
    audience: "SHARED_SAFE",
    defaultHost: "CLASSROOM_STAGE",
    allowedHosts: ["CLASSROOM_STAGE", "CLASSROOM_SIDECAR", "STUDENT_DISPLAY"],
    dataSensitivity: "PUBLIC_LESSON_CONTENT",
    sourceReferences: [
      "app/shell-v1/classroom/components/internal/classroom-internal-components.tsx#ClassroomMaterialChecklist",
    ],
    capabilityIds: [],
    degradesTo: "显示只读材料与收纳安全清单。",
    isIndependentAgent: false,
    r0RuntimeEffect: "NONE_REGISTRATION_ONLY",
  }),
  defineComponent({
    componentId: "classroom.display.student-gallery-fixture",
    title: "匿名学生作品画廊",
    componentType: "DISPLAY",
    implementationStatus: "IMPLEMENTED_M1_FIXTURE",
    audience: "SHARED_SAFE",
    defaultHost: "CLASSROOM_STAGE",
    allowedHosts: ["CLASSROOM_STAGE", "STUDENT_DISPLAY"],
    dataSensitivity: "PUBLIC_LESSON_CONTENT",
    sourceReferences: [
      "app/shell-v1/classroom/components/internal/classroom-internal-components.tsx#ClassroomAnonymousStudentGallery",
    ],
    capabilityIds: [],
    degradesTo: "显示匿名占位与无评分声明，不显示学生身份。",
    isIndependentAgent: false,
    r0RuntimeEffect: "NONE_REGISTRATION_ONLY",
  }),
  defineComponent({
    componentId: "classroom.sidecar.lesson-flow",
    title: "课堂流程",
    componentType: "CONTEXT",
    implementationStatus: "EXISTING_R1",
    audience: "TEACHER_ONLY",
    defaultHost: "CLASSROOM_SIDECAR",
    allowedHosts: ["CLASSROOM_SIDECAR"],
    dataSensitivity: "TEACHER_WORK_CONTEXT",
    sourceReferences: [
      "app/shell-v1/classroom/components/classroom-live-components.tsx#ClassroomLessonFlow",
    ],
    capabilityIds: ["classroom.episode.next"],
    degradesTo: "显示只读环节列表，不推进课堂状态。",
    isIndependentAgent: false,
    r0RuntimeEffect: "NONE_REGISTRATION_ONLY",
  }),
  defineComponent({
    componentId: "classroom.sidecar.student-status-summary",
    title: "学生状态摘要",
    componentType: "OBSERVATION",
    implementationStatus: "EXISTING_R1",
    audience: "TEACHER_ONLY",
    defaultHost: "CLASSROOM_SIDECAR",
    allowedHosts: ["CLASSROOM_SIDECAR"],
    dataSensitivity: "STUDENT_AGGREGATE_FIXTURE",
    sourceReferences: [
      "app/shell-v1/classroom/components/classroom-live-components.tsx#ClassroomStudentStatus",
    ],
    capabilityIds: ["classroom.info.current_state"],
    degradesTo: "显示数据尚未连接，不推断学生状态。",
    isIndependentAgent: false,
    r0RuntimeEffect: "NONE_REGISTRATION_ONLY",
  }),
  defineComponent({
    componentId: "classroom.sidecar.student-detail",
    title: "学生详情抽屉",
    componentType: "OBSERVATION",
    implementationStatus: "EXISTING_R1_PARTIAL",
    audience: "TEACHER_ONLY",
    defaultHost: "CLASSROOM_SIDECAR",
    allowedHosts: ["CLASSROOM_SIDECAR", "CLASSROOM_OVERLAY"],
    dataSensitivity: "STUDENT_IDENTIFIABLE_FIXTURE",
    sourceReferences: [
      "app/shell-v1/classroom/classroom-surface.tsx#sv1-classroom-right",
    ],
    capabilityIds: ["classroom.info.student_record"],
    degradesTo: "关闭抽屉并保留聚合摘要。",
    isIndependentAgent: false,
    r0RuntimeEffect: "NONE_REGISTRATION_ONLY",
  }),
  defineComponent({
    componentId: "classroom.sidecar.recent-events",
    title: "最近课堂动态",
    componentType: "OBSERVATION",
    implementationStatus: "EXISTING_R1",
    audience: "TEACHER_ONLY",
    defaultHost: "CLASSROOM_SIDECAR",
    allowedHosts: ["CLASSROOM_SIDECAR"],
    dataSensitivity: "STUDENT_IDENTIFIABLE_FIXTURE",
    sourceReferences: [
      "app/shell-v1/classroom/components/classroom-live-components.tsx#ClassroomRecentEvents",
    ],
    capabilityIds: ["classroom.info.student_evidence"],
    degradesTo: "隐藏事件流，不用合成事件补位。",
    isIndependentAgent: false,
    r0RuntimeEffect: "NONE_REGISTRATION_ONLY",
  }),
  defineComponent({
    componentId: "xiaojiao.classroom.context-reminder",
    title: "小教提醒",
    componentType: "AGENT_OUTPUT",
    implementationStatus: "EXISTING_R1",
    audience: "TEACHER_ONLY",
    defaultHost: "CLASSROOM_SIDECAR",
    allowedHosts: ["CLASSROOM_SIDECAR"],
    dataSensitivity: "TEACHER_WORK_CONTEXT",
    sourceReferences: [
      "app/shell-v1/classroom/components/classroom-live-components.tsx#XiaojiaoClassroomReminder",
    ],
    capabilityIds: [
      "classroom.info.current_state",
      "classroom.summary.suggest_next_action",
    ],
    degradesTo: "不显示提醒；不阻断教师原有课堂控制。",
    isIndependentAgent: false,
    r0RuntimeEffect: "NONE_REGISTRATION_ONLY",
  }),
  defineComponent({
    componentId: "classroom.note.quick-capture",
    title: "课堂随手记",
    componentType: "NOTE_CAPTURE",
    implementationStatus: "EXISTING_R1",
    audience: "TEACHER_ONLY",
    defaultHost: "CLASSROOM_OVERLAY",
    allowedHosts: ["CLASSROOM_OVERLAY"],
    dataSensitivity: "TEACHER_WORK_CONTEXT",
    sourceReferences: [
      "app/shell-v1/classroom/teacher-work-assistant-review.tsx#TeacherWorkAssistantQuickMark",
    ],
    capabilityIds: ["classroom.note.capture"],
    degradesTo: "隐藏入口；已结束课堂不得继续新增标记。",
    isIndependentAgent: false,
    r0RuntimeEffect: "NONE_REGISTRATION_ONLY",
  }),
  defineComponent({
    componentId: "classroom.control.primary-dock",
    title: "课堂控制栏",
    componentType: "CONTROL",
    implementationStatus: "EXISTING_R1",
    audience: "TEACHER_ONLY",
    defaultHost: "CLASSROOM_DOCK",
    allowedHosts: ["CLASSROOM_DOCK"],
    dataSensitivity: "TEACHER_WORK_CONTEXT",
    sourceReferences: [
      "app/shell-v1/classroom/components/classroom-live-components.tsx#ClassroomPrimaryControlDock",
    ],
    capabilityIds: [
      "classroom.screen.next",
      "classroom.screen.previous",
      "classroom.timer.start",
      "classroom.display.blackout",
      "classroom.display.spotlight",
      "classroom.student.random_select",
    ],
    degradesTo: "保留只读课堂状态，不假装控制成功。",
    isIndependentAgent: false,
    r0RuntimeEffect: "NONE_REGISTRATION_ONLY",
  }),
  defineComponent({
    componentId: "classroom.overlay.action-receipt",
    title: "课堂轻提示",
    componentType: "FEEDBACK",
    implementationStatus: "EXISTING_R1",
    audience: "TEACHER_ONLY",
    defaultHost: "CLASSROOM_OVERLAY",
    allowedHosts: ["CLASSROOM_OVERLAY"],
    dataSensitivity: "TEACHER_WORK_CONTEXT",
    sourceReferences: [
      "app/shell-v1/classroom/components/feedback/classroom-action-receipt.tsx#LightweightEvidenceToast",
    ],
    capabilityIds: ["classroom.note.capture"],
    degradesTo: "操作结果写入页面状态；不依赖浮层持续存在。",
    isIndependentAgent: false,
    r0RuntimeEffect: "NONE_REGISTRATION_ONLY",
  }),
  defineComponent({
    componentId: "xiaojiao.global.input-dock",
    title: "全局小教输入栏",
    componentType: "AGENT_INPUT",
    implementationStatus: "EXISTING_R1_PARTIAL",
    audience: "TEACHER_ONLY",
    defaultHost: "GLOBAL_AGENT_DOCK",
    allowedHosts: ["GLOBAL_AGENT_DOCK"],
    dataSensitivity: "TEACHER_WORK_CONTEXT",
    sourceReferences: ["app/shell-v1/page.tsx#全局小教对话停靠层"],
    capabilityIds: [],
    degradesTo: "收起输入栏，不影响当前教室工作。",
    isIndependentAgent: false,
    r0RuntimeEffect: "NONE_REGISTRATION_ONLY",
  }),
  ]);

export interface ClassroomComponentPlacementRequest {
  componentId: string;
  hostId: ClassroomComponentHostId;
  safeStudentProjection?: Readonly<SafeStudentProjection>;
}

export interface ClassroomComponentPlacementDecision {
  allowed: boolean;
  reason:
    | "PLACEMENT_ALLOWED"
    | "COMPONENT_NOT_REGISTERED"
    | "HOST_NOT_REGISTERED"
    | "HOST_NOT_ALLOWED_BY_COMPONENT"
    | "AUDIENCE_NOT_ALLOWED_BY_HOST"
    | "AUDIENCE_NOT_VISIBLE_TO_VIEWER"
    | "TEACHER_DATA_BLOCKED_FROM_STUDENT_DISPLAY"
    | "TRUSTED_VIEWER_CONTEXT_REQUIRED"
    | "TRUSTED_VIEWER_CONTEXT_INVALID"
    | "TRUSTED_VIEWER_HOST_MISMATCH"
    | "VIEWER_NOT_ALLOWED_BY_HOST"
    | "SAFE_STUDENT_PROJECTION_REQUIRED"
    | "SAFE_STUDENT_PROJECTION_INVALID";
}

export function createClassroomComponentTrustedViewerContext(input: {
  hostId: ClassroomComponentHostId;
  viewer: ClassroomComponentViewer;
  contextRevision: number;
}): Readonly<ClassroomComponentTrustedViewerContext> {
  if (!Number.isInteger(input.contextRevision) || input.contextRevision < 0)
    throw new Error("CLASSROOM_COMPONENT_VIEWER_CONTEXT_REVISION_INVALID");
  return Object.freeze({
    trustSource: "TRUSTED_COMPONENT_HOST",
    hostId: input.hostId,
    viewer: input.viewer,
    contextRevision: input.contextRevision,
  });
}

export function createSafeStudentProjection(input: {
  projectionId: string;
  sourceComponentId: string;
}): Readonly<SafeStudentProjection> {
  if (!input.projectionId.trim() || !input.sourceComponentId.trim())
    throw new Error("SAFE_STUDENT_PROJECTION_ID_REQUIRED");
  return Object.freeze({
    projectionId: input.projectionId,
    sourceComponentId: input.sourceComponentId,
    audience: "STUDENT",
    reviewStatus: "SAFE_FOR_STUDENT_DISPLAY",
    contentClass: "PUBLIC_LESSON_CONTENT",
  });
}

export function decideClassroomComponentPlacement(
  request: ClassroomComponentPlacementRequest,
  trustedViewerContext?: Readonly<ClassroomComponentTrustedViewerContext>,
): ClassroomComponentPlacementDecision {
  const component = classroomComponentRegistry.find(
    (item) => item.componentId === request.componentId,
  );
  if (!component) {
    return { allowed: false, reason: "COMPONENT_NOT_REGISTERED" };
  }

  const host = classroomComponentHostRegistry.find(
    (item) => item.hostId === request.hostId,
  );
  if (!host) {
    return { allowed: false, reason: "HOST_NOT_REGISTERED" };
  }

  if (!trustedViewerContext)
    return { allowed: false, reason: "TRUSTED_VIEWER_CONTEXT_REQUIRED" };
  if (
    trustedViewerContext.trustSource !== "TRUSTED_COMPONENT_HOST" ||
    !Number.isInteger(trustedViewerContext.contextRevision) ||
    trustedViewerContext.contextRevision < 0
  )
    return { allowed: false, reason: "TRUSTED_VIEWER_CONTEXT_INVALID" };
  if (trustedViewerContext.hostId !== request.hostId)
    return { allowed: false, reason: "TRUSTED_VIEWER_HOST_MISMATCH" };
  if (!host.allowedViewers.includes(trustedViewerContext.viewer))
    return { allowed: false, reason: "VIEWER_NOT_ALLOWED_BY_HOST" };

  if (!component.allowedHosts.includes(request.hostId)) {
    return { allowed: false, reason: "HOST_NOT_ALLOWED_BY_COMPONENT" };
  }

  if (!host.allowedAudiences.includes(component.audience)) {
    return { allowed: false, reason: "AUDIENCE_NOT_ALLOWED_BY_HOST" };
  }

  if (
    request.hostId === "STUDENT_DISPLAY" &&
    (component.audience === "TEACHER_ONLY" ||
      component.dataSensitivity !== "PUBLIC_LESSON_CONTENT")
  ) {
    return {
      allowed: false,
      reason: "TEACHER_DATA_BLOCKED_FROM_STUDENT_DISPLAY",
    };
  }


  if (host.projectionPolicy === "SAFE_STUDENT_PROJECTION_REQUIRED") {
    const projection = request.safeStudentProjection;
    if (!projection)
      return { allowed: false, reason: "SAFE_STUDENT_PROJECTION_REQUIRED" };
    if (
      !projection.projectionId.trim() ||
      projection.sourceComponentId !== component.componentId ||
      projection.audience !== "STUDENT" ||
      projection.reviewStatus !== "SAFE_FOR_STUDENT_DISPLAY" ||
      projection.contentClass !== "PUBLIC_LESSON_CONTENT"
    )
      return { allowed: false, reason: "SAFE_STUDENT_PROJECTION_INVALID" };
  }

  const visibleToViewer =
    component.audience === "SHARED_SAFE" ||
    (component.audience === "TEACHER_ONLY" &&
      trustedViewerContext.viewer === "TEACHER") ||
    (component.audience === "STUDENT_ONLY" &&
      trustedViewerContext.viewer === "STUDENT");

  if (!visibleToViewer) {
    return { allowed: false, reason: "AUDIENCE_NOT_VISIBLE_TO_VIEWER" };
  }

  return { allowed: true, reason: "PLACEMENT_ALLOWED" };
}

export interface ClassroomComponentPlanItem {
  componentId: string;
  hostId: ClassroomComponentHostId;
  safeStudentProjection?: Readonly<SafeStudentProjection>;
}

export type ClassroomComponentTrustedViewerContexts = Readonly<
  Partial<
    Record<
      ClassroomComponentHostId,
      Readonly<ClassroomComponentTrustedViewerContext>
    >
  >
>;

export interface ClassroomComponentPlanR0 {
  status: "VALID_CONTRACT_ONLY" | "REJECTED";
  accepted: readonly ClassroomComponentPlanItem[];
  rejected: readonly (ClassroomComponentPlanItem & {
    reason: ClassroomComponentPlacementDecision["reason"];
  })[];
  runtimeEffect: "NONE";
}

/** Contract compiler only. It never renders DOM or calls a runtime executor. */
export function compileClassroomComponentPlanR0(
  items: readonly ClassroomComponentPlanItem[],
  trustedViewerContexts: ClassroomComponentTrustedViewerContexts = {},
): ClassroomComponentPlanR0 {
  const accepted: ClassroomComponentPlanItem[] = [];
  const rejected: Array<
    ClassroomComponentPlanItem & {
      reason: ClassroomComponentPlacementDecision["reason"];
    }
  > = [];

  for (const item of items) {
    const decision = decideClassroomComponentPlacement(
      item,
      trustedViewerContexts[item.hostId],
    );
    if (decision.allowed) {
      accepted.push(item);
    } else {
      rejected.push({ ...item, reason: decision.reason });
    }
  }

  return Object.freeze({
    status: rejected.length === 0 ? "VALID_CONTRACT_ONLY" : "REJECTED",
    accepted: Object.freeze(accepted),
    rejected: Object.freeze(rejected),
    runtimeEffect: "NONE",
  });
}

export function validateClassroomComponentRegistry(): readonly string[] {
  const errors: string[] = [];
  const componentIds = classroomComponentRegistry.map((item) => item.componentId);
  const hostIds = classroomComponentHostRegistry.map((item) => item.hostId);

  if (new Set(componentIds).size !== componentIds.length) {
    errors.push("COMPONENT_IDS_MUST_BE_UNIQUE");
  }
  if (new Set(hostIds).size !== hostIds.length) {
    errors.push("HOST_IDS_MUST_BE_UNIQUE");
  }

  for (const host of classroomComponentHostRegistry) {
    if (!host.allowedViewers.length)
      errors.push(`${host.hostId}:ALLOWED_VIEWERS_REQUIRED`);
    if (host.trustedViewerContext !== "REQUIRED_HOST_INJECTION")
      errors.push(`${host.hostId}:TRUSTED_VIEWER_CONTEXT_REQUIRED`);
    if (
      host.hostId === "STUDENT_DISPLAY" &&
      (host.projectionPolicy !== "SAFE_STUDENT_PROJECTION_REQUIRED" ||
        !host.allowedViewers.includes("STUDENT") ||
        host.allowedViewers.includes("TEACHER"))
    )
      errors.push("STUDENT_DISPLAY_TRUST_CONTRACT_INVALID");
  }

  for (const component of classroomComponentRegistry) {
    if (!component.componentId.trim()) {
      errors.push("COMPONENT_ID_REQUIRED");
    }
    if (!component.allowedHosts.includes(component.defaultHost)) {
      errors.push(`${component.componentId}:DEFAULT_HOST_NOT_ALLOWED`);
    }
    if (component.sourceReferences.length === 0) {
      errors.push(`${component.componentId}:SOURCE_REFERENCE_REQUIRED`);
    }
    if (component.r0RuntimeEffect !== "NONE_REGISTRATION_ONLY") {
      errors.push(`${component.componentId}:R0_RUNTIME_EFFECT_FORBIDDEN`);
    }
    for (const hostId of component.allowedHosts) {
      const host = classroomComponentHostRegistry.find(
        (item) => item.hostId === hostId,
      );
      if (!host) {
        errors.push(`${component.componentId}:UNKNOWN_HOST:${hostId}`);
      } else if (!host.allowedAudiences.includes(component.audience)) {
        errors.push(`${component.componentId}:AUDIENCE_HOST_MISMATCH:${hostId}`);
      }
    }
  }

  const reminder = classroomComponentRegistry.find(
    (item) => item.componentId === "xiaojiao.classroom.context-reminder",
  );
  if (
    !reminder ||
    reminder.componentType !== "AGENT_OUTPUT" ||
    reminder.audience !== "TEACHER_ONLY" ||
    reminder.isIndependentAgent
  ) {
    errors.push("XIAOJIAO_CONTEXT_REMINDER_IDENTITY_INVALID");
  }

  const inputDock = classroomComponentRegistry.find(
    (item) => item.componentId === "xiaojiao.global.input-dock",
  );
  if (
    !inputDock ||
    inputDock.componentType !== "AGENT_INPUT" ||
    inputDock.isIndependentAgent
  ) {
    errors.push("XIAOJIAO_GLOBAL_INPUT_IDENTITY_INVALID");
  }

  return Object.freeze(errors);
}
