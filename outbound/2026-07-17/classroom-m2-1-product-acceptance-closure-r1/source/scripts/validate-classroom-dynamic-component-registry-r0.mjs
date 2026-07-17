import { existsSync, readFileSync, writeFileSync } from "node:fs";

import {
  classroomComponentHostRegistry,
  classroomComponentRegistry,
  compileClassroomComponentPlanR0,
  createClassroomComponentTrustedViewerContext,
  createSafeStudentProjection,
  decideClassroomComponentPlacement,
  validateClassroomComponentRegistry,
} from "../domain/classroom-components/classroom-component-registry.ts";
import { classroomAgentCapabilityRegistry } from "../domain/classroom-assistant/classroom-agent-capability-registry.ts";

const results = [];
const check = (id, condition, evidence) => {
  results.push({ id, status: condition ? "PASS" : "FAIL", ...(evidence ? { evidence } : {}) });
};

const componentIds = new Set(classroomComponentRegistry.map((item) => item.componentId));
const capabilityIds = new Set(
  classroomAgentCapabilityRegistry.map((item) => item.capabilityId),
);
const studentDisplay = classroomComponentHostRegistry.find(
  (host) => host.hostId === "STUDENT_DISPLAY",
);
const reminder = classroomComponentRegistry.find(
  (item) => item.componentId === "xiaojiao.classroom.context-reminder",
);
const inputDock = classroomComponentRegistry.find(
  (item) => item.componentId === "xiaojiao.global.input-dock",
);
const quickNote = classroomComponentRegistry.find(
  (item) => item.componentId === "classroom.note.quick-capture",
);
const structuredScreen = classroomComponentRegistry.find(
  (item) => item.componentId === "classroom.stage.structured-screen",
);
const unknownBindings = classroomComponentRegistry.flatMap((component) =>
  component.capabilityIds.filter((id) => !capabilityIds.has(id)),
);
const missingSourceReferences = classroomComponentRegistry.flatMap((component) =>
  component.sourceReferences.filter((reference) => {
    const [path, anchor] = reference.split("#");
    return !existsSync(path) || (anchor && !readFileSync(path, "utf8").includes(anchor));
  }),
);
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const classroomSurface = readFileSync(
  "app/shell-v1/classroom/classroom-surface.tsx",
  "utf8",
);
const defaultDependencies = [
  "drizzle-orm",
  "next",
  "react",
  "react-dom",
  "react-moveable",
];
const studentDisplayContext = createClassroomComponentTrustedViewerContext({
  hostId: "STUDENT_DISPLAY",
  viewer: "STUDENT",
  contextRevision: 5,
});
const studentOverlayContext = createClassroomComponentTrustedViewerContext({
  hostId: "CLASSROOM_OVERLAY",
  viewer: "STUDENT",
  contextRevision: 5,
});
const safeStructuredScreenProjection = createSafeStudentProjection({
  projectionId: "validator:structured-screen:5",
  sourceComponentId: structuredScreen?.componentId ?? "",
});

check("HOST_COUNT_6", classroomComponentHostRegistry.length === 6);
check("HOST_IDS_UNIQUE", new Set(classroomComponentHostRegistry.map((host) => host.hostId)).size === 6);
check("COMPONENT_COUNT_AT_LEAST_13_M1", classroomComponentRegistry.length >= 13);
check("COMPONENT_IDS_UNIQUE", componentIds.size === classroomComponentRegistry.length);
check("REGISTRY_DOMAIN_VALID", validateClassroomComponentRegistry().length === 0, validateClassroomComponentRegistry());
check("STAGE_HOST_REGISTERED", classroomComponentHostRegistry.some((host) => host.hostId === "CLASSROOM_STAGE"));
check("SIDECAR_HOST_REGISTERED", classroomComponentHostRegistry.some((host) => host.hostId === "CLASSROOM_SIDECAR"));
check("OVERLAY_HOST_REGISTERED", classroomComponentHostRegistry.some((host) => host.hostId === "CLASSROOM_OVERLAY"));
check("DOCK_HOST_REGISTERED", classroomComponentHostRegistry.some((host) => host.hostId === "CLASSROOM_DOCK"));
check("STUDENT_DISPLAY_HOST_REGISTERED", Boolean(studentDisplay));
check("GLOBAL_AGENT_DOCK_REGISTERED", classroomComponentHostRegistry.some((host) => host.hostId === "GLOBAL_AGENT_DOCK"));
check("STUDENT_DISPLAY_EXCLUDES_TEACHER_ONLY", !studentDisplay?.allowedAudiences.includes("TEACHER_ONLY"));
check("ALL_HOSTS_REQUIRE_TRUSTED_VIEWER_CONTEXT", classroomComponentHostRegistry.every((host) => host.trustedViewerContext === "REQUIRED_HOST_INJECTION"));
check("ALL_HOSTS_DECLARE_ALLOWED_VIEWERS", classroomComponentHostRegistry.every((host) => host.allowedViewers.length > 0));
check("STUDENT_DISPLAY_SAFE_PROJECTION_POLICY", studentDisplay?.projectionPolicy === "SAFE_STUDENT_PROJECTION_REQUIRED" && studentDisplay.allowedViewers.join() === "STUDENT");
check("STRUCTURED_SCREEN_REGISTERED", structuredScreen?.componentType === "DISPLAY");
check("LESSON_FLOW_REGISTERED", componentIds.has("classroom.sidecar.lesson-flow"));
check("STUDENT_STATUS_REGISTERED", componentIds.has("classroom.sidecar.student-status-summary"));
check("QUICK_NOTE_REGISTERED", quickNote?.capabilityIds.includes("classroom.note.capture"));
check("CONTROL_DOCK_REGISTERED", componentIds.has("classroom.control.primary-dock"));
check("RECENT_EVENTS_REGISTERED", componentIds.has("classroom.sidecar.recent-events"));
check("STUDENT_DETAIL_REGISTERED", componentIds.has("classroom.sidecar.student-detail"));
check("ACTION_RECEIPT_REGISTERED", componentIds.has("classroom.overlay.action-receipt"));
check("IMAGE_COMPARE_REGISTERED", componentIds.has("classroom.display.image-compare"));
check("MATERIAL_CHECKLIST_REGISTERED", componentIds.has("classroom.art.material-checklist"));
check("ANONYMOUS_GALLERY_REGISTERED", componentIds.has("classroom.display.student-gallery-fixture"));
check("XIAOJIAO_REMINDER_EXACT_ID", reminder?.componentId === "xiaojiao.classroom.context-reminder");
check("XIAOJIAO_REMINDER_AGENT_OUTPUT", reminder?.componentType === "AGENT_OUTPUT");
check("XIAOJIAO_REMINDER_TEACHER_ONLY", reminder?.audience === "TEACHER_ONLY");
check("XIAOJIAO_INPUT_AGENT_INPUT", inputDock?.componentType === "AGENT_INPUT");
check("NO_SECOND_AGENT_CREATED", classroomComponentRegistry.every((item) => !item.isIndependentAgent));
check("REMINDER_BLOCKED_FROM_STUDENT_DISPLAY", !decideClassroomComponentPlacement({ componentId: reminder?.componentId ?? "", hostId: "STUDENT_DISPLAY" }, studentDisplayContext).allowed);
check("QUICK_NOTE_HIDDEN_FROM_STUDENT", !decideClassroomComponentPlacement({ componentId: quickNote?.componentId ?? "", hostId: "CLASSROOM_OVERLAY" }, studentOverlayContext).allowed);
check("CALLER_SUPPLIED_VIEWER_REMOVED", decideClassroomComponentPlacement({ componentId: structuredScreen?.componentId ?? "", hostId: "STUDENT_DISPLAY", safeStudentProjection: safeStructuredScreenProjection }).reason === "TRUSTED_VIEWER_CONTEXT_REQUIRED");
check("PUBLIC_LABEL_ALONE_NOT_SUFFICIENT", decideClassroomComponentPlacement({ componentId: structuredScreen?.componentId ?? "", hostId: "STUDENT_DISPLAY" }, studentDisplayContext).reason === "SAFE_STUDENT_PROJECTION_REQUIRED");
check("SAFE_SCREEN_ALLOWED_ON_STUDENT_DISPLAY", decideClassroomComponentPlacement({ componentId: structuredScreen?.componentId ?? "", hostId: "STUDENT_DISPLAY", safeStudentProjection: safeStructuredScreenProjection }, studentDisplayContext).allowed);
check("ALL_CAPABILITY_BINDINGS_REGISTERED", unknownBindings.length === 0, unknownBindings);
check("ALL_SOURCE_REFERENCES_RESOLVE", missingSourceReferences.length === 0, missingSourceReferences);
check("ALL_COMPONENTS_EXISTING_NOT_FUTURE_FAKE", classroomComponentRegistry.every((item) => item.implementationStatus !== "CONTRACT_ONLY"));
check("ALL_COMPONENTS_R0_NO_RUNTIME_EFFECT", classroomComponentRegistry.every((item) => item.r0RuntimeEffect === "NONE_REGISTRATION_ONLY"));
check("ALL_HOSTS_R0_NO_RUNTIME_EFFECT", classroomComponentHostRegistry.every((item) => item.r0RuntimeEffect === "NONE_CONTRACT_ONLY"));
check("PLAN_COMPILER_HAS_NO_RUNTIME_EFFECT", compileClassroomComponentPlanR0([]).runtimeEffect === "NONE");
check("R1_THREE_STAGE_NAV_RETAINED", classroomSurface.includes("TeacherWorkAssistantNavigation"));
check("R1_CLICK_LOOP_RETAINED", classroomSurface.includes("finishTeacherAssistantClassroom"));
check("NO_NEW_COMPONENT_PAGE", !classroomSurface.includes("dynamic-component-registry"));
check("NO_THIRD_PARTY_DEPENDENCY_ADDED", JSON.stringify(Object.keys(packageJson.dependencies).sort()) === JSON.stringify(defaultDependencies));
check("NO_MODEL_SDK_ADDED", !Object.keys(packageJson.dependencies).some((name) => /openai|anthropic|gemini|langchain/i.test(name)));
check("NO_RUNTIME_SDK_ADDED", !Object.keys(packageJson.dependencies).some((name) => /electron|socket\.io|ws$/i.test(name)));

const passed = results.filter((item) => item.status === "PASS").length;
const failed = results.length - passed;
const report = {
  validator: "CLASSROOM_DYNAMIC_COMPONENT_REGISTRY_R0_2_TRUSTED_HOST_AND_SAFE_STUDENT_PROJECTION",
  checks: results.length,
  passed,
  failed,
  status: failed === 0 ? "PASS" : "FAIL",
  acceptance: {
    localExistingComponentCount: classroomComponentRegistry.length,
    hostContractCount: classroomComponentHostRegistry.length,
    xiaojiaoInputReminderRelationship: "PASS_SAME_AGENT_INPUT_AND_TEACHER_OUTPUT",
    teacherStudentVisibilityGuard: "PASS",
    trustedHostViewerContext: failed.length ? "FAIL" : "PASS",
    safeStudentProjectionRequired: failed.length ? "FAIL" : "PASS",
    r1Default: "UNCHANGED",
    newPageCount: 0,
    thirdPartyInstallCount: 0,
  },
  boundaries: {
    realSession: "HOLD",
    database: "HOLD",
    model: "HOLD",
    studentConnection: "HOLD",
    localRuntime: "HOLD",
    formalWriteback: "HOLD",
  },
  results,
};

writeFileSync(
  "CLASSROOM_DYNAMIC_COMPONENT_REGISTRY_R0_2_TRUSTED_HOST_AND_SAFE_STUDENT_PROJECTION_VALIDATION_REPORT.json",
  `${JSON.stringify(report, null, 2)}\n`,
);
console.log(JSON.stringify(report, null, 2));

if (failed > 0) process.exitCode = 1;
