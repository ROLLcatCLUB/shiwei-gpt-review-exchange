import type { LessonClassroomPackage } from "../../../domain/classroom-handoff/lesson-classroom-package";
import classroomPackageJson from "../../../fixtures/classroom-handoff/COLOR_GRADIENT_CLASSROOM_HANDOFF_SAMPLE_V0_2.json" with { type: "json" };
import type { ClassroomPreviewFixtureExtension } from "./classroom-contracts.ts";
import classroomPreviewFixtureJson from "./classroom-preview-fixture.json" with { type: "json" };

export const colorGradientClassroomPackage =
  classroomPackageJson as unknown as LessonClassroomPackage;

export const classroomPreviewFixture =
  classroomPreviewFixtureJson as ClassroomPreviewFixtureExtension;
