"use client";

import { useMemo, useReducer, type SetStateAction } from "react";
import type {
  ClassroomScheduleInstance,
  ClassroomSessionPackage,
  ResearchHandoffCandidate,
} from "../../../domain/classroom-workset/semester-classroom-workset.ts";
import {
  classroomWorkspaceReducer,
  createInitialClassroomWorkspaceState,
  type ClassroomWorkspaceState,
} from "./classroom-workspace-state.ts";

export {
  classroomWorkspaceReducer,
  createInitialClassroomWorkspaceState,
} from "./classroom-workspace-state.ts";
export type {
  ArchiveConfirmation,
  ArchiveConfirmationMode,
  ClassroomCatalogFilter,
  ClassroomRecordPriorityFilter,
  ClassroomWorkspaceAction,
  ClassroomWorkspaceState,
  NextClassPreparationOutcome,
  PreparationWorksetFilter,
  RecordArchiveFilter,
  RecordWorkflowFilter,
  ResearchCandidateEditorState,
  ReuseScheduleEditorState,
  TeacherAssistantPrimaryView,
} from "./classroom-workspace-state.ts";

export function useClassroomWorkspaceController(input: Parameters<typeof createInitialClassroomWorkspaceState>[0]) {
  const [state, dispatch] = useReducer(classroomWorkspaceReducer, input, createInitialClassroomWorkspaceState);
  const actions = useMemo(() => {
    function setter<K extends keyof ClassroomWorkspaceState>(key: K) {
      return (value: SetStateAction<ClassroomWorkspaceState[K]>) => dispatch({ type: "SET", key, value });
    }
    return {
      setSelectedCandidateId: setter("selectedCandidateId"),
      setCatalogFilter: setter("catalogFilter"),
      setCatalogPreviewPackageId: setter("catalogPreviewPackageId"),
      setPreviewLock: setter("previewLock"),
      setCurrentBindingId: setter("currentBindingId"),
      setClassroomToolState: setter("classroomToolState"),
      setRightRailOpen: setter("rightRailOpen"),
      setExitConfirmOpen: setter("exitConfirmOpen"),
      setActiveQuickMark: setter("activeQuickMark"),
      setLastQuickMarkFact: setter("lastQuickMarkFact"),
      setTeacherAssistantReviewState: setter("teacherAssistantReviewState"),
      setTeacherAssistantPrimaryView: setter("teacherAssistantPrimaryView"),
      setTeacherAssistantQuickMarkOpen: setter("teacherAssistantQuickMarkOpen"),
      setTeacherAssistantContextChoice: setter("teacherAssistantContextChoice"),
      setTeacherAssistantContextNote: setter("teacherAssistantContextNote"),
      setTeacherAssistantDecisionAction: setter("teacherAssistantDecisionAction"),
      setTeacherAssistantTriageDeferred: setter("teacherAssistantTriageDeferred"),
      setTeacherAssistantNextClassOutcome: setter("teacherAssistantNextClassOutcome"),
      setMaterialItems: setter("materialItems"),
      setSelectedGalleryWorkId: setter("selectedGalleryWorkId"),
      setImageCompareSide: setter("imageCompareSide"),
      setPreparationSearchQuery: setter("preparationSearchQuery"),
      setPreparationFilter: setter("preparationFilter"),
      setPreparationFilterDrawerOpen: setter("preparationFilterDrawerOpen"),
      setReuseScheduleEditorState: setter("reuseScheduleEditorState"),
      setWorksetFeedback: setter("worksetFeedback"),
      setRecordPriorityFilter: setter("recordPriorityFilter"),
      setRecordSearchQuery: setter("recordSearchQuery"),
      setRecordUnitFilter: setter("recordUnitFilter"),
      setRecordWorkflowFilter: setter("recordWorkflowFilter"),
      setRecordArchiveFilter: setter("recordArchiveFilter"),
      setRecordFilterDrawerOpen: setter("recordFilterDrawerOpen"),
      setRecordHierarchyExpanded: setter("recordHierarchyExpanded"),
      setSelectedSessionPackageId: setter("selectedSessionPackageId"),
      setSelectedAcrossSummaryId: setter("selectedAcrossSummaryId"),
      setResearchDrawerOpen: setter("researchDrawerOpen"),
      setActiveResearchCandidateId: setter("activeResearchCandidateId"),
      setResearchCandidateEditorState: setter("researchCandidateEditorState"),
      setArchiveConfirmation: setter("archiveConfirmation"),
      setArchiveFeedback: setter("archiveFeedback"),
      resetClassroom: (elapsedSeconds = 0) => dispatch({ type: "RESET_CLASSROOM", elapsedSeconds }),
      togglePreparationSection: (section: "today" | "week" | "recent" | "semester") => dispatch({ type: "TOGGLE_PREPARATION_SECTION", section }),
      togglePinnedLesson: (lessonId: string) => dispatch({ type: "TOGGLE_STRING_SET", key: "pinnedLessonIds", value: lessonId }),
      toggleFrequentLesson: (lessonId: string) => dispatch({ type: "TOGGLE_STRING_SET", key: "frequentlyUsedLessonIds", value: lessonId }),
      toggleExpandedUnit: (unitId: string) => dispatch({ type: "TOGGLE_STRING_SET", key: "expandedUnitIds", value: unitId }),
      toggleExpandedLesson: (lessonId: string) => dispatch({ type: "TOGGLE_STRING_SET", key: "expandedLessonIds", value: lessonId }),
      toggleResearchSessionPackage: (id: string) => dispatch({ type: "TOGGLE_RESEARCH_PACKAGE", value: id }),
      toggleResearchEvidence: (ref: string) => dispatch({ type: "TOGGLE_RESEARCH_EVIDENCE", value: ref }),
      openResearchDrawer: (ids: readonly string[]) => dispatch({ type: "OPEN_RESEARCH_DRAWER", sessionPackageIds: ids }),
      addResearchCandidate: (candidate: ResearchHandoffCandidate) => dispatch({ type: "ADD_RESEARCH_CANDIDATE", candidate }),
      cancelResearchEditor: () => dispatch({ type: "CANCEL_RESEARCH_EDITOR" }),
      replaceSessionPackage: (sessionPackage: ClassroomSessionPackage) => dispatch({ type: "REPLACE_SESSION_PACKAGE", sessionPackage }),
      replaceSessionPackages: (sessionPackages: readonly ClassroomSessionPackage[]) => dispatch({ type: "REPLACE_SESSION_PACKAGES", sessionPackages }),
      addScheduleInstance: (scheduleInstance: ClassroomScheduleInstance) => dispatch({ type: "ADD_SCHEDULE_INSTANCE", scheduleInstance }),
    };
  }, []);
  return { state, dispatch, ...actions };
}
