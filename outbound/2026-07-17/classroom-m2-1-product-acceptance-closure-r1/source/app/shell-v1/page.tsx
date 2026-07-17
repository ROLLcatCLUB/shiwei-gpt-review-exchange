"use client";

import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  AcademicWorkspaceContext,
  AgentDockMode,
  CourseAssignment,
  LessonPreparationSummary,
  LessonProjectionId,
  PrepSurfaceId,
  RenderMode,
  RoomId,
  SurfaceId,
  academicWorkspaceFixture,
  getActiveAssignment,
  getActiveTerm,
  getActiveTermAssignments,
  getWorkspaceClassIds,
  renderModeCopy,
  roomContracts,
} from "./contracts";
import {
  PrepReasoningRequestError,
  runPrepReasoning,
} from "./prep-reasoning-client";
import type {
  PrepReasoningBffViewModel,
  ProjectionRenderModel,
} from "./prep-reasoning-contracts";
import {
  getReadonlyReasoningRequest,
  readonlyCaseLabels,
} from "./prep-readonly-cases";
import type {
  CandidateScreen,
  CandidateScreenBinding,
  LessonViewVersion,
} from "./v0-5-p1-candidate";
import {
  colorGradientArtworkAssessment,
  colorGradientV05P1Candidate,
  getCandidateEpisode,
  getColorGradientV05P1Projection,
} from "./v0-5-p1-candidate";
import type {
  LessonWorkspaceAction,
  ScreenEditorState,
  StructuredScreenDocument,
  TaskRequirement,
  TextStyle,
} from "./screen-editing";
import {
  createDraftAsset,
  createInitialScreenEditorState,
  createScreenDocumentFromRole,
  createTeacherImageObject,
  createTeacherTextObject,
  deriveClassroomPresentationOrder,
  duplicateScreenDocument,
  editableScreenIds,
  getScreenCanvasObject,
  inspectScreenLayoutHealth,
  reduceScreenEditorState,
  releaseAllDraftAssets,
  releaseDraftAsset,
  resolveScreenAssetUri,
  resolveStructuredScreen,
  structuredScreenBaseDocuments,
} from "./screen-editing";
import { StructuredScreenRenderer } from "./structured-screen-renderer";
import { ScreenMoveableController } from "./screen-moveable-controller";
import {
  getLayoutSlotDefinition,
  visualThemeRegistry,
} from "./screen-rendering";
import { ClassroomSurface } from "./classroom/classroom-surface";
import { GlobalAgentInputHost } from "./classroom/hosts/classroom-component-hosts";
import { UserCenterSurface } from "./user-center/user-center-surface";
import type {
  TeacherProfile,
  TeachingPreference,
  UserCenterDraft,
} from "./user-center/user-center-contracts";
import {
  prepTimetableDays,
  prepTimetablePeriods,
  teacherProfileFixture,
  teacherScheduleOccurrences,
  teachingPreferenceFixture,
} from "./user-center/user-center-fixture";
import "./shell-v1.css";
import "./classroom/classroom.css";

const dockOrder: AgentDockMode[] = [
  "COLLAPSED",
  "FLOATING",
  "DOCKED",
  "FULL_CONVERSATION",
];

const screenEditorContext = {
  baseDocuments: structuredScreenBaseDocuments,
  bindings: colorGradientV05P1Candidate.screenBindings,
  screenOrder: colorGradientV05P1Candidate.screens.map((screen) => screen.id),
  episodeIds: colorGradientV05P1Candidate.episodes.map((episode) => episode.id),
} as const;

function getScreenNumber(screenId: string, screenOrder?: readonly string[]) {
  const index = screenOrder
    ? screenOrder.indexOf(screenId)
    : colorGradientV05P1Candidate.screens.findIndex(
        (screen) => screen.id === screenId,
      );
  return index >= 0 ? index + 1 : null;
}

function getEpisodeNumber(episodeId: string) {
  const index = colorGradientV05P1Candidate.episodes.findIndex(
    (episode) => episode.id === episodeId,
  );
  return index >= 0 ? index + 1 : null;
}

function screenDisplayLabel(screenId: string, screenOrder?: readonly string[]) {
  const number = getScreenNumber(screenId, screenOrder);
  return number ? `第${number}屏` : "课堂大屏";
}

function episodeDisplayLabel(episodeId: string) {
  const number = getEpisodeNumber(episodeId);
  return number ? `第${number}环节` : "课堂环节";
}

const projectionToWorkspace = {
  lesson_plan: "LESSON_DOCUMENT",
  class_flow: "CLASS_FLOW",
  class_screen: "CLASS_SCREEN",
  worksheet: "WORKSHEET",
  assessment: "ASSESSMENT",
} as const;

export default function ShiweiShellV1() {
  const userAvatarRef = useRef<HTMLButtonElement>(null);
  const [surfaceId, setSurfaceId] = useState<SurfaceId>("welcome");
  const [userCenterOpen, setUserCenterOpen] = useState(false);
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile>(
    teacherProfileFixture,
  );
  const [teachingPreferences, setTeachingPreferences] =
    useState<TeachingPreference>(teachingPreferenceFixture);
  const [dockMode, setDockMode] = useState<AgentDockMode>("COLLAPSED");
  const [overlay, setOverlay] = useState<"source" | "confirm" | "term" | null>(
    null,
  );
  const [activeAssignmentId, setActiveAssignmentId] = useState(
    () => getActiveAssignment(academicWorkspaceFixture).id,
  );
  const [activeTermId, setActiveTermId] = useState(
    academicWorkspaceFixture.activeTermId,
  );
  const [selectedClassIds, setSelectedClassIds] = useState<
    Record<string, string[]>
  >(() =>
    Object.fromEntries(
      academicWorkspaceFixture.assignments.map((assignment) => [
        assignment.id,
        assignment.classIds,
      ]),
    ),
  );
  const [enabledAssignmentIds, setEnabledAssignmentIds] = useState(() =>
    academicWorkspaceFixture.assignments.map((assignment) => assignment.id),
  );
  const enabledAssignments = useMemo(
    () =>
      academicWorkspaceFixture.assignments.filter((assignment) =>
        enabledAssignmentIds.includes(assignment.id),
      ),
    [enabledAssignmentIds],
  );
  const academicContext = useMemo(
    () => ({
      ...academicWorkspaceFixture,
      activeTermId,
      assignments: academicWorkspaceFixture.assignments,
      workspaceSelection: {
        enabledAssignmentIds,
        enabledClassIds: selectedClassIds,
        activeAssignmentId,
      },
      activeAssignmentId,
    }),
    [activeAssignmentId, activeTermId, enabledAssignmentIds, selectedClassIds],
  );
  const activeTerm = getActiveTerm(academicContext);
  const activeAssignment = getActiveAssignment(academicContext);
  const room = useMemo(
    () => roomContracts.find((item) => item.id === surfaceId) || null,
    [surfaceId],
  );
  const renderMode = room?.renderMode || "workspace";

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      if (params.get("surface") === "user-center") {
        setSurfaceId("semester");
        setUserCenterOpen(true);
      } else if (params.get("room") === "classroom") setSurfaceId("classroom");
      else if (params.has("lesson"))
        setSurfaceId("prep");
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!userCenterOpen) return;
    const background = Array.from(
      document.querySelectorAll<HTMLElement>(
        ".sv1-header, .sv1-stage-shell, .sv1-agent-dock, .sv1-overlay-host",
      ),
    );
    background.forEach((element) => element.setAttribute("inert", ""));
    const focusTimer = window.requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>("[data-user-center-initial-focus]")
        ?.focus();
    });
    function containModalFocus(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setUserCenterOpen(false);
        window.requestAnimationFrame(() => userAvatarRef.current?.focus());
        return;
      }
      if (event.key !== "Tab") return;
      const dialog = document.querySelector<HTMLElement>(".sv1-user-center");
      if (!dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", containModalFocus);
    return () => {
      window.cancelAnimationFrame(focusTimer);
      window.removeEventListener("keydown", containModalFocus);
      background.forEach((element) => element.removeAttribute("inert"));
    };
  }, [userCenterOpen]);

  function switchRoom(next: RoomId) {
    const contract = roomContracts.find((item) => item.id === next)!;
    setSurfaceId(next);
    if (contract.renderMode === "presentation") setDockMode("COLLAPSED");
    else if (dockMode === "COLLAPSED") setDockMode("FLOATING");
  }

  function openSemesterHome() {
    setSurfaceId("semester");
    if (dockMode === "COLLAPSED") setDockMode("FLOATING");
  }

  function openUserCenter() {
    setOverlay(null);
    setUserCenterOpen(true);
  }

  function closeUserCenter() {
    setUserCenterOpen(false);
    window.requestAnimationFrame(() => userAvatarRef.current?.focus());
  }

  function cycleDock() {
    const next =
      dockOrder[(dockOrder.indexOf(dockMode) + 1) % dockOrder.length];
    setDockMode(next);
  }

  function selectWorkspaceTerm(termId: string) {
    const nextAssignment = enabledAssignments.find(
      (assignment) => assignment.termId === termId,
    );
    if (!nextAssignment) return;
    setActiveTermId(termId);
    setActiveAssignmentId(nextAssignment.id);
  }

  function toggleWorkspaceAssignment(assignmentId: string) {
    const assignment = academicWorkspaceFixture.assignments.find(
      (item) => item.id === assignmentId,
    );
    if (!assignment) return;
    const enabledInTerm = academicWorkspaceFixture.assignments.filter(
      (item) =>
        item.termId === assignment.termId &&
        enabledAssignmentIds.includes(item.id),
    );
    const isEnabled = enabledAssignmentIds.includes(assignmentId);
    if (isEnabled && enabledInTerm.length === 1) return;
    setEnabledAssignmentIds((current) =>
      isEnabled
        ? current.filter((id) => id !== assignmentId)
        : [...current, assignmentId],
    );
    if (isEnabled && activeAssignmentId === assignmentId) {
      const fallback = enabledInTerm.find((item) => item.id !== assignmentId);
      if (fallback) setActiveAssignmentId(fallback.id);
    }
  }

  function applyUserCenterDraft(draft: UserCenterDraft) {
    const validEnabledAssignments = draft.enabledAssignmentIds.filter((assignmentId) =>
      academicWorkspaceFixture.assignments.some((assignment) => assignment.id === assignmentId),
    );
    if (!validEnabledAssignments.length) return;
    const validClassSelection = Object.fromEntries(
      academicWorkspaceFixture.teachingAssignmentFacts.map((fact) => {
        const selected = draft.enabledClassIds[fact.assignmentId] || [];
        const allowed = selected.filter((classId) => fact.authorizedClassIds.includes(classId));
        return [fact.assignmentId, allowed.length ? allowed : [fact.authorizedClassIds[0]]];
      }),
    );
    setTeacherProfile(draft.profile);
    setTeachingPreferences(draft.preferences);
    setEnabledAssignmentIds(validEnabledAssignments);
    setSelectedClassIds(validClassSelection);
    if (!validEnabledAssignments.includes(activeAssignmentId)) {
      setActiveAssignmentId(validEnabledAssignments[0]);
    }
  }

  function toggleWorkspaceClass(assignmentId: string, classId: string) {
    setSelectedClassIds((current) => {
      const selectedIds = current[assignmentId] || [];
      const selected = selectedIds.includes(classId);
      if (selected && selectedIds.length === 1) return current;
      return {
        ...current,
        [assignmentId]: selected
          ? selectedIds.filter((id) => id !== classId)
          : [...selectedIds, classId],
      };
    });
  }

  return (
    <main
      className={`sv1-app dock-${dockMode.toLowerCase()} mode-${renderMode}`}
    >
      <header className="sv1-header">
        <button
          className="sv1-brand"
          onClick={() => switchRoom("welcome")}
          aria-label="返回师维欢迎页"
        >
          <i>师</i>
          <span>
            <b>师维</b>
            <small>AI 教师工作台</small>
          </span>
        </button>
        <nav aria-label="全局空间导航">
          <button
            className={surfaceId === "semester" ? "active" : ""}
            onClick={openSemesterHome}
          >
            <span>⌂</span>学期工作台
          </button>
          {roomContracts
            .filter((item) => item.id !== "welcome")
            .map((item) => (
              <button
                key={item.id}
                className={surfaceId === item.id ? "active" : ""}
                onClick={() => switchRoom(item.id)}
              >
                <span>{item.icon}</span>
                {item.label}
              </button>
            ))}
        </nav>
        <div className="sv1-header-state">
          <span className="sv1-online-dot" />
          <span className="sv1-online-label">小教在线</span>
          <button
            ref={userAvatarRef}
            className={`sv1-user-avatar ${userCenterOpen ? "active" : ""}`}
            style={teacherProfile.avatarImage ? { backgroundImage: `url("${teacherProfile.avatarImage}")` } : undefined}
            aria-label="打开用户中心"
            aria-expanded={userCenterOpen}
            aria-haspopup="dialog"
            onClick={openUserCenter}
          >
            {teacherProfile.avatarImage ? "" : (teacherProfile.avatarText || teacherProfile.displayName.slice(0, 1))}
          </button>
        </div>
      </header>

      <section
        className={`sv1-stage-shell ${surfaceId === "welcome" ? "is-welcome" : ""}`}
      >
        {surfaceId === "welcome" && (
          <WelcomeSurface enter={() => switchRoom("prep")} />
        )}
        {surfaceId === "semester" && (
          <SemesterWorkspaceHome
            context={academicContext}
            selectAssignment={setActiveAssignmentId}
            openRoom={switchRoom}
          />
        )}
        {room && surfaceId !== "welcome" && (
          <RoomSurface
            key={room.id}
            roomId={room.id}
            label={room.label}
            purpose={room.purpose}
            renderMode={renderMode}
            slots={room.slots}
            openOverlay={setOverlay}
            academicContext={academicContext}
            scope={room.scope}
            selectAssignment={setActiveAssignmentId}
          />
        )}
      </section>

      {surfaceId !== "welcome" && (
        <GlobalAgentInputHost>
          <AgentDock
            mode={dockMode}
            cycle={cycleDock}
            setMode={setDockMode}
            context={`${activeTerm.label} · ${activeAssignment.grade}${activeAssignment.subject} · ${surfaceId === "semester" ? "学期工作台" : room?.label} · ${renderMode}`}
          />
        </GlobalAgentInputHost>
      )}
      <div className="sv1-overlay-host" aria-live="polite">
        {overlay && (
          <GlobalOverlay
            type={overlay}
            close={() => setOverlay(null)}
            academicContext={academicContext}
            availableAssignments={academicWorkspaceFixture.assignments}
            selectedClassIds={selectedClassIds}
            enabledAssignmentIds={enabledAssignmentIds}
            selectTerm={selectWorkspaceTerm}
            selectAssignment={setActiveAssignmentId}
            toggleAssignment={toggleWorkspaceAssignment}
            toggleClass={toggleWorkspaceClass}
          />
        )}
      </div>
      {userCenterOpen && (
        <div
          className="sv1-user-center-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeUserCenter();
          }}
          role="presentation"
        >
          <div className="sv1-user-center-layer">
            <UserCenterSurface
              profile={teacherProfile}
              preferences={teachingPreferences}
              applyDraft={applyUserCenterDraft}
              close={closeUserCenter}
              teachingContext={{
                terms: academicWorkspaceFixture.terms,
                activeTermId,
                activeAssignmentId,
                availableAssignments: academicWorkspaceFixture.assignments,
                assignmentFacts: academicWorkspaceFixture.teachingAssignmentFacts,
                workspaceSelection: academicContext.workspaceSelection,
                scheduleOccurrences: teacherScheduleOccurrences,
              }}
              selectTerm={selectWorkspaceTerm}
              selectAssignment={setActiveAssignmentId}
            />
          </div>
        </div>
      )}
    </main>
  );
}

function SemesterWorkspaceHome({
  context,
  selectAssignment,
  openRoom,
}: {
  context: AcademicWorkspaceContext;
  selectAssignment: (assignmentId: string) => void;
  openRoom: (room: RoomId) => void;
}) {
  const activeTerm = getActiveTerm(context);
  const activeTermAssignments = getActiveTermAssignments(context);
  const activeAssignment = getActiveAssignment(context);
  const activeUnit =
    activeAssignment.courseMap.units.find(
      (unit) => unit.id === activeAssignment.courseMap.activeUnitId,
    ) || null;
  const assignmentSummary = activeTermAssignments
    .map((item) => `${item.grade}${item.subject} · ${item.classIds.length}个班`)
    .join(" / ");
  const progressPercent = Math.min(
    100,
    Math.max(
      0,
      (activeAssignment.courseMap.currentWeek /
        activeAssignment.courseMap.totalWeeks) *
        100,
    ),
  );
  const summary = context.semesterSummary;
  return (
    <section className="sv1-semester-home">
      <header className="sv1-semester-header">
        <div>
          <span>学期工作台 · 今天</span>
          <h1>
            {activeTerm.academicYear} · {activeTerm.label}
          </h1>
          <p>{assignmentSummary}</p>
        </div>
        <div className="sv1-term-progress">
          <span>
            {activeAssignment.grade}当前第{" "}
            {activeAssignment.courseMap.currentWeek} 周
          </span>
          <b>
            {activeAssignment.courseMap.currentWeek} /{" "}
            {activeAssignment.courseMap.totalWeeks}
          </b>
          <i>
            <em style={{ width: `${progressPercent}%` }} />
          </i>
        </div>
      </header>
      <section
        className="sv1-assignment-tabs"
        aria-label="当前学期任教任务"
        role="tablist"
      >
        {activeTermAssignments.map((assignment) => (
          <button
            key={assignment.id}
            role="tab"
            aria-selected={assignment.id === activeAssignment.id}
            className={assignment.id === activeAssignment.id ? "active" : ""}
            onClick={() => selectAssignment(assignment.id)}
          >
            <b>
              {assignment.grade}
              {assignment.subject}
            </b>
            <span>
              {assignment.classIds.length}个班 · {assignment.textbook}
            </span>
          </button>
        ))}
      </section>
      <section className="sv1-daily-priority" aria-label="今日优先工作">
        <button className="sv1-resume-primary" onClick={() => openRoom("prep")}>
          <span>上次工作线索 · 尚未接入真实恢复</span>
          <b>{activeAssignment.workspace.continueTitle}</b>
          <small>{activeAssignment.workspace.continueMeta}</small>
          <em>进入备课室查看 →</em>
        </button>
        <button
          className="sv1-today-primary"
          onClick={() => openRoom("classroom")}
        >
          <span>今日课堂</span>
          <b>{activeAssignment.workspace.todayClassCount} 节</b>
          <small>{activeAssignment.grade} · 当前任教任务</small>
          <em>进入教室 →</em>
        </button>
      </section>
      <section className="sv1-course-map">
        <div>
          <span>当前进行中的课程与单元</span>
          <h2>
            {activeUnit
              ? `${activeAssignment.grade} · 第${activeUnit.order}单元《${activeUnit.title}》`
              : `${activeAssignment.grade} · 尚未指定当前单元`}
          </h2>
          <p>
            {activeAssignment.courseMap.units.length}个单元 · 第
            {activeAssignment.courseMap.currentWeek}周
          </p>
        </div>
        <div
          className="sv1-unit-line"
          style={{
            gridTemplateColumns: `repeat(${activeAssignment.courseMap.units.length}, minmax(0, 1fr))`,
          }}
        >
          {activeAssignment.courseMap.units.map((unit) => (
            <span
              key={unit.id}
              className={
                unit.status === "ACTIVE"
                  ? "active"
                  : unit.status === "COMPLETED"
                    ? "done"
                    : ""
              }
            >
              <i>{unit.order}</i>
              <b>{unit.status === "ACTIVE" ? "当前单元" : unit.title}</b>
            </span>
          ))}
        </div>
      </section>
      <section className="sv1-workflow-card">
        <header>
          <div>
            <span>同一教学对象的连续状态</span>
            <h2>{activeAssignment.workspace.currentLessonLabel}</h2>
          </div>
          <small>备课、课堂、评阅不再是三个孤立入口</small>
        </header>
        <div className="sv1-workflow-line">
          <button onClick={() => openRoom("prep")}>
            <i>1</i>
            <span>
              <b>备课</b>
              <small>{activeAssignment.workspace.workflow.prep}</small>
            </span>
          </button>
          <em>→</em>
          <button onClick={() => openRoom("classroom")}>
            <i>2</i>
            <span>
              <b>课堂</b>
              <small>{activeAssignment.workspace.workflow.classroom}</small>
            </span>
          </button>
          <em>→</em>
          <button onClick={() => openRoom("review")}>
            <i>3</i>
            <span>
              <b>评阅</b>
              <small>{activeAssignment.workspace.workflow.review}</small>
            </span>
          </button>
        </div>
      </section>
      <section className="sv1-semester-task-grid" aria-label="近期任务">
        <button onClick={() => openRoom("prep")}>
          <span>近期备课</span>
          <b>{activeAssignment.workspace.prepPendingCount} 节</b>
          <small>进入备课室 →</small>
        </button>
        <button onClick={() => openRoom("review")}>
          <span>待评作品</span>
          <b>{activeAssignment.workspace.reviewPendingCount} 份</b>
          <small>进入评阅室 →</small>
        </button>
        <button onClick={() => openRoom("review")}>
          <span>待教师确认</span>
          <b>{activeAssignment.workspace.teacherConfirmationCount} 项</b>
          <small>查看确认项 →</small>
        </button>
        <article>
          <span>本学期提醒</span>
          <b>
            {summary.missingMaterialCount + summary.taughtPendingReviewCount} 项
          </b>
          <small>
            {summary.missingMaterialCount}项待补材料 ·{" "}
            {summary.taughtPendingReviewCount}项待回看
          </small>
        </article>
      </section>
    </section>
  );
}

function WelcomeSurface({ enter }: { enter: () => void }) {
  return (
    <div className="sv1-original-welcome">
      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">
            <span /> 为复杂教学任务而生
          </p>
          <h1>
            不是替老师写一篇教案，
            <br />
            而是陪老师<span>完成一次教学判断。</span>
          </h1>
          <p className="hero-lead">
            师维把教材、经验、课堂事件和学习证据组织成一条可追溯、可审核、可修改的工作链，让
            AI 真正进入教师工作的全过程。
          </p>
          <div className="hero-actions">
            <button className="primary-button" onClick={enter}>
              进入真实备课体验 <span>→</span>
            </button>
            <span className="text-button">为什么是师维？</span>
          </div>
          <div className="trust-row">
            <span>教师始终拥有最终决定权</span>
            <span>依据可回看</span>
            <span>过程可继续</span>
          </div>
        </div>
        <div className="hero-note" aria-label="产品核心工作流">
          <div className="paper-tab">一节课如何被理解</div>
          <div className="note-date">备课札记 · 07 / 11</div>
          <blockquote>
            “先判断这节课为什么存在，再决定课堂怎样展开。”
          </blockquote>
          <div className="pencil-line" />
          <ol>
            <li>
              <b>看依据</b>
              <span>教材与教师原稿</span>
            </li>
            <li>
              <b>做推理</b>
              <span>单元位置与课时责任</span>
            </li>
            <li>
              <b>展课堂</b>
              <span>示范、练习、支架与创作</span>
            </li>
            <li>
              <b>留证据</b>
              <span>评价、审核与教研回流</span>
            </li>
          </ol>
          <div className="stamp">教师确认</div>
        </div>
      </section>
    </div>
  );
}

type PrepToolId =
  "week_schedule" | "preparation" | "class_progress" | "semester_plan";

const prepTools: {
  id: PrepToolId;
  icon: string;
  title: string;
  question: string;
}[] = [
  {
    id: "week_schedule",
    icon: "表",
    title: "课表",
    question: "今天哪个班上哪一课",
  },
  {
    id: "preparation",
    icon: "备",
    title: "备课",
    question: "从大单元进入具体课时",
  },
  {
    id: "class_progress",
    icon: "班",
    title: "班级进度",
    question: "各班现在走到哪里",
  },
  {
    id: "semester_plan",
    icon: "期",
    title: "学期规划",
    question: "本学期课程怎样展开",
  },
];

type PrepTimetableStatus =
  "ready" | "preparing" | "not_started" | "needs_confirmation" | "hold";
type PrepTimetableEntry = {
  id: string;
  dayId: string;
  period: number;
  assignmentId: string;
  classLabel: string;
  lessonId: string;
  lessonCode: string;
  lessonTitle: string;
  room: string;
  status: PrepTimetableStatus;
  statusLabel: string;
};

type SemesterPlanTone = "intro" | "unit" | "festival" | "flex" | "exam";
type SemesterPlanCell = {
  title: string;
  hours: number;
  tone: SemesterPlanTone;
};
type SemesterUnitPlan = {
  order: number | "专";
  title: string;
  weeks: string;
  startWeek: number;
  endWeek: number;
  hours: number;
  tone: SemesterPlanTone;
};
const semesterPlanDates = [
  "3/5",
  "3/10–3/14",
  "3/17–3/21",
  "3/24–3/28",
  "3/31–4/4",
  "4/7–4/11",
  "4/14–4/18",
  "4/21–4/25",
  "4/28–5/2",
  "5/5–5/9",
  "5/11–5/15",
  "5/18–5/22",
  "5/25–5/29",
  "6/1–6/5",
  "6/9–6/13",
  "6/16–6/21",
];
const semesterPlanCalendar = [
  "开学",
  "",
  "",
  "",
  "清明",
  "足球联赛",
  "足球联赛",
  "创艺节",
  "创艺节·五一",
  "五一收尾",
  "",
  "",
  "",
  "儿童节",
  "机动",
  "考试周",
];
const grade3SemesterPlan: SemesterPlanCell[] = [
  { title: "开学第一课", hours: 1, tone: "intro" },
  { title: "多彩的世界", hours: 2, tone: "unit" },
  { title: "色彩→海洋", hours: 2, tone: "unit" },
  { title: "辽阔的海洋", hours: 2, tone: "unit" },
  { title: "辽阔的海洋", hours: 2, tone: "unit" },
  { title: "辽阔的海洋", hours: 2, tone: "unit" },
  { title: "红领巾告诉我", hours: 2, tone: "unit" },
  { title: "创艺节·足球梦", hours: 2, tone: "festival" },
  { title: "创艺节·足球梦", hours: 2, tone: "festival" },
  { title: "青绿中国色", hours: 2, tone: "unit" },
  { title: "青绿中国色", hours: 2, tone: "unit" },
  { title: "足下生辉", hours: 2, tone: "unit" },
  { title: "足下生辉", hours: 2, tone: "unit" },
  { title: "虎虎生威", hours: 2, tone: "unit" },
  { title: "成长日记", hours: 2, tone: "unit" },
  { title: "机动·复习", hours: 2, tone: "flex" },
];
const grade4SemesterPlan: SemesterPlanCell[] = [
  { title: "开学第一课", hours: 1, tone: "intro" },
  { title: "对比与和谐", hours: 2, tone: "unit" },
  { title: "对比→编织", hours: 3, tone: "unit" },
  { title: "编织·纸艺", hours: 2, tone: "unit" },
  { title: "编织·纸艺", hours: 2, tone: "unit" },
  { title: "编织→自然", hours: 3, tone: "unit" },
  { title: "自然·生命", hours: 2, tone: "unit" },
  { title: "创艺节+自然", hours: 2, tone: "festival" },
  { title: "创艺节+纹样", hours: 2, tone: "festival" },
  { title: "纹样→创意", hours: 3, tone: "unit" },
  { title: "创意·表现", hours: 2, tone: "unit" },
  { title: "创意→设计", hours: 3, tone: "unit" },
  { title: "立体·工艺", hours: 2, tone: "unit" },
  { title: "立体·工艺", hours: 3, tone: "unit" },
  { title: "机动·补课", hours: 2, tone: "flex" },
  { title: "考试周", hours: 0, tone: "exam" },
];
const grade3SemesterUnits: SemesterUnitPlan[] = [
  {
    order: 1,
    title: "多彩的世界",
    weeks: "第2—3周",
    startWeek: 2,
    endWeek: 3,
    hours: 3,
    tone: "unit",
  },
  {
    order: 2,
    title: "辽阔的海洋",
    weeks: "第3—6周",
    startWeek: 3,
    endWeek: 6,
    hours: 3,
    tone: "unit",
  },
  {
    order: 3,
    title: "红领巾告诉我",
    weeks: "第7周",
    startWeek: 7,
    endWeek: 7,
    hours: 2,
    tone: "unit",
  },
  {
    order: "专",
    title: "创艺节·足球梦",
    weeks: "第8—9周",
    startWeek: 8,
    endWeek: 9,
    hours: 4,
    tone: "festival",
  },
  {
    order: 4,
    title: "青绿中国色",
    weeks: "第10—11周",
    startWeek: 10,
    endWeek: 11,
    hours: 2,
    tone: "unit",
  },
  {
    order: 5,
    title: "足下生辉",
    weeks: "第12—13周",
    startWeek: 12,
    endWeek: 13,
    hours: 3,
    tone: "unit",
  },
  {
    order: 6,
    title: "虎虎生威",
    weeks: "第14周",
    startWeek: 14,
    endWeek: 14,
    hours: 2,
    tone: "unit",
  },
  {
    order: 7,
    title: "成长日记",
    weeks: "第15周",
    startWeek: 15,
    endWeek: 15,
    hours: 2,
    tone: "unit",
  },
];
const grade4SemesterUnits: SemesterUnitPlan[] = [
  {
    order: 1,
    title: "对比与和谐",
    weeks: "第2—3周",
    startWeek: 2,
    endWeek: 3,
    hours: 3,
    tone: "unit",
  },
  {
    order: 2,
    title: "编织·纸艺",
    weeks: "第3—6周",
    startWeek: 3,
    endWeek: 6,
    hours: 6,
    tone: "unit",
  },
  {
    order: 3,
    title: "自然·生命",
    weeks: "第6—8周",
    startWeek: 6,
    endWeek: 8,
    hours: 6,
    tone: "unit",
  },
  {
    order: "专",
    title: "创艺节·足球",
    weeks: "第8—9周",
    startWeek: 8,
    endWeek: 9,
    hours: 4,
    tone: "festival",
  },
  {
    order: 4,
    title: "纹样·传统",
    weeks: "第9—10周",
    startWeek: 9,
    endWeek: 10,
    hours: 4,
    tone: "unit",
  },
  {
    order: 5,
    title: "创意·表现",
    weeks: "第10—12周",
    startWeek: 10,
    endWeek: 12,
    hours: 4,
    tone: "unit",
  },
  {
    order: 6,
    title: "设计·应用",
    weeks: "第12周",
    startWeek: 12,
    endWeek: 12,
    hours: 4,
    tone: "unit",
  },
  {
    order: 7,
    title: "立体·工艺",
    weeks: "第13—14周",
    startWeek: 13,
    endWeek: 14,
    hours: 4,
    tone: "unit",
  },
];

function getPrepLessons(
  assignment: CourseAssignment,
): LessonPreparationSummary[] {
  if (assignment.grade === "四年级")
    return [
      {
        id: "lesson_grade4_paper_magic_01",
        title: "纸卷魔术",
        unitId: "g4_u3",
        unitLabel: "纸卷魔术",
        lessonOrder: 1,
        week: 10,
        classScope: "四年级5班",
        status: "待教师审核",
      },
      {
        id: "lesson_grade4_weaving_02",
        title: "穿穿编编",
        unitId: "g4_u3",
        unitLabel: "纸卷魔术",
        lessonOrder: 2,
        week: 11,
        classScope: "四年级5班",
        status: "待修改",
        holdReason: "材料规格待确认",
      },
      {
        id: "lesson_grade4_shape_design_03",
        title: "图形的联想",
        unitId: "g4_u4",
        unitLabel: "图形与设计",
        lessonOrder: 1,
        week: 12,
        classScope: "四年级5班",
        status: "继续备课",
      },
    ];
  return [
    {
      id: "lesson_grade3_gradient_01",
      title: "色彩的渐变",
      unitId: "g3_u2",
      unitLabel: "多彩的世界",
      lessonOrder: 1,
      week: 10,
      classScope: "三年级5班",
      status: "继续备课",
    },
    {
      id: "lesson_grade3_rhythm_02",
      title: "渐变的节奏",
      unitId: "g3_u2",
      unitLabel: "多彩的世界",
      lessonOrder: 2,
      week: 11,
      classScope: "三年级5班",
      status: "待教师审核",
    },
    {
      id: "lesson_grade3_memory_03",
      title: "画一段记忆",
      unitId: "g3_u3",
      unitLabel: "影像与记忆",
      lessonOrder: 1,
      week: 12,
      classScope: "三年级5班",
      status: "待修改",
      holdReason: "范画来源待补充",
    },
    {
      id: "lesson_grade3_shoe_hold_01",
      title: "画画鞋",
      unitId: "g3_u5",
      unitLabel: "鞋的想象",
      lessonOrder: 1,
      week: 13,
      classScope: "三年级5班",
      status: "待修改",
      holdReason: "大单元归属待确认",
    },
  ];
}

function getPrepTimetable(
  assignments: CourseAssignment[],
): PrepTimetableEntry[] {
  const classOccurrences = new Map<string, number>();
  const prepState = (
    lesson: LessonPreparationSummary,
  ): { status: PrepTimetableStatus; label: string } => {
    if (lesson.holdReason) return { status: "hold", label: "HOLD" };
    if (lesson.status === "待教师审核")
      return { status: "needs_confirmation", label: "待确认" };
    if (lesson.status === "继续备课")
      return { status: "preparing", label: "备课中" };
    return { status: "not_started", label: "未备课" };
  };
  return teacherScheduleOccurrences.map((occurrenceFact) => {
    const assignment =
      assignments.find((item) => item.id === occurrenceFact.assignmentId) ||
      assignments[0];
    const lessons = getPrepLessons(assignment);
    const classNo = occurrenceFact.classId.split("_").at(-1) || "";
    const gradeLabel = assignment.grade.replace("年级", "");
    const period = Number(occurrenceFact.periodId.replace("p", ""));
    const occurrenceKey = occurrenceFact.classId;
    const occurrence = classOccurrences.get(occurrenceKey) || 0;
    classOccurrences.set(occurrenceKey, occurrence + 1);
    const lesson =
      lessons[Math.min(occurrence, lessons.length - 1)] || lessons[0];
    const state = prepState(lesson);
    return {
      id: occurrenceFact.occurrenceId,
      dayId: occurrenceFact.dayId,
      period,
      assignmentId: assignment.id,
      classLabel: `${gradeLabel}（${classNo}）班`,
      lessonId: lesson.id,
      lessonCode: `${assignment.courseMap.units.find((unit) => unit.id === lesson.unitId)?.order || 1}-${lesson.lessonOrder}`,
      lessonTitle: lesson.title,
      room: "",
      status: state.status,
      statusLabel: state.label,
    };
  });
}

function RoomSurface({
  roomId,
  label,
  purpose,
  renderMode,
  slots,
  openOverlay,
  academicContext,
  scope,
  selectAssignment,
}: {
  roomId: RoomId;
  label: string;
  purpose: string;
  renderMode: RenderMode;
  slots: { left: boolean; center: true; right: boolean };
  openOverlay: (type: "source" | "confirm") => void;
  academicContext: AcademicWorkspaceContext;
  scope: "brand" | "term" | "cross-term";
  selectAssignment: (assignmentId: string) => void;
}) {
  if (roomId === "prep")
    return (
      <PrepRoomSurface
        academicContext={academicContext}
        openOverlay={openOverlay}
        selectAssignment={selectAssignment}
      />
    );
  if (roomId === "classroom")
    return (
      <ClassroomSurface
        academicContext={academicContext}
        openOverlay={openOverlay}
      />
    );
  return (
    <GenericRoomSurface
      roomId={roomId}
      label={label}
      purpose={purpose}
      renderMode={renderMode}
      slots={slots}
      openOverlay={openOverlay}
      academicContext={academicContext}
      scope={scope}
    />
  );
}

function GenericRoomSurface({
  roomId,
  label,
  purpose,
  renderMode,
  slots,
  openOverlay,
  academicContext,
  scope,
}: {
  roomId: RoomId;
  label: string;
  purpose: string;
  renderMode: RenderMode;
  slots: { left: boolean; center: true; right: boolean };
  openOverlay: (type: "source" | "confirm") => void;
  academicContext: AcademicWorkspaceContext;
  scope: "brand" | "term" | "cross-term";
}) {
  const roomTools =
    roomId === "classroom"
      ? [
          {
            id: "classroom_rhythm",
            icon: "节",
            title: "课堂节奏",
            question: "现在进行到哪里",
          },
          {
            id: "classroom_screen",
            icon: "屏",
            title: "课堂大屏",
            question: "学生正在看什么",
          },
          {
            id: "student_response",
            icon: "生",
            title: "学生响应",
            question: "哪里需要停一下",
          },
        ]
      : roomId === "review"
        ? [
            {
              id: "artifact_batch",
              icon: "批",
              title: "作品批次",
              question: "这次评什么",
            },
            {
              id: "learning_evidence",
              icon: "证",
              title: "学习证据",
              question: "判断依据是什么",
            },
            {
              id: "teacher_confirmation",
              icon: "评",
              title: "教师确认",
              question: "哪些需要我决定",
            },
          ]
        : roomId === "research"
          ? [
              {
                id: "research_question",
                icon: "题",
                title: "研究问题",
                question: "真实问题是什么",
              },
              {
                id: "evidence_canvas",
                icon: "据",
                title: "证据画布",
                question: "证据如何连接",
              },
              {
                id: "research_output",
                icon: "稿",
                title: "成果沉淀",
                question: "下一步写什么",
              },
            ]
          : [
              {
                id: "resource_catalog",
                icon: "目",
                title: "资料目录",
                question: "资料放在哪里",
              },
              {
                id: "source_authority",
                icon: "源",
                title: "来源权重",
                question: "哪些依据更可靠",
              },
              {
                id: "reuse_history",
                icon: "用",
                title: "复用记录",
                question: "被哪些任务使用",
              },
            ];
  const [activeToolId, setActiveToolId] = useState(roomTools[0].id);
  const activeTool =
    roomTools.find((tool) => tool.id === activeToolId) || roomTools[0];
  const activeTerm = getActiveTerm(academicContext);
  const activeAssignment = getActiveAssignment(academicContext);
  const activeUnit =
    activeAssignment.courseMap.units.find(
      (unit) => unit.id === activeAssignment.courseMap.activeUnitId,
    ) || null;
  return (
    <section
      className={`sv1-room-shell room-${roomId} slots-${slots.left ? "l" : ""}${slots.right ? "r" : ""}`}
    >
      {slots.left && (
        <aside className="sv1-slot sv1-left-slot">
          <p className="sv1-tool-label">{label}工具</p>
          <nav>
            {roomTools.map((tool) => (
              <button
                key={tool.id}
                className={activeToolId === tool.id ? "active" : ""}
                onClick={() => setActiveToolId(tool.id)}
              >
                <i>{tool.icon}</i>
                <span>
                  <b>{tool.title}</b>
                  <small>{tool.question}</small>
                </span>
              </button>
            ))}
          </nav>
          <p>学期与任教任务由全局壳层提供；这里仅承载当前空间的三级工具。</p>
        </aside>
      )}
      <section className="sv1-center-stage">
        <header>
          <div>
            <span>{label} · 当前工具</span>
            <h1>{activeTool.title}</h1>
            <p>{purpose}</p>
          </div>
        </header>
        <ContentSurface
          mode={renderMode}
          roomId={roomId}
          activeTool={activeTool.title}
          assignment={activeAssignment}
        />
      </section>
      {slots.right && (
        <aside className="sv1-slot sv1-right-slot">
          {scope === "cross-term" ? (
            <>
              <span>查看范围</span>
              <h2>当前学期筛选</h2>
              <article>
                <b>时间范围</b>
                <p>
                  {activeTerm.academicYear} · {activeTerm.label}
                </p>
              </article>
              <article>
                <b>生命周期</b>
                <p>{label}跨学期积累；当前学期只用于筛选，不拥有这些内容。</p>
              </article>
              <article>
                <b>可选范围</b>
                <p>全部学期 / 当前学期（真实切换尚未实现）</p>
              </article>
            </>
          ) : (
            <>
              <span>当前工作上下文</span>
              <h2>{activeTerm.label}</h2>
              <article>
                <b>教学对象</b>
                <p>
                  {activeAssignment.grade} · {activeUnit?.title || "未指定单元"}{" "}
                  · 第{activeAssignment.courseMap.currentWeek}周
                </p>
              </article>
              <article>
                <b>临时查看</b>
                <button onClick={() => openOverlay("source")}>
                  打开来源浮层
                </button>
              </article>
              <article>
                <b>教师确认</b>
                <button onClick={() => openOverlay("confirm")}>
                  打开确认浮层
                </button>
              </article>
            </>
          )}
        </aside>
      )}
    </section>
  );
}

type LessonDetailStatus =
  | "LOADING"
  | "RETRYING"
  | "READY"
  | "HOLD"
  | "BACKEND_OFFLINE"
  | "ASSET_INTEGRITY_ERROR"
  | "REQUEST_REJECTED"
  | "FAILED";
type LessonDetailState = {
  status: LessonDetailStatus;
  data?: PrepReasoningBffViewModel;
  message?: string;
};

function PrepRoomSurface({
  academicContext,
  openOverlay,
  selectAssignment,
}: {
  academicContext: AcademicWorkspaceContext;
  openOverlay: (type: "source" | "confirm") => void;
  selectAssignment: (assignmentId: string) => void;
}) {
  const activeTerm = getActiveTerm(academicContext);
  const assignment = getActiveAssignment(academicContext);
  const termAssignments = getActiveTermAssignments(academicContext);
  const lessons = getPrepLessons(assignment);
  const initialLessonId = useMemo(
    () =>
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("lesson")
        : null,
    [],
  );
  const [surfaceId, setSurfaceId] = useState<PrepSurfaceId>(
    initialLessonId ? "lesson_detail" : "week_schedule",
  );
  const [activeLessonId, setActiveLessonId] = useState<string | null>(
    initialLessonId,
  );
  const [activeProjection, setActiveProjection] =
    useState<LessonProjectionId>("lesson_plan");
  const [activeUnitId, setActiveUnitId] = useState(
    assignment.courseMap.activeUnitId ||
      assignment.courseMap.units[0]?.id ||
      "",
  );
  const [activeWeek, setActiveWeek] = useState(
    assignment.courseMap.currentWeek,
  );
  const [activeClassFilter, setActiveClassFilter] = useState("all");
  const [lessonDetailState, setLessonDetailState] =
    useState<LessonDetailState | null>(null);
  const [lessonViewVersion, setLessonViewVersion] = useState<LessonViewVersion>(
    initialLessonId === "lesson_grade3_gradient_01"
      ? "candidate-v0.5-p1"
      : "runtime-v0.3",
  );
  const [screenEditorState, dispatchScreenEditorAction] = useReducer(
    (state: ScreenEditorState, action: LessonWorkspaceAction) =>
      reduceScreenEditorState(state, action, screenEditorContext),
    colorGradientV05P1Candidate.screenBindings[0],
    (firstBinding) =>
      createInitialScreenEditorState(
        firstBinding,
        screenEditorContext.bindings,
        screenEditorContext.screenOrder,
      ),
  );
  const screenEditorStateRef = useRef(screenEditorState);
  const draftAssetRegistryRef = useRef(
    screenEditorState.draftSession.draftAssets,
  );
  const lessonCache = useRef(new Map<string, PrepReasoningBffViewModel>());
  const requestSerial = useRef(0);
  const initialLessonApplied = useRef(false);
  const activeLesson =
    lessons.find((lesson) => lesson.id === activeLessonId) || null;
  const toolId: PrepToolId = [
    "unit_design",
    "lesson_index",
    "lesson_detail",
  ].includes(surfaceId)
    ? "preparation"
    : (surfaceId as PrepToolId);
  const activeTool =
    prepTools.find((tool) => tool.id === toolId) || prepTools[0];
  useEffect(() => {
    screenEditorStateRef.current = screenEditorState;
  }, [screenEditorState]);
  useEffect(() => {
    const previous = draftAssetRegistryRef.current;
    Object.entries(previous)
      .filter(
        ([draftAssetId]) =>
          !screenEditorState.draftSession.draftAssets[draftAssetId],
      )
      .forEach(([, asset]) => releaseDraftAsset(asset));
    draftAssetRegistryRef.current = screenEditorState.draftSession.draftAssets;
  }, [screenEditorState.draftSession.draftAssets]);
  useEffect(
    () => () => releaseAllDraftAssets(screenEditorStateRef.current),
    [],
  );
  function openSurface(next: Exclude<PrepSurfaceId, "lesson_detail">) {
    requestSerial.current += 1;
    setSurfaceId(next);
    if (["unit_design", "lesson_index"].includes(next)) setActiveLessonId(null);
  }

  function openTool(tool: PrepToolId) {
    openSurface(tool === "preparation" ? "unit_design" : tool);
  }

  function switchPreparationAssignment(assignmentId: string) {
    const target = termAssignments.find((item) => item.id === assignmentId);
    if (!target || target.id === assignment.id) return;
    selectAssignment(target.id);
    setActiveUnitId(
      target.courseMap.activeUnitId || target.courseMap.units[0]?.id || "",
    );
    setActiveWeek(target.courseMap.currentWeek);
    setActiveLessonId(null);
    setActiveClassFilter("all");
    setLessonDetailState(null);
  }

  async function loadLessonDetail(
    lesson: LessonPreparationSummary,
    targetAssignment: CourseAssignment,
    retrying = false,
  ) {
    const reasoningRequest = getReadonlyReasoningRequest(lesson.id);
    if (!reasoningRequest) {
      setLessonDetailState({
        status: "REQUEST_REJECTED",
        message:
          "这节课尚未接入只读推理服务，页面不会用旧的静态教案冒充真实结果。",
      });
      return;
    }
    const cached = lessonCache.current.get(lesson.id);
    if (cached && !retrying) {
      setLessonDetailState({
        status:
          cached.readinessStatus === "HOLD_REQUIRES_TEACHER_ACTION"
            ? "HOLD"
            : "READY",
        data: cached,
      });
      return;
    }
    const serial = ++requestSerial.current;
    setLessonDetailState({ status: retrying ? "RETRYING" : "LOADING" });
    try {
      const data = await runPrepReasoning({
        workspaceContext: {
          term: {
            id: activeTerm.id,
            label: `${activeTerm.academicYear} · ${activeTerm.label}`,
          },
          assignment: {
            id: targetAssignment.id,
            grade: targetAssignment.grade,
            subject: targetAssignment.subject,
            textbook: targetAssignment.textbook,
          },
        },
        lessonIndex: lesson,
        reasoningRequest,
      });
      if (serial !== requestSerial.current) return;
      if (data.executionStatus !== "COMPLETED") {
        setLessonDetailState({
          status: "FAILED",
          message: "课时推理没有完成，请稍后重试。",
        });
        return;
      }
      lessonCache.current.set(lesson.id, data);
      setLessonDetailState({
        status:
          data.readinessStatus === "HOLD_REQUIRES_TEACHER_ACTION"
            ? "HOLD"
            : "READY",
        data,
      });
    } catch (error) {
      if (serial !== requestSerial.current) return;
      if (error instanceof PrepReasoningRequestError && error.status === 503) {
        setLessonDetailState({
          status: "BACKEND_OFFLINE",
          message: "备课后端暂时未连接。页面已停止，不会回退到旧的静态教案。",
        });
      } else if (
        error instanceof PrepReasoningRequestError &&
        error.errorCode === "ASSET_INTEGRITY_ERROR"
      ) {
        setLessonDetailState({
          status: "ASSET_INTEGRITY_ERROR",
          message:
            "教学资产版本或内容校验失败。页面已停止，不会回退到旧课时内容。",
        });
      } else if (
        error instanceof PrepReasoningRequestError &&
        [409, 422].includes(error.status)
      ) {
        setLessonDetailState({
          status: "REQUEST_REJECTED",
          message: "当前课时请求未通过只读服务校验，请检查课时资料后重试。",
        });
      } else {
        setLessonDetailState({
          status: "FAILED",
          message: "课时推理请求没有完成，请重试。",
        });
      }
    }
  }

  function openLesson(
    lessonId: string,
    assignmentId = assignment.id,
    retrying = false,
  ) {
    const targetAssignment =
      termAssignments.find((item) => item.id === assignmentId) || assignment;
    const lesson = getPrepLessons(targetAssignment).find(
      (item) => item.id === lessonId,
    );
    if (targetAssignment.id !== assignment.id)
      selectAssignment(targetAssignment.id);
    setActiveLessonId(lessonId);
    if (!retrying)
      setLessonViewVersion(
        lessonId === "lesson_grade3_gradient_01"
          ? "candidate-v0.5-p1"
          : "runtime-v0.3",
      );
    if (!retrying && lessonId === "lesson_grade3_gradient_01")
      dispatchScreenEditorAction({
        type: "OPEN_BOUND_SCREEN",
        bindingId: colorGradientV05P1Candidate.screenBindings[0].id,
        origin: "OTHER",
      });
    if (lesson) {
      setActiveUnitId(lesson.unitId);
      setActiveWeek(lesson.week);
    }
    setActiveProjection("lesson_plan");
    setSurfaceId("lesson_detail");
    if (lesson) void loadLessonDetail(lesson, targetAssignment, retrying);
    else
      setLessonDetailState({
        status: "REQUEST_REJECTED",
        message: "没有找到这个课时，无法发起只读推理。",
      });
  }

  function retryLesson() {
    const targetAssignment =
      termAssignments.find((item) =>
        getPrepLessons(item).some((lesson) => lesson.id === activeLessonId),
      ) || assignment;
    const lesson = getPrepLessons(targetAssignment).find(
      (item) => item.id === activeLessonId,
    );
    if (lesson) openLesson(lesson.id, targetAssignment.id, true);
  }

  useEffect(() => {
    if (initialLessonApplied.current || !initialLessonId) return;
    initialLessonApplied.current = true;
    const targetAssignment =
      termAssignments.find((item) =>
        getPrepLessons(item).some((lesson) => lesson.id === initialLessonId),
      ) || assignment;
    openLesson(initialLessonId, targetAssignment.id);
    // The deep link is intentionally consumed once; later assignment changes must not reopen it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLessonId]);

  return (
    <section
      className={`sv1-room-shell room-prep slots-lr ${screenEditorState.workspace.rightRailCollapsed ? "is-screen-rail-collapsed" : ""}`}
    >
      <aside className="sv1-slot sv1-left-slot sv1-prep-left">
        <nav>
          {prepTools.map((tool) => (
            <button
              key={tool.id}
              className={toolId === tool.id ? "active" : ""}
              onClick={() => openTool(tool.id)}
            >
              <i>{tool.icon}</i>
              <span>
                <b>{tool.title}</b>
                <small>{tool.question}</small>
              </span>
            </button>
          ))}
        </nav>
        <div className="sv1-prep-filters">
          <label>
            班级筛选
            <select
              value={activeClassFilter}
              onChange={(event) => setActiveClassFilter(event.target.value)}
            >
              <option value="all">全部班级</option>
              {termAssignments.flatMap((item) =>
                item.classIds.map((classId, index) => (
                  <option key={classId} value={classId}>
                    {item.grade.replace("年级", "")}（{index + 1}）班
                  </option>
                )),
              )}
            </select>
          </label>
        </div>
        <div className="sv1-prep-todos">
          <span>
            <b>待教师确认</b>
            <em>3</em>
          </span>
          <span>
            <b>待补材料</b>
            <em>2</em>
          </span>
          <span>
            <b>待修改候选</b>
            <em>2</em>
          </span>
        </div>
      </aside>
      <section className="sv1-center-stage sv1-prep-center">
        <header>
          <div>
            <h1>备课室 · {activeTool.title}</h1>
          </div>
        </header>
        <PrepContentSurface
          surfaceId={surfaceId}
          assignment={assignment}
          assignments={termAssignments}
          lessons={lessons}
          activeLesson={activeLesson}
          activeProjection={activeProjection}
          setActiveProjection={setActiveProjection}
          activeUnitId={activeUnitId}
          setActiveUnitId={setActiveUnitId}
          activeWeek={activeWeek}
          setActiveWeek={setActiveWeek}
          activeClassFilter={activeClassFilter}
          openLesson={openLesson}
          switchPreparationAssignment={switchPreparationAssignment}
          switchPreparationView={openSurface}
          backToLessons={() => openSurface("lesson_index")}
          lessonDetailState={lessonDetailState}
          retryLesson={retryLesson}
          lessonViewVersion={lessonViewVersion}
          screenEditorState={screenEditorState}
          dispatchScreenEditorAction={dispatchScreenEditorAction}
        />
      </section>
      <PrepRightRail
        surfaceId={surfaceId}
        assignment={assignment}
        activeLesson={activeLesson}
        activeProjection={activeProjection}
        lessonDetailState={lessonDetailState}
        lessonViewVersion={lessonViewVersion}
        screenEditorState={screenEditorState}
        dispatchScreenEditorAction={dispatchScreenEditorAction}
        openOverlay={openOverlay}
      />
    </section>
  );
}

type LessonSortKey = "title" | "unit" | "week" | "class" | "status" | "hold";

function PrepContentSurface({
  surfaceId,
  assignment,
  assignments,
  lessons,
  activeLesson,
  activeProjection,
  setActiveProjection,
  activeUnitId,
  setActiveUnitId,
  activeWeek,
  setActiveWeek,
  activeClassFilter,
  openLesson,
  switchPreparationAssignment,
  switchPreparationView,
  backToLessons,
  lessonDetailState,
  retryLesson,
  lessonViewVersion,
  screenEditorState,
  dispatchScreenEditorAction,
}: {
  surfaceId: PrepSurfaceId;
  assignment: CourseAssignment;
  assignments: CourseAssignment[];
  lessons: LessonPreparationSummary[];
  activeLesson: LessonPreparationSummary | null;
  activeProjection: LessonProjectionId;
  setActiveProjection: (projection: LessonProjectionId) => void;
  activeUnitId: string;
  setActiveUnitId: (unitId: string) => void;
  activeWeek: number;
  setActiveWeek: (week: number) => void;
  activeClassFilter: string;
  openLesson: (lessonId: string, assignmentId?: string) => void;
  switchPreparationAssignment: (assignmentId: string) => void;
  switchPreparationView: (
    surface: Exclude<PrepSurfaceId, "lesson_detail">,
  ) => void;
  backToLessons: () => void;
  lessonDetailState: LessonDetailState | null;
  retryLesson: () => void;
  lessonViewVersion: LessonViewVersion;
  screenEditorState: ScreenEditorState;
  dispatchScreenEditorAction: React.Dispatch<LessonWorkspaceAction>;
}) {
  const semesterTimelineRef = useRef<HTMLDivElement>(null);
  const lessonDetailScrollRef = useRef<HTMLElement>(null);
  const candidateSelection = screenEditorState.workspace;
  const semesterTimelineDrag = useRef({
    active: false,
    startX: 0,
    scrollLeft: 0,
  });
  const [lessonQuery, setLessonQuery] = useState("");
  const [lessonUnitFilter, setLessonUnitFilter] = useState("all");
  const [lessonWeekFilter, setLessonWeekFilter] = useState("all");
  const [lessonClassFilter, setLessonClassFilter] = useState("all");
  const [lessonStatusFilter, setLessonStatusFilter] = useState("all");
  const [lessonHoldFilter, setLessonHoldFilter] = useState("all");
  const [lessonSortKey, setLessonSortKey] = useState<LessonSortKey>("week");
  const [lessonSortDirection, setLessonSortDirection] = useState<
    "asc" | "desc"
  >("asc");
  const [progressBoard, setProgressBoard] = useState<"timeline" | "comparison">(
    "timeline",
  );
  const [semesterPlanScope, setSemesterPlanScope] = useState<
    "grade3" | "grade4"
  >(assignment.grade === "四年级" ? "grade4" : "grade3");
  const [semesterPlanMode, setSemesterPlanMode] = useState<"units" | "weeks">(
    "weeks",
  );
  const [planNarrativeOpen, setPlanNarrativeOpen] = useState(false);
  useEffect(() => {
    const timeline = semesterTimelineRef.current;
    if (surfaceId !== "class_progress" || !timeline) return;
    const dayPosition = (Math.min(activeWeek, 16) - 1) * 5 + 2.5;
    const todayPosition = 118 + dayPosition * 96;
    timeline.scrollLeft = Math.max(
      0,
      todayPosition - timeline.clientWidth * 0.56,
    );
  }, [surfaceId, activeWeek, progressBoard]);
  useEffect(() => {
    if (surfaceId === "lesson_detail")
      lessonDetailScrollRef.current?.scrollTo({ top: 0 });
  }, [surfaceId, activeProjection]);
  const filteredLessons = lessons
    .filter(
      (lesson) =>
        (!lessonQuery.trim() || lesson.title.includes(lessonQuery.trim())) &&
        (lessonUnitFilter === "all" || lesson.unitId === lessonUnitFilter) &&
        (lessonWeekFilter === "all" ||
          String(lesson.week) === lessonWeekFilter) &&
        (lessonClassFilter === "all" ||
          lesson.classScope === lessonClassFilter) &&
        (lessonStatusFilter === "all" ||
          lesson.status === lessonStatusFilter) &&
        (lessonHoldFilter === "all" ||
          (lessonHoldFilter === "has" && Boolean(lesson.holdReason)) ||
          (lessonHoldFilter === "none" && !lesson.holdReason)),
    )
    .sort((left, right) => {
      const values: Record<LessonSortKey, [string | number, string | number]> =
        {
          title: [left.title, right.title],
          unit: [left.unitLabel, right.unitLabel],
          week: [left.week, right.week],
          class: [left.classScope, right.classScope],
          status: [left.status, right.status],
          hold: [left.holdReason || "", right.holdReason || ""],
        };
      const [a, b] = values[lessonSortKey];
      const order =
        typeof a === "number" && typeof b === "number"
          ? a - b
          : String(a).localeCompare(String(b), "zh-CN");
      return lessonSortDirection === "asc" ? order : -order;
    });
  function toggleLessonSort(key: LessonSortKey) {
    if (lessonSortKey === key)
      setLessonSortDirection((current) => (current === "asc" ? "desc" : "asc"));
    else {
      setLessonSortKey(key);
      setLessonSortDirection("asc");
    }
  }
  function changePreparationAssignment(assignmentId: string) {
    setLessonQuery("");
    setLessonUnitFilter("all");
    setLessonWeekFilter("all");
    setLessonClassFilter("all");
    setLessonStatusFilter("all");
    setLessonHoldFilter("all");
    switchPreparationAssignment(assignmentId);
  }
  if (surfaceId === "semester_plan") {
    const selectedWeek = Math.min(
      Math.max(activeWeek, 1),
      semesterPlanDates.length,
    );
    const gradeLabel = semesterPlanScope === "grade3" ? "三年级" : "四年级";
    const planCells =
      semesterPlanScope === "grade3" ? grade3SemesterPlan : grade4SemesterPlan;
    const unitRows =
      semesterPlanScope === "grade3"
        ? grade3SemesterUnits
        : grade4SemesterUnits;
    const totalHours = planCells.reduce((sum, cell) => sum + cell.hours, 0);
    const narrative =
      semesterPlanScope === "grade3"
        ? {
            title: "从色彩感知走向综合表达",
            summary:
              "以审美教育为核心，联系儿童生活经验，在色彩、材料与传统文化的连续学习中建立大单元知识框架。",
            goals: [
              "理解色彩变化并用于表达",
              "从生活与传统文化中发现创作主题",
              "在真实任务中发展观察、合作与综合创作能力",
            ],
          }
        : {
            title: "从多种工艺走向知识迁移",
            summary:
              "将原有课目整合为七个大单元，在编织、纸艺、版画、水墨与设计实践中，引导学生把已有经验迁移到新的创作问题。",
            goals: [
              "理解色彩对比与和谐关系",
              "掌握多种工艺并形成材料判断",
              "在真实问题中发展创意、合作与文化认同",
            ],
          };
    function selectPlanGrade(scope: "grade3" | "grade4") {
      setSemesterPlanScope(scope);
      const target = assignments.find(
        (item) => item.grade === (scope === "grade3" ? "三年级" : "四年级"),
      );
      if (target && target.id !== assignment.id)
        changePreparationAssignment(target.id);
    }
    return (
      <section className="sv1-content sv1-prep-workspace sv1-semester-plan-v2">
        <PrepPageHeader
          eyebrow="学期规划"
          title={`${gradeLabel}16周课程规划`}
          description="纵向查看大单元与每周安排"
        />
        <div className="sv1-semester-plan-now">
          <span>当前时间</span>
          <b>2026年5月10日 · 星期日</b>
          <em>第10周已结束，下一教学周为第11周</em>
        </div>
        <section
          className={`sv1-plan-narrative ${planNarrativeOpen ? "open" : ""}`}
        >
          <button
            className="sv1-plan-narrative-toggle"
            aria-expanded={planNarrativeOpen}
            onClick={() => setPlanNarrativeOpen((current) => !current)}
          >
            <span>
              <small>理念与目标 · 协商草稿</small>
              <b>{narrative.title}</b>
            </span>
            <em>{planNarrativeOpen ? "收起 ↑" : "展开 ↓"}</em>
          </button>
          {planNarrativeOpen && (
            <div className="sv1-plan-narrative-body">
              <p>{narrative.summary}</p>
              <ul>
                {narrative.goals.map((goal) => (
                  <li key={goal}>{goal}</li>
                ))}
              </ul>
              <footer>
                <span>教师主导 · 小教协商生成 · 教师确认后进入正式规划</span>
                <button disabled title="后续接入">
                  与小教协商
                </button>
                <button disabled title="后续接入">
                  导出教学计划
                </button>
              </footer>
            </div>
          )}
        </section>
        <div className="sv1-semester-plan-switches">
          <div role="tablist" aria-label="年级切换">
            <button
              className={semesterPlanScope === "grade3" ? "active" : ""}
              onClick={() => selectPlanGrade("grade3")}
            >
              三年级
            </button>
            <button
              className={semesterPlanScope === "grade4" ? "active" : ""}
              onClick={() => selectPlanGrade("grade4")}
            >
              四年级
            </button>
          </div>
          <div role="tablist" aria-label="规划视图切换">
            <button
              className={semesterPlanMode === "units" ? "active" : ""}
              onClick={() => setSemesterPlanMode("units")}
            >
              大单元
            </button>
            <button
              className={semesterPlanMode === "weeks" ? "active" : ""}
              onClick={() => setSemesterPlanMode("weeks")}
            >
              周课表
            </button>
          </div>
          <button
            className="open-timeline"
            onClick={() => switchPreparationView("class_progress")}
          >
            查看班级时间表 →
          </button>
        </div>
        <div className="sv1-semester-plan-kpis">
          <span>
            <b>16</b>教学周
          </span>
          <span>
            <b>7</b>大单元
          </span>
          <span>
            <b>{totalHours}</b>周表课时
          </span>
          {semesterPlanScope === "grade4" && (
            <span className="attention">
              <b>1</b>口径待核
            </span>
          )}
        </div>
        {semesterPlanMode === "units" ? (
          <div className="sv1-semester-unit-list">
            <header>
              <b>序</b>
              <span>大单元</span>
              <span>安排周次</span>
              <span>课时</span>
              <span>状态</span>
            </header>
            {unitRows.map((unit) => {
              const current = unit.startWeek <= 10 && unit.endWeek >= 10;
              return (
                <button
                  key={`${unit.order}-${unit.title}`}
                  className={`${unit.tone} ${current ? "current" : ""}`}
                  onClick={() => setActiveWeek(unit.startWeek)}
                >
                  <i>{unit.order}</i>
                  <b>{unit.title}</b>
                  <span>{unit.weeks}</span>
                  <span>{unit.hours}课时</span>
                  <em>
                    {current
                      ? "当前阶段"
                      : unit.endWeek < 10
                        ? "已完成"
                        : "待进行"}
                  </em>
                </button>
              );
            })}
            <footer>
              <span>第16周</span>
              <b>机动、复习与考试</b>
              <em>保留调整空间</em>
            </footer>
          </div>
        ) : (
          <div className="sv1-semester-week-list">
            <header>
              <span>周次</span>
              <span>日期</span>
              <span>校历</span>
              <span>教学内容</span>
              <span>课时</span>
              <span>状态</span>
            </header>
            {planCells.flatMap((cell, index) => {
              const week = index + 1;
              const row = (
                <button
                  key={`week-${week}`}
                  className={`${cell.tone} ${selectedWeek === week ? "active" : ""}`}
                  onClick={() => setActiveWeek(week)}
                >
                  <b>第{week}周</b>
                  <span>{semesterPlanDates[index]}</span>
                  <span className={semesterPlanCalendar[index] ? "event" : ""}>
                    {semesterPlanCalendar[index] || "—"}
                  </span>
                  <strong>{cell.title}</strong>
                  <span>{cell.hours}</span>
                  <em>{week <= 10 ? "已完成" : "待进行"}</em>
                </button>
              );
              return index === 9
                ? [
                    row,
                    <div key="today" className="sv1-semester-today-divider">
                      <b>今天 · 5月10日</b>
                      <span>第10周与第11周之间</span>
                    </div>,
                  ]
                : [row];
            })}
          </div>
        )}
        {semesterPlanMode === "weeks" && (
          <div className="sv1-semester-plan-selection">
            <b>第{selectedWeek}周</b>
            <span>{semesterPlanDates[selectedWeek - 1]}</span>
            <em>
              {gradeLabel} · {planCells[selectedWeek - 1].title} ·{" "}
              {planCells[selectedWeek - 1].hours}课时
            </em>
            {semesterPlanCalendar[selectedWeek - 1] && (
              <strong>{semesterPlanCalendar[selectedWeek - 1]}</strong>
            )}
          </div>
        )}
        {semesterPlanScope === "grade4" && (
          <div className="sv1-semester-plan-note">
            <b>待核对</b>
            <span>课程需求、可用容量与周表合计暂按三个口径保留。</span>
          </div>
        )}
      </section>
    );
  }

  if (surfaceId === "unit_design") {
    const activeUnit =
      assignment.courseMap.units.find((unit) => unit.id === activeUnitId) ||
      assignment.courseMap.units[0];
    const unitLessons = lessons.filter(
      (lesson) => lesson.unitId === activeUnit?.id,
    );
    return (
      <section className="sv1-content sv1-prep-canvas sv1-preparation-hub">
        <div className="sv1-preparation-title-row">
          <div className="sv1-preparation-heading">
            <PrepPageHeader
              eyebrow="大单元备课"
              title="从大观念到每一课的责任"
            />
            <PrepGradeTabs
              assignment={assignment}
              assignments={assignments}
              switchAssignment={changePreparationAssignment}
            />
          </div>
          <PrepModeTabs active="unit" switchView={switchPreparationView} />
        </div>
        <div className="sv1-unit-selector">
          {assignment.courseMap.units.map((unit) => (
            <button
              key={unit.id}
              className={activeUnitId === unit.id ? "active" : ""}
              onClick={() => setActiveUnitId(unit.id)}
            >
              第{unit.order}单元 · {unit.title}
            </button>
          ))}
        </div>
        <div className="sv1-unit-prep-layout">
          <div className="sv1-unit-design-outline">
            <section>
              <span>大观念</span>
              <h3>视觉变化有方向、层次与节奏</h3>
              <p>学生用观察、比较和创作理解变化如何形成表达。</p>
            </section>
            <section>
              <span>基本问题</span>
              <h3>我们如何看见并组织“变化”？</h3>
            </section>
            <section>
              <span>表现性任务</span>
              <h3>完成一件有明确变化节奏的作品，并说明选择。</h3>
            </section>
            <section>
              <span>学习进阶</span>
              <ol>
                <li>辨认变化</li>
                <li>描述方向</li>
                <li>控制层次</li>
                <li>用于表达</li>
              </ol>
            </section>
          </div>
          <section
            className="sv1-unit-lesson-directory"
            aria-label={`${activeUnit?.title || "当前单元"}子课时目录`}
          >
            <header>
              <div>
                <span>子课时目录</span>
                <h3>{activeUnit?.title || "当前单元"}</h3>
              </div>
              <button onClick={() => switchPreparationView("lesson_index")}>
                查看全部课时 →
              </button>
            </header>
            {unitLessons.length ? (
              <div>
                {unitLessons.map((lesson) => (
                  <button key={lesson.id} onClick={() => openLesson(lesson.id)}>
                    <i>{lesson.lessonOrder}</i>
                    <span>
                      <b>
                        第{lesson.lessonOrder}课 · {lesson.title}
                      </b>
                      <small>
                        第{lesson.week}周 · {lesson.status}
                      </small>
                    </span>
                    <em>打开课时 →</em>
                  </button>
                ))}
              </div>
            ) : (
              <p>本单元课时目录待补充，可以先切换到“课时备课”查看全部课时。</p>
            )}
          </section>
        </div>
      </section>
    );
  }

  if (surfaceId === "class_progress") {
    const today = new Date(2026, 4, 10, 12);
    const todayLabel = new Intl.DateTimeFormat("zh-CN", {
      month: "long",
      day: "numeric",
      weekday: "long",
    }).format(today);
    const todayStep = 4;
    const totalWeeks = semesterPlanDates.length;
    const semesterStart = new Date(2026, 2, 2);
    const dayLabels: Record<string, string> = {
      mon: "一",
      tue: "二",
      wed: "三",
      thu: "四",
      fri: "五",
    };
    const dayOffsets: Record<string, number> = {
      mon: 0,
      tue: 1,
      wed: 2,
      thu: 3,
      fri: 4,
    };
    const semesterWeeks = Array.from({ length: totalWeeks }, (_, index) => {
      const start = new Date(semesterStart);
      start.setDate(semesterStart.getDate() + index * 7);
      return { week: index + 1, start };
    });
    const semesterDays = semesterWeeks.flatMap((week) =>
      Object.entries(dayOffsets).map(([dayId, offset]) => {
        const date = new Date(week.start);
        date.setDate(week.start.getDate() + offset);
        return {
          week: week.week,
          dayId,
          date,
          label: `${date.getMonth() + 1}/${date.getDate()}`,
        };
      }),
    );
    const classRows = assignments.flatMap((item) => {
      const grade = item.grade.replace("年级", "");
      const progressPattern =
        item.grade === "四年级" ? [3, 3, 4, 2, 4] : [4, 3, 3, 4, 5];
      const gradeLessons = getPrepLessons(item);
      return getWorkspaceClassIds(academicContext, item.id).map((classId) => {
        const index = Math.max(0, item.classIds.indexOf(classId));
        const progress = progressPattern[index] || 3;
        const lesson =
          gradeLessons[
            Math.min(progress >= 4 ? 1 : 0, gradeLessons.length - 1)
          ];
        return {
          classId,
          classLabel: `${grade}（${index + 1}）班`,
          grade: item.grade,
          gradeShort: grade,
          classNo: index + 1,
          progress,
          lesson,
        };
      });
    });
    const kindLabels: Record<string, string> = {
      complete: "已上",
      planned: "计划课",
      cancelled: "停课",
      shifted: "调课",
      makeup: "补课",
      extra: "加课",
    };
    function timelineEvents(
      row: (typeof classRows)[number],
      day: (typeof semesterDays)[number],
    ) {
      const slots = teacherScheduleOccurrences.filter(
        (slot) => slot.classId === row.classId,
      );
      const topic =
        (row.grade === "三年级" ? grade3SemesterPlan : grade4SemesterPlan)[
          day.week - 1
        ]?.title || row.lesson.title;
      const regular = slots
        .filter((slot) => slot.dayId === day.dayId)
        .map((slot, slotIndex) => {
          const isPast = day.date < today;
          let kind = isPast ? "complete" : "planned";
          let reason = isPast ? "按计划完成" : "按学期计划待上";
          if (
            row.grade === "三年级" &&
            row.classNo === 2 &&
            day.week === 7 &&
            day.dayId === "thu" &&
            slotIndex === 0
          ) {
            kind = "cancelled";
            reason = "校外活动停课";
          }
          if (
            row.grade === "四年级" &&
            row.classNo === 5 &&
            day.week === 8 &&
            day.dayId === "tue" &&
            slotIndex === 0
          ) {
            kind = "shifted";
            reason = "校内活动，课程调至周五";
          }
          return {
            id: `${row.classId}-${day.week}-${slot.dayId}-${slot.periodId}`,
            kind,
            topic,
            reason,
          };
        });
      if (
        row.grade === "三年级" &&
        row.classNo === 2 &&
        day.week === 8 &&
        day.dayId === "thu"
      )
        regular.unshift({
          id: `${row.classId}-${day.week}-makeup`,
          kind: "makeup",
          topic: "红领巾告诉我",
          reason: "午间机动补课",
        });
      if (
        row.grade === "四年级" &&
        row.classNo === 3 &&
        day.week === 12 &&
        day.dayId === "wed"
      )
        regular.push({
          id: `${row.classId}-${day.week}-extra`,
          kind: "extra",
          topic: "创意·表现",
          reason: "临时增加一课",
        });
      return regular;
    }
    return (
      <section className="sv1-content sv1-prep-workspace sv1-class-progress-board">
        <PrepPageHeader
          eyebrow="班级进度"
          title="各班今天走到哪里"
          description="按2025—2026学年第二学期时间表展开，演示日期为5月10日"
        />
        <div
          className="sv1-progress-board-tabs"
          role="tablist"
          aria-label="班级进度看板切换"
        >
          <button
            role="tab"
            aria-selected={progressBoard === "timeline"}
            className={progressBoard === "timeline" ? "active" : ""}
            onClick={() => setProgressBoard("timeline")}
          >
            学期班级时间表
          </button>
          <button
            role="tab"
            aria-selected={progressBoard === "comparison"}
            className={progressBoard === "comparison" ? "active" : ""}
            onClick={() => setProgressBoard("comparison")}
          >
            课题推进对照
          </button>
        </div>
        {progressBoard === "timeline" ? (
          <section
            className="sv1-progress-panel sv1-semester-timeline-board"
            aria-label="学期班级时间表"
          >
            <header>
              <div>
                <h3>学期班级时间表</h3>
              </div>
              <p>{todayLabel} · 按住拖动查看完整学期</p>
            </header>
            <div className="sv1-semester-timeline-legend">
              <span className="complete">已上</span>
              <span className="planned">计划课</span>
              <span className="cancelled">停课</span>
              <span className="shifted">调课</span>
              <span className="makeup">补课</span>
              <span className="extra">加课</span>
            </div>
            <div
              ref={semesterTimelineRef}
              className="sv1-semester-timeline-scroll"
              aria-label="可横向拖动的学期班级时间表"
              tabIndex={0}
              onPointerDown={(event) => {
                if (event.button !== 0) return;
                semesterTimelineDrag.current = {
                  active: true,
                  startX: event.clientX,
                  scrollLeft: event.currentTarget.scrollLeft,
                };
                event.currentTarget.setPointerCapture(event.pointerId);
                event.currentTarget.classList.add("dragging");
              }}
              onPointerMove={(event) => {
                if (!semesterTimelineDrag.current.active) return;
                event.currentTarget.scrollLeft =
                  semesterTimelineDrag.current.scrollLeft -
                  (event.clientX - semesterTimelineDrag.current.startX);
              }}
              onPointerUp={(event) => {
                semesterTimelineDrag.current.active = false;
                event.currentTarget.classList.remove("dragging");
                if (event.currentTarget.hasPointerCapture(event.pointerId))
                  event.currentTarget.releasePointerCapture(event.pointerId);
              }}
              onPointerCancel={(event) => {
                semesterTimelineDrag.current.active = false;
                event.currentTarget.classList.remove("dragging");
              }}
            >
              <div
                className="sv1-semester-timeline"
                style={
                  {
                    "--timeline-days": semesterDays.length,
                    "--today-left": `${118 + 10 * 5 * 96}px`,
                    width: `${118 + semesterDays.length * 96}px`,
                  } as React.CSSProperties
                }
              >
                <div className="sv1-semester-today-line">
                  <b>今天</b>
                </div>
                <div className="sv1-semester-timeline-head">
                  <b>班级</b>
                  {semesterDays.map((day) => (
                    <span
                      key={`${day.week}-${day.dayId}`}
                      className={`${day.week === activeWeek ? "today-week" : ""} ${day.dayId === "mon" ? "week-start" : ""}`}
                    >
                      <em>第{day.week}周</em>
                      <b>{day.label}</b>
                      <small>周{dayLabels[day.dayId]}</small>
                    </span>
                  ))}
                </div>
                {classRows.map((row) => (
                  <div
                    key={row.classId}
                    className={`sv1-semester-timeline-row ${activeClassFilter !== "all" && activeClassFilter !== row.classId ? "muted" : ""}`}
                  >
                    <b>{row.classLabel}</b>
                    {semesterDays.map((day) => (
                      <div
                        key={`${day.week}-${day.dayId}`}
                        className={`${day.week === activeWeek ? "today-week" : ""} ${day.dayId === "mon" ? "week-start" : ""}`}
                      >
                        {timelineEvents(row, day).map((event) => (
                          <span
                            key={event.id}
                            className={event.kind}
                            title={`${day.label} ${kindLabels[event.kind]}：${event.reason}`}
                          >
                            <b>{event.topic}</b>
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : (
          <section
            className="sv1-progress-panel sv1-progress-comparison"
            aria-label="课题推进对照"
          >
            <header>
              <div>
                <h3>课题推进对照</h3>
              </div>
              <p>按课题横向比较三、四年级各班</p>
            </header>
            <div className="sv1-progress-matrix">
              <div className="head">
                <b>班级</b>
                <b>起始课</b>
                <b>当前课</b>
                <b>下一课</b>
                <b>材料与准备</b>
              </div>
              {classRows.map((row) => (
                <div
                  key={row.classId}
                  className={
                    activeClassFilter !== "all" &&
                    activeClassFilter !== row.classId
                      ? "muted"
                      : ""
                  }
                >
                  <b>{row.classLabel}</b>
                  <span className="done">已完成</span>
                  <span
                    className={row.progress < todayStep ? "current" : "done"}
                  >
                    {row.lesson.title}
                  </span>
                  <span
                    className={row.progress > todayStep ? "done" : "current"}
                  >
                    {row.progress > todayStep ? "已进入" : "待上"}
                  </span>
                  <span
                    className={
                      row.grade === "三年级" && row.classLabel.includes("（5）")
                        ? "hold"
                        : "done"
                    }
                  >
                    {row.grade === "三年级" && row.classLabel.includes("（5）")
                      ? "待补"
                      : "已齐"}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
        <aside className="sv1-progress-notice-line" aria-label="班级进度提醒">
          <b>需要关注</b>
          <ul>
            <li>
              <span>三（2）班</span>校外活动缺课，建议从观察任务补入。
            </li>
            <li>
              <span>三（5）班</span>暖色卡纸仍待补充，周四前确认替代方案。
            </li>
          </ul>
        </aside>
      </section>
    );
  }

  if (surfaceId === "week_schedule") {
    const timetable = getPrepTimetable(assignments);
    const currentDayId = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][
      new Date().getDay()
    ];
    const currentDayIndex = prepTimetableDays.findIndex(
      (day) => day.id === currentDayId,
    );
    const dayState = (dayId: string) =>
      currentDayIndex < 0
        ? "future"
        : prepTimetableDays.findIndex((day) => day.id === dayId) ===
            currentDayIndex
          ? "today"
          : prepTimetableDays.findIndex((day) => day.id === dayId) <
              currentDayIndex
            ? "past"
            : "future";
    const readyCount = timetable.filter(
      (entry) => entry.status === "ready",
    ).length;
    const attentionCount = timetable.filter((entry) =>
      ["needs_confirmation", "hold"].includes(entry.status),
    ).length;
    const pendingCount = timetable.filter((entry) =>
      ["preparing", "not_started"].includes(entry.status),
    ).length;
    return (
      <section className="sv1-content sv1-prep-workspace sv1-timetable-page">
        <header className="sv1-prep-page-header compact">
          <h2>本周课表</h2>
        </header>
        <div className="sv1-timetable-toolbar">
          <div className="sv1-week-control">
            <button onClick={() => setActiveWeek(Math.max(1, activeWeek - 1))}>
              ← 上一周
            </button>
            <b>第 {activeWeek} 周</b>
            <button
              onClick={() =>
                setActiveWeek(
                  Math.min(assignment.courseMap.totalWeeks, activeWeek + 1),
                )
              }
            >
              下一周 →
            </button>
          </div>
          <div className="sv1-timetable-summary">
            <span>
              <b>{timetable.length}</b>节课
            </span>
            <span className="ready">
              <b>{readyCount}</b>已备妥
            </span>
            <span className="pending">
              <b>{pendingCount}</b>准备中
            </span>
            <span className="attention">
              <b>{attentionCount}</b>需处理
            </span>
          </div>
        </div>
        <div className="sv1-timetable-legend" aria-label="备课状态图例">
          <span className="ready">已备妥</span>
          <span className="preparing">备课中</span>
          <span className="not-started">未备课</span>
          <span className="needs-confirmation">待确认</span>
          <span className="hold">HOLD</span>
          <small>班级与节次来自图片；课题和状态由当前备课数据关联</small>
        </div>
        <div className="sv1-timetable-scroll">
          <div className="sv1-timetable" role="table" aria-label="本周教师课表">
            <div className="sv1-timetable-head" role="row">
              <div className="corner" role="columnheader">
                节次
              </div>
              {prepTimetableDays.map((day) => (
                <div
                  key={day.id}
                  className={dayState(day.id)}
                  role="columnheader"
                >
                  <b>{day.label}</b>
                </div>
              ))}
            </div>
            {prepTimetablePeriods.map((period) => (
              <div
                className={`sv1-timetable-row ${period.id === "lunch" ? "lunch-flex" : ""}`}
                role="row"
                key={period.id}
              >
                <div className="sv1-timetable-period" role="rowheader">
                  <b>{period.label}</b>
                  <small>{period.time}</small>
                </div>
                {prepTimetableDays.map((day) => {
                  const state = dayState(day.id);
                  const entry = timetable.find(
                    (item) =>
                      item.dayId === day.id && item.period === period.period,
                  );
                  return (
                    <div
                      className={`sv1-timetable-cell ${state}`}
                      role="cell"
                      key={`${day.id}-${period.id}`}
                    >
                      {entry ? (
                        <button
                          className={`sv1-timetable-course ${entry.status}`}
                          onClick={() =>
                            openLesson(entry.lessonId, entry.assignmentId)
                          }
                        >
                          <span>
                            <b>{entry.classLabel}</b>
                            <em>{entry.statusLabel}</em>
                          </span>
                          <strong>
                            {entry.lessonCode} · {entry.lessonTitle}
                          </strong>
                        </button>
                      ) : (
                        <span
                          className="sv1-timetable-empty"
                          aria-label={
                            period.id === "lunch"
                              ? `${day.label}午间机动时段无课`
                              : `${day.label}${period.label}无课`
                          }
                        >
                          无课
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (surfaceId === "lesson_index")
    return (
      <section className="sv1-content sv1-prep-workspace sv1-preparation-hub">
        <div className="sv1-preparation-title-row">
          <div className="sv1-preparation-heading">
            <PrepPageHeader eyebrow="课时备课" title="本学期课时索引" />
            <PrepGradeTabs
              assignment={assignment}
              assignments={assignments}
              switchAssignment={changePreparationAssignment}
            />
          </div>
          <PrepModeTabs active="lesson" switchView={switchPreparationView} />
        </div>
        <div className="sv1-lesson-filters" aria-label="课时筛选与排序">
          <label className="search">
            <span>课题</span>
            <input
              value={lessonQuery}
              onChange={(event) => setLessonQuery(event.target.value)}
              placeholder="搜索课题"
            />
          </label>
          <label>
            <span>单元</span>
            <select
              value={lessonUnitFilter}
              onChange={(event) => setLessonUnitFilter(event.target.value)}
            >
              <option value="all">全部单元</option>
              {assignment.courseMap.units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  第{unit.order}单元 · {unit.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>周次</span>
            <select
              value={lessonWeekFilter}
              onChange={(event) => setLessonWeekFilter(event.target.value)}
            >
              <option value="all">全部周次</option>
              {[...new Set(lessons.map((lesson) => lesson.week))]
                .sort((a, b) => a - b)
                .map((week) => (
                  <option key={week} value={week}>
                    第{week}周
                  </option>
                ))}
            </select>
          </label>
          <label>
            <span>班级范围</span>
            <select
              value={lessonClassFilter}
              onChange={(event) => setLessonClassFilter(event.target.value)}
            >
              <option value="all">全部班级</option>
              {[...new Set(lessons.map((lesson) => lesson.classScope))].map(
                (scope) => (
                  <option key={scope} value={scope}>
                    {scope}
                  </option>
                ),
              )}
            </select>
          </label>
          <label>
            <span>状态</span>
            <select
              value={lessonStatusFilter}
              onChange={(event) => setLessonStatusFilter(event.target.value)}
            >
              <option value="all">全部状态</option>
              {[...new Set(lessons.map((lesson) => lesson.status))].map(
                (status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ),
              )}
            </select>
          </label>
          <label>
            <span>HOLD</span>
            <select
              value={lessonHoldFilter}
              onChange={(event) => setLessonHoldFilter(event.target.value)}
            >
              <option value="all">全部</option>
              <option value="has">存在HOLD</option>
              <option value="none">无HOLD</option>
            </select>
          </label>
          <label>
            <span>排序</span>
            <select
              value={lessonSortKey}
              onChange={(event) => {
                setLessonSortKey(event.target.value as LessonSortKey);
                setLessonSortDirection("asc");
              }}
            >
              <option value="week">周次</option>
              <option value="title">课题</option>
              <option value="unit">单元</option>
              <option value="class">班级范围</option>
              <option value="status">备课状态</option>
              <option value="hold">HOLD</option>
            </select>
          </label>
          <button
            className="direction"
            onClick={() =>
              setLessonSortDirection((current) =>
                current === "asc" ? "desc" : "asc",
              )
            }
            aria-label="切换升序降序"
          >
            {lessonSortDirection === "asc" ? "升序 ↑" : "降序 ↓"}
          </button>
        </div>
        <div
          className="sv1-lesson-table"
          role="table"
          aria-label="本学期课时索引"
        >
          <div className="head" role="row">
            <button onClick={() => toggleLessonSort("title")}>
              课题{" "}
              {lessonSortKey === "title"
                ? lessonSortDirection === "asc"
                  ? "↑"
                  : "↓"
                : ""}
            </button>
            <button onClick={() => toggleLessonSort("unit")}>
              单元{" "}
              {lessonSortKey === "unit"
                ? lessonSortDirection === "asc"
                  ? "↑"
                  : "↓"
                : ""}
            </button>
            <button onClick={() => toggleLessonSort("week")}>
              周次{" "}
              {lessonSortKey === "week"
                ? lessonSortDirection === "asc"
                  ? "↑"
                  : "↓"
                : ""}
            </button>
            <button onClick={() => toggleLessonSort("class")}>
              班级范围{" "}
              {lessonSortKey === "class"
                ? lessonSortDirection === "asc"
                  ? "↑"
                  : "↓"
                : ""}
            </button>
            <button onClick={() => toggleLessonSort("status")}>
              备课状态{" "}
              {lessonSortKey === "status"
                ? lessonSortDirection === "asc"
                  ? "↑"
                  : "↓"
                : ""}
            </button>
            <button onClick={() => toggleLessonSort("hold")}>
              HOLD{" "}
              {lessonSortKey === "hold"
                ? lessonSortDirection === "asc"
                  ? "↑"
                  : "↓"
                : ""}
            </button>
            <b>操作</b>
          </div>
          {filteredLessons.map((lesson) => (
            <div key={lesson.id} role="row">
              <b>{lesson.title}</b>
              <span>{lesson.unitLabel}</span>
              <span>第{lesson.week}周</span>
              <span>{lesson.classScope}</span>
              <em
                className={
                  lesson.status === "已完成"
                    ? "done"
                    : lesson.status === "待修改"
                      ? "hold"
                      : "current"
                }
              >
                {lesson.status}
              </em>
              <span>{lesson.holdReason || "—"}</span>
              <button onClick={() => openLesson(lesson.id)}>
                {lesson.status === "继续备课" ? "继续备课" : "打开课时"} →
              </button>
            </div>
          ))}
          {!filteredLessons.length && (
            <p className="sv1-lesson-empty">没有符合当前筛选条件的课时。</p>
          )}
        </div>
      </section>
    );

  const lesson = activeLesson || lessons[0];
  const isV05Candidate =
    lesson.id === "lesson_grade3_gradient_01" &&
    lessonViewVersion === "candidate-v0.5-p1";
  const projection = isV05Candidate
    ? getColorGradientV05P1Projection(activeProjection)
    : lessonDetailState?.data?.projections.find(
        (item) => item.id === activeProjection,
      ) || null;
  const canonical = lessonDetailState?.data?.canonicalLessonSummary;
  const stateIsRenderable =
    isV05Candidate ||
    lessonDetailState?.status === "READY" ||
    lessonDetailState?.status === "HOLD";
  const teachingAsset = lessonDetailState?.data?.teachingAsset;
  const versionLabel = isV05Candidate
    ? null
    : teachingAsset?.displayStatus || readonlyCaseLabels[lesson.id];
  const lessonResponsibility =
    canonical?.lessonResponsibility || "正在从真实来源推理这节课的学习责任。";
  const projections = isV05Candidate
    ? colorGradientV05P1Candidate.projections
    : lessonDetailState?.data?.projections || [];
  function navigateCandidateBinding(
    binding: CandidateScreenBinding,
    targetProjection: "class_flow" | "class_screen",
    origin: "FLOW" | "SCREEN",
  ) {
    dispatchScreenEditorAction({
      type: "OPEN_BOUND_SCREEN",
      bindingId: binding.id,
      origin,
    });
    setActiveProjection(targetProjection);
    dispatchScreenEditorAction({
      type: "SET_ACTIVE_PROJECTION",
      projection: projectionToWorkspace[targetProjection],
    });
  }
  function selectProjection(projectionId: LessonProjectionId) {
    setActiveProjection(projectionId);
    dispatchScreenEditorAction({
      type: "SET_ACTIVE_PROJECTION",
      projection: projectionToWorkspace[projectionId],
    });
  }
  return (
    <section
      ref={lessonDetailScrollRef}
      className={`sv1-content sv1-document sv1-prep-detail projection-${activeProjection} ${isV05Candidate ? "is-v05-candidate" : "is-runtime-baseline"}`}
    >
      <article className="sv1-paper">
        <div className="sv1-reading-column">
          <header className="sv1-lesson-document-head">
            <button
              className="sv1-back-link"
              onClick={backToLessons}
              aria-label="返回课时列表"
              title="返回课时列表"
            >
              ‹
            </button>
            <span>
              {assignment.grade}下 · 第
              {assignment.courseMap.units.find(
                (unit) => unit.id === lesson.unitId,
              )?.order || 1}
              单元 · 第{lesson.lessonOrder}课
            </span>
            <div className="sv1-backend-case-row">
              <h2>
                {lessonDetailState?.data?.context.lessonIndex.title ||
                  lesson.title}
              </h2>
              {versionLabel && <em>{versionLabel}</em>}
            </div>
            {!isV05Candidate && <p>{lessonResponsibility}</p>}
            {!isV05Candidate &&
              teachingAsset && (
                <div className="sv1-asset-quickfacts">
                  <span>
                    <b>
                      {teachingAsset.plannedMinutes}＋
                      {teachingAsset.flexMinutes}
                    </b>{" "}
                    分钟
                  </span>
                  <span>
                    <b>{teachingAsset.episodeCount}</b> 段课堂展开
                  </span>
                  <span>
                    <b>{teachingAsset.sceneCount}</b> 个大屏场景
                  </span>
                  <span>
                    材料：<b>{teachingAsset.materialStatus}</b>
                  </span>
                </div>
              )}
          </header>
          {!isV05Candidate &&
            lessonDetailState?.status === "HOLD" &&
            lessonDetailState.data && (
              <div className="sv1-hold-banner" role="status">
                <b>{lessonDetailState.data.teacherGate.title}</b>
                {lessonDetailState.data.teacherGate.messages.map((message) => (
                  <span key={message}>{message}</span>
                ))}
                <small>当前仍可查看与修改；确认采用和正式写回保持关闭。</small>
              </div>
            )}
          {stateIsRenderable && (
            <nav className="sv1-doc-tabs">
              {projections.map((item) => (
                <button
                  key={item.id}
                  className={activeProjection === item.id ? "active" : ""}
                  onClick={() => selectProjection(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          )}
          <div className="sv1-lesson-document-body">
            {stateIsRenderable && projection ? (
              isV05Candidate && activeProjection === "class_flow" ? (
                <CandidateClassroomFlow
                  selection={candidateSelection}
                  editorState={screenEditorState}
                  openScreen={(binding) =>
                    navigateCandidateBinding(binding, "class_screen", "FLOW")
                  }
                />
              ) : isV05Candidate && activeProjection === "class_screen" ? (
                <CandidateClassroomScreen
                  editorState={screenEditorState}
                  dispatch={dispatchScreenEditorAction}
                  openFlow={(binding) =>
                    navigateCandidateBinding(binding, "class_flow", "SCREEN")
                  }
                />
              ) : isV05Candidate && activeProjection === "assessment" ? (
                <CandidateAssessmentProjection />
              ) : (
                <BackendLessonProjection projection={projection} />
              )
            ) : (
              <LessonDetailStatePanel
                state={lessonDetailState}
                retry={retryLesson}
              />
            )}
          </div>
        </div>
      </article>
    </section>
  );
}

function PrepGradeTabs({
  assignment,
  assignments,
  switchAssignment,
}: {
  assignment: CourseAssignment;
  assignments: CourseAssignment[];
  switchAssignment: (assignmentId: string) => void;
}) {
  return (
    <nav className="sv1-preparation-grades" aria-label="备课年级切换">
      {assignments.map((item) => (
        <button
          key={item.id}
          className={item.id === assignment.id ? "active" : ""}
          onClick={() => switchAssignment(item.id)}
        >
          {item.grade}
        </button>
      ))}
    </nav>
  );
}

function PrepModeTabs({
  active,
  switchView,
}: {
  active: "unit" | "lesson";
  switchView: (surface: Exclude<PrepSurfaceId, "lesson_detail">) => void;
}) {
  return (
    <nav className="sv1-preparation-tabs" aria-label="备课页面切换">
      <button
        className={active === "unit" ? "active" : ""}
        onClick={() => switchView("unit_design")}
      >
        大单元
      </button>
      <button
        className={active === "lesson" ? "active" : ""}
        onClick={() => switchView("lesson_index")}
      >
        课时备课
      </button>
    </nav>
  );
}

function PrepPageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <header className="sv1-prep-page-header">
      <span>{eyebrow}</span>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </header>
  );
}

function LessonDetailStatePanel({
  state,
  retry,
}: {
  state: LessonDetailState | null;
  retry: () => void;
}) {
  const status = state?.status || "LOADING";
  const copy =
    status === "BACKEND_OFFLINE"
      ? { title: "备课后端暂时未连接", text: state?.message }
      : status === "ASSET_INTEGRITY_ERROR"
        ? { title: "教学资产校验未通过", text: state?.message }
        : status === "REQUEST_REJECTED"
          ? { title: "这节课暂未接入只读推理", text: state?.message }
          : status === "FAILED"
            ? { title: "课时推理没有完成", text: state?.message }
            : status === "RETRYING"
              ? {
                  title: "正在重新读取课时",
                  text: "重新运行只读推理，并核对教师门与五个投影。",
                }
              : {
                  title: "正在读取真实课时",
                  text: "正在通过本地 BFF 调用备课后端，不会显示旧的静态正文。",
                };
  const waiting = status === "LOADING" || status === "RETRYING";
  return (
    <section
      className={`sv1-lesson-state state-${status.toLowerCase()}`}
      aria-live="polite"
    >
      <i>{waiting ? "···" : "!"}</i>
      <h3>{copy.title}</h3>
      <p>{copy.text}</p>
      {!waiting && <button onClick={retry}>重新尝试</button>}
      <small>
        {status === "BACKEND_OFFLINE"
          ? "服务恢复后可在当前页面重试。"
          : "当前仍为只读阶段，不会写入正式教学资产。"}
      </small>
    </section>
  );
}

function BackendLessonProjection({
  projection,
}: {
  projection: ProjectionRenderModel;
}) {
  return (
    <div
      className={`sv1-lesson-projection sv1-runtime-projection ${projection.id === "class_screen" ? "sv1-screen-preview" : ""}`}
    >
      {projection.sections.map((section, pageIndex) => (
        <section key={section.sectionId} className="sv1-projection-page-card">
          <header>
            <span>第 {pageIndex + 1} 页</span>
            <b>{section.title}</b>
          </header>
          {section.text && <h3>{section.text}</h3>}
          {section.items.length > 0 && (
            <div className="sv1-runtime-items">
              {section.items.map((item, index) => (
                <article key={`${section.sectionId}-${item.label}-${index}`}>
                  <div>
                    <b>{item.label}</b>
                    {item.minutes !== null && <em>{item.minutes} 分钟</em>}
                  </div>
                  {item.text && <p>{item.text}</p>}
                </article>
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}

function CandidateAssessmentProjection() {
  const assessment = colorGradientArtworkAssessment;
  return (
    <section className="sv1-artwork-assessment" aria-label="学生最终作品评价">
      <header>
        <div>
          <span>评价设计</span>
          <h3>{assessment.title}</h3>
        </div>
        <p>过程表现、最终作品和学生说明一起构成本课学习评价。</p>
      </header>
      <div className="sv1-assessment-rubric">
        {assessment.dimensions.map((dimension) => (
          <article key={dimension.id}>
            <strong>
              {dimension.weight}
              <small>分</small>
            </strong>
            <div>
              <b>{dimension.label}</b>
              <p>{dimension.description}</p>
            </div>
          </article>
        ))}
      </div>
      <article className="sv1-assessment-example">
        <div
          className="sv1-artwork-placeholder"
          role="img"
          aria-label="学生作品示例位置"
        >
          <span>学生作品</span>
          <small>添加作品后，在画面中标记判断依据</small>
        </div>
        <div className="sv1-assessment-result">
          <header>
            <div>
              <span>{assessment.example.label}</span>
              <b>
                {assessment.example.suggestedScore}
                <small> / {assessment.totalScore}</small>
              </b>
            </div>
            <em>{assessment.example.learningStatus}</em>
          </header>
          <dl>
            {assessment.dimensions.map((dimension) => (
              <div key={dimension.id}>
                <dt>{dimension.label}</dt>
                <dd>
                  {assessment.example.dimensionScores[dimension.id]} /{" "}
                  {dimension.weight}
                </dd>
              </div>
            ))}
          </dl>
          <section>
            <b>我从作品中看到了什么</b>
            <p>{assessment.example.visibleEvidence}</p>
          </section>
          <section>
            <b>还可以改进哪里</b>
            <p>{assessment.example.improvementSuggestion}</p>
          </section>
          <footer>
            <span>{assessment.example.teacherConfirmation}</span>
            <button type="button">教师确认</button>
          </footer>
        </div>
      </article>
      <article className="sv1-assessment-history">
        <b>{assessment.historyComparison.title}</b>
        <p>{assessment.historyComparison.description}</p>
      </article>
    </section>
  );
}

function CandidateClassroomFlow({
  selection,
  editorState,
  openScreen,
}: {
  selection: ScreenEditorState["workspace"];
  editorState: ScreenEditorState;
  openScreen: (binding: CandidateScreenBinding) => void;
}) {
  return (
    <div className="sv1-candidate-flow" aria-label="课堂流程与大屏关联">
      <header>
        <div>
          <span>课堂流程</span>
          <h3>按上课顺序查看每个环节</h3>
        </div>
        <small>点击右侧画面，可以查看或调整学生在课堂上看到的内容。</small>
      </header>
      <div className="sv1-candidate-flow-list">
        {colorGradientV05P1Candidate.episodes.map((episode, episodeIndex) => {
          const bindings = editorState.draftSession.bindings
            .filter((binding) => binding.episodeId === episode.id)
            .sort((left, right) => left.order - right.order);
          const active = selection.activeEpisodeId === episode.id;
          return (
            <article
              key={episode.id}
              data-episode-id={episode.id}
              className={active ? "active" : ""}
              id={`candidate-episode-${episode.id}`}
            >
              <div className="sv1-candidate-flow-order">
                <i>第{episodeIndex + 1}环节</i>
                <span>{episode.minutes}分钟</span>
              </div>
              <div className="sv1-candidate-flow-copy">
                <h3>{episode.title}</h3>
                <p>{episode.teacher}</p>
                <dl>
                  <div>
                    <dt>学生在做什么</dt>
                    <dd>{episode.student}</dd>
                  </div>
                  <div>
                    <dt>完成到什么程度</dt>
                    <dd>{episode.evidence}</dd>
                  </div>
                </dl>
              </div>
              <aside>
                <div>
                  <b>本环节使用 {bindings.length} 屏</b>
                  <small>
                    {bindings.length ? "按出现顺序排列" : "暂时没有大屏"}
                  </small>
                </div>
                {bindings.map((binding) => {
                  const screen = colorGradientV05P1Candidate.screens.find(
                    (item) => item.id === binding.screenId,
                  );
                  const document = resolveStructuredScreen(
                    editorState,
                    binding.screenId,
                  );
                  return (
                    <button
                      key={binding.id}
                      data-binding-id={binding.id}
                      data-screen-id={binding.screenId}
                      className={`${selection.activeBindingId === binding.id ? "active" : ""} ${document ? "editable" : ""}`}
                      onClick={() => openScreen(binding)}
                    >
                      {document && (
                        <StructuredScreenRenderer
                          context={{
                            mode: "FLOW_THUMBNAIL",
                            document,
                            editable: false,
                          }}
                          resolveAssetUri={(assetId) =>
                            resolveScreenAssetUri(
                              editorState,
                              document,
                              assetId,
                            )
                          }
                        />
                      )}
                      <span>
                        <i>
                          {screenDisplayLabel(
                            binding.screenId,
                            editorState.draftSession.screenOrder,
                          )}
                        </i>
                        <b>{document?.title || screen?.title}</b>
                        {editorState.draftSession.dirtyScreenIds.includes(
                          binding.screenId,
                        ) && <mark>已调整</mark>}
                      </span>
                      <small>{binding.displayTiming}</small>
                      <em>
                        {document
                          ? getStructuredScreenSummary(document)
                          : binding.purpose}
                      </em>
                    </button>
                  );
                })}
              </aside>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function CandidateClassroomScreen({
  editorState,
  dispatch,
  openFlow,
}: {
  editorState: ScreenEditorState;
  dispatch: React.Dispatch<LessonWorkspaceAction>;
  openFlow: (binding: CandidateScreenBinding) => void;
}) {
  const [canvasHost, setCanvasHost] = useState<HTMLDivElement | null>(null);
  const [newScreenMenuOpen, setNewScreenMenuOpen] = useState(false);
  const lifecycleIdRef = useRef(1);
  const selection = editorState.workspace;
  const presentationOrder = deriveClassroomPresentationOrder(
    colorGradientV05P1Candidate.episodes.map((episode) => episode.id),
    editorState.draftSession.bindings,
  );
  const linkedScreenIds = new Set(presentationOrder);
  const unboundScreenIds = editorState.draftSession.screenOrder.filter(
    (screenId) => !linkedScreenIds.has(screenId),
  );
  const directoryScreenIds = [
    ...presentationOrder.filter(
      (screenId, index) => presentationOrder.indexOf(screenId) === index,
    ),
    ...unboundScreenIds,
  ];
  const screens = directoryScreenIds.map(
    (screenId): CandidateScreen => {
      const candidate = colorGradientV05P1Candidate.screens.find(
        (item) => item.id === screenId,
      );
      const document = resolveStructuredScreen(editorState, screenId);
      return (
        candidate ?? {
          id: screenId,
          kind:
            document?.instructionalRole === "TASK"
              ? "OPEN_NATURE_TIME_TASK"
              : document?.instructionalRole === "DEMONSTRATION"
                ? "DEMO_PLACEHOLDER"
                : "TEXTBOOK_NATURE_IMAGE",
          title: document?.title ?? "新课堂画面",
          question: document ? getStructuredScreenSummary(document) : "",
          action: "教师本次新增的课堂画面",
        }
      );
    },
  );
  const selectedBinding =
    editorState.draftSession.bindings.find(
      (binding) => binding.id === selection.activeBindingId,
    ) ||
    editorState.draftSession.bindings.find(
      (binding) => binding.screenId === selection.activeScreenId,
    );
  const activeScreenId = editorState.draftSession.screenOrder.includes(
    selection.activeScreenId ?? "",
  )
    ? selection.activeScreenId
    : (selectedBinding?.screenId ?? editorState.draftSession.screenOrder[0]);
  const screenIndex = Math.max(
    0,
    screens.findIndex((item) => item.id === activeScreenId),
  );
  const screen = screens[screenIndex];
  const structuredDocument = resolveStructuredScreen(editorState, screen.id);
  const layoutHealth = structuredDocument
    ? inspectScreenLayoutHealth(structuredDocument)
    : null;
  const presentationIndex = presentationOrder.indexOf(screen.id);
  const editable = Boolean(structuredDocument);
  const editing = selection.screenMode === "STRUCTURED_EDIT" && editable;
  const rehearsing =
    selection.screenMode === "STUDENT_REHEARSAL" ||
    selection.screenMode === "BLACKOUT";
  function activateScreen(screenId: string) {
    const bindings = editorState.draftSession.bindings.filter(
      (binding) => binding.screenId === screenId,
    );
    const binding =
      bindings.find((item) => item.episodeId === selection.activeEpisodeId) ||
      bindings[0];
    if (binding)
      dispatch({
        type: "OPEN_BOUND_SCREEN",
        bindingId: binding.id,
        origin: "SCREEN",
      });
    else dispatch({ type: "OPEN_SCREEN", screenId });
  }

  const deletedScreenIds = Object.keys(editorState.draftSession.deletedScreens);
  const currentScreenBindings = editorState.draftSession.bindings.filter(
    (binding) => binding.screenId === screen.id,
  );
  const createScreen = (
    role: StructuredScreenDocument["instructionalRole"],
  ) => {
    const stamp = lifecycleIdRef.current++;
    const screenId = `screen-${stamp}`;
    const episodeId =
      selection.activeEpisodeId ?? colorGradientV05P1Candidate.episodes[0].id;
    const order =
      Math.max(
        0,
        ...editorState.draftSession.bindings
          .filter((binding) => binding.episodeId === episodeId)
          .map((binding) => binding.order),
      ) + 1;
    dispatch({
      type: "CREATE_SCREEN",
      document: createScreenDocumentFromRole(role, screenId),
      binding: {
        id: `binding-${stamp}`,
        screenId,
        episodeId,
        order,
        purpose: "教师新增的课堂画面",
        displayTiming: "按课堂需要展示",
        teacherCue: "请在备课时补充本屏教师提示。",
      },
      insertAfterScreenId: screen.id,
    });
    setNewScreenMenuOpen(false);
  };
  const duplicateCurrentScreen = () => {
    if (!structuredDocument || !selectedBinding) return;
    const stamp = lifecycleIdRef.current++;
    const screenId = `screen-${stamp}`;
    dispatch({
      type: "DUPLICATE_SCREEN",
      sourceScreenId: structuredDocument.screenId,
      document: duplicateScreenDocument(structuredDocument, screenId),
      binding: {
        ...selectedBinding,
        id: `binding-${stamp}`,
        screenId,
        order: selectedBinding.order + 1,
        purpose: `${selectedBinding.purpose}（副本）`,
      },
    });
  };
  const bindScreenToEpisode = (episodeId: string) => {
    const stamp = lifecycleIdRef.current++;
    dispatch({
      type: "BIND_SCREEN_TO_EPISODE",
      binding: {
        id: `binding-${stamp}`,
        screenId: screen.id,
        episodeId,
        order: 1,
        purpose: "教师关联的课堂画面",
        displayTiming: "按课堂需要展示",
        teacherCue: "请在备课时补充本屏教师提示。",
      },
    });
  };
  return (
    <section className="sv1-candidate-screen-player" aria-label="学生课堂大屏">
      <nav aria-label="学生大屏目录">
        <p className="sv1-screen-directory-label">课堂播放画面</p>
        {screens.map((item, index) => {
          const binding = editorState.draftSession.bindings.find(
            (candidateBinding) => candidateBinding.screenId === item.id,
          );
          const document = resolveStructuredScreen(editorState, item.id);
          const linkedEpisodeForScreen = binding
            ? getCandidateEpisode(binding.episodeId)
            : null;
          return (
            <div key={item.id} className="sv1-screen-directory-item">
              {index === presentationOrder.length && unboundScreenIds.length > 0 && (
                <p className="sv1-screen-directory-label">未关联画面</p>
              )}
            <button
              data-screen-id={item.id}
              className={index === screenIndex ? "active" : ""}
              aria-current={index === screenIndex ? "page" : undefined}
              onClick={() => activateScreen(item.id)}
            >
              <i>
                {linkedScreenIds.has(item.id)
                  ? screenDisplayLabel(item.id, presentationOrder)
                  : "未关联"}
              </i>
              <span>
                <b>{document?.title || item.title}</b>
                <small>
                  {!binding
                    ? "尚未关联课堂环节"
                    : editorState.draftSession.dirtyScreenIds.includes(item.id)
                    ? "本次已调整"
                    : linkedEpisodeForScreen?.title || "课堂画面"}
                </small>
              </span>
            </button>
            </div>
          );
        })}
      </nav>
      <div className={`sv1-candidate-screen-stage ${editing ? "editing" : ""}`}>
        <header>
          <div className="sv1-screen-stage-heading">
            <span>
              {screenDisplayLabel(
                screen.id,
                presentationOrder,
              )}
            </span>
            <b>{structuredDocument?.title || screen.title}</b>
          </div>
          <div className="sv1-screen-header-actions">
            {selectedBinding && (
              <button onClick={() => openFlow(selectedBinding)}>
                返回课堂流程
              </button>
            )}
            {editable && (
              <button
                className={editing ? "active" : ""}
                onClick={() =>
                  dispatch(
                    editing
                      ? { type: "EXIT_STRUCTURED_EDIT" }
                      : { type: "ENTER_STRUCTURED_EDIT", screenId: screen.id },
                  )
                }
              >
                {editing ? "完成编辑" : "编辑画面"}
              </button>
            )}
            <button
              className="primary"
              onClick={() =>
                dispatch({
                  type: "ENTER_STUDENT_REHEARSAL",
                  screenId: screen.id,
                })
              }
            >
              课堂预览
            </button>
          </div>
        </header>
        {editing && structuredDocument && (
          <div className="sv1-screen-editing-toolbars">
            <DirectCanvasToolbar
              document={structuredDocument}
              editorState={editorState}
              dispatch={dispatch}
            />
            <div className="sv1-screen-lifecycle-toolbar" aria-label="页面管理">
          <span>页面管理</span>
          <button onClick={() => setNewScreenMenuOpen((value) => !value)}>
            ＋新增一屏
          </button>
          <button
            onClick={duplicateCurrentScreen}
            disabled={!selectedBinding}
          >
            复制当前屏
          </button>
          <button
            onClick={() => dispatch({ type: "UNDO_LIFECYCLE" })}
            disabled={!editorState.draftSession.lifecycleUndoStack.length}
          >
            撤销页面操作
          </button>
          {deletedScreenIds.length > 0 && (
            <button
              onClick={() =>
                dispatch({
                  type: "RESTORE_DELETED_SCREEN",
                  screenId: deletedScreenIds.at(-1)!,
                })
              }
            >
              恢复刚删除的页面
            </button>
          )}
          <button
            onClick={() => {
              if (!selectedBinding) return;
              dispatch({
                type: "REORDER_SCREEN_BINDING",
                bindingId: selectedBinding.id,
                direction: -1,
              });
            }}
            disabled={!selectedBinding || selectedBinding.order <= 1}
          >
            上移
          </button>
          <button
            onClick={() => {
              if (!selectedBinding) return;
                dispatch({
                  type: "REORDER_SCREEN_BINDING",
                  bindingId: selectedBinding.id,
                  direction: 1,
                });
            }}
            disabled={
              !selectedBinding ||
              selectedBinding.order >=
                editorState.draftSession.bindings.filter(
                  (binding) =>
                    binding.episodeId === selectedBinding?.episodeId,
                ).length
            }
          >
            下移
          </button>
            <label>
              所在环节
              <select
                value={selectedBinding?.episodeId ?? ""}
                onChange={(event) => {
                  if (selectedBinding)
                    dispatch({
                      type: "MOVE_SCREEN_BINDING_TO_EPISODE",
                      bindingId: selectedBinding.id,
                      episodeId: event.target.value,
                    });
                  else bindScreenToEpisode(event.target.value);
                }}
              >
                <option value="" disabled>
                  选择课堂环节
                </option>
                {colorGradientV05P1Candidate.episodes.map((episode, index) => (
                  <option key={episode.id} value={episode.id}>
                    第{index + 1}环节 · {episode.title}
                  </option>
                ))}
              </select>
            </label>
            <button
              onClick={() =>
                selectedBinding &&
                dispatch({
                  type: "REMOVE_BINDING_FROM_EPISODE",
                  bindingId: selectedBinding.id,
                })
              }
              disabled={!selectedBinding}
            >
              从本环节移除
            </button>
            <button
              className="danger"
              onClick={() => {
                const confirmed =
                  currentScreenBindings.length <= 1 ||
                  window.confirm(
                    `这张画面关联了 ${currentScreenBindings.length} 个环节，确认从本次备课中删除吗？`,
                  );
                if (confirmed)
                  dispatch({
                    type: "SOFT_DELETE_SCREEN",
                    screenId: screen.id,
                    confirmed,
                  });
              }}
              disabled={editorState.draftSession.screenOrder.length <= 1}
            >
              删除这张大屏
            </button>
            {newScreenMenuOpen && (
              <div className="sv1-new-screen-menu">
                <b>选择新画面的用途</b>
                <button onClick={() => createScreen("OBSERVATION")}>
                  观察画面
                </button>
                <button onClick={() => createScreen("DEMONSTRATION")}>
                  示范画面
                </button>
                <button onClick={() => createScreen("TASK")}>任务画面</button>
              </div>
            )}
          </div>
          </div>
        )}
        {layoutHealth && layoutHealth.issues.length > 0 && (
          <div
            className={`sv1-screen-health ${layoutHealth.status === "INCOMPLETE" ? "is-blocking" : ""}`}
            role="status"
          >
            <b>
              {layoutHealth.status === "INCOMPLETE"
                ? "画面尚未完成"
                : "画面需要检查"}
            </b>
            <span>{layoutHealth.issues.slice(0, 2).map((issue) => issue.message).join("；")}</span>
          </div>
        )}
        <div
          className={`sv1-screen-mvp-workarea ${editorState.workspace.canvasViewportMode === "FIT_CANVAS" ? "fit-canvas" : ""}`}
        >
          <div ref={setCanvasHost} className="sv1-screen-teacher-preview">
            {structuredDocument ? (
              <StructuredScreenRenderer
                context={{
                  mode: "TEACHER_CANVAS",
                  document: structuredDocument,
                  revealStep: 2,
                  editable: editing,
                  selection: editorState.workspace.canvasSelection,
                }}
                editingObjectId={editorState.workspace.editingTextObjectId}
                dispatch={dispatch}
                resolveAssetUri={(assetId) =>
                  resolveScreenAssetUri(
                    editorState,
                    structuredDocument,
                    assetId,
                  )
                }
              />
            ) : (
              <>
                <CandidateScreenVisual screen={screen} />
                <div className="sv1-candidate-screen-question">
                  <small>{screen.title}</small>
                  <h3>{screen.question}</h3>
                  <p>{screen.action}</p>
                </div>
              </>
            )}
            {editing && structuredDocument && (
              <ScreenMoveableController
                host={canvasHost}
                document={structuredDocument}
                selection={editorState.workspace.canvasSelection}
                dispatch={dispatch}
              />
            )}
          </div>
        </div>
        <footer>
          <button
            className="sv1-icon-page-button"
            title="上一屏"
            aria-label="上一屏"
            onClick={() => dispatch({ type: "GO_TO_PREVIOUS_SCREEN" })}
            disabled={presentationIndex <= 0}
          >
            ‹
          </button>
          <span>
            {presentationIndex >= 0
              ? `${presentationIndex + 1} / ${presentationOrder.length}`
              : "未进入课堂播放"}
          </span>
          <button
            className="sv1-icon-page-button"
            title="下一屏"
            aria-label="下一屏"
            onClick={() => dispatch({ type: "GO_TO_NEXT_SCREEN" })}
            disabled={
              presentationIndex < 0 ||
              presentationIndex === presentationOrder.length - 1
            }
          >
            ›
          </button>
        </footer>
      </div>
      {rehearsing && (
        <StudentRehearsalOverlay
          editorState={editorState}
          dispatch={dispatch}
        />
      )}
    </section>
  );
}

function getStructuredScreenSummary(document: StructuredScreenDocument) {
  const content = document.studentVisibleContent;
  if (content.kind === "OBSERVATION") return content.question;
  if (content.kind === "DEMONSTRATION") return content.repairPrompt;
  return `${content.taskTitle} · ${content.durationMinutes}分钟`;
}

function DirectCanvasToolbar({
  document,
  editorState,
  dispatch,
}: {
  document: StructuredScreenDocument;
  editorState: ScreenEditorState;
  dispatch: React.Dispatch<LessonWorkspaceAction>;
}) {
  const replaceInput = useRef<HTMLInputElement>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const selected = editorState.workspace.canvasSelection;
  const object = selected
    ? getScreenCanvasObject(document, selected.objectId)
    : null;
  const templateStyle = selected
    ? document.textStyles[selected.objectId]
    : undefined;
  const style =
    object?.content.kind === "TEXT" && object.origin === "TEACHER_ADDED"
      ? object.content.style
      : templateStyle;
  const content = document.studentVisibleContent;
  const selectedRequirement =
    content.kind === "TASK" && selected?.objectId.startsWith("requirement-")
      ? content.requirements.find((item) => item.id === selected.objectId)
      : null;
  const selectedRequirementIndex =
    content.kind === "TASK" && selectedRequirement
      ? content.requirements.findIndex(
          (item) => item.id === selectedRequirement.id,
        )
      : -1;
  const imagePresentation =
    object?.content.kind === "IMAGE" && object.origin === "TEACHER_ADDED"
      ? object.content.presentation
      : selected
        ? document.imagePresentation[selected.objectId]
        : undefined;

  const updateRequirements = (next: TaskRequirement[]) =>
    document.instructionalRole === "TASK" &&
    dispatch({
      type: "UPDATE_TASK_DRAFT",
      screenId: document.screenId,
      patch: { requirements: next },
    });
  const updateStyle = (patch: Partial<TextStyle>) => {
    if (!selected) return;
    if (object?.content.kind === "TEXT" && object.origin === "TEACHER_ADDED")
      dispatch({
        type: "UPDATE_TEXT_OBJECT",
        screenId: document.screenId,
        objectId: object.objectId,
        patch: {
          style: {
            ...(object.content.style ?? {
              size: "MEDIUM",
              bold: false,
              color: "DARK",
              align: "LEFT",
            }),
            ...patch,
          },
        },
      });
    else
      dispatch({
        type: "UPDATE_TEXT_STYLE",
        screenId: document.screenId,
        objectId: selected.objectId,
        patch,
      });
  };
  const resetTextStyle = () => {
    if (!selected || object?.content.kind !== "TEXT") return;
    if (object.origin === "TEACHER_ADDED") {
      dispatch({
        type: "UPDATE_TEXT_OBJECT",
        screenId: document.screenId,
        objectId: object.objectId,
        patch: {
          style: {
            size: "MEDIUM",
            fontSize: 24,
            bold: false,
            color: "DARK",
            align: "LEFT",
          },
        },
      });
      return;
    }
    dispatch({
      type: "RESET_TEXT_STYLE_TO_LAYOUT_DEFAULT",
      screenId: document.screenId,
      objectId: selected.objectId,
    });
  };
  const updateImage = (patch: {
    fit?: "FIT" | "FILL";
    focalX?: number;
    focalY?: number;
    zoom?: number;
  }) => {
    if (!selected || object?.content.kind !== "IMAGE") return;
    if (object.origin === "TEACHER_ADDED")
      dispatch({
        type: "UPDATE_IMAGE_OBJECT",
        screenId: document.screenId,
        objectId: object.objectId,
        patch: {
          presentation: {
            ...(object.content.presentation ?? {
              fit: "FILL",
              focalX: 50,
              focalY: 50,
              zoom: 1,
            }),
            ...patch,
          },
        },
      });
    else
      dispatch({
        type: "UPDATE_IMAGE_PRESENTATION",
        screenId: document.screenId,
        objectId: selected.objectId,
        patch,
      });
  };
  const replaceImage = (file?: File) => {
    if (!file || !selected || object?.content.kind !== "IMAGE") return;
    const asset = createDraftAsset(file, document.screenId, selected.objectId);
    dispatch({ type: "REGISTER_DRAFT_ASSET", asset });
    if (object.origin === "TEACHER_ADDED")
      dispatch({
        type: "UPDATE_IMAGE_OBJECT",
        screenId: document.screenId,
        objectId: object.objectId,
        patch: { assetId: asset.draftAssetId },
      });
  };
  const addText = () => {
    const objectId = `teacher-text-${Date.now()}`;
    dispatch({
      type: "ADD_SCREEN_OBJECT",
      screenId: document.screenId,
      object: createTeacherTextObject(objectId),
    });
    dispatch({
      type: "SELECT_CANVAS_OBJECT",
      selection: { screenId: document.screenId, kind: "TEXT", objectId },
    });
    dispatch({ type: "EDIT_CANVAS_TEXT", objectId });
  };
  const addImage = () => {
    const objectId = `teacher-image-${Date.now()}`;
    dispatch({
      type: "ADD_SCREEN_OBJECT",
      screenId: document.screenId,
      object: createTeacherImageObject(objectId),
    });
    dispatch({
      type: "SELECT_CANVAS_OBJECT",
      selection: { screenId: document.screenId, kind: "IMAGE", objectId },
    });
  };
  const fontSizes = [16, 18, 20, 24, 28, 32, 36, 40, 44, 48] as const;
  const currentFontSize =
    style?.fontSize ??
    (style?.size === "LARGE" ? 36 : style?.size === "SMALL" ? 18 : 24);
  const changeFontSize = (delta: -1 | 1) => {
    const index = Math.max(
      0,
      fontSizes.indexOf(currentFontSize as (typeof fontSizes)[number]),
    );
    updateStyle({
      fontSize:
        fontSizes[Math.min(fontSizes.length - 1, Math.max(0, index + delta))],
    });
  };
  const moveRequirement = (delta: -1 | 1) => {
    if (content.kind !== "TASK" || !selectedRequirement) return;
    const target = selectedRequirementIndex + delta;
    if (target < 0 || target >= content.requirements.length) return;
    const next = [...content.requirements];
    [next[selectedRequirementIndex], next[target]] = [
      next[target],
      next[selectedRequirementIndex],
    ];
    updateRequirements(next);
  };
  const resetFrame = () => {
    if (!object) return;
    const slot = getLayoutSlotDefinition(document.layoutRef, object.objectId);
    if (slot)
      dispatch({
        type: "UPDATE_OBJECT_FRAME",
        screenId: document.screenId,
        objectId: object.objectId,
        frame: slot.defaultFrame,
      });
  };
  const alignmentButtons: Array<
    ["LEFT" | "H_CENTER" | "RIGHT" | "TOP" | "V_CENTER" | "BOTTOM", string]
  > = [
    ["LEFT", "左齐"],
    ["H_CENTER", "水平居中"],
    ["RIGHT", "右齐"],
    ["TOP", "顶齐"],
    ["V_CENTER", "垂直居中"],
    ["BOTTOM", "底齐"],
  ];
  const colorOrder: TextStyle["color"][] = ["AUTO", "DARK", "ACCENT"];
  const colorLabels: Record<TextStyle["color"], string> = {
    AUTO: "自动",
    DARK: "深色",
    ACCENT: "强调",
    LIGHT: "浅色",
  };

  return (
    <div className="sv1-direct-canvas-toolbar" aria-label="大屏编辑工具栏">
      <div className="sv1-direct-toolbar-primary">
        <button
          title="撤销上一步"
          aria-label="撤销上一步"
          onClick={() =>
            dispatch({ type: "UNDO_SCREEN_DRAFT", screenId: document.screenId })
          }
          disabled={
            !editorState.draftSession.undoStacks[document.screenId]?.length
          }
        >
          ↶
        </button>
        <button
          title="恢复刚撤销的操作"
          aria-label="恢复刚撤销的操作"
          onClick={() =>
            dispatch({ type: "REDO_SCREEN_DRAFT", screenId: document.screenId })
          }
          disabled={
            !editorState.draftSession.redoStacks[document.screenId]?.length
          }
        >
          ↷
        </button>
        <button
          onClick={() =>
            dispatch({
              type: "RESTORE_SCREEN_DRAFT",
              screenId: document.screenId,
            })
          }
          disabled={
            !editorState.draftSession.dirtyScreenIds.includes(document.screenId)
          }
        >
          恢复本屏
        </button>
        {document.screenId !== "S09" && (
          <button onClick={addText}>＋文字</button>
        )}
        {document.screenId !== "S09" && (
          <button onClick={addImage}>＋图片</button>
        )}
      </div>
      <div className="sv1-direct-toolbar-context">
        {!selected && <span>点选文字或图片后，可直接移动、调整和编辑</span>}
        {style && (
          <>
            <button onClick={() => changeFontSize(-1)}>字号－</button>
            <button onClick={() => changeFontSize(1)}>字号＋</button>
            <button
              className={style.bold ? "active" : ""}
              onClick={() => updateStyle({ bold: !style.bold })}
            >
              加粗
            </button>
            <button
              title="浅色画面只使用深色、自动或强调文字"
              onClick={() =>
                updateStyle({
                  customColor: undefined,
                  color:
                    colorOrder[
                      (Math.max(0, colorOrder.indexOf(style.color)) + 1) %
                        colorOrder.length
                    ],
                })
              }
            >
              文字：{colorLabels[style.color]}
            </button>
            <div className="sv1-text-color-palette" aria-label="文字颜色">
              {[
                ["#243c33", "深墨绿"],
                ["#2f6a55", "师维绿"],
                ["#c46f43", "暖橙"],
                ["#3d6f8c", "湖蓝"],
                ["#7a5368", "梅紫"],
                ["#775f4b", "棕色"],
              ].map(([color, label]) => (
                <button
                  key={color}
                  className={style.customColor === color ? "active" : ""}
                  title={label}
                  aria-label={`文字颜色：${label}`}
                  style={{ backgroundColor: color }}
                  onClick={() => updateStyle({ customColor: color })}
                />
              ))}
              <label title="自选文字颜色">
                <input
                  type="color"
                  value={style.customColor || "#243c33"}
                  aria-label="自选文字颜色"
                  onChange={(event) =>
                    updateStyle({ customColor: event.target.value })
                  }
                />
                自选
              </label>
            </div>
            <button
              onClick={() =>
                updateStyle({
                  align:
                    style.align === "LEFT"
                      ? "CENTER"
                      : style.align === "CENTER"
                        ? "RIGHT"
                        : "LEFT",
                })
              }
            >
              对齐
            </button>
            <button onClick={resetTextStyle}>恢复文字</button>
          </>
        )}
        {object?.content.kind === "IMAGE" && (
          <>
            <input
              ref={replaceInput}
              hidden
              type="file"
              accept="image/*"
              onChange={(event) => replaceImage(event.target.files?.[0])}
            />
            <button onClick={() => replaceInput.current?.click()}>
              替换图片
            </button>
            <button
              title="保留整张图片，可能出现留白"
              className={imagePresentation?.fit === "FIT" ? "active" : ""}
              onClick={() => updateImage({ fit: "FIT" })}
            >
              完整显示
            </button>
            <button
              title="填满图片区域，边缘可能被裁掉"
              className={imagePresentation?.fit === "FILL" ? "active" : ""}
              onClick={() => updateImage({ fit: "FILL" })}
            >
              铺满画面
            </button>
            <button
              className={cropOpen ? "active" : ""}
              onClick={() => setCropOpen((value) => !value)}
            >
              调整取景
            </button>
            <button
              onClick={() =>
                updateImage({ fit: "FILL", focalX: 50, focalY: 50, zoom: 1 })
              }
            >
              还原取景
            </button>
            {cropOpen && (
              <div className="sv1-crop-direction-panel">
                <span>移动画面重点</span>
                <div>
                  {[
                    ["↑", 0, -10],
                    ["←", -10, 0],
                    ["●", 0, 0],
                    ["→", 10, 0],
                    ["↓", 0, 10],
                  ].map(([label, dx, dy]) => (
                    <button
                      key={String(label)}
                      title={
                        label === "●"
                          ? "取景居中"
                          : `取景向${label === "↑" ? "上" : label === "↓" ? "下" : label === "←" ? "左" : "右"}`
                      }
                      aria-label={
                        label === "●"
                          ? "取景居中"
                          : `取景向${label === "↑" ? "上" : label === "↓" ? "下" : label === "←" ? "左" : "右"}`
                      }
                      onClick={() =>
                        updateImage({
                          focalX:
                            label === "●"
                              ? 50
                              : (imagePresentation?.focalX ?? 50) + Number(dx),
                          focalY:
                            label === "●"
                              ? 50
                              : (imagePresentation?.focalY ?? 50) + Number(dy),
                        })
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        {object && (
          <>
            {alignmentButtons.map(([alignment, label]) => (
              <button
                key={alignment}
                onClick={() =>
                  dispatch({
                    type: "ALIGN_SCREEN_OBJECT",
                    screenId: document.screenId,
                    objectId: object.objectId,
                    alignment,
                  })
                }
              >
                {label}
              </button>
            ))}
            <button
              onClick={() =>
                dispatch({
                  type: "CHANGE_OBJECT_Z_INDEX",
                  screenId: document.screenId,
                  objectId: object.objectId,
                  direction: "FORWARD",
                })
              }
            >
              前移
            </button>
            <button
              onClick={() =>
                dispatch({
                  type: "CHANGE_OBJECT_Z_INDEX",
                  screenId: document.screenId,
                  objectId: object.objectId,
                  direction: "BACKWARD",
                })
              }
            >
              后移
            </button>
            <button
              onClick={() =>
                dispatch({
                  type: object.locked
                    ? "UNLOCK_SCREEN_OBJECT"
                    : "LOCK_SCREEN_OBJECT",
                  screenId: document.screenId,
                  objectId: object.objectId,
                })
              }
            >
              {object.locked ? "解锁" : "锁定"}
            </button>
            {object.origin !== "TEACHER_ADDED" && (
              <button onClick={resetFrame}>恢复位置</button>
            )}
            {object.origin === "TEACHER_ADDED" && (
              <>
                <button
                  onClick={() =>
                    dispatch({
                      type: "DUPLICATE_SCREEN_OBJECT",
                      screenId: document.screenId,
                      objectId: object.objectId,
                      newObjectId: `teacher-${object.objectType.toLowerCase()}-${Date.now()}`,
                    })
                  }
                >
                  复制
                </button>
                <button
                  onClick={() =>
                    dispatch({
                      type: "DELETE_SCREEN_OBJECT",
                      screenId: document.screenId,
                      objectId: object.objectId,
                    })
                  }
                >
                  删除
                </button>
              </>
            )}
          </>
        )}
        {document.instructionalRole === "DEMONSTRATION" &&
          (selected?.objectId === "errorImage" ||
            selected?.objectId === "correctImage") && (
            <>
              <button
                onClick={() =>
                  dispatch({
                    type: "UPDATE_REVEAL_MODE",
                    screenId: document.screenId,
                    revealMode:
                      selected.objectId === "errorImage"
                        ? "ERROR_THEN_REPAIR"
                        : "CORRECT_THEN_ERROR",
                  })
                }
              >
                先显示这张
              </button>
              <button
                onClick={() =>
                  dispatch({
                    type: "UPDATE_REVEAL_MODE",
                    screenId: document.screenId,
                    revealMode:
                      document.presentationSettings.revealMode ===
                      "ERROR_THEN_REPAIR"
                        ? "CORRECT_THEN_ERROR"
                        : "ERROR_THEN_REPAIR",
                  })
                }
              >
                交换顺序
              </button>
            </>
          )}
        {content.kind === "TASK" && (
          <button
            onClick={() =>
              updateRequirements([
                ...content.requirements,
                {
                  id: `requirement-${Date.now()}`,
                  text: "双击填写新的作业要求",
                  emphasis: false,
                },
              ])
            }
            disabled={content.requirements.length >= 6}
          >
            新增要求
          </button>
        )}
        {content.kind === "TASK" && selectedRequirement && (
          <>
            <button
              onClick={() =>
                updateRequirements(
                  content.requirements.map((item) =>
                    item.id === selectedRequirement.id
                      ? { ...item, emphasis: !item.emphasis }
                      : item,
                  ),
                )
              }
            >
              {selectedRequirement.emphasis ? "取消强调" : "强调"}
            </button>
            <button
              onClick={() => moveRequirement(-1)}
              disabled={selectedRequirementIndex <= 0}
            >
              上移
            </button>
            <button
              onClick={() => moveRequirement(1)}
              disabled={
                selectedRequirementIndex >= content.requirements.length - 1
              }
            >
              下移
            </button>
            <button
              onClick={() =>
                updateRequirements(
                  content.requirements.filter(
                    (item) => item.id !== selectedRequirement.id,
                  ),
                )
              }
            >
              删除
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* R0 comparison implementation retired from the production render path.
type LegacySlotEngine = "MOVEABLE" | "REACT_RND";

function LegacyDirectCanvasToolbar({
  document,
  editorState,
  dispatch,
  slotEngine,
  setSlotEngine,
  lexicalEnabled,
  setLexicalEnabled,
  openPrecisionCrop,
}: {
  document: StructuredScreenDocument;
  editorState: ScreenEditorState;
  dispatch: React.Dispatch<LessonWorkspaceAction>;
  slotEngine: LegacySlotEngine;
  setSlotEngine: (engine: LegacySlotEngine) => void;
  lexicalEnabled: boolean;
  setLexicalEnabled: (enabled: boolean) => void;
  openPrecisionCrop: (objectId: string) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const selected = editorState.workspace.canvasSelection;
  const style = selected ? document.textStyles[selected.objectId] : undefined;
  const isImage = selected?.kind === "IMAGE";
  const imageSlot =
    selected?.objectId === "primaryImage" ||
    selected?.objectId === "errorImage" ||
    selected?.objectId === "correctImage"
      ? selected.objectId
      : null;
  const imagePresentation = imageSlot
    ? document.imagePresentation[imageSlot]
    : undefined;
  const content = document.studentVisibleContent;
  const selectedRequirement =
    content.kind === "TASK" && selected?.objectId.startsWith("requirement-")
      ? content.requirements.find((item) => item.id === selected.objectId)
      : null;
  function updateRequirements(next: TaskRequirement[]) {
    if (document.instructionalRole === "TASK")
      dispatch({
        type: "UPDATE_TASK_DRAFT",
        screenId: document.screenId,
        patch: { requirements: next },
      });
  }
  function handleFile(file: File | undefined) {
    if (!file || !imageSlot) return;
    dispatch({
      type: "REGISTER_DRAFT_ASSET",
      asset: createDraftAsset(file, document.screenId, imageSlot),
    });
  }
  function restore() {
    dispatch({ type: "RESTORE_SCREEN_DRAFT", screenId: document.screenId });
  }
  function updateStyle(patch: Partial<TextStyle>) {
    if (selected)
      dispatch({
        type: "UPDATE_TEXT_STYLE",
        screenId: document.screenId,
        objectId: selected.objectId,
        patch,
      });
  }
  function updateImage(patch: {
    fit?: "FIT" | "FILL";
    focalX?: number;
    focalY?: number;
    zoom?: number;
  }) {
    if (imageSlot)
      dispatch({
        type: "UPDATE_IMAGE_PRESENTATION",
        screenId: document.screenId,
        objectId: imageSlot,
        patch,
      });
  }
  const sizeOrder: TextStyle["size"][] = ["SMALL", "MEDIUM", "LARGE"];
  const alignOrder: TextStyle["align"][] = ["LEFT", "CENTER", "RIGHT"];
  const colorOrder: TextStyle["color"][] = ["AUTO", "DARK", "ACCENT"];
  const colorLabels: Record<TextStyle["color"], string> = {
    AUTO: "自动",
    DARK: "深色",
    ACCENT: "强调",
    LIGHT: "浅色",
  };
  const selectedRequirementIndex =
    content.kind === "TASK" && selectedRequirement
      ? content.requirements.findIndex(
          (item) => item.id === selectedRequirement.id,
        )
      : -1;
  function moveRequirement(delta: -1 | 1) {
    if (content.kind !== "TASK" || !selectedRequirement) return;
    const target = selectedRequirementIndex + delta;
    if (target < 0 || target >= content.requirements.length) return;
    const next = [...content.requirements];
    [next[selectedRequirementIndex], next[target]] = [
      next[target],
      next[selectedRequirementIndex],
    ];
    updateRequirements(next);
  }
  return (
    <div className="sv1-direct-canvas-toolbar" aria-label="大屏编辑工具栏">
      <div className="sv1-direct-toolbar-primary">
        <button
          title="撤销上一步"
          aria-label="撤销上一步"
          onClick={() =>
            dispatch({ type: "UNDO_SCREEN_DRAFT", screenId: document.screenId })
          }
          disabled={
            !editorState.draftSession.undoStacks[document.screenId]?.length
          }
        >
          ↶
        </button>
        <button
          onClick={restore}
          disabled={
            !editorState.draftSession.dirtyScreenIds.includes(document.screenId)
          }
        >
          恢复本屏
        </button>
        <button
          onClick={() =>
            dispatch({
              type: "ENTER_STUDENT_REHEARSAL",
              screenId: document.screenId,
            })
          }
        >
          课堂预览
        </button>
      </div>
      <div className="sv1-direct-toolbar-context">
        {!selected && <span>点选画面中的文字或图片，就会出现对应工具</span>}
        {style && (
          <>
            <button
              onClick={() =>
                updateStyle({
                  size: sizeOrder[
                    Math.min(
                      sizeOrder.length - 1,
                      sizeOrder.indexOf(style.size) + 1,
                    )
                  ],
                })
              }
            >
              字号＋
            </button>
            <button
              onClick={() =>
                updateStyle({
                  size: sizeOrder[
                    Math.max(0, sizeOrder.indexOf(style.size) - 1)
                  ],
                })
              }
            >
              字号－
            </button>
            <button
              className={style.bold ? "active" : ""}
              onClick={() => updateStyle({ bold: !style.bold })}
            >
              加粗
            </button>
            <button
              title="浅色画面只提供自动、深色和强调文字"
              onClick={() =>
                updateStyle({
                  color:
                    colorOrder[
                      (Math.max(0, colorOrder.indexOf(style.color)) + 1) %
                        colorOrder.length
                    ],
                })
              }
            >
              文字：{colorLabels[style.color]}
            </button>
            <button
              onClick={() =>
                updateStyle({
                  align:
                    alignOrder[
                      (alignOrder.indexOf(style.align) + 1) % alignOrder.length
                    ],
                })
              }
            >
              对齐
            </button>
            <button
              onClick={() =>
                selected &&
                dispatch({
                  type: "RESET_TEXT_STYLE_TO_LAYOUT_DEFAULT",
                  screenId: document.screenId,
                  objectId: selected.objectId,
                })
              }
            >
              恢复模板文字
            </button>
          </>
        )}
        {isImage && imageSlot && (
          <>
            <input
              ref={fileInput}
              hidden
              type="file"
              accept="image/*"
              onChange={(event) => handleFile(event.target.files?.[0])}
            />
            <button onClick={() => fileInput.current?.click()}>替换图片</button>
            <button
              title="保留整张图片，可能出现留白"
              className={imagePresentation?.fit === "FIT" ? "active" : ""}
              onClick={() => updateImage({ fit: "FIT" })}
            >
              完整显示
            </button>
            <button
              title="填满图片区域，边缘可能被裁掉"
              className={imagePresentation?.fit === "FILL" ? "active" : ""}
              onClick={() => updateImage({ fit: "FILL" })}
            >
              铺满画面
            </button>
            <button
              className={cropOpen ? "active" : ""}
              onClick={() => setCropOpen((current) => !current)}
            >
              画布内取景
            </button>
            <button
              onClick={() =>
                updateImage({ fit: "FILL", focalX: 50, focalY: 50, zoom: 1 })
              }
            >
              还原取景
            </button>
            {cropOpen && (
              <div
                className="sv1-crop-direction-panel"
                aria-label="调整图片取景"
              >
                <span>移动画面重点</span>
                <div>
                  <button
                    title="向上"
                    aria-label="取景向上"
                    onClick={() =>
                      updateImage({
                        focalY: (imagePresentation?.focalY ?? 50) - 10,
                      })
                    }
                  >
                    ↑
                  </button>
                  <button
                    title="向左"
                    aria-label="取景向左"
                    onClick={() =>
                      updateImage({
                        focalX: (imagePresentation?.focalX ?? 50) - 10,
                      })
                    }
                  >
                    ←
                  </button>
                  <button
                    title="居中"
                    aria-label="取景居中"
                    onClick={() => updateImage({ focalX: 50, focalY: 50 })}
                  >
                    ●
                  </button>
                  <button
                    title="向右"
                    aria-label="取景向右"
                    onClick={() =>
                      updateImage({
                        focalX: (imagePresentation?.focalX ?? 50) + 10,
                      })
                    }
                  >
                    →
                  </button>
                  <button
                    title="向下"
                    aria-label="取景向下"
                    onClick={() =>
                      updateImage({
                        focalY: (imagePresentation?.focalY ?? 50) + 10,
                      })
                    }
                  >
                    ↓
                  </button>
                </div>
              </div>
            )}
          </>
        )}
        {document.instructionalRole === "DEMONSTRATION" &&
          (selected?.objectId === "errorImage" ||
            selected?.objectId === "correctImage") && (
            <>
              <button
                onClick={() =>
                  dispatch({
                    type: "UPDATE_REVEAL_MODE",
                    screenId: document.screenId,
                    revealMode:
                      selected.objectId === "errorImage"
                        ? "ERROR_THEN_REPAIR"
                        : "CORRECT_THEN_ERROR",
                  })
                }
              >
                先显示这张
              </button>
              <button
                onClick={() =>
                  dispatch({
                    type: "UPDATE_REVEAL_MODE",
                    screenId: document.screenId,
                    revealMode:
                      document.presentationSettings.revealMode ===
                      "ERROR_THEN_REPAIR"
                        ? "CORRECT_THEN_ERROR"
                        : "ERROR_THEN_REPAIR",
                  })
                }
              >
                交换顺序
              </button>
            </>
          )}
        {content.kind === "TASK" && (
          <button
            onClick={() =>
              updateRequirements([
                ...content.requirements,
                {
                  id: `requirement-${Date.now()}`,
                  text: "双击填写新的作业要求",
                  emphasis: false,
                },
              ])
            }
            disabled={content.requirements.length >= 6}
          >
            新增要求
          </button>
        )}
        {content.kind === "TASK" && selectedRequirement && (
          <>
            <button
              onClick={() =>
                updateRequirements(
                  content.requirements.map((item) =>
                    item.id === selectedRequirement.id
                      ? { ...item, emphasis: !item.emphasis }
                      : item,
                  ),
                )
              }
            >
              {selectedRequirement.emphasis ? "取消强调" : "强调"}
            </button>
            <button
              onClick={() => moveRequirement(-1)}
              disabled={selectedRequirementIndex <= 0}
            >
              上移
            </button>
            <button
              onClick={() => moveRequirement(1)}
              disabled={
                selectedRequirementIndex >= content.requirements.length - 1
              }
            >
              下移
            </button>
            <button
              onClick={() =>
                updateRequirements(
                  content.requirements.filter(
                    (item) => item.id !== selectedRequirement.id,
                  ),
                )
              }
            >
              删除
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function resolveImageAssetId(
  document: StructuredScreenDocument,
  objectId: string,
) {
  const content = document.studentVisibleContent;
  if (content.kind === "OBSERVATION" && objectId === "primaryImage")
    return content.imageAssetId;
  if (content.kind === "DEMONSTRATION" && objectId === "errorImage")
    return content.errorImageAssetId;
  if (content.kind === "DEMONSTRATION" && objectId === "correctImage")
    return content.correctImageAssetId;
  return undefined;
}
*/

function StudentRehearsalOverlay({
  editorState,
  dispatch,
}: {
  editorState: ScreenEditorState;
  dispatch: React.Dispatch<LessonWorkspaceAction>;
}) {
  const ref = useRef<HTMLElement>(null);
  const { presentationOrder, readyScreenOrder } = useMemo(() => {
    const order = deriveClassroomPresentationOrder(
      colorGradientV05P1Candidate.episodes.map((item) => item.id),
      editorState.draftSession.bindings,
    );
    return {
      presentationOrder: order,
      readyScreenOrder: order.filter((candidateId) => {
        const candidateDocument =
          editorState.draftSession.workingDrafts[candidateId] ??
          editorState.draftSession.createdDocuments[candidateId] ??
          structuredScreenBaseDocuments[candidateId] ??
          null;
        return (
          candidateDocument &&
          inspectScreenLayoutHealth(candidateDocument)
            .canEnterClassroomPlayback
        );
      }),
    };
  }, [
    editorState.draftSession.bindings,
    editorState.draftSession.createdDocuments,
    editorState.draftSession.workingDrafts,
  ]);
  const requestedScreenId =
    editorState.workspace.activeScreenId ||
    readyScreenOrder[0] ||
    presentationOrder[0];
  const inspectingIncomplete = !readyScreenOrder.includes(requestedScreenId);
  const screenOrder = useMemo(
    () =>
      inspectingIncomplete
        ? [
            requestedScreenId,
            ...readyScreenOrder.filter((id) => id !== requestedScreenId),
          ]
        : readyScreenOrder,
    [inspectingIncomplete, readyScreenOrder, requestedScreenId],
  );
  const screenId = requestedScreenId;
  const screenIndex = Math.max(0, screenOrder.indexOf(screenId));
  const screen = colorGradientV05P1Candidate.screens.find(
    (candidate) => candidate.id === screenId,
  ) ?? {
    id: screenId,
    kind: "TEXTBOOK_NATURE_IMAGE" as const,
    title: resolveStructuredScreen(editorState, screenId)?.title ?? "课堂画面",
    question: "",
    action: "",
  };
  const document = resolveStructuredScreen(editorState, screen.id);
  const nextScreenId = screenOrder[screenIndex + 1];
  const nextScreen = nextScreenId
    ? (colorGradientV05P1Candidate.screens.find(
        (candidate) => candidate.id === nextScreenId,
      ) ?? {
        id: nextScreenId,
        title:
          resolveStructuredScreen(editorState, nextScreenId)?.title ??
          "课堂画面",
      })
    : undefined;
  const blackout = editorState.workspace.screenMode === "BLACKOUT";
  const canReveal =
    document?.instructionalRole === "DEMONSTRATION" &&
    editorState.workspace.revealStep === 1;
  const openRelativeScreen = (delta: -1 | 1) => {
    const nextId = screenOrder[screenIndex + delta];
    if (nextId) dispatch({ type: "OPEN_SCREEN", screenId: nextId });
  };
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") {
        const previousId = screenOrder[screenIndex - 1];
        if (previousId)
          dispatch({ type: "OPEN_SCREEN", screenId: previousId });
      }
      if (event.key === "ArrowRight") {
        const nextId = screenOrder[screenIndex + 1];
        if (nextId) dispatch({ type: "OPEN_SCREEN", screenId: nextId });
      }
      if (event.key === " ") {
        event.preventDefault();
        dispatch(
          canReveal
            ? { type: "ADVANCE_REVEAL" }
            : screenOrder[screenIndex + 1]
              ? {
                  type: "OPEN_SCREEN",
                  screenId: screenOrder[screenIndex + 1],
                }
              : { type: "OPEN_SCREEN", screenId },
        );
      }
      if (event.key.toLowerCase() === "b")
        dispatch({ type: "TOGGLE_BLACKOUT" });
      if (event.key === "Escape") dispatch({ type: "EXIT_STUDENT_REHEARSAL" });
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canReveal, dispatch, screenId, screenIndex, screenOrder]);
  return (
    <section
      ref={ref}
      className={`sv1-student-rehearsal ${blackout ? "blackout" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="课堂大屏预览"
    >
      <header>
        <div>
          <b>课堂大屏预览</b>
          <span>
            {inspectingIncomplete
              ? "检查预览 · 未进入课堂连续播放"
              : `${screenDisplayLabel(screen.id, screenOrder)} · ${screenIndex + 1}/${screenOrder.length}`}
          </span>
        </div>
        <div>
          <button onClick={() => ref.current?.requestFullscreen?.()}>
            全屏
          </button>
          <button onClick={() => dispatch({ type: "TOGGLE_BLACKOUT" })}>
            {blackout ? "恢复画面" : "暂时黑屏"}
          </button>
          <button onClick={() => dispatch({ type: "EXIT_STUDENT_REHEARSAL" })}>
            退出预览
          </button>
        </div>
      </header>
      <main>
        {blackout ? (
          <div className="sv1-rehearsal-blackout">
            <span>画面已暂时隐藏</span>
            <small>按 B 恢复</small>
          </div>
        ) : document ? (
          <div className="sv1-rehearsal-canvas">
            <StructuredScreenRenderer
              context={{
                mode: "STUDENT_REHEARSAL",
                document,
                revealStep: editorState.workspace.revealStep,
                editable: false,
              }}
              resolveAssetUri={(assetId) =>
                resolveScreenAssetUri(editorState, document, assetId)
              }
            />
            {canReveal && (
              <button
                className="sv1-reveal-next"
                onClick={() => dispatch({ type: "ADVANCE_REVEAL" })}
              >
                继续揭示修复方法 →
              </button>
            )}
          </div>
        ) : (
          <div className="sv1-rehearsal-fallback">
            <CandidateScreenVisual screen={screen} />
            <div>
              <h2>{screen.question}</h2>
              <p>{screen.action}</p>
            </div>
          </div>
        )}
      </main>
      <footer>
        <button
          className="sv1-icon-page-button"
          title="上一屏"
          aria-label="上一屏"
          onClick={() => openRelativeScreen(-1)}
          disabled={screenIndex <= 0}
        >
          ‹
        </button>
        <span>方向键切屏 · 空格继续 · B 隐藏画面 · Esc 退出</span>
        <div>
          <small>下一屏</small>
          <b>
            {nextScreen
              ? `${screenDisplayLabel(nextScreen.id, screenOrder)} · ${resolveStructuredScreen(editorState, nextScreen.id)?.title || nextScreen.title}`
              : "已经是最后一屏"}
          </b>
        </div>
        <button
          className="sv1-icon-page-button"
          title="下一屏"
          aria-label="下一屏"
          onClick={() => openRelativeScreen(1)}
          disabled={screenIndex >= screenOrder.length - 1}
        >
          ›
        </button>
      </footer>
    </section>
  );
}

function CandidateScreenVisual({ screen }: { screen: CandidateScreen }) {
  if (
    screen.kind === "TEXTBOOK_NATURE_IMAGE" ||
    screen.kind === "TEXTBOOK_NATURE_DETAIL"
  )
    return (
      <div
        className={`sv1-candidate-visual textbook-nature ${screen.kind === "TEXTBOOK_NATURE_DETAIL" ? "detail" : ""}`}
        role="img"
        aria-label="教材中具有自然时刻气氛的山峦色彩图像"
      >
        <span>教材图像 · 来源已闭合</span>
      </div>
    );
  if (screen.kind === "CONTINUOUS_AND_MULTICOLOR")
    return (
      <div
        className="sv1-candidate-visual color-relations"
        aria-label="单色加白与多颜色有序过渡的两组渐变"
      >
        <div>
          <span />
          <span />
          <span />
          <span />
        </div>
        <div>
          <span />
          <span />
          <span />
          <span />
        </div>
        <small>今天先试“主色逐次加白”；渐变不只有这一种方法。</small>
      </div>
    );
  if (screen.kind === "CONTINUOUS_VS_JUMP")
    return (
      <div
        className="sv1-candidate-visual transition-compare"
        aria-label="突然跳变和连续渐变的比较"
      >
        <div>
          <span />
          <span />
        </div>
        <b>比较</b>
        <div className="smooth">
          <span />
          <span />
          <span />
        </div>
      </div>
    );
  if (screen.kind === "FLAT_VS_GRADIENT_NATURE")
    return (
      <div
        className="sv1-candidate-visual light-compare"
        aria-label="平涂与渐变自然光线的比较"
      >
        <div>
          <i />
          <b>平涂</b>
        </div>
        <div className="gradient">
          <i />
          <b>渐变</b>
        </div>
      </div>
    );
  if (screen.kind === "DEMO_PLACEHOLDER")
    return (
      <div className="sv1-candidate-visual demo-placeholder">
        <i>示范图片占位</i>
        <b>{screen.title.replace(/^水粉示范.：/, "")}</b>
        <p>{screen.action.replace(/^示范图片占位：/, "")}</p>
        <small>
          课堂中由教师现场水粉实物示范；这里不使用数字色块冒充真实颜料。
        </small>
      </div>
    );
  if (screen.kind === "OPEN_NATURE_TIME_TASK")
    return (
      <div className="sv1-candidate-visual open-task">
        <span>清晨</span>
        <span>傍晚</span>
        <span>雨后</span>
        <small>只提供自然时刻，不提供标准答案式配色。</small>
      </div>
    );
  if (screen.kind === "LIVE_STUDENT_WORK")
    return (
      <div className="sv1-candidate-visual live-work">
        <i>学生作品投屏区</i>
        <b>让同伴先说感受，再请作者决定改或留</b>
      </div>
    );
  return (
    <div className="sv1-candidate-visual cleanup">
      <span>① 收作品</span>
      <span>② 洗画笔</span>
      <span>③ 收调色盘</span>
      <span>④ 查桌面</span>
    </div>
  );
}

function ScreenObjectTools({
  document,
  editorState,
  dispatch,
}: {
  document: StructuredScreenDocument;
  editorState: ScreenEditorState;
  dispatch: React.Dispatch<LessonWorkspaceAction>;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const selected = editorState.workspace.canvasSelection;
  const object = selected
    ? getScreenCanvasObject(document, selected.objectId)
    : null;
  const style = selected
    ? object?.content.kind === "TEXT" && object.origin === "TEACHER_ADDED"
      ? object.content.style
      : document.textStyles[selected.objectId]
    : undefined;
  const imagePresentation =
    object?.content.kind === "IMAGE" && object.origin === "TEACHER_ADDED"
      ? object.content.presentation
      : selected
        ? document.imagePresentation[selected.objectId]
        : undefined;
  const updateStyle = (patch: Partial<TextStyle>) => {
    if (!selected) return;
    if (object?.content.kind === "TEXT" && object.origin === "TEACHER_ADDED") {
      dispatch({
        type: "UPDATE_TEXT_OBJECT",
        screenId: document.screenId,
        objectId: object.objectId,
        patch: {
          style: {
            ...(object.content.style ?? {
              size: "MEDIUM",
              bold: false,
              color: "DARK",
              align: "LEFT",
            }),
            ...patch,
          },
        },
      });
      return;
    }
    dispatch({
      type: "UPDATE_TEXT_STYLE",
      screenId: document.screenId,
      objectId: selected.objectId,
      patch,
    });
  };
  const updateImage = (patch: {
    fit?: "FIT" | "FILL";
    focalX?: number;
    focalY?: number;
    zoom?: number;
  }) => {
    if (!selected || object?.content.kind !== "IMAGE") return;
    if (object.origin === "TEACHER_ADDED") {
      dispatch({
        type: "UPDATE_IMAGE_OBJECT",
        screenId: document.screenId,
        objectId: object.objectId,
        patch: {
          presentation: {
            ...(object.content.presentation ?? {
              fit: "FILL",
              focalX: 50,
              focalY: 50,
              zoom: 1,
            }),
            ...patch,
          },
        },
      });
      return;
    }
    dispatch({
      type: "UPDATE_IMAGE_PRESENTATION",
      screenId: document.screenId,
      objectId: selected.objectId,
      patch,
    });
  };
  const replaceImage = (file?: File) => {
    if (!file || !selected || object?.content.kind !== "IMAGE") return;
    const asset = createDraftAsset(file, document.screenId, selected.objectId);
    dispatch({ type: "REGISTER_DRAFT_ASSET", asset });
    if (object.origin === "TEACHER_ADDED")
      dispatch({
        type: "UPDATE_IMAGE_OBJECT",
        screenId: document.screenId,
        objectId: object.objectId,
        patch: { assetId: asset.draftAssetId },
      });
    fileInput.current!.value = "";
  };
  const fontSizes = [16, 18, 20, 24, 28, 32, 36, 40, 44, 48] as const;
  const currentFontSize =
    style?.fontSize ??
    (style?.size === "LARGE" ? 36 : style?.size === "SMALL" ? 18 : 24);
  const changeFontSize = (delta: -1 | 1) => {
    const exactIndex = fontSizes.indexOf(
      currentFontSize as (typeof fontSizes)[number],
    );
    const index = exactIndex >= 0 ? exactIndex : 3;
    updateStyle({
      fontSize:
        fontSizes[Math.min(fontSizes.length - 1, Math.max(0, index + delta))],
    });
  };
  const resetFrame = () => {
    if (!object) return;
    const slot = getLayoutSlotDefinition(document.layoutRef, object.objectId);
    if (!slot) return;
    dispatch({
      type: "UPDATE_OBJECT_FRAME",
      screenId: document.screenId,
      objectId: object.objectId,
      frame: slot.defaultFrame,
    });
  };
  const colorSwatches = [
    ["#243c33", "深墨绿"],
    ["#2f6a55", "师维绿"],
    ["#c46f43", "暖橙"],
    ["#3d6f8c", "湖蓝"],
    ["#7a5368", "梅紫"],
    ["#775f4b", "棕色"],
  ] as const;
  const objectLabel = object
    ? object.content.kind === "IMAGE"
      ? "图片"
      : "文字"
    : selected?.kind === "TASK_REQUIREMENT"
      ? "任务要求"
      : "未选择对象";
  return (
    <section className="sv1-object-tools" aria-label="当前对象工具">
      <header>
        <b>当前对象</b>
        <span>{objectLabel}</span>
      </header>
      {!selected && (
        <p className="sv1-object-tools-empty">
          点选画面里的文字或图片，这里会出现对应工具。
        </p>
      )}
      {style && (
        <>
          <div className="sv1-inspector-tool-row">
            <button onClick={() => changeFontSize(-1)}>字号－</button>
            <b>{currentFontSize}px</b>
            <button onClick={() => changeFontSize(1)}>字号＋</button>
            <button
              className={style.bold ? "active" : ""}
              onClick={() => updateStyle({ bold: !style.bold })}
            >
              加粗
            </button>
          </div>
          <div className="sv1-inspector-tool-row">
            {(["LEFT", "CENTER", "RIGHT"] as const).map((align) => (
              <button
                key={align}
                className={style.align === align ? "active" : ""}
                onClick={() => updateStyle({ align })}
              >
                {align === "LEFT" ? "左排" : align === "CENTER" ? "居中" : "右排"}
              </button>
            ))}
          </div>
          <div className="sv1-inspector-color-palette">
            {colorSwatches.map(([color, label]) => (
              <button
                key={color}
                className={style.customColor === color ? "active" : ""}
                title={label}
                aria-label={`文字颜色：${label}`}
                style={{ backgroundColor: color }}
                onClick={() => updateStyle({ customColor: color })}
              />
            ))}
            <label title="自选文字颜色">
              <input
                type="color"
                value={style.customColor || "#243c33"}
                aria-label="自选文字颜色"
                onChange={(event) =>
                  updateStyle({ customColor: event.target.value })
                }
              />
              自选
            </label>
            <button
              className="sv1-color-auto"
              onClick={() =>
                updateStyle({ customColor: undefined, color: "AUTO" })
              }
            >
              跟随主题
            </button>
          </div>
        </>
      )}
      {object?.content.kind === "IMAGE" && (
        <>
          <input
            ref={fileInput}
            hidden
            type="file"
            accept="image/*"
            onChange={(event) => replaceImage(event.target.files?.[0])}
          />
          <div className="sv1-inspector-tool-row">
            <button onClick={() => fileInput.current?.click()}>选择图片</button>
            <button
              className={imagePresentation?.fit === "FIT" ? "active" : ""}
              title="保留整张图片，可能出现留白"
              onClick={() => updateImage({ fit: "FIT" })}
            >
              完整显示
            </button>
            <button
              className={imagePresentation?.fit === "FILL" ? "active" : ""}
              title="填满图片区域，边缘可能被裁掉"
              onClick={() => updateImage({ fit: "FILL" })}
            >
              铺满画面
            </button>
          </div>
          <div className="sv1-inspector-tool-row">
            <button
              onClick={() =>
                updateImage({ fit: "FILL", focalX: 50, focalY: 50, zoom: 1 })
              }
            >
              还原取景
            </button>
          </div>
        </>
      )}
      {object && (
        <>
          <div className="sv1-object-tool-group">
            <b>放到画面位置</b>
            <small>这些按钮是主动对齐；平时拖动仍然自由。</small>
            <div className="sv1-inspector-align-grid">
              {([
                ["LEFT", "靠左"],
                ["H_CENTER", "水平居中"],
                ["RIGHT", "靠右"],
                ["TOP", "靠上"],
                ["V_CENTER", "垂直居中"],
                ["BOTTOM", "靠下"],
              ] as const).map(([alignment, label]) => (
                <button
                  key={alignment}
                  onClick={() =>
                    dispatch({
                      type: "ALIGN_SCREEN_OBJECT",
                      screenId: document.screenId,
                      objectId: object.objectId,
                      alignment,
                    })
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="sv1-inspector-tool-row">
            <button
              className={object.locked ? "active" : ""}
              onClick={() =>
                dispatch({
                  type: object.locked
                    ? "UNLOCK_SCREEN_OBJECT"
                    : "LOCK_SCREEN_OBJECT",
                  screenId: document.screenId,
                  objectId: object.objectId,
                })
              }
            >
              {object.locked ? "解锁" : "锁定"}
            </button>
            <button
              onClick={() =>
                dispatch({
                  type: "CHANGE_OBJECT_Z_INDEX",
                  screenId: document.screenId,
                  objectId: object.objectId,
                  direction: "FORWARD",
                })
              }
            >
              上移一层
            </button>
            <button
              onClick={() =>
                dispatch({
                  type: "CHANGE_OBJECT_Z_INDEX",
                  screenId: document.screenId,
                  objectId: object.objectId,
                  direction: "BACKWARD",
                })
              }
            >
              下移一层
            </button>
          </div>
          <div className="sv1-inspector-tool-row">
            <button onClick={resetFrame} disabled={object.origin === "TEACHER_ADDED"}>
              恢复原位置
            </button>
            {object.origin === "TEACHER_ADDED" && (
              <>
                <button
                  onClick={() =>
                    dispatch({
                      type: "DUPLICATE_SCREEN_OBJECT",
                      screenId: document.screenId,
                      objectId: object.objectId,
                      newObjectId: `${object.objectId}-copy-${Date.now()}`,
                    })
                  }
                >
                  复制
                </button>
                <button
                  className="danger"
                  onClick={() =>
                    dispatch({
                      type: "DELETE_SCREEN_OBJECT",
                      screenId: document.screenId,
                      objectId: object.objectId,
                    })
                  }
                >
                  删除
                </button>
              </>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function ScreenEditingRightRail({
  editorState,
  dispatch,
}: {
  editorState: ScreenEditorState;
  dispatch: React.Dispatch<LessonWorkspaceAction>;
}) {
  const screenId = editorState.workspace.activeScreenId || "S01";
  const document = resolveStructuredScreen(editorState, screenId);
  const binding =
    editorState.draftSession.bindings.find(
      (item) => item.id === editorState.workspace.activeBindingId,
    ) ||
    editorState.draftSession.bindings.find(
      (item) => item.screenId === screenId,
    );
  const episode = binding ? getCandidateEpisode(binding.episodeId) : null;
  const draftAssets = Object.values(
    editorState.draftSession.draftAssets,
  ).filter((asset) => asset.screenId === screenId);
  const presentationOrder = deriveClassroomPresentationOrder(
    colorGradientV05P1Candidate.episodes.map((item) => item.id),
    editorState.draftSession.bindings,
  );
  if (!document) return null;
  if (editorState.workspace.rightRailCollapsed)
    return (
      <aside className="sv1-slot sv1-right-slot sv1-prep-right sv1-screen-editing-inspector is-collapsed">
        <button
          onClick={() => dispatch({ type: "TOGGLE_SCREEN_EDITING_RAIL" })}
          aria-label="展开大屏编辑侧栏"
        >
          ‹<span>展开编辑</span>
        </button>
      </aside>
    );
  return (
    <aside className="sv1-slot sv1-right-slot sv1-prep-right sv1-screen-editing-inspector">
      <button
        className="sv1-inspector-collapse"
        onClick={() => dispatch({ type: "TOGGLE_SCREEN_EDITING_RAIL" })}
      >
        收起侧栏 ›
      </button>
      <span>编辑工具</span>
      <h2>
        {screenDisplayLabel(screenId, presentationOrder)} ·{" "}
        {document.title}
      </h2>
      <ScreenObjectTools
        document={document}
        editorState={editorState}
        dispatch={dispatch}
      />
      <details className="sv1-screen-general-tools" open>
        <summary>整张画面</summary>
        {document.instructionalRole === "OBSERVATION" && (
          <article className="sv1-layout-review-switch">
          <b>画面构图</b>
          <div>
            <button
              className={
                document.layoutRef.templateId === "SINGLE_IMAGE_QUESTION"
                  ? "active"
                  : ""
              }
              onClick={() =>
                dispatch({
                  type: "CHANGE_LAYOUT_TEMPLATE",
                  screenId,
                  layoutRef: {
                    templateId: "SINGLE_IMAGE_QUESTION",
                    version: "1.0",
                  },
                })
              }
            >
              整图提问
            </button>
            <button
              className={
                document.layoutRef.templateId === "SINGLE_IMAGE_QUESTION_SPLIT"
                  ? "active"
                  : ""
              }
              onClick={() =>
                dispatch({
                  type: "CHANGE_LAYOUT_TEMPLATE",
                  screenId,
                  layoutRef: {
                    templateId: "SINGLE_IMAGE_QUESTION_SPLIT",
                    version: "1.0",
                  },
                })
              }
            >
              图文分栏
            </button>
          </div>
          <small>切换构图不会改变文字、图片和课堂关系。</small>
          </article>
        )}
        <article className="sv1-theme-review-switch">
        <b>画面颜色</b>
        <div>
          {visualThemeRegistry.map((theme) => (
            <button
              key={theme.themeId}
              className={
                document.themeRef.themeId === theme.themeId ? "active" : ""
              }
              onClick={() =>
                dispatch({
                  type: "APPLY_VISUAL_THEME",
                  screenId,
                  themeRef: { themeId: theme.themeId, version: theme.version },
                })
              }
            >
              {theme.displayName}
            </button>
          ))}
        </div>
        <div
          className="sv1-theme-batch-status"
          aria-label="三块可编辑大屏颜色状态"
        >
          {editableScreenIds.map((id) => {
            const ref = resolveStructuredScreen(editorState, id)?.themeRef;
            const theme = ref
              ? visualThemeRegistry.find(
                  (item) =>
                    item.themeId === ref.themeId &&
                    item.version === ref.version,
                )
              : null;
            return (
              <span key={id}>
                <b>{screenDisplayLabel(id)}</b>
                {theme?.displayName || "默认颜色"}
              </span>
            );
          })}
        </div>
        <div className="sv1-theme-scope-actions">
          {visualThemeRegistry.map((theme) => (
            <button
              key={`batch-${theme.themeId}`}
              onClick={() =>
                dispatch({
                  type: "APPLY_VISUAL_THEME_TO_EDITABLE_SCREENS",
                  themeRef: { themeId: theme.themeId, version: theme.version },
                })
              }
            >
              三屏统一为「{theme.displayName}」
            </button>
          ))}
          <button
            onClick={() => dispatch({ type: "UNDO_THEME_BATCH" })}
            disabled={!editorState.draftSession.themeBatchUndoStack.length}
          >
            撤销三屏颜色
          </button>
        </div>
        <small>只统一画面颜色，不会覆盖你后来修改的文字、图片和构图。</small>
        </article>
      </details>
      <details className="sv1-screen-info-details">
        <summary>画面信息与教师备注</summary>
        <article>
          <b>用于哪个课堂环节</b>
          <p>
            {episode
              ? `${episodeDisplayLabel(episode.id)} · ${episode.title}`
              : "尚未关联课堂环节"}
          </p>
          <small>
            {binding
              ? `${binding.displayTiming} · ${binding.purpose}`
              : "这张画面目前未放入任何课堂环节。"}
          </small>
        </article>
        <article>
          <b>教师提示</b>
          <textarea
            value={document.teacherOnlyNotes.teacherCue || ""}
            placeholder={binding?.teacherCue || "填写只给教师看的提示"}
            onChange={(event) =>
              dispatch({
                type: "UPDATE_TEACHER_NOTES",
                screenId,
                patch: { teacherCue: event.target.value },
              })
            }
          />
        </article>
        {document.instructionalRole === "TASK" && (
          <>
            <article>
              <b>课前准备</b>
              <textarea
                value={document.teacherOnlyNotes.teacherPreparationNote || ""}
                onChange={(event) =>
                  dispatch({
                    type: "UPDATE_TEACHER_NOTES",
                    screenId,
                    patch: { teacherPreparationNote: event.target.value },
                  })
                }
              />
            </article>
            <article>
              <b>材料降级条件</b>
              <textarea
                value={document.teacherOnlyNotes.materialFallback || ""}
                onChange={(event) =>
                  dispatch({
                    type: "UPDATE_TEACHER_NOTES",
                    screenId,
                    patch: { materialFallback: event.target.value },
                  })
                }
              />
            </article>
          </>
        )}
        <article>
          <b>图片来源</b>
          <p>
            {document.sourcePointers
              .map((source) => source.note || "教师选用的课堂图片")
              .join("；")}
          </p>
          {draftAssets.length ? (
            draftAssets.map((asset) => (
              <small key={asset.draftAssetId}>
                {asset.fileName} · {Math.ceil(asset.size / 1024)}KB · 本次替换
              </small>
            ))
          ) : (
            <small>当前使用原来的课堂图片。</small>
          )}
        </article>
        <article>
          <b>本次调整</b>
          <p>
            {editorState.draftSession.dirtyScreenIds.includes(screenId)
              ? "当前画面已经调整"
              : "当前画面还没有调整"}
          </p>
          <small>可继续预览；正式保存将在后续版本开放。</small>
        </article>
      </details>
      <button
        className="sv1-inspector-exit"
        onClick={() => dispatch({ type: "EXIT_STRUCTURED_EDIT" })}
      >
        完成编辑
      </button>
    </aside>
  );
}

function PrepRightRail({
  surfaceId,
  assignment,
  activeLesson,
  activeProjection,
  lessonDetailState,
  lessonViewVersion,
  screenEditorState,
  dispatchScreenEditorAction,
  openOverlay,
}: {
  surfaceId: PrepSurfaceId;
  assignment: CourseAssignment;
  activeLesson: LessonPreparationSummary | null;
  activeProjection: LessonProjectionId;
  lessonDetailState: LessonDetailState | null;
  lessonViewVersion: LessonViewVersion;
  screenEditorState: ScreenEditorState;
  dispatchScreenEditorAction: React.Dispatch<LessonWorkspaceAction>;
  openOverlay: (type: "source" | "confirm") => void;
}) {
  const backendDetail = lessonDetailState?.data;
  const asset = backendDetail?.teachingAsset;
  const candidateActive =
    activeLesson?.id === "lesson_grade3_gradient_01" &&
    lessonViewVersion === "candidate-v0.5-p1";
  const candidateSelection = screenEditorState.workspace;
  const activeCandidateBinding =
    colorGradientV05P1Candidate.screenBindings.find(
      (binding) => binding.id === candidateSelection.activeBindingId,
    ) || null;
  const activeCandidateEpisode = activeCandidateBinding
    ? getCandidateEpisode(activeCandidateBinding.episodeId)
    : null;
  const activeCandidateScreen = activeCandidateBinding
    ? colorGradientV05P1Candidate.screens.find(
        (screen) => screen.id === activeCandidateBinding.screenId,
      ) || null
    : null;
  const candidateItems = [
    {
      label: "课堂结构",
      text: `${colorGradientV05P1Candidate.episodeCount}个环节 · ${colorGradientV05P1Candidate.plannedMinutes}分钟 · ${colorGradientV05P1Candidate.screenCount}屏学生大屏`,
    },
    ...(activeCandidateBinding &&
    ["class_flow", "class_screen"].includes(activeProjection)
      ? [
          {
            label: "当前课堂位置",
            text: `${activeCandidateEpisode ? episodeDisplayLabel(activeCandidateEpisode.id) : "课堂环节"} · ${activeCandidateEpisode?.title || ""} ↔ ${activeCandidateScreen ? screenDisplayLabel(activeCandidateScreen.id) : "课堂画面"} · ${activeCandidateScreen?.title || ""}`,
          },
          {
            label: "什么时候展示",
            text: `${activeCandidateBinding.displayTiming}；${activeCandidateBinding.purpose}`,
          },
          {
            label: "教师提示",
            text: activeCandidateBinding.teacherCue || "当前画面没有额外提示。",
          },
        ]
      : []),
    {
      label: "材料",
      text: `${colorGradientV05P1Candidate.primaryMaterial}；${colorGradientV05P1Candidate.fallbackMaterial}`,
    },
    { label: "示范准备", text: colorGradientV05P1Candidate.demoStatus },
    { label: "课堂时间", text: colorGradientV05P1Candidate.timingStatus },
  ];
  const runtimeItems = backendDetail
    ? [
        {
          label: "教学版本",
          text: asset
            ? `${asset.displayStatus} · V${asset.assetReleaseVersion} · 非正式标准`
            : "当前课时未绑定版本化教学资产。",
        },
        {
          label: "课堂结构",
          text: asset
            ? `${asset.episodeCount}段课堂展开 · ${asset.plannedMinutes}分钟教学＋${asset.flexMinutes}分钟弹性`
            : backendDetail.stageStatusSummary.summary,
        },
        { label: "材料", text: asset?.materialStatus || "待教师判断" },
        {
          label: "资源待确认",
          text:
            asset?.holds.map((item) => item.label).join("；") ||
            "当前没有资源待确认项。",
        },
        {
          label: "第二课接口",
          text: asset?.nextLessonInterface || "尚未建立下一课接口。",
        },
        { label: "质量检查", text: backendDetail.stageStatusSummary.summary },
        {
          label: "待处理事项",
          text:
            backendDetail.teacherGate.messages.join("；") ||
            "当前没有需要先处理的事项。",
        },
        {
          label: "教师确认",
          text: backendDetail.teacherGate.canConfirm
            ? "当前可进入教师审核；本阶段仍为只读，不会自动写回。"
            : "当前允许查看和修改，确认采用与正式写回保持关闭。",
        },
      ]
    : [
        {
          label: "服务状态",
          text:
            lessonDetailState?.message ||
            "正在读取真实课时，不显示旧的静态正文。",
        },
      ];
  const lessonDetailItems = candidateActive ? candidateItems : runtimeItems;
  const content: Record<
    PrepSurfaceId,
    {
      title: string;
      items: { label: string; text: string; action?: "source" | "confirm" }[];
    }
  > = {
    semester_plan: {
      title: "双年级学期规划",
      items: [
        {
          label: "共同校历",
          text: "两年级共用16个教学周、节假日、创艺节与考试周。",
        },
        {
          label: "理念所有权",
          text: "理念由教师与小教协商形成，教师确认后才进入正式规划。",
        },
        {
          label: "后续输出",
          text: "理念、单元与周课表将共同进入可导出的教学工作计划。",
        },
      ],
    },
    unit_design: {
      title: "来源与单元确认",
      items: [
        {
          label: "来源依据",
          text: "教材单元说明、课标要求、既有课堂记录。",
          action: "source",
        },
        {
          label: "待教师确认",
          text: "大观念表述和表现性任务尚需教师确认。",
          action: "confirm",
        },
        { label: "资料缺口", text: "缺少一份学生前测作品样本。" },
      ],
    },
    class_progress: {
      title: "两个班级进度看板",
      items: [
        {
          label: "课题推进对照",
          text: "保留原看板，按课题横向比较三、四年级共10个班。",
        },
        {
          label: "学期班级时间表",
          text: "按工作日逐天展开；课程格只显示课题，纵线表示5月10日，可横向拖动。",
        },
        {
          label: "后续串联",
          text: "周次和日期关系已保留，后续可以由学期规划调整教学周、活动周与机动周。",
        },
      ],
    },
    week_schedule: {
      title: "真实课表与课前准备",
      items: [
        {
          label: "课位来源",
          text: "教师提供的课程表图片共18节：三年级8节、四年级10节，已合并显示。",
        },
        {
          label: "午间机动",
          text: "每天12:10–12:50保留为空闲调课位，不计入18节正式课。",
        },
        {
          label: "尚待确认",
          text: "原图未标注教室，页面暂记为“教室待确认”；课题与状态读取当前备课数据。",
          action: "confirm",
        },
      ],
    },
    lesson_index: {
      title: "状态筛选与待办",
      items: [
        { label: "待教师确认", text: "3项" },
        { label: "待补材料", text: "2项" },
        { label: "待修改候选", text: "2项" },
      ],
    },
    lesson_detail: {
      title: activeLesson?.title || "课时判断",
      items: lessonDetailItems,
    },
  };
  const rail = content[surfaceId];
  if (
    candidateActive &&
    activeProjection === "class_screen" &&
    candidateSelection.screenMode === "STRUCTURED_EDIT"
  )
    return (
      <ScreenEditingRightRail
        editorState={screenEditorState}
        dispatch={dispatchScreenEditorAction}
      />
    );
  return (
    <aside className="sv1-slot sv1-right-slot sv1-prep-right">
      <span>当前页面辅助判断</span>
      <h2>{rail.title}</h2>
      <article>
        <b>教学对象</b>
        <p>
          {assignment.grade}
          {assignment.subject} · 当前学期
        </p>
      </article>
      {surfaceId === "lesson_detail" && !candidateActive && backendDetail && (
        <article className="sv1-asset-source-detail">
          <details>
            <summary>查看来源与版本</summary>
            <p>{backendDetail.sourceSummary.summary}</p>
            {asset && (
              <>
                <small>教学资产 V{asset.assetReleaseVersion}</small>
                <small>{asset.displayStatus}，不是正式教学标准</small>
                <small>教师裁决与经审核系统重建分开记录</small>
              </>
            )}
          </details>
        </article>
      )}
      {rail.items.map((item) => (
        <article key={item.label}>
          <b>{item.label}</b>
          <p>{item.text}</p>
          {item.action && (
            <button onClick={() => openOverlay(item.action!)}>
              {item.action === "source" ? "查看来源" : "打开确认"}
            </button>
          )}
        </article>
      ))}
    </aside>
  );
}

function ContentSurface({
  mode,
  roomId,
  activeTool,
  assignment,
}: {
  mode: RenderMode;
  roomId: RoomId;
  activeTool: string;
  assignment: CourseAssignment;
}) {
  const copy = renderModeCopy[mode];
  if (roomId === "classroom" && mode === "presentation")
    return (
      <div className="sv1-content sv1-presentation sv1-classroom-template">
        <div className="sv1-classroom-main">
          <span>课堂主舞台 · {assignment.grade}</span>
          <h2>
            {assignment.workspace.currentLessonLabel.replace(/[《》]/g, "")}
          </h2>
          <p>当前环节：观察两组色彩变化，判断渐变的方向与速度。</p>
          <div className="sv1-classroom-cue">
            <b>教师提示</b>
            <span>先让学生描述“哪里开始变化”，再进入示范。</span>
          </div>
        </div>
        <aside>
          <span>课堂节奏</span>
          <b>观察与表达</b>
          <small>下一步：示范渐变方法</small>
          <span>学生状态</span>
          <b>多数已完成比较</b>
          <small>三（2）组需要再次提示</small>
        </aside>
      </div>
    );
  if (roomId === "review" && mode === "workspace")
    return (
      <div className="sv1-content sv1-workspace sv1-review-template">
        <header>
          <span>评阅室 · {assignment.grade}</span>
          <h2>{assignment.workspace.currentLessonLabel} 学习证据</h2>
          <p>先看作品与课堂证据，再形成评价候选，最终由教师确认。</p>
        </header>
        <div className="sv1-review-board">
          <article>
            <i>01</i>
            <b>当前批次</b>
            <p>{assignment.workspace.reviewPendingCount}份作品等待查看</p>
          </article>
          <article>
            <i>02</i>
            <b>学习证据</b>
            <p>色彩方向、层次变化、表达说明</p>
          </article>
          <article>
            <i>03</i>
            <b>评价候选</b>
            <p>系统给出判断依据，不直接写回结果</p>
          </article>
          <article>
            <i>04</i>
            <b>教师确认</b>
            <p>{assignment.workspace.teacherConfirmationCount}项需要教师决定</p>
          </article>
        </div>
      </div>
    );
  if (mode === "document")
    return (
      <div className="sv1-content sv1-document">
        <article className="sv1-paper">
          <div className="sv1-reading-column">
            <span>CONTENT SURFACE · 四级内容</span>
            <h2>{copy.label}</h2>
            <p>{copy.description}</p>
            <h3>{activeTool}</h3>
          </div>
        </article>
      </div>
    );
  if (mode === "workspace")
    return (
      <div className="sv1-content sv1-workspace">
        <header>
          <span>CONTENT SURFACE · 四级内容</span>
          <h2>{copy.label}</h2>
          <p>{copy.description}</p>
        </header>
        <div>
          {["任务区", "工作区", "状态区", "操作区"].map((item, index) => (
            <article key={item}>
              <i>0{index + 1}</i>
              <b>{item}</b>
              <p>由当前业务空间定义，不进入全局壳合同。</p>
            </article>
          ))}
        </div>
      </div>
    );
  if (mode === "canvas")
    return (
      <div className="sv1-content sv1-canvas">
        <span>CONTENT SURFACE · 四级内容</span>
        <h2>{copy.label}</h2>
        <p>{copy.description}</p>
        <div className="sv1-node n1">问题</div>
        <div className="sv1-node n2">证据</div>
        <div className="sv1-node n3">关系</div>
        <div className="sv1-node n4">沉淀</div>
      </div>
    );
  return (
    <div className="sv1-content sv1-presentation">
      <div>
        <span>PRESENTATION MODE</span>
        <h2>中央舞台获得最高优先级</h2>
        <p>{copy.description}</p>
        <small>左、右插槽与小教可按场景折叠。</small>
      </div>
    </div>
  );
}

function AgentDock({
  mode,
  cycle,
  setMode,
}: {
  mode: AgentDockMode;
  cycle: () => void;
  setMode: (mode: AgentDockMode) => void;
  context: string;
}) {
  if (mode === "COLLAPSED")
    return (
      <button
        className="sv1-agent-collapsed"
        onClick={() => setMode("FLOATING")}
        aria-label="展开小教"
      >
        小
      </button>
    );
  if (mode === "FLOATING")
    return (
      <section
        className="sv1-agent-dock floating"
        aria-label="全局小教对话停靠层"
      >
        <div className="sv1-agent-inline-identity">
          <i>小</i>
          <b>小教</b>
        </div>
        <input
          aria-label="告诉小教你想做什么"
          placeholder="告诉小教：我接下来想做什么……"
        />
        <button
          className="sv1-agent-expand"
          onClick={cycle}
          aria-label="展开小教对话"
        >
          ⌃
        </button>
        <button className="sv1-agent-send">发送</button>
      </section>
    );
  return (
    <section
      className={`sv1-agent-dock ${mode.toLowerCase()}`}
      aria-label="全局小教对话停靠层"
    >
      <header>
        <div>
          <i>小</i>
          <b>小教</b>
        </div>
        <button onClick={cycle}>切换形态</button>
      </header>
      {mode !== "FLOATING" && (
        <div className="sv1-agent-history">
          <p>
            <b>小教</b>
            我会保留当前空间、任务与渲染模式，但不会把对话框变成新的业务壳层。
          </p>
          <div>
            <button>查看当前上下文</button>
            <button>建议下一步</button>
          </div>
        </div>
      )}
      <footer>
        <input
          aria-label="告诉小教你想做什么"
          placeholder="告诉小教：我接下来想做什么……"
        />
        <button>发送</button>
      </footer>
    </section>
  );
}

function GlobalOverlay({
  type,
  close,
  academicContext,
  availableAssignments,
  enabledAssignmentIds,
  selectedClassIds,
  selectTerm,
  selectAssignment,
  toggleAssignment,
  toggleClass,
}: {
  type: "source" | "confirm" | "term";
  close: () => void;
  academicContext: AcademicWorkspaceContext;
  availableAssignments: CourseAssignment[];
  enabledAssignmentIds: string[];
  selectedClassIds: Record<string, string[]>;
  selectTerm: (termId: string) => void;
  selectAssignment: (assignmentId: string) => void;
  toggleAssignment: (assignmentId: string) => void;
  toggleClass: (assignmentId: string, classId: string) => void;
}) {
  const title =
    type === "source"
      ? "来源与依据"
      : type === "confirm"
        ? "教师确认"
        : "学期与任教设置";
  return (
    <div
      className="sv1-overlay-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && close()}
    >
      <section
        className={`sv1-overlay ${type === "term" ? "term-overlay" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={
          type === "source"
            ? "来源与依据"
            : type === "confirm"
              ? "教师确认"
              : "学期与任教设置浮层"
        }
      >
        <header>
          <div>
            <span>
              {type === "term"
                ? "全局工作上下文"
                : type === "source"
                  ? "当前课堂依据"
                  : "教师判断与采用"}
            </span>
            <h2>{title}</h2>
          </div>
          <button onClick={close}>×</button>
        </header>
        {type === "term" ? (
          <>
            <p>
              这里统一设置当前工作学期和任教范围，备课室、教室与评阅室会共同使用这份上下文。
            </p>
            <section className="sv1-work-context-editor">
              <header>
                <b>工作学期</b>
                <small>已有任教配置的学期可以直接切换</small>
              </header>
              <div className="sv1-term-list">
              {academicContext.terms.map((term) => (
                <button
                  key={term.id}
                  className={
                    term.id === academicContext.activeTermId ? "active" : ""
                  }
                  disabled={
                    !availableAssignments.some(
                      (assignment) => assignment.termId === term.id,
                    )
                  }
                  onClick={() => selectTerm(term.id)}
                >
                  <div>
                    <b>
                      {term.academicYear} · {term.label}
                    </b>
                    <span>
                      {availableAssignments.some(
                        (assignment) => assignment.termId === term.id,
                      )
                        ? term.id === academicContext.activeTermId
                          ? "当前使用"
                          : "切换到这个学期"
                        : "尚未配置任教信息"}
                    </span>
                  </div>
                  <em>{term.id === academicContext.activeTermId ? "已选择" : ""}</em>
                </button>
              ))}
              </div>
            </section>
            <section className="sv1-work-context-editor">
              <header>
                <b>任教学科与班级</b>
                <small>至少保留一项任教任务和一个班级</small>
              </header>
              <div className="sv1-assignment-editor-list">
                {availableAssignments
                  .filter(
                    (assignment) =>
                      assignment.termId === academicContext.activeTermId,
                  )
                  .map((assignment) => {
                    const enabled = enabledAssignmentIds.includes(assignment.id);
                    const selectedClasses = selectedClassIds[assignment.id] || [];
                    return (
                      <article
                        key={assignment.id}
                        className={
                          assignment.id === academicContext.activeAssignmentId
                            ? "active"
                            : ""
                        }
                      >
                        <header>
                          <label>
                            <input
                              type="checkbox"
                              checked={enabled}
                              onChange={() => toggleAssignment(assignment.id)}
                            />
                            <b>
                              {assignment.grade}
                              {assignment.subject}
                            </b>
                          </label>
                          <button
                            disabled={!enabled}
                            onClick={() => selectAssignment(assignment.id)}
                          >
                            {assignment.id === academicContext.activeAssignmentId
                              ? "当前任务"
                              : "设为当前"}
                          </button>
                        </header>
                        <div className="sv1-class-choice-list">
                          {assignment.classIds.map((classId, index) => (
                            <button
                              key={classId}
                              className={
                                selectedClasses.includes(classId) ? "active" : ""
                              }
                              disabled={!enabled}
                              onClick={() => toggleClass(assignment.id, classId)}
                            >
                              {assignment.grade.replace("年级", "")}（{index + 1}）班
                            </button>
                          ))}
                        </div>
                      </article>
                    );
                  })}
              </div>
            </section>
          </>
        ) : (
          <>
            <p>
              {type === "source"
                ? "当前内容来自本学期任教上下文与教师已确认的课时快照。这里仅供查看，不会改变课堂内容。"
                : "当前仍是系统内课堂预演。确认操作只改变本页预览状态，不会写入真实课堂记录。"}
            </p>
            <div className="sv1-overlay-demo">
              <b>
                {type === "source"
                  ? "来源受保护 · 课堂只读使用"
                  : "教师确认尚未开放正式写回"}
              </b>
              <span>
                {type === "source"
                  ? "关闭后回到当前课堂环节和当前大屏。"
                  : "关闭后继续预演；不会生成 ClassroomActualRecord。"}
              </span>
            </div>
          </>
        )}
        <footer>
          <button onClick={close}>完成查看</button>
        </footer>
      </section>
    </div>
  );
}
