import {
  createClassroomAgentCommandCandidateR0,
  createClassroomAgentTrustedStateContext,
  existingClassroomFixtureCapabilityBindings,
  getClassroomAgentCapability,
  validateClassroomAgentCommandCandidateR0,
  type ClassroomAgentCapabilityId,
  type ClassroomAgentCapabilityDefinition,
  type ClassroomAgentCommandCandidate,
} from "../../../../domain/classroom-assistant/classroom-agent-capability-registry.ts";
import type { ClassroomQuickMark } from "../../../../domain/classroom-evidence/lightweight-evidence-triage.ts";

export type ClassroomFixtureTimerMode = "STOPPED" | "COUNT_UP" | "COUNT_DOWN";
export type ClassroomFixtureReminderState = "VISIBLE" | "DEFERRED" | "DISMISSED";

export interface ClassroomFixtureToolState {
  revision: number;
  timerMode: ClassroomFixtureTimerMode;
  timerRunning: boolean;
  elapsedSeconds: number;
  countdownInitialSeconds: number | null;
  countdownRemainingSeconds: number | null;
  blackScreen: boolean;
  spotlight: boolean;
  selectedStudent: string | null;
  previousSelectedStudent: string | null;
  recentSelectedStudents: readonly string[];
  reminderStates: Readonly<Record<string, ClassroomFixtureReminderState>>;
  reminderDeferredAtBindingIds: Readonly<Record<string, string>>;
  capturedNotes: readonly {
    quickMark: ClassroomQuickMark;
    note?: string;
    bindingId: string;
  }[];
  events: readonly ClassroomFixtureEvent[];
  latestReceipt: ClassroomExecutionReceipt | null;
}

export interface ClassroomFixtureEvent {
  eventId: string;
  commandId: string;
  capabilityId: ClassroomAgentCapabilityId;
  bindingId: string;
  stateRevisionBefore: number;
  stateRevisionAfter: number;
  outcome: "APPLIED" | "REJECTED";
  summary: string;
  executionScope: "WEB_FIXTURE_MEMORY_ONLY";
}

export interface ClassroomExecutionReceipt {
  receiptId: string;
  commandId: string;
  capabilityId: ClassroomAgentCapabilityId;
  status: "SUCCESS" | "FAILED";
  title: string;
  detail: string;
  fixtureOnly: true;
}

export interface ClassroomWebFixtureResult {
  status: "APPLIED" | "REJECTED";
  nextState: Readonly<ClassroomFixtureToolState>;
  event: Readonly<ClassroomFixtureEvent>;
  receipt: Readonly<ClassroomExecutionReceipt>;
  candidate: Readonly<ClassroomAgentCommandCandidate>;
  nextBindingId?: string;
  capturedQuickMark?: {
    quickMark: ClassroomQuickMark;
    note?: string;
  };
}

export interface ClassroomWebFixtureAdapter {
  previousScreen(): ClassroomWebFixtureResult;
  nextScreen(): ClassroomWebFixtureResult;
  openBinding(bindingId: string): ClassroomWebFixtureResult;
  startTimer(): ClassroomWebFixtureResult;
  pauseTimer(): ClassroomWebFixtureResult;
  resetTimer(): ClassroomWebFixtureResult;
  startCountdown(seconds: number): ClassroomWebFixtureResult;
  toggleBlackout(): ClassroomWebFixtureResult;
  toggleSpotlight(): ClassroomWebFixtureResult;
  randomSelectStudent(): ClassroomWebFixtureResult;
  undoRandomSelection(): ClassroomWebFixtureResult;
  captureQuickNote(input: {
    quickMark: ClassroomQuickMark;
    note?: string;
  }): ClassroomWebFixtureResult;
  dismissXiaojiaoReminder(id: string): ClassroomWebFixtureResult;
  deferXiaojiaoReminder(id: string): ClassroomWebFixtureResult;
}

export interface ClassroomWebFixtureAdapterContext {
  state: Readonly<ClassroomFixtureToolState>;
  currentBindingId: string;
  presentationBindingIds: readonly string[];
  presentStudentLabels: readonly string[];
  activeReminderIds?: readonly string[];
}

export function validateClassroomWebFixtureCapability(
  capability: Pick<
    ClassroomAgentCapabilityDefinition,
    "capabilityId" | "status" | "r0Executor"
  >,
): readonly string[] {
  const issues: string[] = [];
  if (!["AVAILABLE_FIXTURE", "FIXTURE_ONLY"].includes(capability.status))
    issues.push(`WEB_FIXTURE_CAPABILITY_STATUS_INVALID:${capability.capabilityId}`);
  if (capability.r0Executor !== "EXISTING_WEB_FIXTURE")
    issues.push(`WEB_FIXTURE_EXECUTOR_INVALID:${capability.capabilityId}`);
  if (!(capability.capabilityId in existingClassroomFixtureCapabilityBindings))
    issues.push(`WEB_FIXTURE_BINDING_MISSING:${capability.capabilityId}`);
  return Object.freeze(issues);
}

export function createInitialClassroomFixtureToolState(
  elapsedSeconds = 0,
): Readonly<ClassroomFixtureToolState> {
  return Object.freeze({
    revision: 0,
    timerMode: "STOPPED",
    timerRunning: false,
    elapsedSeconds,
    countdownInitialSeconds: null,
    countdownRemainingSeconds: null,
    blackScreen: false,
    spotlight: false,
    selectedStudent: null,
    previousSelectedStudent: null,
    recentSelectedStudents: Object.freeze([]),
    reminderStates: Object.freeze({}),
    reminderDeferredAtBindingIds: Object.freeze({}),
    capturedNotes: Object.freeze([]),
    events: Object.freeze([]),
    latestReceipt: null,
  });
}

export function advanceClassroomFixtureClock(
  state: Readonly<ClassroomFixtureToolState>,
): Readonly<ClassroomFixtureToolState> {
  if (!state.timerRunning) return state;
  if (state.timerMode === "COUNT_DOWN") {
    const nextRemaining = Math.max(0, (state.countdownRemainingSeconds ?? 0) - 1);
    return Object.freeze({
      ...state,
      countdownRemainingSeconds: nextRemaining,
      timerRunning: nextRemaining > 0,
    });
  }
  return Object.freeze({ ...state, elapsedSeconds: state.elapsedSeconds + 1 });
}

function freezeState(state: ClassroomFixtureToolState) {
  return Object.freeze({
    ...state,
    recentSelectedStudents: Object.freeze([...state.recentSelectedStudents]),
    reminderStates: Object.freeze({ ...state.reminderStates }),
    reminderDeferredAtBindingIds: Object.freeze({
      ...state.reminderDeferredAtBindingIds,
    }),
    capturedNotes: Object.freeze([...state.capturedNotes]),
    events: Object.freeze([...state.events]),
  });
}

export function createClassroomWebFixtureAdapter(
  context: ClassroomWebFixtureAdapterContext,
): ClassroomWebFixtureAdapter {
  const bindingIndex = context.presentationBindingIds.indexOf(
    context.currentBindingId,
  );

  function run(
    capabilityId: ClassroomAgentCapabilityId,
    parameters: Readonly<Record<string, unknown>>,
    summary: string,
    mutate: () => {
      patch?: Partial<ClassroomFixtureToolState>;
      nextBindingId?: string;
      capturedQuickMark?: ClassroomWebFixtureResult["capturedQuickMark"];
      rejectReason?: string;
    },
  ): ClassroomWebFixtureResult {
    const capability = getClassroomAgentCapability(capabilityId);
    const trustedState = createClassroomAgentTrustedStateContext({
      actualSessionState: "CLASSROOM_ACTIVE",
      actualSessionRevision: context.state.revision,
    });
    const commandId = `fixture-command-${context.state.revision + 1}-${capabilityId}`;
    const candidate = createClassroomAgentCommandCandidateR0({
      commandId,
      capabilityId,
      issuedBy: "TEACHER",
      parameters,
      trustedStateContext: trustedState,
    });
    const candidateIssues = [
      ...validateClassroomWebFixtureCapability(capability),
      ...validateClassroomAgentCommandCandidateR0(candidate, {
        trustedStateContext: trustedState,
      }),
    ];
    const mutation = candidateIssues.length
      ? { rejectReason: candidateIssues.join("、") }
      : mutate();
    const rejected = Boolean(mutation.rejectReason);
    const nextRevision = context.state.revision + 1;
    const event: ClassroomFixtureEvent = Object.freeze({
      eventId: `fixture-event-${nextRevision}`,
      commandId,
      capabilityId,
      bindingId: context.currentBindingId,
      stateRevisionBefore: context.state.revision,
      stateRevisionAfter: nextRevision,
      outcome: rejected ? "REJECTED" : "APPLIED",
      summary: rejected ? `${summary}未执行：${mutation.rejectReason}` : summary,
      executionScope: "WEB_FIXTURE_MEMORY_ONLY",
    });
    const receipt: ClassroomExecutionReceipt = Object.freeze({
      receiptId: `fixture-receipt-${nextRevision}`,
      commandId,
      capabilityId,
      status: rejected ? "FAILED" : "SUCCESS",
      title: rejected ? "操作未完成" : "操作已完成",
      detail: rejected ? mutation.rejectReason ?? "状态不允许" : summary,
      fixtureOnly: true,
    });
    const nextState = freezeState({
      ...context.state,
      ...(mutation.patch ?? {}),
      revision: nextRevision,
      events: [...context.state.events, event],
      latestReceipt: receipt,
    });
    return Object.freeze({
      status: rejected ? "REJECTED" : "APPLIED",
      nextState,
      event,
      receipt,
      candidate,
      ...(mutation.nextBindingId
        ? { nextBindingId: mutation.nextBindingId }
        : {}),
      ...(mutation.capturedQuickMark
        ? { capturedQuickMark: mutation.capturedQuickMark }
        : {}),
    });
  }

  function move(direction: -1 | 1) {
    const nextIndex = bindingIndex + direction;
    const nextBindingId = context.presentationBindingIds[nextIndex];
    return run(
      direction === -1 ? "classroom.screen.previous" : "classroom.screen.next",
      {},
      direction === -1 ? "已切换到上一屏" : "已切换到下一屏",
      () =>
        nextBindingId
          ? {
              nextBindingId,
              patch: { blackScreen: false, spotlight: false },
            }
          : { rejectReason: direction === -1 ? "已经是第一屏" : "已经是最后一屏" },
    );
  }

  return Object.freeze({
    previousScreen: () => move(-1),
    nextScreen: () => move(1),
    openBinding: (bindingId: string) =>
      run(
        "classroom.screen.open",
        { bindingId },
        "已切换课堂环节",
        () =>
          context.presentationBindingIds.includes(bindingId)
            ? {
                nextBindingId: bindingId,
                patch: { blackScreen: false, spotlight: false },
              }
            : { rejectReason: "课堂包中没有这个 Binding" },
      ),
    startTimer: () =>
      run(
        "classroom.timer.start",
        { mode: "COUNT_UP" },
        "正计时已开始",
        () => ({
          patch: {
            timerMode: "COUNT_UP",
            timerRunning: true,
            countdownInitialSeconds: null,
            countdownRemainingSeconds: null,
          },
        }),
      ),
    pauseTimer: () =>
      run("classroom.timer.pause", {}, "计时已暂停", () =>
        context.state.timerRunning
          ? { patch: { timerRunning: false } }
          : { rejectReason: "当前没有正在运行的计时" },
      ),
    resetTimer: () =>
      run("classroom.timer.reset", {}, "计时已重置", () => ({
        patch: {
          timerMode: "STOPPED",
          timerRunning: false,
          elapsedSeconds: 0,
          countdownInitialSeconds: null,
          countdownRemainingSeconds: null,
        },
      })),
    startCountdown: (seconds: number) =>
      run(
        "classroom.timer.start",
        { mode: "COUNT_DOWN", durationSeconds: seconds },
        `倒计时 ${Math.ceil(seconds / 60)} 分钟已开始`,
        () =>
          Number.isInteger(seconds) && seconds > 0
            ? {
                patch: {
                  timerMode: "COUNT_DOWN",
                  timerRunning: true,
                  countdownInitialSeconds: seconds,
                  countdownRemainingSeconds: seconds,
                },
              }
            : { rejectReason: "倒计时必须大于 0 秒" },
      ),
    toggleBlackout: () =>
      run(
        "classroom.display.blackout",
        { enabled: !context.state.blackScreen },
        context.state.blackScreen ? "学生大屏已恢复" : "学生大屏已黑屏",
        () => ({
          patch: {
            blackScreen: !context.state.blackScreen,
            spotlight: false,
          },
        }),
      ),
    toggleSpotlight: () =>
      run(
        "classroom.display.spotlight",
        { enabled: !context.state.spotlight },
        context.state.spotlight ? "聚光灯已关闭" : "聚光灯已打开",
        () => ({
          patch: {
            spotlight: !context.state.spotlight,
            blackScreen: false,
          },
        }),
      ),
    randomSelectStudent: () =>
      run("classroom.student.random_select", {}, "已完成一次随机点名", () => {
        const recent = new Set(context.state.recentSelectedStudents.slice(-2));
        const available = context.presentStudentLabels.filter(
          (student) => !recent.has(student),
        );
        const pool = available.length ? available : context.presentStudentLabels;
        if (!pool.length) return { rejectReason: "当前没有可用的体验学生名单" };
        const selected = pool[context.state.revision % pool.length];
        return {
          patch: {
            previousSelectedStudent: context.state.selectedStudent,
            selectedStudent: selected,
            recentSelectedStudents: [
              ...context.state.recentSelectedStudents.slice(-3),
              selected,
            ],
          },
        };
      }),
    undoRandomSelection: () =>
      run("classroom.student.random_select", {}, "已撤销本次随机点名", () =>
        context.state.selectedStudent
          ? {
              patch: {
                selectedStudent: context.state.previousSelectedStudent,
                previousSelectedStudent: null,
              },
            }
          : { rejectReason: "当前没有可撤销的随机点名" },
      ),
    captureQuickNote: (input: { quickMark: ClassroomQuickMark; note?: string }) =>
      run(
        "classroom.note.capture",
        {
          quickMark: input.quickMark,
          ...(input.note ? { note: input.note } : {}),
        },
        "已记下，下课后再一起看",
        () => ({
          patch: {
            capturedNotes: [
              ...context.state.capturedNotes,
              {
                quickMark: input.quickMark,
                ...(input.note ? { note: input.note } : {}),
                bindingId: context.currentBindingId,
              },
            ],
          },
          capturedQuickMark: input,
        }),
      ),
    dismissXiaojiaoReminder: (reminderId: string) =>
      run(
        "classroom.reminder.dismiss",
        { reminderId },
        "小教提醒已关闭",
        () =>
          context.activeReminderIds?.includes(reminderId)
            ? {
                patch: {
                  reminderStates: {
                    ...context.state.reminderStates,
                    [reminderId]: "DISMISSED",
                  },
                },
              }
            : { rejectReason: "当前课堂位置没有这条小教提醒" },
      ),
    deferXiaojiaoReminder: (reminderId: string) =>
      run(
        "classroom.reminder.defer",
        { reminderId },
        "小教提醒已设为稍后再看",
        () =>
          context.activeReminderIds?.includes(reminderId)
            ? {
                patch: {
                  reminderStates: {
                    ...context.state.reminderStates,
                    [reminderId]: "DEFERRED",
                  },
                  reminderDeferredAtBindingIds: {
                    ...context.state.reminderDeferredAtBindingIds,
                    [reminderId]: context.currentBindingId,
                  },
                },
              }
            : { rejectReason: "当前课堂位置没有这条小教提醒" },
      ),
  });
}
