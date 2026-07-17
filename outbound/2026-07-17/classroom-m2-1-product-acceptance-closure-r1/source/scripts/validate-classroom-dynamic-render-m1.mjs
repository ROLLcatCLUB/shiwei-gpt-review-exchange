import { readFileSync } from "node:fs";

import { colorGradientClassroomPackage } from "../app/shell-v1/classroom/classroom-preview-fixture.ts";
import { compileClassroomComponentPlan } from "../app/shell-v1/classroom/composition/classroom-component-plan.ts";
import { colorGradientClassroomCompositionBlueprint } from "../app/shell-v1/classroom/composition/color-gradient-classroom-composition-blueprint.ts";
import { classroomContextReminderRegistry } from "../app/shell-v1/classroom/composition/classroom-context-reminder-registry.ts";
import {
  createClassroomWebFixtureAdapter,
  createInitialClassroomFixtureToolState,
} from "../app/shell-v1/classroom/adapters/classroom-web-fixture-adapter.ts";
import {
  classroomComponentHostRegistry,
  classroomComponentRegistry,
} from "../domain/classroom-components/classroom-component-registry.ts";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const checks = [];
const check = (label, condition) => checks.push({ label, condition: Boolean(condition) });
const bindingIds = colorGradientClassroomPackage.presentationSequence.map(
  (item) => item.bindingId,
);

const profiles = [];
const plans = [];
for (const episode of colorGradientClassroomPackage.episodes) {
  const binding = colorGradientClassroomPackage.screenBindings.find(
    (item) => item.episodeId === episode.episodeId,
  );
  const plan = compileClassroomComponentPlan({
    classroomPackage: colorGradientClassroomPackage,
    blueprint: colorGradientClassroomCompositionBlueprint,
    currentBindingId: binding.bindingId,
    currentEpisode: episode,
    mode: "LIVE",
    fixtureStateRevision: 3,
  });
  profiles.push(plan.profileId);
  plans.push(plan);
}

check("真实课堂包包含7个Episode", colorGradientClassroomPackage.episodes.length === 7);
check("Episode形成5种组件组合", new Set(profiles).size === 5);
check("E01-E03为观察比较", profiles.slice(0, 3).every((item) => item === "OBSERVATION_COMPARE"));
check("E04为教师示范", profiles[3] === "TEACHER_DEMONSTRATION");
check("E05为学生实践", profiles[4] === "STUDENT_PRACTICE");
check("E06为展示评价", profiles[5] === "SHOWCASE_EVALUATION");
check("E07为收纳结束", profiles[6] === "CLEANUP_AND_CLOSE");
check("全部计划由外置蓝图与Binding游标生成", plans.every((plan) => plan.source === "LESSON_PACKAGE_BLUEPRINT_BINDING_CURSOR"));
check("全部计划使用色彩渐变外置蓝图", plans.every((plan) => plan.blueprintId === colorGradientClassroomCompositionBlueprint.blueprintId));
check("五类profile有五条独立提醒", classroomContextReminderRegistry.length === 5 && new Set(classroomContextReminderRegistry.map((item) => item.reminderId)).size === 5);
check("全部计划可接受", plans.every((plan) => plan.status === "READY" && plan.rejected.length === 0));
check("全部计划挂载课堂Stage", plans.every((plan) => plan.accepted.some((item) => item.hostId === "CLASSROOM_STAGE")));
check("全部计划挂载Sidecar", plans.every((plan) => plan.accepted.some((item) => item.hostId === "CLASSROOM_SIDECAR")));
check("全部计划挂载Overlay", plans.every((plan) => plan.accepted.some((item) => item.hostId === "CLASSROOM_OVERLAY")));
check("全部计划挂载Dock", plans.every((plan) => plan.accepted.some((item) => item.hostId === "CLASSROOM_DOCK")));
check("全部计划挂载Student Display", plans.every((plan) => plan.accepted.some((item) => item.hostId === "STUDENT_DISPLAY")));
check("全部计划挂载全局小教", plans.every((plan) => plan.accepted.some((item) => item.hostId === "GLOBAL_AGENT_DOCK")));
check("Student Display全部有安全投影", plans.every((plan) => plan.accepted.filter((item) => item.hostId === "STUDENT_DISPLAY").every((item) => item.safeStudentProjection?.reviewStatus === "SAFE_FOR_STUDENT_DISPLAY")));
check("Host注册数为6", classroomComponentHostRegistry.length === 6);
check("组件注册数不少于13", classroomComponentRegistry.length >= 13);
for (const componentId of [
  "classroom.display.image-compare",
  "classroom.art.material-checklist",
  "classroom.display.student-gallery-fixture",
])
  check(`${componentId}已实现`, classroomComponentRegistry.some((item) => item.componentId === componentId && item.implementationStatus === "IMPLEMENTED_M1_FIXTURE"));

const initial = createInitialClassroomFixtureToolState();
const adapter = createClassroomWebFixtureAdapter({
  state: initial,
  currentBindingId: bindingIds[0],
  presentationBindingIds: bindingIds,
  presentStudentLabels: ["学生甲", "学生乙", "学生丙"],
  activeReminderIds: ["xiaojiao-observation-compare"],
});
const timer = adapter.startTimer();
const blackout = adapter.toggleBlackout();
const note = adapter.captureQuickNote({ quickMark: "EFFECTIVE" });
const rejected = adapter.previousScreen();
check("工具先生成R0候选命令", timer.candidate.executionStatus === "NOT_EXECUTABLE_IN_R0");
check("工具事件只写fixture内存", timer.event.executionScope === "WEB_FIXTURE_MEMORY_ONLY");
check("成功工具返回成功回执", timer.receipt.status === "SUCCESS");
check("失败工具返回失败回执", rejected.receipt.status === "FAILED");
check("正计时进入运行状态", timer.nextState.timerMode === "COUNT_UP" && timer.nextState.timerRunning);
check("黑屏是可逆fixture状态", blackout.nextState.blackScreen === true && blackout.nextState.spotlight === false);
check("随手记绑定当前Binding", note.nextState.capturedNotes[0]?.bindingId === bindingIds[0]);
check("边界操作被拒绝", rejected.status === "REJECTED" && rejected.event.outcome === "REJECTED");

const surface = read("app/shell-v1/classroom/classroom-surface.tsx");
const page = read("app/shell-v1/page.tsx");
const hosts = read("app/shell-v1/classroom/hosts/classroom-component-hosts.tsx");
const liveComponents = read("app/shell-v1/classroom/components/classroom-live-components.tsx");
const composition = read("app/shell-v1/classroom/composition/classroom-component-plan.ts");
const css = read("app/shell-v1/classroom/classroom.css");
const internals = read("app/shell-v1/classroom/components/internal/classroom-internal-components.tsx");
const allRuntimeSource = `${surface}\n${page}\n${hosts}`;
check("旧classroomR2Review已删除", !allRuntimeSource.includes("classroomR2Review"));
check("旧r2State已删除", !allRuntimeSource.includes("r2State"));
check("旧R2评审面板已删除", !allRuntimeSource.includes("LightweightEvidenceReviewPanel"));
check("页面只挂载一个AgentDock", (page.match(/<AgentDock\s/g) ?? []).length === 1);
for (const host of [
  "ClassroomStageHost",
  "ClassroomSidecarHost",
  "ClassroomOverlayHost",
  "ClassroomDockHost",
  "StudentDisplayHost",
  "GlobalAgentInputHost",
])
  check(`${host}已实现`, hosts.includes(`function ${host}`) || hosts.includes(`const ${host}`));
check("课堂主区避让全局小教", /sv1-classroom-live-main[^}]*padding-bottom:\s*82px/.test(css));
check("课堂控制目标至少44px", /sv1-classroom-control-dock button[^}]*min-height:\s*44px/.test(css));
check("1366响应式规则存在", css.includes("@media (max-width: 1439px)"));
check("1920宽屏规则存在", css.includes("@media (min-width: 1700px)"));
check("三种下一班状态已拆分", ["PREPARED_WITH_CONFIRMED_TRIAL", "KEPT_ORIGINAL_PACKAGE", "DEFERRED"].every((item) => surface.includes(item)));
check("通用编译器不含色彩渐变Episode硬编码", !/E01|E02|E03|E04|E05|E06|E07/.test(composition));
check("未知组合策略为失败关闭", read("app/shell-v1/classroom/composition/classroom-composition-blueprint.ts").includes("REJECTED_UNKNOWN_COMPOSITION"));
check("默认教师界面有显式调试开关", surface.includes('get("classroomComponentDebug")'));
check("Student Display摘要只在调试模式出现", hosts.includes("context.componentDebug && <StudentDisplayHost"));
check("默认大屏Binding标签受调试开关保护", liveComponents.includes('context.componentDebug && <span>Binding'));
check("下一班旧布尔动作已移除", !surface.includes("setTeacherAssistantNextClassPrepared(true)"));
check("内部组件无外部请求", !/fetch\(|WebSocket|EventSource/.test(internals));
check("内部组件无学生身份字段", !/studentId|studentName/.test(internals));

let passed = 0;
for (const item of checks) {
  if (item.condition) {
    passed += 1;
    console.log(`PASS ${item.label}`);
  } else {
    console.error(`FAIL ${item.label}`);
  }
}
console.log(`CLASSROOM_DYNAMIC_RENDER_M1_VALIDATOR = ${passed}/${checks.length} PASS`);
if (passed !== checks.length) process.exitCode = 1;
