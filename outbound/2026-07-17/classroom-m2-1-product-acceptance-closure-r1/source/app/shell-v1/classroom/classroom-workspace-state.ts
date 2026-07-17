import type { ClassroomFactEvent, ClassroomQuickMark } from "../../../domain/classroom-evidence/lightweight-evidence-triage.ts";
import type { TeacherProfessionalContextChoice, TeacherWorkDecision } from "../../../domain/classroom-assistant/teacher-work-assistant.ts";
import {
  attachResearchCandidateToSessionPackages,
  type ClassroomScheduleInstance,
  type ClassroomSessionPackage,
  type ResearchHandoffCandidate,
} from "../../../domain/classroom-workset/semester-classroom-workset.ts";
import type { ClassroomPreviewLock } from "./classroom-contracts.ts";
import type { ClassroomMaterialItem } from "./components/internal/classroom-internal-components.tsx";
import type { ClassroomFixtureToolState } from "./adapters/classroom-web-fixture-adapter.ts";
import { createInitialClassroomFixtureToolState } from "./adapters/classroom-web-fixture-adapter.ts";
import type { TeacherWorkAssistantReviewState } from "./teacher-work-assistant-review-fixture.ts";

export type ClassroomCatalogFilter = "TODAY" | "WEEK" | "ALL" | "ATTENTION";
export type TeacherAssistantPrimaryView = "preparation" | "current" | "record";
export type NextClassPreparationOutcome = "PREPARED_WITH_CONFIRMED_TRIAL" | "KEPT_ORIGINAL_PACKAGE" | "DEFERRED";
export type ClassroomRecordPriorityFilter = "PRIORITY" | "RECENT" | "SEMESTER";
export type PreparationWorksetFilter = "ALL" | "TODAY" | "WEEK" | "NEEDS_PREPARATION" | "REMINDER";
export type RecordWorkflowFilter = "ALL" | "PENDING_TRIAGE" | "NEEDS_TEACHER_DECISION" | "COMPLETE";
export type RecordArchiveFilter = "ALL" | "ACTIVE" | "ARCHIVED";
export type ArchiveConfirmationMode = "ARCHIVE" | "RESTORE";
export type ArchiveConfirmation =
  | { kind: "SESSION"; sessionPackageId: string; mode: ArchiveConfirmationMode }
  | { kind: "HIERARCHY"; scope: "LESSON" | "UNIT"; scopeId: string; mode: ArchiveConfirmationMode };

export interface ResearchCandidateEditorState {
  objectName: string;
  researchQuestion: string;
  anonymized: boolean;
  nonAnonymizedTeacherConfirmation: boolean;
  selectedSessionPackageIds: readonly string[];
  selectedEvidenceRefs: readonly string[];
}

export interface ReuseScheduleEditorState {
  lessonId: string;
  classId: string;
  classLabel: string;
  scheduledAt: string;
}

export interface ClassroomWorkspaceState {
  selectedCandidateId: string;
  catalogFilter: ClassroomCatalogFilter;
  catalogPreviewPackageId: string | null;
  previewLock: ClassroomPreviewLock | null;
  currentBindingId: string | null;
  classroomToolState: Readonly<ClassroomFixtureToolState>;
  rightRailOpen: boolean;
  exitConfirmOpen: boolean;
  activeQuickMark: ClassroomQuickMark | null;
  lastQuickMarkFact: ClassroomFactEvent | null;
  teacherAssistantReviewState: TeacherWorkAssistantReviewState;
  teacherAssistantPrimaryView: TeacherAssistantPrimaryView;
  teacherAssistantQuickMarkOpen: boolean;
  teacherAssistantContextChoice: TeacherProfessionalContextChoice | null;
  teacherAssistantContextNote: string;
  teacherAssistantDecisionAction: TeacherWorkDecision["action"] | null;
  teacherAssistantTriageDeferred: boolean;
  teacherAssistantNextClassOutcome: NextClassPreparationOutcome | null;
  materialItems: readonly ClassroomMaterialItem[];
  selectedGalleryWorkId: string | null;
  imageCompareSide: "BOTH" | "LEFT" | "RIGHT";
  preparationSectionExpanded: Readonly<Record<"today" | "week" | "recent" | "semester", boolean>>;
  preparationSearchQuery: string;
  preparationFilter: PreparationWorksetFilter;
  preparationFilterDrawerOpen: boolean;
  pinnedLessonIds: readonly string[];
  frequentlyUsedLessonIds: readonly string[];
  expandedUnitIds: readonly string[];
  expandedLessonIds: readonly string[];
  scheduleInstances: readonly ClassroomScheduleInstance[];
  reuseScheduleEditorState: ReuseScheduleEditorState | null;
  worksetFeedback: string | null;
  recordPriorityFilter: ClassroomRecordPriorityFilter;
  recordSearchQuery: string;
  recordUnitFilter: string;
  recordWorkflowFilter: RecordWorkflowFilter;
  recordArchiveFilter: RecordArchiveFilter;
  recordFilterDrawerOpen: boolean;
  recordHierarchyExpanded: boolean;
  selectedSessionPackageId: string | null;
  selectedAcrossSummaryId: string | null;
  sessionPackages: readonly ClassroomSessionPackage[];
  researchHandoffCandidates: readonly ResearchHandoffCandidate[];
  activeResearchCandidateId: string | null;
  researchCandidateEditorState: ResearchCandidateEditorState;
  researchDrawerOpen: boolean;
  archiveConfirmation: ArchiveConfirmation | null;
  archiveFeedback: string | null;
}

type ToggleStringKey = "pinnedLessonIds" | "frequentlyUsedLessonIds" | "expandedUnitIds" | "expandedLessonIds";
export type ClassroomWorkspaceAction =
  | { type: "SET"; key: keyof ClassroomWorkspaceState; value: unknown }
  | { type: "RESET_CLASSROOM"; elapsedSeconds: number }
  | { type: "TOGGLE_PREPARATION_SECTION"; section: "today" | "week" | "recent" | "semester" }
  | { type: "TOGGLE_STRING_SET"; key: ToggleStringKey; value: string }
  | { type: "TOGGLE_RESEARCH_PACKAGE"; value: string }
  | { type: "TOGGLE_RESEARCH_EVIDENCE"; value: string }
  | { type: "OPEN_RESEARCH_DRAWER"; sessionPackageIds: readonly string[] }
  | { type: "ADD_RESEARCH_CANDIDATE"; candidate: ResearchHandoffCandidate }
  | { type: "CANCEL_RESEARCH_EDITOR" }
  | { type: "REPLACE_SESSION_PACKAGE"; sessionPackage: ClassroomSessionPackage }
  | { type: "REPLACE_SESSION_PACKAGES"; sessionPackages: readonly ClassroomSessionPackage[] }
  | { type: "ADD_SCHEDULE_INSTANCE"; scheduleInstance: ClassroomScheduleInstance };

type StateAction<T> = T | ((value: T) => T);

function applySetState<T>(current: T, next: StateAction<T>): T {
  return typeof next === "function" ? (next as (value: T) => T)(current) : next;
}

function toggle(values: readonly string[], value: string) {
  return Object.freeze(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
}

export function classroomWorkspaceReducer(state: ClassroomWorkspaceState, action: ClassroomWorkspaceAction): ClassroomWorkspaceState {
  if (action.type === "SET") {
    const key = action.key;
    return { ...state, [key]: applySetState(state[key], action.value as StateAction<typeof state[typeof key]>) } as ClassroomWorkspaceState;
  }
  if (action.type === "RESET_CLASSROOM") return {
    ...state,
    classroomToolState: createInitialClassroomFixtureToolState(action.elapsedSeconds),
    rightRailOpen: false,
    exitConfirmOpen: false,
    previewLock: null,
    currentBindingId: null,
    catalogPreviewPackageId: null,
    teacherAssistantQuickMarkOpen: false,
  };
  if (action.type === "TOGGLE_PREPARATION_SECTION") return {
    ...state,
    preparationSectionExpanded: { ...state.preparationSectionExpanded, [action.section]: !state.preparationSectionExpanded[action.section] },
  };
  if (action.type === "TOGGLE_STRING_SET") return { ...state, [action.key]: toggle(state[action.key], action.value) };
  if (action.type === "TOGGLE_RESEARCH_PACKAGE") return {
    ...state,
    researchCandidateEditorState: {
      ...state.researchCandidateEditorState,
      selectedSessionPackageIds: toggle(state.researchCandidateEditorState.selectedSessionPackageIds, action.value),
    },
  };
  if (action.type === "TOGGLE_RESEARCH_EVIDENCE") return {
    ...state,
    researchCandidateEditorState: {
      ...state.researchCandidateEditorState,
      selectedEvidenceRefs: toggle(state.researchCandidateEditorState.selectedEvidenceRefs, action.value),
    },
  };
  if (action.type === "OPEN_RESEARCH_DRAWER") return {
    ...state,
    researchDrawerOpen: true,
    activeResearchCandidateId: null,
    researchCandidateEditorState: {
      ...state.researchCandidateEditorState,
      selectedSessionPackageIds: Object.freeze([...new Set(action.sessionPackageIds)]),
      selectedEvidenceRefs: Object.freeze([]),
    },
  };
  if (action.type === "ADD_RESEARCH_CANDIDATE") return {
    ...state,
    researchHandoffCandidates: Object.freeze(
      state.researchHandoffCandidates.some((item) => item.researchReferenceId === action.candidate.researchReferenceId)
        ? state.researchHandoffCandidates.map((item) => item.researchReferenceId === action.candidate.researchReferenceId ? action.candidate : item)
        : [...state.researchHandoffCandidates, action.candidate],
    ),
    activeResearchCandidateId: action.candidate.researchReferenceId,
    sessionPackages: attachResearchCandidateToSessionPackages(
      state.sessionPackages.map((item) => Object.freeze({
        ...item,
        researchReferenceIds: Object.freeze(item.researchReferenceIds.filter((id) => id !== action.candidate.researchReferenceId)),
      })),
      action.candidate,
    ),
    researchDrawerOpen: false,
    archiveFeedback: "研究引用候选已保存；课堂原始记录仍留在教室，研究室继续 HOLD。",
  };
  if (action.type === "CANCEL_RESEARCH_EDITOR") return {
    ...state,
    researchDrawerOpen: false,
    activeResearchCandidateId: null,
    researchCandidateEditorState: { ...state.researchCandidateEditorState, selectedSessionPackageIds: Object.freeze([]), selectedEvidenceRefs: Object.freeze([]) },
  };
  if (action.type === "REPLACE_SESSION_PACKAGE") return {
    ...state,
    sessionPackages: Object.freeze(state.sessionPackages.map((item) => item.sessionPackageId === action.sessionPackage.sessionPackageId ? action.sessionPackage : item)),
  };
  if (action.type === "REPLACE_SESSION_PACKAGES") return { ...state, sessionPackages: Object.freeze([...action.sessionPackages]) };
  if (action.type === "ADD_SCHEDULE_INSTANCE") return {
    ...state,
    scheduleInstances: Object.freeze([...state.scheduleInstances, action.scheduleInstance]),
    reuseScheduleEditorState: null,
    worksetFeedback: `已建立 ${action.scheduleInstance.classLabel} 的复用课次候选；未写入真实课表。`,
  };
  return state;
}

export function createInitialClassroomWorkspaceState(input: {
  selectedCandidateId: string;
  elapsedSeconds: number;
  materialItems: readonly ClassroomMaterialItem[];
  sessionPackages: readonly ClassroomSessionPackage[];
  scheduleInstances?: readonly ClassroomScheduleInstance[];
  researchHandoffCandidates?: readonly ResearchHandoffCandidate[];
}): ClassroomWorkspaceState {
  const firstPriorityPackage = input.sessionPackages.find((item) => item.workflowStatus === "PENDING_TRIAGE") || input.sessionPackages[0] || null;
  return {
    selectedCandidateId: input.selectedCandidateId,
    catalogFilter: "ALL",
    catalogPreviewPackageId: null,
    previewLock: null,
    currentBindingId: null,
    classroomToolState: createInitialClassroomFixtureToolState(input.elapsedSeconds),
    rightRailOpen: false,
    exitConfirmOpen: false,
    activeQuickMark: null,
    lastQuickMarkFact: null,
    teacherAssistantReviewState: "preparation",
    teacherAssistantPrimaryView: "preparation",
    teacherAssistantQuickMarkOpen: false,
    teacherAssistantContextChoice: null,
    teacherAssistantContextNote: "",
    teacherAssistantDecisionAction: null,
    teacherAssistantTriageDeferred: false,
    teacherAssistantNextClassOutcome: null,
    materialItems: Object.freeze([...input.materialItems]),
    selectedGalleryWorkId: null,
    imageCompareSide: "BOTH",
    preparationSectionExpanded: Object.freeze({ today: true, week: false, recent: true, semester: false }),
    preparationSearchQuery: "",
    preparationFilter: "ALL",
    preparationFilterDrawerOpen: false,
    pinnedLessonIds: Object.freeze(["lesson-color-gradient"]),
    frequentlyUsedLessonIds: Object.freeze(["lesson-color-gradient", "lesson-gradient-rhythm"]),
    expandedUnitIds: Object.freeze([]),
    expandedLessonIds: Object.freeze([]),
    scheduleInstances: Object.freeze([...(input.scheduleInstances || [])]),
    reuseScheduleEditorState: null,
    worksetFeedback: null,
    recordPriorityFilter: "PRIORITY",
    recordSearchQuery: "",
    recordUnitFilter: "ALL",
    recordWorkflowFilter: "ALL",
    recordArchiveFilter: "ACTIVE",
    recordFilterDrawerOpen: false,
    recordHierarchyExpanded: false,
    selectedSessionPackageId: firstPriorityPackage?.sessionPackageId || null,
    selectedAcrossSummaryId: null,
    sessionPackages: Object.freeze([...input.sessionPackages]),
    researchHandoffCandidates: Object.freeze([...(input.researchHandoffCandidates || [])]),
    activeResearchCandidateId: null,
    researchCandidateEditorState: Object.freeze({
      objectName: "中间色示范的跨班课堂差异",
      researchQuestion: "对比画面与材料准备分别怎样影响学生理解中间色？",
      anonymized: true,
      nonAnonymizedTeacherConfirmation: false,
      selectedSessionPackageIds: Object.freeze([]),
      selectedEvidenceRefs: Object.freeze([]),
    }),
    researchDrawerOpen: false,
    archiveConfirmation: null,
    archiveFeedback: null,
  };
}
