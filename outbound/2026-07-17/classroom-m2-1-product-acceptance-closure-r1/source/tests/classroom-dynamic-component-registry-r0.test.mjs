import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

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

const studentDisplayContext = createClassroomComponentTrustedViewerContext({
  hostId: "STUDENT_DISPLAY",
  viewer: "STUDENT",
  contextRevision: 3,
});
const studentOverlayContext = createClassroomComponentTrustedViewerContext({
  hostId: "CLASSROOM_OVERLAY",
  viewer: "STUDENT",
  contextRevision: 3,
});
const safeStructuredScreenProjection = createSafeStudentProjection({
  projectionId: "projection:structured-screen:3",
  sourceComponentId: "classroom.stage.structured-screen",
});

test("六个动态课堂容器合同完整且R0不产生运行时效果", () => {
  assert.equal(classroomComponentHostRegistry.length, 6);
  assert.deepEqual(
    classroomComponentHostRegistry.map((host) => host.hostId),
    [
      "CLASSROOM_STAGE",
      "CLASSROOM_SIDECAR",
      "CLASSROOM_OVERLAY",
      "CLASSROOM_DOCK",
      "STUDENT_DISPLAY",
      "GLOBAL_AGENT_DOCK",
    ],
  );
  assert.ok(
    classroomComponentHostRegistry.every(
      (host) => host.r0RuntimeEffect === "NONE_CONTRACT_ONLY",
    ),
  );
  assert.ok(
    classroomComponentHostRegistry.every(
      (host) =>
        host.allowedViewers.length > 0 &&
        host.trustedViewerContext === "REQUIRED_HOST_INJECTION",
    ),
  );
});

test("现有R1课堂组件全部登记且没有新增独立Agent", () => {
  assert.ok(classroomComponentRegistry.length >= 13);
  assert.ok(
    classroomComponentRegistry.every(
      (component) => component.implementationStatus !== "CONTRACT_ONLY",
    ),
  );
  assert.ok(classroomComponentRegistry.every((component) => !component.isIndependentAgent));
  assert.deepEqual(validateClassroomComponentRegistry(), []);
});

test("M1 三个内部组件已登记且保持安全学生投影合同", () => {
  for (const componentId of [
    "classroom.display.image-compare",
    "classroom.art.material-checklist",
    "classroom.display.student-gallery-fixture",
  ]) {
    const component = classroomComponentRegistry.find(
      (item) => item.componentId === componentId,
    );
    assert.equal(component?.implementationStatus, "IMPLEMENTED_M1_FIXTURE");
    assert.equal(component?.audience, "SHARED_SAFE");
    assert.ok(component?.allowedHosts.includes("STUDENT_DISPLAY"));
  }
});

test("小教输入和小教提醒属于同一Agent的输入与课堂输出组件", () => {
  const input = classroomComponentRegistry.find(
    (component) => component.componentId === "xiaojiao.global.input-dock",
  );
  const reminder = classroomComponentRegistry.find(
    (component) => component.componentId === "xiaojiao.classroom.context-reminder",
  );

  assert.equal(input?.componentType, "AGENT_INPUT");
  assert.equal(input?.defaultHost, "GLOBAL_AGENT_DOCK");
  assert.equal(reminder?.componentType, "AGENT_OUTPUT");
  assert.equal(reminder?.audience, "TEACHER_ONLY");
  assert.equal(reminder?.defaultHost, "CLASSROOM_SIDECAR");
  assert.equal(input?.isIndependentAgent, false);
  assert.equal(reminder?.isIndependentAgent, false);
});

test("学生显示端拒绝小教提醒和可识别学生信息", () => {
  const reminderDecision = decideClassroomComponentPlacement({
    componentId: "xiaojiao.classroom.context-reminder",
    hostId: "STUDENT_DISPLAY",
  }, studentDisplayContext);
  const eventDecision = decideClassroomComponentPlacement({
    componentId: "classroom.sidecar.recent-events",
    hostId: "STUDENT_DISPLAY",
  }, studentDisplayContext);

  assert.equal(reminderDecision.allowed, false);
  assert.equal(eventDecision.allowed, false);
});

test("学生显示端必须接收安全投影对象而不是只看公开内容标签", () => {
  assert.deepEqual(
    decideClassroomComponentPlacement(
      {
        componentId: "classroom.stage.structured-screen",
        hostId: "STUDENT_DISPLAY",
      },
      studentDisplayContext,
    ),
    { allowed: false, reason: "SAFE_STUDENT_PROJECTION_REQUIRED" },
  );
  assert.deepEqual(
    decideClassroomComponentPlacement(
      {
        componentId: "classroom.stage.structured-screen",
        hostId: "STUDENT_DISPLAY",
        safeStudentProjection: safeStructuredScreenProjection,
      },
      studentDisplayContext,
    ),
    { allowed: true, reason: "PLACEMENT_ALLOWED" },
  );
});

test("普通PlacementRequest不能自行声明viewer", () => {
  assert.deepEqual(
    decideClassroomComponentPlacement({
      componentId: "classroom.stage.structured-screen",
      hostId: "STUDENT_DISPLAY",
      safeStudentProjection: safeStructuredScreenProjection,
    }),
    { allowed: false, reason: "TRUSTED_VIEWER_CONTEXT_REQUIRED" },
  );
});

test("教师专属组件对学生viewer不可见", () => {
  assert.deepEqual(
    decideClassroomComponentPlacement(
      {
        componentId: "classroom.note.quick-capture",
        hostId: "CLASSROOM_OVERLAY",
      },
      studentOverlayContext,
    ),
    { allowed: false, reason: "VIEWER_NOT_ALLOWED_BY_HOST" },
  );
});

test("R0组件计划编译器只判定合同而不渲染或执行", () => {
  const plan = compileClassroomComponentPlanR0([
    {
      componentId: "classroom.stage.structured-screen",
      hostId: "STUDENT_DISPLAY",
      safeStudentProjection: safeStructuredScreenProjection,
    },
    {
      componentId: "xiaojiao.classroom.context-reminder",
      hostId: "STUDENT_DISPLAY",
    },
  ], { STUDENT_DISPLAY: studentDisplayContext });

  assert.equal(plan.status, "REJECTED");
  assert.equal(plan.accepted.length, 1);
  assert.equal(plan.rejected.length, 1);
  assert.equal(plan.runtimeEffect, "NONE");
});

test("所有能力映射都指向已注册的课堂助手能力", () => {
  const knownCapabilities = new Set(
    classroomAgentCapabilityRegistry.map((capability) => capability.capabilityId),
  );
  const unknownBindings = classroomComponentRegistry.flatMap((component) =>
    component.capabilityIds
      .filter((capabilityId) => !knownCapabilities.has(capabilityId))
      .map((capabilityId) => `${component.componentId}:${capabilityId}`),
  );
  assert.deepEqual(unknownBindings, []);
});

test("每个现有组件的源码引用都能在本地找到锚点", () => {
  for (const component of classroomComponentRegistry) {
    for (const sourceReference of component.sourceReferences) {
      const [path, anchor] = sourceReference.split("#");
      assert.equal(existsSync(path), true, `${component.componentId}: ${path}`);
      if (anchor) {
        assert.ok(
          readFileSync(path, "utf8").includes(anchor),
          `${component.componentId}: missing anchor ${anchor}`,
        );
      }
    }
  }
});

test("R0组件登记没有增加第三方运行时依赖", () => {
  const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
  assert.deepEqual(Object.keys(packageJson.dependencies).sort(), [
    "drizzle-orm",
    "next",
    "react",
    "react-dom",
    "react-moveable",
  ]);
});
