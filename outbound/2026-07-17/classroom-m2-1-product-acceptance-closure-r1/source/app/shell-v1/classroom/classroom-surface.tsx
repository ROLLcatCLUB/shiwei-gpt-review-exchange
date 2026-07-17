"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { ClassroomScreenDocument } from "../../../domain/classroom-handoff/lesson-classroom-package";
import { type ClassroomQuickMark } from "../../../domain/classroom-evidence/lightweight-evidence-triage";
import {
  createAssistantOneLineNote,
  createAssistantQuickMark,
  type TeacherProfessionalContextChoice,
  type TeacherWorkDecision,
} from "../../../domain/classroom-assistant/teacher-work-assistant";
import {
  getActiveAssignment,
  getActiveTerm,
  type AcademicWorkspaceContext,
} from "../contracts";
import {
  classroomPageRegistry,
  classroomScreenContent,
  classroomScreenImageUri,
  type ClassroomCandidate,
  type ClassroomLessonPackageDirectory,
} from "./classroom-contracts";
import {
  classroomCandidates,
  classroomLessonPackageDirectories,
  recommendedClassroomCandidateId,
} from "./classroom-candidate-fixture";
import { classroomPreviewFixture } from "./classroom-preview-fixture";
import {
  classroomPackageMinutes,
  resolveClassroomPackage,
  validateCurrentBindingForPackage,
  validatePreviewLockAgainstPackage,
} from "./classroom-package-registry";
import {
  TeacherWorkAssistantJourneyBar,
  TeacherWorkAssistantNavigation,
  TeacherWorkAssistantPostclassPanel,
  TeacherWorkAssistantPreparationPanel,
  TeacherWorkAssistantRecordPanel,
} from "./teacher-work-assistant-review";
import {
  createTeacherWorkAssistantReviewFixture,
} from "./teacher-work-assistant-review-fixture";
import {
  advanceClassroomFixtureClock,
  createClassroomWebFixtureAdapter,
  createInitialClassroomFixtureToolState,
  type ClassroomWebFixtureResult,
} from "./adapters/classroom-web-fixture-adapter";
import { compileClassroomComponentPlan } from "./composition/classroom-component-plan";
import { colorGradientClassroomCompositionBlueprint } from "./composition/color-gradient-classroom-composition-blueprint";
import { resolveClassroomContextReminderCandidate } from "./composition/classroom-context-reminder-registry";
import {
  ClassroomDockHost,
  ClassroomOverlayHost,
  ClassroomSidecarHost,
  ClassroomStageHost,
} from "./hosts/classroom-component-hosts";
import type {
  ClassroomGalleryWork,
  ClassroomMaterialItem,
} from "./components/internal/classroom-internal-components";
import type { ClassroomLiveRenderContext } from "./components/classroom-live-components";
import { colorfulWorldSemesterClassroomWorkset } from "./semester-classroom-workset-fixture";
import { useClassroomWorkspaceController } from "./use-classroom-workspace-controller";
import {
  SemesterClassroomPreparationPanel,
  SemesterClassroomRecordPanel,
} from "./components/semester-classroom-workset-panels";

type ClassroomSurfaceProps = {
  academicContext: AcademicWorkspaceContext;
  openOverlay: (type: "source" | "confirm") => void;
};

const initialMaterialItems: readonly ClassroomMaterialItem[] = Object.freeze([
  { id: "paint", label: "水粉颜料已分装", checked: true, group: "PREPARE" },
  { id: "water", label: "清水与调色盘已检查", checked: false, group: "PREPARE" },
  { id: "middle-color", label: "先调中间色，再连接两端", checked: false, group: "USE" },
  { id: "brush", label: "换色前清洗并吸干画笔", checked: false, group: "USE" },
  { id: "work", label: "先收作品，再洗笔", checked: false, group: "CLEANUP" },
  { id: "desk", label: "检查调色盘与桌面", checked: false, group: "CLEANUP" },
]);

const classroomGalleryWorks: readonly ClassroomGalleryWork[] = Object.freeze([
  { workId: "work-01", title: "傍晚的山峦", tag: "表现突出", palette: "linear-gradient(145deg,#f3b38d,#7b728f,#38566b)" },
  { workId: "work-02", title: "雨后的天空", tag: "基本达成", palette: "linear-gradient(145deg,#d9e1d7,#83a8ac,#5c7284)" },
  { workId: "work-03", title: "清晨的湖面", tag: "基本达成", palette: "linear-gradient(145deg,#f4d5a9,#a8c9c3,#6a8b95)" },
  { workId: "work-04", title: "晚霞试色", tag: "需支持", palette: "linear-gradient(145deg,#f0aa87 0 48%,#566f91 52%)" },
  { workId: "work-05", title: "山谷微光", tag: "表现突出", palette: "linear-gradient(145deg,#f1c690,#aa8d9f,#3f6170)" },
  { workId: "work-06", title: "雨后远山", tag: "需支持", palette: "linear-gradient(145deg,#c9d7d0 0 42%,#758f84 46%)" },
]);

function classroomCandidateStatus(candidate: ClassroomCandidate) {
  if (candidate.catalogState === "TAUGHT")
    return { className: "taught", label: "已上" };
  if (candidate.catalogState === "IN_PROGRESS")
    return { className: "in-progress", label: "当前时段" };
  if (candidate.eligibility === "READY")
    return { className: "ready", label: "可上" };
  if (candidate.eligibility === "NEEDS_CONFIRMATION")
    return { className: "needs_confirmation", label: "待确认" };
  if (candidate.eligibility === "DRAFT_ONLY")
    return { className: "draft_only", label: "草稿" };
  return { className: "hold", label: "暂停" };
}

function packageCandidates(lessonPackage: ClassroomLessonPackageDirectory) {
  return lessonPackage.candidateIds
    .map((candidateId) =>
      classroomCandidates.find((candidate) => candidate.candidateId === candidateId),
    )
    .filter((candidate): candidate is ClassroomCandidate => Boolean(candidate));
}

function formatClock(seconds: number) {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const rest = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${rest}`;
}

const subscribeToClassroomComponentDebug = () => () => {};
const readClassroomComponentDebug = () =>
  new URLSearchParams(window.location.search).get("classroomComponentDebug") ===
  "true";
const readServerClassroomComponentDebug = () => false;

export function ClassroomSurface({
  academicContext,
}: ClassroomSurfaceProps) {
  const fixture = classroomPreviewFixture;
  const activeTerm = getActiveTerm(academicContext);
  const activeAssignment = getActiveAssignment(academicContext);
  const classroomWorkspace = useClassroomWorkspaceController({
    selectedCandidateId: recommendedClassroomCandidateId,
    elapsedSeconds: fixture.session.elapsedSeconds,
    materialItems: initialMaterialItems,
    sessionPackages: colorfulWorldSemesterClassroomWorkset.sessionPackages,
    scheduleInstances: colorfulWorldSemesterClassroomWorkset.scheduleInstances,
    researchHandoffCandidates: colorfulWorldSemesterClassroomWorkset.researchHandoffCandidates,
  });
  const {
    selectedCandidateId,
    catalogPreviewPackageId,
    previewLock,
    currentBindingId,
    classroomToolState,
    rightRailOpen,
    exitConfirmOpen,
    activeQuickMark,
    lastQuickMarkFact,
    teacherAssistantReviewState,
    teacherAssistantPrimaryView,
    teacherAssistantQuickMarkOpen,
    teacherAssistantContextChoice,
    teacherAssistantContextNote,
    teacherAssistantDecisionAction,
    teacherAssistantTriageDeferred,
    teacherAssistantNextClassOutcome,
    materialItems,
    selectedGalleryWorkId,
    imageCompareSide,
  } = classroomWorkspace.state;
  const {
    setSelectedCandidateId,
    setCatalogPreviewPackageId,
    setPreviewLock,
    setCurrentBindingId,
    setClassroomToolState,
    setRightRailOpen,
    setExitConfirmOpen,
    setActiveQuickMark,
    setLastQuickMarkFact,
    setTeacherAssistantReviewState,
    setTeacherAssistantPrimaryView,
    setTeacherAssistantQuickMarkOpen,
    setTeacherAssistantContextChoice,
    setTeacherAssistantContextNote,
    setTeacherAssistantDecisionAction,
    setTeacherAssistantTriageDeferred,
    setTeacherAssistantNextClassOutcome,
    setMaterialItems,
    setSelectedGalleryWorkId,
    setImageCompareSide,
  } = classroomWorkspace;
  const classroomComponentDebug = useSyncExternalStore(
    subscribeToClassroomComponentDebug,
    readClassroomComponentDebug,
    readServerClassroomComponentDebug,
  );
  const teacherAssistantReviewFixture = createTeacherWorkAssistantReviewFixture(teacherAssistantReviewState, {
         ...(teacherAssistantContextChoice
           ? { selectedContextChoice: teacherAssistantContextChoice }
          : {}),
        ...(teacherAssistantContextNote
          ? { selectedContextNote: teacherAssistantContextNote }
          : {}),
         ...(teacherAssistantDecisionAction
           ? { selectedDecisionAction: teacherAssistantDecisionAction }
           : {}),
       });

  useEffect(() => {
    if (teacherAssistantReviewState !== "closing") return;
    const finishClosing = window.setTimeout(
      () => setTeacherAssistantReviewState("postclass"),
      350,
    );
    return () => window.clearTimeout(finishClosing);
  }, [setTeacherAssistantReviewState, teacherAssistantReviewState]);

  useEffect(() => {
    if (!classroomToolState.timerRunning) return;
    const timer = window.setInterval(
      () => setClassroomToolState((current) => advanceClassroomFixtureClock(current)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [classroomToolState.timerRunning, setClassroomToolState]);

  const nearestCandidate = classroomCandidates.find(
    (candidate) => candidate.candidateId === recommendedClassroomCandidateId,
  ) || classroomCandidates[0];
  const lockedCandidate = previewLock
    ? classroomCandidates.find((candidate) => candidate.candidateId === previewLock.candidateId)
    : null;
  const teacherAssistantClassroomCandidate =
    lockedCandidate ||
    classroomCandidates.find(
      (candidate) => candidate.candidateId === selectedCandidateId,
    ) ||
    nearestCandidate;
  const contextMismatch = Boolean(
    previewLock && activeAssignment.id !== previewLock.assignmentId,
  );
  const previewPackage = catalogPreviewPackageId
    ? classroomLessonPackageDirectories.find(
        (lessonPackage) => lessonPackage.directoryId === catalogPreviewPackageId,
      ) || null
    : null;
  const previewPackageCandidates = previewPackage
    ? packageCandidates(previewPackage)
    : [];
  const previewSelectedCandidate =
    previewPackageCandidates.find(
      (candidate) => candidate.candidateId === selectedCandidateId,
    ) || previewPackageCandidates[0] || null;
  const previewPackageSourceCandidate =
    previewPackageCandidates.find(
      (candidate) => candidate.eligibility === "READY",
    ) || null;
  const previewResolution = resolveClassroomPackage(
    previewPackageSourceCandidate,
  );
  const resolvedPreviewPackage =
    previewResolution.status === "RESOLVED"
      ? previewResolution.classroomPackage
      : null;
  const previewPresentationProfile =
    previewResolution.status === "RESOLVED"
      ? previewResolution.presentationProfile
      : null;
  const previewMinutes = resolvedPreviewPackage
    ? classroomPackageMinutes(resolvedPreviewPackage)
    : 0;
  const lockedResolution = resolveClassroomPackage(lockedCandidate);
  const classroomPackage =
    lockedResolution.status === "RESOLVED"
      ? lockedResolution.classroomPackage
      : null;
  const classroomPresentationProfile =
    lockedResolution.status === "RESOLVED"
      ? lockedResolution.presentationProfile
      : null;
  const lockIssues =
    previewLock && lockedCandidate && classroomPackage
      ? validatePreviewLockAgainstPackage(
          previewLock,
          lockedCandidate,
          classroomPackage,
        )
      : [];
  const currentPresentationItem =
    classroomPackage && currentBindingId
      ? classroomPackage.presentationSequence.find(
          (item) => item.bindingId === currentBindingId,
        ) || null
      : null;
  const currentBinding =
    classroomPackage && currentPresentationItem
      ? classroomPackage.screenBindings.find(
          (binding) => binding.bindingId === currentPresentationItem.bindingId,
        ) || null
      : null;
  const bindingIssues = classroomPackage
    ? validateCurrentBindingForPackage(currentBindingId, classroomPackage)
    : [];
  const currentEpisode =
    classroomPackage && currentBinding
      ? classroomPackage.episodes.find(
          (episode) => episode.episodeId === currentBinding.episodeId,
        ) || null
      : null;
  const currentScreen =
    classroomPackage && currentBinding
      ? classroomPackage.screens.find(
          (screen) => screen.screenId === currentBinding.screenId,
        ) || null
      : null;
  const currentBindingIndex =
    currentPresentationItem
      ? currentPresentationItem.sequenceIndex
      : -1;
  const currentScreenNumber =
    currentPresentationItem ? currentPresentationItem.sequenceIndex + 1 : 0;
  const teacherCue =
    classroomPackage && currentBinding
      ? classroomPackage.teacherNotes.find(
          (note) =>
            note.bindingId === currentBinding.bindingId &&
            note.noteType === "TEACHER_CUE",
        )?.content
      : undefined;
  const totalMinutes = classroomPackage
    ? classroomPackageMinutes(classroomPackage)
    : 0;
  const progressPercent =
    classroomPackage && currentEpisode
      ? Math.round(
          (currentEpisode.displayOrder / classroomPackage.episodes.length) *
            100,
        )
      : 0;
  const preflightScreens =
    previewResolution.status === "RESOLVED"
      ? previewResolution.presentationProfile.previewScreenIds
          .map((screenId) =>
            previewResolution.classroomPackage.screens.find(
              (screen) => screen.screenId === screenId,
            ),
          )
          .filter((screen): screen is ClassroomScreenDocument => Boolean(screen))
      : [];

  function openCatalogPackage(
    lessonPackage: ClassroomLessonPackageDirectory,
    candidateId?: string,
  ) {
    const candidates = packageCandidates(lessonPackage);
    const preferredCandidate = candidateId
      ? candidates.find((candidate) => candidate.candidateId === candidateId)
      : candidates.find(
          (candidate) =>
            candidate.eligibility === "READY" && candidate.catalogState !== "TAUGHT",
        ) || candidates[0];
    if (preferredCandidate) setSelectedCandidateId(preferredCandidate.candidateId);
    setCatalogPreviewPackageId(lessonPackage.directoryId);
    setRightRailOpen(false);
  }

  function openSemesterWorksetLesson(lessonId: string, classId: string) {
    const lesson = colorfulWorldSemesterClassroomWorkset.lessons.find(
      (item) => item.lessonId === lessonId,
    );
    if (!lesson) return;
    const lessonPackage = classroomLessonPackageDirectories.find(
      (item) => item.lessonTitle === lesson.lessonTitle,
    );
    if (!lessonPackage) return;
    const candidate = packageCandidates(lessonPackage).find(
      (item) => item.classId === classId,
    );
    openCatalogPackage(lessonPackage, candidate?.candidateId);
  }

  function openSemesterSessionRecord(sessionPackageId: string) {
    classroomWorkspace.setSelectedSessionPackageId(sessionPackageId);
    classroomWorkspace.setSelectedAcrossSummaryId(null);
    setTeacherAssistantReviewState("record");
    setTeacherAssistantPrimaryView("record");
  }

  function startClassroomSimulation(candidate: ClassroomCandidate) {
    if (candidate.eligibility !== "READY" || candidate.catalogState === "TAUGHT")
      return;
    const resolution = resolveClassroomPackage(candidate);
    if (resolution.status !== "RESOLVED") return;
    const firstPresentationItem =
      resolution.classroomPackage.presentationSequence[0];
    if (!firstPresentationItem) return;
    setPreviewLock({
      candidateId: candidate.candidateId,
      occurrenceId: candidate.occurrenceId,
      assignmentId: candidate.assignmentId,
      classId: candidate.classId,
      packageId: candidate.packageId,
      snapshotId: candidate.snapshotId,
      sourceLessonRevisionId: candidate.sourceLessonRevisionId,
    });
    setCurrentBindingId(firstPresentationItem.bindingId);
    setClassroomToolState(createInitialClassroomFixtureToolState(0));
    setTeacherAssistantContextChoice(null);
    setTeacherAssistantContextNote("");
    setTeacherAssistantDecisionAction(null);
    setTeacherAssistantTriageDeferred(false);
    setTeacherAssistantNextClassOutcome(null);
    setTeacherAssistantReviewState("live");
    setTeacherAssistantPrimaryView("current");
  }

  function startSemesterWorksetLesson(lessonId: string, classId: string) {
    const lesson = colorfulWorldSemesterClassroomWorkset.lessons.find(
      (item) => item.lessonId === lessonId,
    );
    const scheduledInstance = colorfulWorldSemesterClassroomWorkset.scheduleInstances.find(
      (item) => item.lessonId === lessonId && item.classId === classId,
    );
    const lessonPackage = lesson
      ? classroomLessonPackageDirectories.find((item) => item.lessonTitle === lesson.lessonTitle)
      : null;
    const candidate = lessonPackage
      ? packageCandidates(lessonPackage).find(
          (item) =>
            item.classId === classId ||
            (scheduledInstance && item.classLabel === scheduledInstance.classLabel),
        )
      : null;
    if (!candidate || candidate.eligibility !== "READY" || candidate.catalogState === "TAUGHT") {
      classroomWorkspace.setWorksetFeedback("这节课尚未具备进入当前课堂的 fixture 条件，请先课前预览。");
      return;
    }
    startClassroomSimulation(candidate);
  }

  function exitClassroomSimulation() {
    setClassroomToolState(
      createInitialClassroomFixtureToolState(fixture.session.elapsedSeconds),
    );
    setRightRailOpen(false);
    setCurrentBindingId(null);
    setPreviewLock(null);
    setExitConfirmOpen(false);
    setTeacherAssistantReviewState("preparation");
    setTeacherAssistantPrimaryView("preparation");
  }

  function openPrepLesson(candidate: ClassroomCandidate) {
    if (candidate.eligibility === "READY") return;
    window.location.assign(
      `/shell-v1?lesson=${candidate.prepRoomMapping.prepLessonId}`,
    );
  }

  function createCurrentFixtureAdapter() {
    if (!classroomPackage || !currentBindingId) return null;
    return createClassroomWebFixtureAdapter({
      state: classroomToolState,
      currentBindingId,
      presentationBindingIds: classroomPackage.presentationSequence.map(
        (item) => item.bindingId,
      ),
      presentStudentLabels: fixture.randomCandidates,
      activeReminderIds: classroomContextReminderCandidate
        ? [classroomContextReminderCandidate.reminderId]
        : [],
    });
  }

  function applyClassroomToolResult(result: ClassroomWebFixtureResult) {
    setClassroomToolState(result.nextState);
    if (result.nextBindingId) setCurrentBindingId(result.nextBindingId);
  }

  function runClassroomTool(
    execute: (
      adapter: ReturnType<typeof createClassroomWebFixtureAdapter>,
    ) => ClassroomWebFixtureResult,
  ) {
    const adapter = createCurrentFixtureAdapter();
    if (!adapter) return null;
    const result = execute(adapter);
    applyClassroomToolResult(result);
    return result;
  }

  function selectEpisode(episodeId: string) {
    if (!classroomPackage) return;
    const item = classroomPackage.presentationSequence.find(
      (item) => item.episodeId === episodeId,
    );
    if (item) runClassroomTool((adapter) => adapter.openBinding(item.bindingId));
  }

  function moveScreen(direction: -1 | 1) {
    runClassroomTool((adapter) =>
      direction === -1 ? adapter.previousScreen() : adapter.nextScreen(),
    );
  }

  function chooseRandomStudent() {
    runClassroomTool((adapter) => adapter.randomSelectStudent());
  }

  function navigateTeacherAssistant(target: TeacherAssistantPrimaryView) {
    setTeacherAssistantQuickMarkOpen(false);
    setTeacherAssistantPrimaryView(target);
  }

  function finishTeacherAssistantClassroom() {
    if (!["live", "marked"].includes(teacherAssistantReviewState))
      return;
    setClassroomToolState((current) => ({ ...current, timerRunning: false }));
    setTeacherAssistantQuickMarkOpen(false);
    setTeacherAssistantReviewState("closing");
  }

  function selectTeacherAssistantContext(choice: TeacherProfessionalContextChoice) {
    setTeacherAssistantContextChoice(choice);
    setTeacherAssistantDecisionAction(null);
    if (choice === "OTHER_CONTEXT") return;
    if (choice === "NOT_A_PROBLEM") {
      setTeacherAssistantDecisionAction("NO_CHANGE_REQUIRED");
      setTeacherAssistantReviewState("not-a-problem");
      return;
    }
    setTeacherAssistantReviewState("recommendation");
  }

  function confirmTeacherAssistantOtherContext() {
    if (!teacherAssistantContextNote.trim()) return;
    setTeacherAssistantContextChoice("OTHER_CONTEXT");
    setTeacherAssistantReviewState("recommendation");
  }

  function recordTeacherAssistantDecision(action: TeacherWorkDecision["action"]) {
    setTeacherAssistantDecisionAction(action);
    setTeacherAssistantReviewState(
      action === "NO_CHANGE_REQUIRED" ? "record" : "decision",
    );
    setTeacherAssistantPrimaryView(
      action === "NO_CHANGE_REQUIRED" ? "record" : "current",
    );
  }

  function resetTeacherAssistantClassroomSurface() {
    classroomWorkspace.resetClassroom(0);
  }

  function continueAfterTeacherAssistantDecision() {
    if (teacherAssistantDecisionAction === "NEXT_CLASS_TRIAL") {
      resetTeacherAssistantClassroomSurface();
      setTeacherAssistantReviewState("next-preparation");
      setTeacherAssistantPrimaryView("preparation");
      return;
    }
    setTeacherAssistantReviewState("record");
    setTeacherAssistantPrimaryView("record");
  }

  function deferTeacherAssistantTriage() {
    setTeacherAssistantTriageDeferred(true);
    resetTeacherAssistantClassroomSurface();
    setTeacherAssistantReviewState("preparation");
    setTeacherAssistantPrimaryView("preparation");
  }

  function returnToTeacherAssistantPreparation() {
    if (teacherAssistantDecisionAction) {
      resetTeacherAssistantClassroomSurface();
      setTeacherAssistantReviewState("preparation");
    }
    setTeacherAssistantPrimaryView("preparation");
  }

  function recordTeacherAssistantQuickMark(mark: ClassroomQuickMark) {
    if (
      !teacherAssistantReviewFixture.snapshot.classroomOpenForQuickMarks ||
      !previewLock ||
      !currentEpisode ||
      !currentBinding ||
      !currentScreen
    )
      return;
    const result = runClassroomTool((adapter) =>
      adapter.captureQuickNote({ quickMark: mark }),
    );
    if (!result || result.status !== "APPLIED") return;
    const fact = createAssistantQuickMark(
      teacherAssistantReviewFixture.snapshot.state,
      {
        occurrenceId: previewLock.occurrenceId,
        episodeId: currentEpisode.episodeId,
        bindingId: currentBinding.bindingId,
        screenId: currentScreen.screenId,
        elapsedSeconds: classroomToolState.elapsedSeconds,
      },
      mark,
    );
    setLastQuickMarkFact(fact);
    setActiveQuickMark(mark);
    setTeacherAssistantQuickMarkOpen(false);
    setTeacherAssistantReviewState("marked");
  }

  function recordTeacherAssistantOneLineNote() {
    if (
      !teacherAssistantReviewFixture.snapshot.classroomOpenForQuickMarks ||
      !previewLock ||
      !currentEpisode ||
      !currentBinding ||
      !currentScreen
    )
      return;
    const note = teacherAssistantReviewFixture.data.oneLineClassroomNote;
    const result = runClassroomTool((adapter) =>
      adapter.captureQuickNote({ quickMark: "LATER", note }),
    );
    if (!result || result.status !== "APPLIED") return;
    const fact = createAssistantOneLineNote(
      teacherAssistantReviewFixture.snapshot.state,
      {
        occurrenceId: previewLock.occurrenceId,
        episodeId: currentEpisode.episodeId,
        bindingId: currentBinding.bindingId,
        screenId: currentScreen.screenId,
        elapsedSeconds: classroomToolState.elapsedSeconds,
      },
      note,
    );
    setLastQuickMarkFact(fact);
    setActiveQuickMark(null);
    setTeacherAssistantQuickMarkOpen(false);
    setTeacherAssistantReviewState("marked");
  }

  function startClassroomTimer() {
    runClassroomTool((adapter) => adapter.startTimer());
  }

  function pauseClassroomTimer() {
    runClassroomTool((adapter) => adapter.pauseTimer());
  }

  function resetClassroomTimer() {
    runClassroomTool((adapter) => adapter.resetTimer());
  }

  function startClassroomCountdown(seconds: number) {
    runClassroomTool((adapter) => adapter.startCountdown(seconds));
  }

  function dismissClassroomReceipt() {
    setClassroomToolState((current) => ({ ...current, latestReceipt: null }));
  }

  function toggleClassroomMaterial(itemId: string) {
    setMaterialItems((items) =>
      items.map((item) =>
        item.id === itemId ? { ...item, checked: !item.checked } : item,
      ),
    );
  }

  function dismissXiaojiaoReminder() {
    if (!classroomContextReminderCandidate) return;
    runClassroomTool((adapter) =>
      adapter.dismissXiaojiaoReminder(
        classroomContextReminderCandidate.reminderId,
      ),
    );
  }

  function deferXiaojiaoReminder() {
    if (!classroomContextReminderCandidate) return;
    runClassroomTool((adapter) =>
      adapter.deferXiaojiaoReminder(
        classroomContextReminderCandidate.reminderId,
      ),
    );
  }

  const teacherAssistantNavigationActive = teacherAssistantPrimaryView;
  const teacherAssistantPageTitle =
    teacherAssistantReviewFixture?.snapshot.view === "PRE_CLASS_PREPARATION"
      ? "课前准备"
      : teacherAssistantReviewFixture?.snapshot.view === "CLASSROOM_RECORD"
        ? "课堂记录"
        : teacherAssistantReviewFixture?.snapshot.view === "POSTCLASS_TRIAGE"
          ? "课后快速整理"
          : "当前课堂";

  if (!previewLock || teacherAssistantPrimaryView !== "current") {
    return (
      <section className={`sv1-room-shell room-classroom slots-lr sv1-classroom-shell sv1-classroom-candidate-shell ${teacherAssistantReviewState ? "sv1-teacher-assistant-shell" : ""}`}>
        <aside className="sv1-slot sv1-left-slot sv1-classroom-left">
          {teacherAssistantReviewState ? (
            <TeacherWorkAssistantNavigation
              active={teacherAssistantNavigationActive}
              onNavigate={navigateTeacherAssistant}
            />
          ) : (
            <>
              <p className="sv1-classroom-space-label">教学工具</p>
              <nav aria-label="教室功能导航">
                {classroomPageRegistry.map((page) => (
                  <button key={page.id} className={page.id === "overview" ? "active" : ""} disabled={!page.implemented}>
                    <i>{page.icon}</i><span><b>{page.label}</b>{page.implemented && <small>{page.description}</small>}</span>
                  </button>
                ))}
              </nav>
            </>
          )}
        </aside>
        <main className="sv1-classroom-main sv1-classroom-candidate-main">
          {teacherAssistantPrimaryView === "current" ? (
            <>
              <header className="sv1-classroom-page-heading">
                <div><h1>当前课堂</h1><p>这里承接正在进行或刚结束、尚待整理的课堂。</p></div>
              </header>
              <section className="sv1-teacher-assistant-empty-stage">
                <i>课</i>
                <div>
                  <span>当前没有进行中的课堂</span>
                  <h2>课堂开始后，舞台、提示和随手记会出现在这里。</h2>
                  <p>一级导航始终可以进入；是否能够写入随手记，由课堂生命周期在页面内部判断。</p>
                  <button type="button" className="primary" onClick={() => setTeacherAssistantPrimaryView("preparation")}>去课前准备</button>
                </div>
              </section>
            </>
          ) : teacherAssistantPrimaryView === "record" ? (
            <>
              <header className="sv1-classroom-page-heading">
                <div><h1>课堂记录</h1><p>先处理待整理和待决定课堂，再按大单元、子课时与班级实例回看。</p></div>
              </header>
              {teacherAssistantDecisionAction && (
                <TeacherWorkAssistantRecordPanel
                  selectedContextChoice={teacherAssistantContextChoice}
                  selectedDecisionAction={teacherAssistantDecisionAction}
                  contextNote={teacherAssistantContextNote}
                  latestClassroomFact={lastQuickMarkFact}
                  classLabel={teacherAssistantClassroomCandidate.classLabel}
                  lessonTitle={teacherAssistantClassroomCandidate.lessonTitle}
                  scheduleLabel={teacherAssistantClassroomCandidate.scheduleLabel}
                  onReturnPreparation={returnToTeacherAssistantPreparation}
                />
              )}
              <SemesterClassroomRecordPanel
                workset={colorfulWorldSemesterClassroomWorkset}
                controller={classroomWorkspace}
                onReturnPreparation={returnToTeacherAssistantPreparation}
              />
            </>
          ) : teacherAssistantReviewFixture?.snapshot.view === "POSTCLASS_TRIAGE" ? (
            <>
              <header className="sv1-classroom-page-heading">
                <div><h1>课后快速整理</h1><p>课堂已经结束，现场记录不可再修改。</p></div>
              </header>
              <TeacherWorkAssistantPostclassPanel
                reviewState={teacherAssistantReviewState as "postclass" | "question" | "recommendation" | "recommendation-material" | "recommendation-extension" | "recommendation-uncertain" | "not-a-problem" | "decision" | "no-findings"}
                selectedContextChoice={teacherAssistantContextChoice}
                selectedDecisionAction={teacherAssistantDecisionAction}
                contextNote={teacherAssistantContextNote}
                latestClassroomFact={lastQuickMarkFact}
                onAnswerOne={() => setTeacherAssistantReviewState("question")}
                onSelectContext={selectTeacherAssistantContext}
                onContextNoteChange={setTeacherAssistantContextNote}
                onConfirmOtherContext={confirmTeacherAssistantOtherContext}
                onDefer={deferTeacherAssistantTriage}
                onSkip={deferTeacherAssistantTriage}
                onDecision={recordTeacherAssistantDecision}
                onContinueAfterDecision={continueAfterTeacherAssistantDecision}
              />
            </>
          ) : !previewPackage ? (
            <>
              <header className="sv1-classroom-page-heading">
                <div><h1>课前准备</h1><p>按下一节、今天、本周、最近完成和本学期课架接住教师工作。</p></div>
              </header>

              {teacherAssistantTriageDeferred && (
                <article className="sv1-classroom-preparation-note" role="status">
                  <div><b>上一节课堂的快速整理已暂存</b><span>你可以稍后从“当前课堂”继续；当前未生成建议，也未修改课包。</span></div>
                  <button type="button" onClick={() => { setTeacherAssistantReviewState("question"); setTeacherAssistantPrimaryView("current"); }}>继续整理</button>
                </article>
              )}

              {teacherAssistantReviewFixture?.snapshot.nextOccurrenceReminder && (
                <article className="sv1-classroom-next-reminder">
                  <header>
                    <div><span>来自上一班的提醒</span><h2>带着教师已确认的决定准备下一班</h2></div>
                    <em>体验预览</em>
                  </header>
                  <div className="sv1-classroom-next-reminder-grid">
                    <section><b>上一班事实</b><p>{teacherAssistantReviewFixture.snapshot.nextOccurrenceReminder.previousClassFact}</p></section>
                    <section><b>教师确认的现实原因</b><p>{teacherAssistantReviewFixture.snapshot.nextOccurrenceReminder.teacherConfirmedContext}</p></section>
                    <section><b>当前班差异</b><p>{teacherAssistantReviewFixture.snapshot.nextOccurrenceReminder.currentClassDifference}</p></section>
                    <section><b>已确认建议</b><p>{teacherAssistantReviewFixture.snapshot.nextOccurrenceReminder.confirmedRecommendation}</p></section>
                  </div>
                  <footer>
                    <div>
                      <button type="button" className={teacherAssistantNextClassOutcome === "PREPARED_WITH_CONFIRMED_TRIAL" ? "primary selected" : "primary"} onClick={() => setTeacherAssistantNextClassOutcome("PREPARED_WITH_CONFIRMED_TRIAL")}>按建议准备本班</button>
                      <button type="button" className={teacherAssistantNextClassOutcome === "KEPT_ORIGINAL_PACKAGE" ? "selected" : ""} onClick={() => setTeacherAssistantNextClassOutcome("KEPT_ORIGINAL_PACKAGE")}>保持原课包</button>
                      <button type="button" className={teacherAssistantNextClassOutcome === "DEFERRED" ? "selected" : ""} onClick={() => setTeacherAssistantNextClassOutcome("DEFERRED")}>稍后处理</button>
                    </div>
                    <small>确认只保留在本次模拟课堂中，不自动修改课包。</small>
                    {teacherAssistantNextClassOutcome && (
                      <p className="sv1-classroom-next-action-status" role="status">
                        {teacherAssistantNextClassOutcome === "PREPARED_WITH_CONFIRMED_TRIAL" ? "已按教师确认的建议准备本班。" : teacherAssistantNextClassOutcome === "KEPT_ORIGINAL_PACKAGE" ? "已保留原课包，不应用建议。" : "已暂存，当前不改变课包或提醒。"}
                      </p>
                    )}
                    {teacherAssistantNextClassOutcome && <button type="button" className="record-link" onClick={() => { setTeacherAssistantReviewState("record"); setTeacherAssistantPrimaryView("record"); }}>查看课堂记录 →</button>}
                  </footer>
                </article>
              )}

              <SemesterClassroomPreparationPanel
                workset={colorfulWorldSemesterClassroomWorkset}
                controller={classroomWorkspace}
                onPreviewLesson={openSemesterWorksetLesson}
                onStartLesson={startSemesterWorksetLesson}
                onOpenSessionRecord={openSemesterSessionRecord}
              />
            </>
          ) : previewPackage ? (
            <>
              <header className="sv1-classroom-page-heading sv1-classroom-preflight-heading">
                <div>
                  <button type="button" onClick={() => setCatalogPreviewPackageId(null)}>‹ 返回课堂目录</button>
                  <h1>课前预览</h1>
                </div>
                <time>{previewPackage.gradeLabel} · {previewPackage.unitTitle}</time>
              </header>
              <section className="sv1-classroom-preflight-layout">
                <div className="sv1-classroom-preflight-content">
                  <article className="sv1-classroom-preflight-hero">
                    <div
                      className={`sv1-classroom-package-cover tone-${previewPackage.cover.tone.toLowerCase()}`}
                      style={(previewPresentationProfile?.cover.assetRef || previewPackage.cover.assetRef) ? { backgroundImage: `url(${previewPresentationProfile?.cover.assetRef || previewPackage.cover.assetRef})` } : undefined}
                    >
                    </div>
                    <div>
                      <small>{previewPackage.gradeLabel} / {previewPackage.unitTitle}</small>
                      <h2>《{previewPackage.lessonTitle}》</h2>
                        <p>{resolvedPreviewPackage ? `${resolvedPreviewPackage.screens.length}页课堂画面 · ${previewMinutes}分钟 · 已准备` : "课堂包尚未就绪 · 暂时不能进入预演"}</p>
                    </div>
                  </article>

                  <article className="sv1-classroom-preflight-screens">
                    <header><b>大屏预览</b><span>{resolvedPreviewPackage ? `${resolvedPreviewPackage.screens.length}页` : "等待课堂包就绪"}</span></header>
                    {resolvedPreviewPackage && previewPresentationProfile ? (
                      <div>
                        {preflightScreens.map((screen) => {
                          const content = classroomScreenContent(screen, previewPresentationProfile);
                          const imageUri = classroomScreenImageUri(screen, previewPresentationProfile);
                          const screenNumber = resolvedPreviewPackage.presentationSequence.findIndex((item) => item.screenId === screen.screenId) + 1;
                          return (
                            <figure key={screen.screenId}>
                              <div className={imageUri ? "has-image" : `role-${screen.instructionalRole.toLowerCase()}`} style={imageUri ? { backgroundImage: `url(${imageUri})` } : undefined}>
                                {!imageUri && <span>{screen.instructionalRole === "DEMONSTRATION" ? "示范画面待替换" : content.title || "课堂画面"}</span>}
                              </div>
                              <figcaption><b>第{screenNumber}屏</b><span>{content.title || "课堂画面"}</span></figcaption>
                            </figure>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="sv1-classroom-empty-package">课堂大屏仍在备课室中整理，当前不使用虚构缩略图代替。</p>
                    )}
                  </article>

                  <article className="sv1-classroom-preflight-flow">
                    <header><b>课堂流程</b><span>{resolvedPreviewPackage ? `${resolvedPreviewPackage.episodes.length}个环节 · ${previewMinutes}分钟` : "尚未就绪"}</span></header>
                    {resolvedPreviewPackage ? (
                      <ol>
                        {resolvedPreviewPackage.episodes.map((episode, index) => (
                          <li key={episode.episodeId}><i>{index + 1}</i><b>{episode.title}</b><span>{episode.durationMinutes}分钟</span></li>
                        ))}
                      </ol>
                    ) : (
                      <p className="sv1-classroom-empty-package">完成课时确认后，课堂流程会从备课室课堂快照进入这里。</p>
                    )}
                  </article>
                </div>

                <aside className="sv1-classroom-preflight-side">
                  <article>
                    <header><b>选择上课班级</b><span>{previewPackageCandidates.length}个课次</span></header>
                    <div className="sv1-classroom-occurrence-list">
                      {previewPackageCandidates.map((candidate) => {
                        const status = classroomCandidateStatus(candidate);
                        return (
                          <button
                            type="button"
                            key={candidate.candidateId}
                            className={`${status.className} ${selectedCandidateId === candidate.candidateId ? "active" : ""}`}
                            onClick={() => setSelectedCandidateId(candidate.candidateId)}
                          >
                            <span><b>{candidate.classLabel}</b><small>{candidate.scheduleLabel}</small></span>
                            <em>{status.label}</em>
                          </button>
                        );
                      })}
                    </div>
                  </article>

                  <article className="sv1-classroom-preflight-check">
                    <header><b>课前检查</b></header>
                    {previewSelectedCandidate?.eligibility === "READY" && previewResolution.status === "RESOLVED" ? (
                      <>
                        <p className="pass"><i>✓</i><span><b>{previewResolution.presentationProfile.teacherFacingSummary.readyLabel}</b><small>{previewResolution.classroomPackage.screens.length}页课堂画面、{previewResolution.classroomPackage.episodes.length}个教学环节</small></span></p>
                        {previewResolution.presentationProfile.teacherFacingSummary.notices.map((notice) => (
                          <p className={notice.tone === "WARNING" ? "warning" : "pass"} key={notice.title}><i>{notice.tone === "WARNING" ? "!" : "i"}</i><span><b>{notice.title}</b><small>{notice.detail}</small></span></p>
                        ))}
                      </>
                    ) : previewSelectedCandidate?.eligibility !== "READY" ? (
                      previewSelectedCandidate?.readinessReasons.map((reason) => <p className="warning" key={reason}><i>!</i><span><b>{reason}</b></span></p>)
                    ) : (
                      <p className="warning"><i>!</i><span><b>{previewResolution.status === "HOLD" ? previewResolution.message : "课堂包需要检查"}</b><small>课堂内容不会自动改用其他课包。</small></span></p>
                    )}
                  </article>

                  {previewLock ? (
                    <button className="sv1-classroom-preflight-start" onClick={() => setTeacherAssistantPrimaryView("current")}><b>返回当前课堂</b><span>课堂已开始，课前准备保持只读</span></button>
                  ) : previewSelectedCandidate?.eligibility === "READY" && previewSelectedCandidate.catalogState !== "TAUGHT" && previewResolution.status === "RESOLVED" ? (
                    <button className="sv1-classroom-preflight-start" onClick={() => startClassroomSimulation(previewSelectedCandidate)}><b>进入课堂预演</b></button>
                  ) : previewSelectedCandidate?.eligibility !== "READY" ? (
                    <button className="sv1-classroom-preflight-start is-pending" onClick={() => previewSelectedCandidate && openPrepLesson(previewSelectedCandidate)}><b>返回备课室处理</b><span>完成确认后再进入课堂预演</span></button>
                  ) : previewResolution.status === "HOLD" ? (
                    <button className="sv1-classroom-preflight-start is-pending" disabled><b>课堂包需要检查</b><span>{previewResolution.message}</span></button>
                  ) : (
                    <button className="sv1-classroom-preflight-start is-pending" disabled><b>该课次已完成</b><span>课堂记录将在后续阶段开放</span></button>
                  )}
                </aside>
              </section>
            </>
          ) : null}
        </main>
      </section>
    );
  }

  if (
    lockedResolution.status !== "RESOLVED" ||
    lockIssues.length > 0 ||
    bindingIssues.length > 0 ||
    !classroomPackage ||
    !classroomPresentationProfile ||
    !currentBinding ||
    !currentEpisode ||
    !currentScreen ||
    currentBindingIndex < 0 ||
    currentScreenNumber < 1
  ) {
    const holdMessage =
      lockedResolution.status === "HOLD"
        ? lockedResolution.message
        : lockIssues[0]?.message ||
          bindingIssues[0]?.message ||
          "当前预演位置不属于所选课堂包，请退出后重新进入。";
    return (
      <section className="sv1-room-shell room-classroom slots-lr sv1-classroom-shell">
        <aside className="sv1-slot sv1-left-slot sv1-classroom-left">
          <p className="sv1-classroom-space-label">教学工具</p>
          <nav aria-label="教室功能导航">
            {classroomPageRegistry.map((page) => (
              <button key={page.id} className={page.id === "overview" ? "active" : ""} disabled>
                <i>{page.icon}</i><span><b>{page.label}</b></span>
              </button>
            ))}
          </nav>
        </aside>
        <main className="sv1-classroom-main sv1-classroom-candidate-main">
          <header className="sv1-classroom-page-heading">
            <div><h1>课堂预演暂不可用</h1><p>{holdMessage}</p></div>
          </header>
          <section className="sv1-classroom-catalog">
            <article className="sv1-classroom-next-lesson">
              <div className="sv1-classroom-next-copy">
                <span>需要处理</span>
                <h2>所选课次与课堂包未能一致解析</h2>
                <p>系统没有改用其他课题的内容。</p>
                <button type="button" onClick={exitClassroomSimulation}>返回课前预览</button>
              </div>
            </article>
          </section>
        </main>
      </section>
    );
  }

  const classroomComponentPlan = compileClassroomComponentPlan({
    classroomPackage,
    blueprint: colorGradientClassroomCompositionBlueprint,
    currentBindingId: currentBinding.bindingId,
    currentEpisode,
    mode: "LIVE",
    fixtureStateRevision: classroomToolState.revision,
  });
  const classroomContextReminderCandidate =
    resolveClassroomContextReminderCandidate({
      reminderId: classroomComponentPlan.contextReminderId,
      profileId: classroomComponentPlan.profileId,
      bindingId: currentBinding.bindingId,
    });
  const classroomLiveRenderContext: ClassroomLiveRenderContext = {
    classroomPackage,
    presentationProfile: classroomPresentationProfile,
    currentEpisode,
    currentBinding,
    currentScreen,
    currentBindingIndex,
    currentScreenNumber,
    teacherCue,
    fixture,
    toolState: classroomToolState,
    contextReminderCandidate: classroomContextReminderCandidate,
    componentDebug: classroomComponentDebug,
    activeQuickMark,
    quickMarkOpen: teacherAssistantQuickMarkOpen,
    quickMarksAllowed: teacherAssistantReviewFixture.snapshot.classroomOpenForQuickMarks,
    materials: materialItems,
    galleryWorks: classroomGalleryWorks,
    selectedGalleryWorkId,
    imageCompareSide,
    lastQuickMarkFact,
    onMoveScreen: moveScreen,
    onSelectEpisode: selectEpisode,
    onOpenStudentDetails: () => setRightRailOpen(true),
    onToggleQuickMark: () =>
      setTeacherAssistantQuickMarkOpen((current) => !current),
    onQuickMark: recordTeacherAssistantQuickMark,
    onSayOneLine: recordTeacherAssistantOneLineNote,
    onStartTimer: startClassroomTimer,
    onPauseTimer: pauseClassroomTimer,
    onResetTimer: resetClassroomTimer,
    onStartCountdown: startClassroomCountdown,
    onToggleBlackout: () =>
      runClassroomTool((adapter) => adapter.toggleBlackout()),
    onToggleSpotlight: () =>
      runClassroomTool((adapter) => adapter.toggleSpotlight()),
    onRandomSelect: chooseRandomStudent,
    onUndoRandomSelect: () =>
      runClassroomTool((adapter) => adapter.undoRandomSelection()),
    onDismissReceipt: dismissClassroomReceipt,
    onDismissReminder: dismissXiaojiaoReminder,
    onDeferReminder: deferXiaojiaoReminder,
    onToggleMaterial: toggleClassroomMaterial,
    onSelectGalleryWork: setSelectedGalleryWorkId,
    onImageCompareSide: setImageCompareSide,
  };

  return (
    <section className={`sv1-room-shell room-classroom slots-lr sv1-classroom-shell ${teacherAssistantReviewState ? "sv1-teacher-assistant-shell" : ""}`}>
      <aside className="sv1-slot sv1-left-slot sv1-classroom-left">
        {teacherAssistantReviewState ? (
          <TeacherWorkAssistantNavigation
            active={teacherAssistantNavigationActive}
            onNavigate={navigateTeacherAssistant}
          />
        ) : (
          <>
            <p className="sv1-classroom-space-label">教学工具</p>
            <nav aria-label="教室功能导航">
              {classroomPageRegistry.map((page) => (
                <button
                  key={page.id}
                  className={page.id === "overview" ? "active" : ""}
                  disabled={!page.implemented}
                  title={!page.implemented ? `${page.label}将在后续阶段开发` : undefined}
                >
                  <i>{page.icon}</i>
                  <span>
                    <b>{page.label}</b>
                    {page.implemented && <small>{page.description}</small>}
                  </span>
                </button>
              ))}
            </nav>
            <button className="sv1-classroom-collapse" type="button">
              ‹ <span>收起侧栏</span>
            </button>
          </>
        )}
      </aside>

      <main className="sv1-classroom-main sv1-classroom-live-main">
        <header className="sv1-classroom-page-heading sv1-classroom-live-heading">
          <div>
            {teacherAssistantReviewState ? (
              <h1>{teacherAssistantPageTitle}</h1>
            ) : (
              <h1>课堂总览</h1>
            )}
            <p>
              {teacherAssistantReviewFixture
                ? `${teacherAssistantClassroomCandidate.classLabel} · 《${teacherAssistantClassroomCandidate.lessonTitle}》`
                : `${lockedCandidate?.classLabel || fixture.classroom.classLabel} · 《${classroomPackage.lesson.title}》`}
            </p>
          </div>
          {teacherAssistantReviewState ? (
            ["live", "live-expanded", "marked"].includes(teacherAssistantReviewState) ? (
              <button className="sv1-classroom-end" type="button" onClick={finishTeacherAssistantClassroom}>下课，开始整理</button>
            ) : (
              <div className="sv1-teacher-assistant-review-badge">
                <b>{teacherAssistantReviewState === "closing" ? "课堂已结束" : "教师工作助手"}</b>
                <span>模拟课堂 · 不产生正式记录</span>
              </div>
            )
          ) : (
            <button className="sv1-classroom-exit" type="button" onClick={() => setExitConfirmOpen(true)}>‹ 退出预演</button>
          )}
        </header>

        {!teacherAssistantReviewState && contextMismatch && (
          <div className="sv1-classroom-context-mismatch" role="status">
            <b>当前工作任务已切换</b>
            <span>课堂预演仍锁定 {lockedCandidate?.classLabel}《{lockedCandidate?.lessonTitle}》，不会被顶部工作上下文替换。</span>
          </div>
        )}

        {teacherAssistantReviewState ? (
          <TeacherWorkAssistantJourneyBar
            reviewState={teacherAssistantReviewState}
            classLabel={teacherAssistantClassroomCandidate.classLabel}
            lessonTitle={teacherAssistantClassroomCandidate.lessonTitle}
          />
        ) : (
        <section className="sv1-classroom-session-bar" aria-label="课堂状态条">
          <div className="sv1-classroom-lesson-identity">
            <span>{classroomPackage.lesson.unitTitle}</span>
            <b>《{classroomPackage.lesson.title}》</b>
            <small>{lockedCandidate?.classLabel || fixture.classroom.classLabel} · 美术 · {totalMinutes}分钟</small>
          </div>
          <div className="sv1-classroom-live-state"><i />课堂预演中</div>
          <div>
            <span>当前环节</span>
            <b>{currentEpisode.title}</b>
          </div>
          <div>
            <span>本课已用时</span>
            <b className="sv1-classroom-clock">{formatClock(classroomToolState.timerMode === "COUNT_DOWN" ? classroomToolState.countdownRemainingSeconds ?? 0 : classroomToolState.elapsedSeconds)}</b>
          </div>
          <div className="sv1-classroom-progress-summary">
            <span>总进度 · {progressPercent}%</span>
            <i><em style={{ width: `${progressPercent}%` }} /></i>
            <small>{currentEpisode.displayOrder} / {classroomPackage.episodes.length} 环节</small>
          </div>
        </section>
        )}

        {teacherAssistantReviewState && teacherAssistantReviewFixture?.snapshot.view === "PRE_CLASS_PREPARATION" ? (
          <TeacherWorkAssistantPreparationPanel
            reviewState={teacherAssistantReviewState as "preparation" | "ready" | "next-preparation"}
          />
        ) : teacherAssistantReviewState && teacherAssistantReviewFixture?.snapshot.view === "POSTCLASS_TRIAGE" ? (
          <TeacherWorkAssistantPostclassPanel
            reviewState={teacherAssistantReviewState as "postclass" | "question" | "recommendation" | "recommendation-material" | "recommendation-extension" | "recommendation-uncertain" | "not-a-problem" | "decision" | "no-findings"}
            selectedContextChoice={teacherAssistantContextChoice}
            selectedDecisionAction={teacherAssistantDecisionAction}
            contextNote={teacherAssistantContextNote}
            latestClassroomFact={lastQuickMarkFact}
            onAnswerOne={() => setTeacherAssistantReviewState("question")}
            onSelectContext={selectTeacherAssistantContext}
            onContextNoteChange={setTeacherAssistantContextNote}
            onConfirmOtherContext={confirmTeacherAssistantOtherContext}
            onDefer={deferTeacherAssistantTriage}
            onSkip={deferTeacherAssistantTriage}
            onDecision={recordTeacherAssistantDecision}
            onContinueAfterDecision={continueAfterTeacherAssistantDecision}
          />
        ) : teacherAssistantReviewState && teacherAssistantReviewFixture?.snapshot.view === "CLASSROOM_RECORD" ? (
          <TeacherWorkAssistantRecordPanel
            selectedContextChoice={teacherAssistantContextChoice}
            selectedDecisionAction={teacherAssistantDecisionAction}
            contextNote={teacherAssistantContextNote}
            latestClassroomFact={lastQuickMarkFact}
            classLabel={teacherAssistantClassroomCandidate.classLabel}
            lessonTitle={teacherAssistantClassroomCandidate.lessonTitle}
            scheduleLabel={teacherAssistantClassroomCandidate.scheduleLabel}
            onReturnPreparation={returnToTeacherAssistantPreparation}
          />
        ) : (
          <>
            <div className="sv1-classroom-profile-caption" role="status" data-component-debug={classroomComponentDebug ? "true" : "false"}>
              <span>{classroomComponentDebug ? classroomComponentPlan.profileId : "当前环节"}</span>
              <b>{currentEpisode.title}</b>
              <small>{classroomComponentDebug
                ? `由 ${currentBinding.bindingId} 与 ${classroomComponentPlan.blueprintId} 编译`
                : `第 ${currentScreenNumber} 屏 · 模拟课堂，不产生正式记录`}</small>
            </div>
            <section className={`sv1-classroom-dynamic-layout profile-${classroomComponentPlan.profileId.toLowerCase()}`}>
              <ClassroomStageHost plan={classroomComponentPlan} context={classroomLiveRenderContext} />
              <ClassroomSidecarHost plan={classroomComponentPlan} context={classroomLiveRenderContext} />
            </section>
            <ClassroomOverlayHost plan={classroomComponentPlan} context={classroomLiveRenderContext} />
            <ClassroomDockHost plan={classroomComponentPlan} context={classroomLiveRenderContext} />
          </>
        )}
      </main>

      <>
      <aside className={`sv1-slot sv1-right-slot sv1-classroom-right ${rightRailOpen ? "is-open" : ""}`}>
        <button className="sv1-classroom-right-close" onClick={() => setRightRailOpen(false)} aria-label="关闭课堂上下文">×</button>
        <span>当前课堂上下文</span>
        <h2>{classroomPackage.lesson.title}</h2>
        <article>
          <b>教学内容</b>
          <p>{classroomPackage.lesson.grade} · 第{classroomPackage.lesson.lessonOrder}课<br />{lockedCandidate?.classLabel || fixture.classroom.classLabel} · {activeTerm.label}</p>
        </article>
        <article>
          <b>当前环节</b>
          <p>{currentEpisode.title}</p>
          <small>{currentBinding.purpose}</small>
        </article>
        <article>
          <b>本课观察重点</b>
          <ul>
            {classroomPackage.successCriteria.map((criterion) => (
              <li key={criterion.criterionId}>{criterion.studentReadableDescription}</li>
            ))}
          </ul>
        </article>
        <article>
          <b>需要关注</b>
          <ul className="sv1-classroom-support-list">
            {fixture.supportStudents.map((student) => (
              <li key={student.studentId}><span>{student.displayName}</span><small>{student.reason}</small></li>
            ))}
          </ul>
        </article>
      </aside>
      {rightRailOpen && <button className="sv1-classroom-drawer-backdrop" onClick={() => setRightRailOpen(false)} aria-label="关闭右栏抽屉" />}
      {exitConfirmOpen && (
        <div className="sv1-classroom-exit-dialog" role="dialog" aria-modal="true" aria-labelledby="classroom-exit-title">
          <button className="sv1-classroom-exit-backdrop" onClick={() => setExitConfirmOpen(false)} aria-label="继续预演" />
          <article>
            <button className="sv1-classroom-exit-close" onClick={() => setExitConfirmOpen(false)} aria-label="关闭">×</button>
            <h2 id="classroom-exit-title">退出预演？</h2>
            <p>退出后将回到课前预览。本次预演不会保存课堂记录。</p>
            <div>
              <button type="button" onClick={() => setExitConfirmOpen(false)}>继续预演</button>
              <button type="button" className="primary" onClick={exitClassroomSimulation}>退出预演</button>
            </div>
          </article>
        </div>
      )}
      </>
    </section>
  );
}
