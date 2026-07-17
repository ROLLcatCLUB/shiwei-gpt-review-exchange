import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { colorGradientClassroomPackage } from "../app/shell-v1/classroom/classroom-preview-fixture.ts";
import {
  classroomComponentProfileIds,
  compileClassroomComponentPlan,
} from "../app/shell-v1/classroom/composition/classroom-component-plan.ts";
import { colorGradientClassroomCompositionBlueprint } from "../app/shell-v1/classroom/composition/color-gradient-classroom-composition-blueprint.ts";
import {
  classroomContextReminderRegistry,
  resolveClassroomContextReminderCandidate,
  resolveClassroomContextReminderVisibility,
} from "../app/shell-v1/classroom/composition/classroom-context-reminder-registry.ts";
import {
  advanceClassroomFixtureClock,
  createClassroomWebFixtureAdapter,
  createInitialClassroomFixtureToolState,
  validateClassroomWebFixtureCapability,
} from "../app/shell-v1/classroom/adapters/classroom-web-fixture-adapter.ts";
import {
  existingClassroomFixtureCapabilityBindings,
  getClassroomAgentCapability,
} from "../domain/classroom-assistant/classroom-agent-capability-registry.ts";

const read = (relativePath) =>
  readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
const orderedBindingIds = colorGradientClassroomPackage.presentationSequence.map(
  (item) => item.bindingId,
);

function planForEpisode(episodeId, revision = 0) {
  const episode = colorGradientClassroomPackage.episodes.find(
    (item) => item.episodeId === episodeId,
  );
  const binding = colorGradientClassroomPackage.screenBindings.find(
    (item) => item.episodeId === episodeId,
  );
  assert.ok(episode);
  assert.ok(binding);
  return compileClassroomComponentPlan({
    classroomPackage: colorGradientClassroomPackage,
    blueprint: colorGradientClassroomCompositionBlueprint,
    currentBindingId: binding.bindingId,
    currentEpisode: episode,
    mode: "LIVE",
    fixtureStateRevision: revision,
  });
}

function adapterFor(state, bindingIndex = 0, students = ["学生甲", "学生乙", "学生丙"]) {
  const bindingId = orderedBindingIds[bindingIndex];
  const compositionEntry = colorGradientClassroomCompositionBlueprint.entries.find(
    (entry) => entry.bindingScope.includes(bindingId),
  );
  return createClassroomWebFixtureAdapter({
    state,
    currentBindingId: bindingId,
    presentationBindingIds: orderedBindingIds,
    presentStudentLabels: students,
    activeReminderIds: compositionEntry?.contextReminderId
      ? [compositionEntry.contextReminderId]
      : [],
  });
}

test("7个真实Episode确定性映射到5种课堂组件组合", () => {
  const profiles = colorGradientClassroomPackage.episodes.map(
    (episode) => planForEpisode(episode.episodeId).profileId,
  );
  assert.deepEqual(profiles, [
    "OBSERVATION_COMPARE",
    "OBSERVATION_COMPARE",
    "OBSERVATION_COMPARE",
    "TEACHER_DEMONSTRATION",
    "STUDENT_PRACTICE",
    "SHOWCASE_EVALUATION",
    "CLEANUP_AND_CLOSE",
  ]);
  assert.deepEqual([...new Set(profiles)], classroomComponentProfileIds);
});

test("组件计划以currentBindingId为唯一课堂游标且重复编译一致", () => {
  const first = planForEpisode("E04", 7);
  const second = planForEpisode("E04", 7);
  assert.equal(first.currentBindingId, "B006");
  assert.deepEqual(first, second);
  assert.equal(first.source, "LESSON_PACKAGE_BLUEPRINT_BINDING_CURSOR");
  assert.equal(first.blueprintId, colorGradientClassroomCompositionBlueprint.blueprintId);
  assert.equal(first.status, "READY");
});

test("组合蓝图在通用编译器外部且未知课时失败关闭", () => {
  const sourceEpisode = colorGradientClassroomPackage.episodes[0];
  const sourceBinding = colorGradientClassroomPackage.screenBindings[0];
  const sourceSequence = colorGradientClassroomPackage.presentationSequence[0];
  const nonColorPackage = {
    ...colorGradientClassroomPackage,
    lesson: {
      ...colorGradientClassroomPackage.lesson,
      lessonId: "lesson-shape-rhythm",
      title: "形状的节奏",
    },
    episodes: [{ ...sourceEpisode, episodeId: "SHAPE_E01", title: "找一找形状的重复" }],
    screenBindings: [{ ...sourceBinding, bindingId: "SHAPE_B001", episodeId: "SHAPE_E01" }],
    presentationSequence: [{ ...sourceSequence, bindingId: "SHAPE_B001", episodeId: "SHAPE_E01" }],
  };
  const unknownBlueprint = {
    blueprintId: "SHAPE_RHYTHM_EMPTY_BLUEPRINT",
    lessonId: "lesson-shape-rhythm",
    entries: [],
    unknownCompositionPolicy: "REJECTED_UNKNOWN_COMPOSITION",
  };
  assert.throws(
    () =>
      compileClassroomComponentPlan({
        classroomPackage: nonColorPackage,
        blueprint: unknownBlueprint,
        currentBindingId: "SHAPE_B001",
        currentEpisode: nonColorPackage.episodes[0],
        mode: "LIVE",
        fixtureStateRevision: 0,
      }),
    /REJECTED_UNKNOWN_COMPOSITION/,
  );
});

test("五类课堂profile拥有五条不同且作用域匹配的小教提醒", () => {
  assert.equal(classroomContextReminderRegistry.length, 5);
  assert.equal(
    new Set(classroomContextReminderRegistry.map((item) => item.reminderId)).size,
    5,
  );
  assert.equal(
    new Set(classroomContextReminderRegistry.map((item) => item.title)).size,
    5,
  );
  for (const episode of colorGradientClassroomPackage.episodes) {
    const plan = planForEpisode(episode.episodeId);
    const candidate = resolveClassroomContextReminderCandidate({
      reminderId: plan.contextReminderId,
      profileId: plan.profileId,
      bindingId: plan.currentBindingId,
    });
    assert.ok(candidate, episode.episodeId);
    assert.equal(candidate.profileId, plan.profileId);
  }
});

test("提醒稍后在下一Binding恢复且关闭只影响当前候选", () => {
  let state = createInitialClassroomFixtureToolState();
  const deferred = adapterFor(state, 0).deferXiaojiaoReminder(
    "xiaojiao-observation-compare",
  );
  state = deferred.nextState;
  const observation = classroomContextReminderRegistry[0];
  assert.equal(
    resolveClassroomContextReminderVisibility({
      candidate: observation,
      state: state.reminderStates[observation.reminderId],
      deferredAtBindingId:
        state.reminderDeferredAtBindingIds[observation.reminderId],
      currentBindingId: "B001",
    }),
    "HIDDEN_DEFERRED",
  );
  assert.equal(
    resolveClassroomContextReminderVisibility({
      candidate: observation,
      state: state.reminderStates[observation.reminderId],
      deferredAtBindingId:
        state.reminderDeferredAtBindingIds[observation.reminderId],
      currentBindingId: "B002",
    }),
    "VISIBLE",
  );
  state = adapterFor(state, 1).dismissXiaojiaoReminder(
    "xiaojiao-observation-compare",
  ).nextState;
  assert.equal(state.reminderStates[observation.reminderId], "DISMISSED");
  const demonstration = classroomContextReminderRegistry.find(
    (item) => item.profileId === "TEACHER_DEMONSTRATION",
  );
  assert.ok(demonstration);
  assert.equal(state.reminderStates[demonstration.reminderId], undefined);
});

test("Web fixture拒绝PLANNED与NONE能力且screen.open合同一致", () => {
  assert.deepEqual(
    validateClassroomWebFixtureCapability({
      capabilityId: "future.fixture.invalid",
      status: "PLANNED",
      r0Executor: "NONE",
    }),
    [
      "WEB_FIXTURE_CAPABILITY_STATUS_INVALID:future.fixture.invalid",
      "WEB_FIXTURE_EXECUTOR_INVALID:future.fixture.invalid",
      "WEB_FIXTURE_BINDING_MISSING:future.fixture.invalid",
    ],
  );
  const screenOpen = getClassroomAgentCapability("classroom.screen.open");
  assert.equal(screenOpen.status, "FIXTURE_ONLY");
  assert.equal(screenOpen.executionOwner, "EXISTING_WEB_FIXTURE");
  assert.equal(screenOpen.r0Executor, "EXISTING_WEB_FIXTURE");
  assert.ok("classroom.screen.open" in existingClassroomFixtureCapabilityBindings);
  assert.equal(adapterFor(createInitialClassroomFixtureToolState()).openBinding("B003").status, "APPLIED");
});

test("Student Display仅接受完成安全投影的公开课堂内容", () => {
  for (const episode of colorGradientClassroomPackage.episodes) {
    const plan = planForEpisode(episode.episodeId);
    const studentItems = plan.accepted.filter(
      (item) => item.hostId === "STUDENT_DISPLAY",
    );
    assert.equal(studentItems.length, 1, episode.episodeId);
    assert.equal(studentItems[0].safeStudentProjection?.audience, "STUDENT");
    assert.equal(
      studentItems[0].safeStudentProjection?.reviewStatus,
      "SAFE_FOR_STUDENT_DISPLAY",
    );
    assert.equal(
      studentItems[0].safeStudentProjection?.contentClass,
      "PUBLIC_LESSON_CONTENT",
    );
  }
});

test("教师端组件不会误投到Student Display", () => {
  const plan = planForEpisode("E05");
  const studentIds = plan.accepted
    .filter((item) => item.hostId === "STUDENT_DISPLAY")
    .map((item) => item.componentId);
  for (const teacherOnly of [
    "classroom.sidecar.student-status-summary",
    "classroom.sidecar.recent-events",
    "classroom.note.quick-capture",
    "xiaojiao.classroom.context-reminder",
    "classroom.control.primary-dock",
    "xiaojiao.global.input-dock",
  ])
    assert.ok(!studentIds.includes(teacherOnly), teacherOnly);
});

test("课堂工具统一生成候选命令、fixture事件和成功回执", () => {
  const result = adapterFor(createInitialClassroomFixtureToolState()).startTimer();
  assert.equal(result.status, "APPLIED");
  assert.equal(result.candidate.executionStatus, "NOT_EXECUTABLE_IN_R0");
  assert.equal(result.event.executionScope, "WEB_FIXTURE_MEMORY_ONLY");
  assert.equal(result.receipt.status, "SUCCESS");
  assert.equal(result.nextState.timerMode, "COUNT_UP");
  assert.equal(result.nextState.events.length, 1);
});

test("正计时、倒计时、暂停和重置均为可逆fixture状态", () => {
  let state = adapterFor(createInitialClassroomFixtureToolState()).startTimer().nextState;
  state = advanceClassroomFixtureClock(state);
  assert.equal(state.elapsedSeconds, 1);
  state = adapterFor(state).pauseTimer().nextState;
  assert.equal(state.timerRunning, false);
  state = adapterFor(state).startCountdown(300).nextState;
  state = advanceClassroomFixtureClock(state);
  assert.equal(state.countdownRemainingSeconds, 299);
  state = adapterFor(state).resetTimer().nextState;
  assert.equal(state.timerMode, "STOPPED");
  assert.equal(state.elapsedSeconds, 0);
  assert.equal(state.countdownRemainingSeconds, null);
});

test("黑屏与聚光灯互斥且切换Binding自动清除临时显示效果", () => {
  let state = adapterFor(createInitialClassroomFixtureToolState()).toggleBlackout().nextState;
  assert.equal(state.blackScreen, true);
  state = adapterFor(state).toggleSpotlight().nextState;
  assert.equal(state.blackScreen, false);
  assert.equal(state.spotlight, true);
  const moved = adapterFor(state).nextScreen();
  assert.equal(moved.status, "APPLIED");
  assert.equal(moved.nextBindingId, orderedBindingIds[1]);
  assert.equal(moved.nextState.spotlight, false);
});

test("边界失败同样生成拒绝事件和失败回执", () => {
  const result = adapterFor(createInitialClassroomFixtureToolState()).previousScreen();
  assert.equal(result.status, "REJECTED");
  assert.equal(result.event.outcome, "REJECTED");
  assert.equal(result.receipt.status, "FAILED");
  assert.match(result.receipt.detail, /第一屏/);
});

test("随机点名排除最近学生、支持撤销且不写入正式评价", () => {
  let state = createInitialClassroomFixtureToolState();
  const first = adapterFor(state).randomSelectStudent();
  state = first.nextState;
  const selected = state.selectedStudent;
  assert.ok(selected);
  const second = adapterFor(state).randomSelectStudent();
  assert.notEqual(second.nextState.selectedStudent, selected);
  const undone = adapterFor(second.nextState).undoRandomSelection();
  assert.equal(undone.nextState.selectedStudent, selected);
  assert.equal(undone.event.executionScope, "WEB_FIXTURE_MEMORY_ONLY");
});

test("随手记自动绑定Binding且小教提醒支持关闭和稍后", () => {
  let state = createInitialClassroomFixtureToolState();
  const note = adapterFor(state, 4).captureQuickNote({
    quickMark: "MATERIAL_ISSUE",
    note: "调色盘需要补充",
  });
  assert.equal(note.nextState.capturedNotes[0].bindingId, orderedBindingIds[4]);
  state = note.nextState;
  const deferred = adapterFor(state, 4).deferXiaojiaoReminder(
    "xiaojiao-observation-compare",
  );
  assert.equal(
    deferred.nextState.reminderStates["xiaojiao-observation-compare"],
    "DEFERRED",
  );
  const dismissed = adapterFor(deferred.nextState, 4).dismissXiaojiaoReminder(
    "xiaojiao-observation-compare",
  );
  assert.equal(
    dismissed.nextState.reminderStates["xiaojiao-observation-compare"],
    "DISMISSED",
  );
});

test("教师默认界面隐藏工程标签并保留显式开发开关", async () => {
  const [surface, live, hosts, receipt, assistant] = await Promise.all([
    read("app/shell-v1/classroom/classroom-surface.tsx"),
    read("app/shell-v1/classroom/components/classroom-live-components.tsx"),
    read("app/shell-v1/classroom/hosts/classroom-component-hosts.tsx"),
    read("app/shell-v1/classroom/components/feedback/classroom-action-receipt.tsx"),
    read("app/shell-v1/classroom/teacher-work-assistant-review.tsx"),
  ]);
  assert.ok(surface.includes('get("classroomComponentDebug")'));
  assert.ok(surface.includes("useSyncExternalStore"));
  assert.ok(surface.includes('data-component-debug={classroomComponentDebug ? "true" : "false"}'));
  assert.ok(hosts.includes("context.componentDebug && <StudentDisplayHost"));
  assert.ok(live.includes('context.componentDebug && <span>Binding'));
  assert.ok(!receipt.includes(" · fixture</small>"));
  assert.ok(!assistant.includes("体验预览 · fixture only"));
});

test("旧R2运行参数和双页面分支已从正式app源码删除", async () => {
  const sources = await Promise.all([
    read("app/shell-v1/classroom/classroom-surface.tsx"),
    read("app/shell-v1/page.tsx"),
  ]);
  for (const legacyToken of [
    "classroomR2Review",
    "r2State",
    "LightweightEvidenceReviewPanel",
    "LightweightQuickMarkBar",
  ])
    assert.ok(!sources.some((source) => source.includes(legacyToken)), legacyToken);
});

test("六类Host是真实挂载层且全局小教仍只有一个入口", async () => {
  const hosts = await read(
    "app/shell-v1/classroom/hosts/classroom-component-hosts.tsx",
  );
  const page = await read("app/shell-v1/page.tsx");
  for (const host of [
    "ClassroomStageHost",
    "ClassroomSidecarHost",
    "ClassroomOverlayHost",
    "ClassroomDockHost",
    "StudentDisplayHost",
    "GlobalAgentInputHost",
  ])
    assert.ok(hosts.includes(`function ${host}`) || hosts.includes(`const ${host}`), host);
  assert.equal((page.match(/<AgentDock\s/g) ?? []).length, 1);
  assert.equal((page.match(/<GlobalAgentInputHost>/g) ?? []).length, 1);
});

test("课堂控制栏为全局小教输入栏保留空间并满足44px操作尺寸", async () => {
  const css = await read("app/shell-v1/classroom/classroom.css");
  assert.match(css, /sv1-classroom-live-main[^}]*padding-bottom:\s*82px/);
  assert.match(css, /sv1-classroom-control-dock button[^}]*min-height:\s*44px/);
  assert.ok(css.includes("CLASSROOM_DYNAMIC_RENDER_M1"));
});

test("下一班三种准备动作具有互斥状态而非同一布尔结果", async () => {
  const surface = await read("app/shell-v1/classroom/classroom-surface.tsx");
  for (const outcome of [
    "PREPARED_WITH_CONFIRMED_TRIAL",
    "KEPT_ORIGINAL_PACKAGE",
    "DEFERRED",
  ])
    assert.ok(surface.includes(outcome), outcome);
  assert.ok(!surface.includes("setTeacherAssistantNextClassPrepared(true)"));
});

test("M1内部组件不引入第三方依赖或外部学生数据", async () => {
  const packageJson = JSON.parse(await read("package.json"));
  assert.deepEqual(Object.keys(packageJson.dependencies).sort(), [
    "drizzle-orm",
    "next",
    "react",
    "react-dom",
    "react-moveable",
  ]);
  const internals = await read(
    "app/shell-v1/classroom/components/internal/classroom-internal-components.tsx",
  );
  assert.ok(!/fetch\(|WebSocket|EventSource|studentId|studentName/.test(internals));
});
