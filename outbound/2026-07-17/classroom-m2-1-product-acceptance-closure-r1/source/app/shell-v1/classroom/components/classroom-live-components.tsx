import type {
  ClassroomEpisode,
  ClassroomScreenBinding,
  ClassroomScreenDocument,
  LessonClassroomPackage,
} from "../../../../domain/classroom-handoff/lesson-classroom-package";
import type {
  ClassroomComponentPlanItem,
  ClassroomComponentViewer,
} from "../../../../domain/classroom-components/classroom-component-registry";
import type { ClassroomQuickMark } from "../../../../domain/classroom-evidence/lightweight-evidence-triage";
import type {
  ClassroomPackagePresentationProfile,
  ClassroomPreviewFixtureExtension,
} from "../classroom-contracts";
import {
  classroomScreenContent,
  classroomScreenImageUri,
} from "../classroom-contracts";
import { colorGradientVisualAssets } from "../classroom-visual-fixture";
import { TeacherWorkAssistantQuickMark } from "../teacher-work-assistant-review";
import type { ClassroomFixtureToolState } from "../adapters/classroom-web-fixture-adapter";
import {
  resolveClassroomContextReminderVisibility,
  type ClassroomContextReminderCandidate,
} from "../composition/classroom-context-reminder-registry";
import {
  ClassroomExecutionReceiptToast,
  LightweightEvidenceToast,
} from "./feedback/classroom-action-receipt";
import {
  ClassroomAnonymousStudentGallery,
  ClassroomImageCompare,
  ClassroomMaterialChecklist,
  type ClassroomGalleryWork,
  type ClassroomMaterialItem,
} from "./internal/classroom-internal-components";

export interface ClassroomLiveRenderContext {
  classroomPackage: LessonClassroomPackage;
  presentationProfile: ClassroomPackagePresentationProfile;
  currentEpisode: ClassroomEpisode;
  currentBinding: ClassroomScreenBinding;
  currentScreen: ClassroomScreenDocument;
  currentBindingIndex: number;
  currentScreenNumber: number;
  teacherCue?: string;
  fixture: ClassroomPreviewFixtureExtension;
  toolState: Readonly<ClassroomFixtureToolState>;
  contextReminderCandidate: Readonly<ClassroomContextReminderCandidate> | null;
  componentDebug: boolean;
  activeQuickMark: ClassroomQuickMark | null;
  quickMarkOpen: boolean;
  quickMarksAllowed: boolean;
  materials: readonly ClassroomMaterialItem[];
  galleryWorks: readonly ClassroomGalleryWork[];
  selectedGalleryWorkId: string | null;
  imageCompareSide: "BOTH" | "LEFT" | "RIGHT";
  lastQuickMarkFact: Parameters<typeof LightweightEvidenceToast>[0]["fact"];
  onMoveScreen: (direction: -1 | 1) => void;
  onSelectEpisode: (episodeId: string) => void;
  onOpenStudentDetails: () => void;
  onToggleQuickMark: () => void;
  onQuickMark: (mark: ClassroomQuickMark) => void;
  onSayOneLine: () => void;
  onStartTimer: () => void;
  onPauseTimer: () => void;
  onResetTimer: () => void;
  onStartCountdown: (seconds: number) => void;
  onToggleBlackout: () => void;
  onToggleSpotlight: () => void;
  onRandomSelect: () => void;
  onUndoRandomSelect: () => void;
  onDismissReceipt: () => void;
  onDismissReminder: () => void;
  onDeferReminder: () => void;
  onToggleMaterial: (itemId: string) => void;
  onSelectGalleryWork: (workId: string) => void;
  onImageCompareSide: (side: "BOTH" | "LEFT" | "RIGHT") => void;
}

function episodeState(episode: ClassroomEpisode, currentEpisode: ClassroomEpisode) {
  if (episode.displayOrder < currentEpisode.displayOrder) return "done";
  if (episode.episodeId === currentEpisode.episodeId) return "current";
  return "upcoming";
}

export function StructuredClassroomStage({
  context,
  viewer,
}: {
  context: ClassroomLiveRenderContext;
  viewer: ClassroomComponentViewer;
}) {
  const { currentScreen: screen, presentationProfile } = context;
  const content = classroomScreenContent(screen, presentationProfile);
  const imageUri = classroomScreenImageUri(screen, presentationProfile);
  const isDemonstration = screen.instructionalRole === "DEMONSTRATION";
  const isTask = screen.instructionalRole === "TASK";
  const isComparison = screen.instructionalRole === "COMPARISON";
  return (
    <article className="sv1-classroom-current-screen-card" data-component-id="classroom.stage.structured-screen">
      <header>
        <div><b>{viewer === "STUDENT" ? "学生大屏" : "当前大屏"}</b>{context.componentDebug && <span>Binding {context.currentBinding.bindingId}</span>}</div>
        <span>{context.currentScreenNumber} / {context.classroomPackage.presentationSequence.length}</span>
      </header>
      <div className={`sv1-classroom-screen ${context.toolState.spotlight ? "is-spotlight" : ""}`} aria-label={`当前学生大屏，第${context.currentScreenNumber}屏`}>
        {context.toolState.blackScreen ? (
          <div className="sv1-classroom-black-screen"><i>●</i><b>学生大屏已暂时隐藏</b><span>教师端仍保留课堂流程与提示</span></div>
        ) : (
          <>
            {imageUri ? <div className="sv1-classroom-screen-image" style={{ backgroundImage: `url(${imageUri})` }} /> : isComparison ? (
              <div className="sv1-classroom-gradient-study" aria-hidden="true"><span /><span /><span /><span /></div>
            ) : isDemonstration ? (
              <div className="sv1-classroom-demo-placeholder"><span>示范画面占位</span><b>课前可替换为教师真实水粉示范图</b></div>
            ) : isTask ? (
              <div className="sv1-classroom-task-visual" aria-hidden="true"><i /><i /><i /></div>
            ) : null}
            <div className="sv1-classroom-screen-copy">
              <span>第{context.currentScreenNumber}屏 · {screen.instructionalRole === "OBSERVATION" ? "观察" : screen.instructionalRole === "COMPARISON" ? "比较" : screen.instructionalRole === "DEMONSTRATION" ? "示范" : screen.instructionalRole === "EVALUATION" ? "欣赏" : "课堂任务"}</span>
              <h2>{content.title || "课堂画面"}</h2>
              <p>{content.question || "请观察当前画面。"}</p>
              {content.studentAction && <small>{content.studentAction}</small>}
            </div>
          </>
        )}
      </div>
      {viewer === "TEACHER" && <footer><span>教师提示</span><p>{context.teacherCue || context.currentBinding.teacherCue || "观察学生反应后再推进。"}</p></footer>}
    </article>
  );
}

export function ClassroomLessonFlow({ context }: { context: ClassroomLiveRenderContext }) {
  return (
    <article className="sv1-classroom-flow-card" data-component-id="classroom.sidecar.lesson-flow">
      <header><div><b>课堂流程</b><span>{context.classroomPackage.episodes.length}个环节</span></div><small>{context.currentEpisode.displayOrder} / {context.classroomPackage.episodes.length}</small></header>
      <ol>{context.classroomPackage.episodes.map((episode) => {
        const state = episodeState(episode, context.currentEpisode);
        return <li key={episode.episodeId} className={state}><button type="button" onClick={() => context.onSelectEpisode(episode.episodeId)}><i>{state === "done" ? "✓" : episode.displayOrder}</i><span><b>{episode.title}</b><small>{episode.durationMinutes} 分钟</small></span></button></li>;
      })}</ol>
    </article>
  );
}

export function ClassroomStudentStatus({ context }: { context: ClassroomLiveRenderContext }) {
  return (
    <article className="sv1-classroom-student-card" data-component-id="classroom.sidecar.student-status-summary">
      <header><div><b>学生状态摘要</b><span>{context.componentDebug ? "fixture 聚合" : "体验数据"}</span></div><button type="button" onClick={context.onOpenStudentDetails}>查看详情 ›</button></header>
      <div className="sv1-classroom-student-stats">
        <span><small>到课</small><b>{context.fixture.classroom.present}</b><em>/ {context.fixture.classroom.enrolled}</em></span>
        <span className="positive"><small>已完成</small><b>{context.fixture.progress.completed}</b><em>人</em></span>
        <span className="active"><small>进行中</small><b>{context.fixture.progress.inProgress}</b><em>人</em></span>
        <span className="muted"><small>未响应</small><b>{context.fixture.progress.notResponded}</b><em>人</em></span>
      </div>
      <div className="sv1-classroom-support-flags"><span><i />需帮助 <b>{context.fixture.supportFlags.needsHelp}</b></span><span><i />可展示 <b>{context.fixture.supportFlags.showcaseEligible}</b></span></div>
    </article>
  );
}

export function ClassroomRecentEvents({ context }: { context: ClassroomLiveRenderContext }) {
  const fixtureEvents = context.fixture.recentEvents.slice(0, 3);
  const toolEvents = context.toolState.events.slice(-2).reverse();
  return (
    <article className="sv1-classroom-event-card" data-component-id="classroom.sidecar.recent-events">
      <header><div><b>最近课堂动态</b><span>课堂事件 + 工具回执</span></div></header>
      <ul>
        {toolEvents.map((event) => <li key={event.eventId} className={event.outcome === "APPLIED" ? "positive" : "attention"}><i /><span><b>教师操作</b>{event.summary}</span><time>刚刚</time></li>)}
        {fixtureEvents.map((event) => <li key={event.eventId} className={event.tone.toLowerCase()}><i /><span><b>{event.studentLabel}</b>{event.action}</span><time>{event.timeLabel}</time></li>)}
      </ul>
    </article>
  );
}

export function XiaojiaoClassroomReminder({ context }: { context: ClassroomLiveRenderContext }) {
  const candidate = context.contextReminderCandidate;
  if (!candidate) return null;
  const visibility = resolveClassroomContextReminderVisibility({
    candidate,
    state: context.toolState.reminderStates[candidate.reminderId],
    deferredAtBindingId:
      context.toolState.reminderDeferredAtBindingIds[candidate.reminderId],
    currentBindingId: context.currentBinding.bindingId,
  });
  if (visibility !== "VISIBLE") return null;
  return (
    <article className="sv1-classroom-xiaojiao-card" data-component-id="xiaojiao.classroom.context-reminder">
      <header><div><b>小教提醒</b><span>根据当前课堂位置整理</span></div><em>{context.componentDebug ? candidate.reminderId : "本环节提示"}</em></header>
      <strong>{candidate.title}</strong>
      <p>{candidate.judgement}</p>
      <details><summary>查看依据</summary><p>{candidate.evidence}{context.componentDebug ? ` · ${context.currentBinding.bindingId}` : ""}</p></details>
      <ul>{candidate.suggestions.map((item) => <li key={item}>{item}</li>)}</ul>
      <footer><button type="button" onClick={context.onDeferReminder}>稍后提醒</button><button type="button" onClick={context.onDismissReminder}>关闭</button></footer>
    </article>
  );
}

export function ClassroomPrimaryControlDock({ context }: { context: ClassroomLiveRenderContext }) {
  const timerLabel = context.toolState.timerMode === "COUNT_DOWN"
    ? `${Math.ceil((context.toolState.countdownRemainingSeconds ?? 0) / 60)}分倒计时`
    : context.toolState.timerRunning ? "暂停计时" : "开始计时";
  return (
    <section className="sv1-classroom-control-dock" aria-label="课堂控制栏" data-component-id="classroom.control.primary-dock">
      <button type="button" onClick={() => context.onMoveScreen(-1)} disabled={context.currentBindingIndex === 0}><i>‹</i><span>上一屏</span></button>
      <button type="button" onClick={() => context.onMoveScreen(1)} disabled={context.currentBindingIndex === context.classroomPackage.presentationSequence.length - 1}><i>›</i><span>下一屏</span></button>
      <button type="button" onClick={context.toolState.timerRunning ? context.onPauseTimer : context.onStartTimer} className={context.toolState.timerRunning && context.toolState.timerMode === "COUNT_UP" ? "active" : ""}><i>{context.toolState.timerRunning ? "Ⅱ" : "▷"}</i><span>{timerLabel}</span></button>
      <button type="button" onClick={() => context.onStartCountdown(300)} className={context.toolState.timerMode === "COUNT_DOWN" ? "active" : ""}><i>5′</i><span>倒计时</span></button>
      <button type="button" onClick={context.onResetTimer}><i>↺</i><span>重置</span></button>
      <button type="button" onClick={context.onToggleBlackout} className={context.toolState.blackScreen ? "active" : ""}><i>■</i><span>黑屏</span></button>
      <button type="button" onClick={context.onToggleSpotlight} className={context.toolState.spotlight ? "active" : ""}><i>◉</i><span>聚光灯</span></button>
      <button type="button" onClick={context.onRandomSelect}><i>人</i><span>{context.toolState.selectedStudent || "随机点名"}</span></button>
      {context.toolState.selectedStudent && <button type="button" className="secondary-action" onClick={context.onUndoRandomSelect}><i>↶</i><span>撤销点名</span></button>}
      <button type="button" onClick={context.onToggleQuickMark} className={context.quickMarkOpen ? "active" : ""}><i>记</i><span>随手记</span></button>
    </section>
  );
}

function StudentSafeProjectionSummary({ item, context }: { item: ClassroomComponentPlanItem; context: ClassroomLiveRenderContext }) {
  return <div className="sv1-student-safe-projection-summary" aria-label="学生端安全投影"><span>学生端安全投影</span><small>{item.componentId} · {context.currentBinding.bindingId}</small></div>;
}

export function renderRegisteredClassroomComponent(
  item: ClassroomComponentPlanItem,
  context: ClassroomLiveRenderContext,
  viewer: ClassroomComponentViewer,
) {
  switch (item.componentId) {
    case "classroom.stage.structured-screen":
      return <StructuredClassroomStage context={context} viewer={viewer} />;
    case "classroom.display.image-compare":
      return <ClassroomImageCompare title="连续变化和突然跳变有什么不同？" question="找一找：哪一处中间色让两端自然地接起来？" leftImage={colorGradientVisualAssets.duskSky} rightImage={colorGradientVisualAssets.gradientCharm} activeSide={context.imageCompareSide} onSwitch={viewer === "TEACHER" ? context.onImageCompareSide : undefined} />;
    case "classroom.art.material-checklist":
      return <ClassroomMaterialChecklist viewer={viewer} items={context.materials} onToggle={viewer === "TEACHER" ? context.onToggleMaterial : undefined} />;
    case "classroom.display.student-gallery-fixture":
      return <ClassroomAnonymousStudentGallery viewer={viewer} works={context.galleryWorks} selectedWorkId={context.selectedGalleryWorkId} onSelect={viewer === "TEACHER" ? context.onSelectGalleryWork : undefined} />;
    case "classroom.sidecar.lesson-flow":
      return <ClassroomLessonFlow context={context} />;
    case "classroom.sidecar.student-status-summary":
      return <ClassroomStudentStatus context={context} />;
    case "classroom.sidecar.recent-events":
      return <ClassroomRecentEvents context={context} />;
    case "xiaojiao.classroom.context-reminder":
      return <XiaojiaoClassroomReminder context={context} />;
    case "classroom.note.quick-capture":
      return context.quickMarksAllowed ? <TeacherWorkAssistantQuickMark expanded={context.quickMarkOpen} activeMark={context.activeQuickMark} onToggle={context.onToggleQuickMark} onMark={context.onQuickMark} onSayOneLine={context.onSayOneLine} /> : null;
    case "classroom.overlay.action-receipt":
      return <ClassroomExecutionReceiptToast receipt={context.toolState.latestReceipt} onDismiss={context.onDismissReceipt} />;
    case "classroom.control.primary-dock":
      return <ClassroomPrimaryControlDock context={context} />;
    case "STUDENT_SAFE_PROJECTION_SUMMARY":
      return <StudentSafeProjectionSummary item={item} context={context} />;
    default:
      return <div className="sv1-classroom-component-unsupported" role="status">组件暂不可用：{item.componentId}</div>;
  }
}
