import type { ClassroomCompositionBlueprint } from "./classroom-composition-blueprint.ts";

export const colorGradientClassroomCompositionBlueprint = Object.freeze({
  blueprintId: "COLOR_GRADIENT_CLASSROOM_COMPOSITION_M1_1",
  lessonId: "lesson_grade3_gradient_01",
  unknownCompositionPolicy: "REJECTED_UNKNOWN_COMPOSITION",
  entries: Object.freeze([
    {
      episodeId: "E01",
      bindingScope: Object.freeze(["B001", "B002"]),
      profileId: "OBSERVATION_COMPARE",
      stageComponentId: "classroom.stage.structured-screen",
      contextReminderId: "xiaojiao-observation-compare",
    },
    {
      episodeId: "E02",
      bindingScope: Object.freeze(["B003", "B004"]),
      profileId: "OBSERVATION_COMPARE",
      stageComponentId: "classroom.display.image-compare",
      contextReminderId: "xiaojiao-observation-compare",
    },
    {
      episodeId: "E03",
      bindingScope: Object.freeze(["B005"]),
      profileId: "OBSERVATION_COMPARE",
      stageComponentId: "classroom.display.image-compare",
      contextReminderId: "xiaojiao-observation-compare",
    },
    {
      episodeId: "E04",
      bindingScope: Object.freeze(["B006", "B007", "B008"]),
      profileId: "TEACHER_DEMONSTRATION",
      stageComponentId: "classroom.stage.structured-screen",
      contextReminderId: "xiaojiao-teacher-demonstration",
    },
    {
      episodeId: "E05",
      bindingScope: Object.freeze(["B009"]),
      profileId: "STUDENT_PRACTICE",
      stageComponentId: "classroom.art.material-checklist",
      contextReminderId: "xiaojiao-student-practice",
    },
    {
      episodeId: "E06",
      bindingScope: Object.freeze(["B010"]),
      profileId: "SHOWCASE_EVALUATION",
      stageComponentId: "classroom.display.student-gallery-fixture",
      contextReminderId: "xiaojiao-showcase-evaluation",
    },
    {
      episodeId: "E07",
      bindingScope: Object.freeze(["B011"]),
      profileId: "CLEANUP_AND_CLOSE",
      stageComponentId: "classroom.art.material-checklist",
      contextReminderId: "xiaojiao-cleanup-and-close",
    },
  ]),
}) satisfies ClassroomCompositionBlueprint;
