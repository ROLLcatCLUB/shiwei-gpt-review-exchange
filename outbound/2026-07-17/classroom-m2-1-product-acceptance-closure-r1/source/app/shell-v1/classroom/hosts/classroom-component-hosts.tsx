import type { ReactNode } from "react";
import {
  createClassroomComponentTrustedViewerContext,
  decideClassroomComponentPlacement,
  type ClassroomComponentHostId,
  type ClassroomComponentPlanItem,
  type ClassroomComponentViewer,
} from "../../../../domain/classroom-components/classroom-component-registry";
import type { ClassroomComponentPlan } from "../composition/classroom-component-plan";
import {
  renderRegisteredClassroomComponent,
  type ClassroomLiveRenderContext,
} from "../components/classroom-live-components";

function acceptedHostItems(
  hostId: ClassroomComponentHostId,
  plan: ClassroomComponentPlan,
) {
  return plan.accepted.filter((item) => item.hostId === hostId);
}

function ClassroomHost({
  hostId,
  viewer,
  plan,
  context,
  className,
}: {
  hostId: ClassroomComponentHostId;
  viewer: ClassroomComponentViewer;
  plan: ClassroomComponentPlan;
  context: ClassroomLiveRenderContext;
  className: string;
}) {
  const trustedViewerContext = createClassroomComponentTrustedViewerContext({
    hostId,
    viewer,
    contextRevision: context.toolState.revision,
  });
  const items = acceptedHostItems(hostId, plan);
  if (plan.status === "REJECTED")
    return <section className={`${className} is-error`} data-classroom-host={hostId}><p>组件计划未通过安全校验。</p></section>;
  if (!items.length)
    return <section className={`${className} is-empty`} data-classroom-host={hostId} aria-hidden="true" />;
  return (
    <section className={className} data-classroom-host={hostId} data-trusted-viewer={viewer}>
      {items.map((item) => {
        const decision = decideClassroomComponentPlacement(item, trustedViewerContext);
        return decision.allowed
          ? <div className="sv1-classroom-host-item" key={`${hostId}:${item.componentId}`}>{renderRegisteredClassroomComponent(item, context, viewer)}</div>
          : <div className="sv1-classroom-component-unsupported" key={`${hostId}:${item.componentId}`}>组件被 Host 拒绝：{decision.reason}</div>;
      })}
    </section>
  );
}

export function StudentDisplayHost({
  plan,
  context,
}: {
  plan: ClassroomComponentPlan;
  context: ClassroomLiveRenderContext;
}) {
  const items = acceptedHostItems("STUDENT_DISPLAY", plan);
  const trustedViewerContext = createClassroomComponentTrustedViewerContext({
    hostId: "STUDENT_DISPLAY",
    viewer: "STUDENT",
    contextRevision: context.toolState.revision,
  });
  const safeItems = items.filter(
    (item) => decideClassroomComponentPlacement(item, trustedViewerContext).allowed,
  );
  return (
    <aside className="sv1-student-display-host" data-classroom-host="STUDENT_DISPLAY" data-trusted-viewer="STUDENT" aria-label="学生端安全投影状态">
      <span>学生端安全投影</span>
      <small>{safeItems.map((item) => item.componentId).join(" · ") || "无可投影内容"}</small>
      <i>{context.currentBinding.bindingId}</i>
    </aside>
  );
}

export function ClassroomStageHost(props: { plan: ClassroomComponentPlan; context: ClassroomLiveRenderContext }) {
  return (
    <div className="sv1-classroom-stage-stack">
      <ClassroomHost hostId="CLASSROOM_STAGE" viewer="TEACHER" className="sv1-classroom-stage-host" {...props} />
      {props.context.componentDebug && <StudentDisplayHost {...props} />}
    </div>
  );
}

export function ClassroomSidecarHost(props: { plan: ClassroomComponentPlan; context: ClassroomLiveRenderContext }) {
  return <ClassroomHost hostId="CLASSROOM_SIDECAR" viewer="TEACHER" className="sv1-classroom-sidecar-host" {...props} />;
}

export function ClassroomOverlayHost(props: { plan: ClassroomComponentPlan; context: ClassroomLiveRenderContext }) {
  return <ClassroomHost hostId="CLASSROOM_OVERLAY" viewer="TEACHER" className="sv1-classroom-overlay-host" {...props} />;
}

export function ClassroomDockHost(props: { plan: ClassroomComponentPlan; context: ClassroomLiveRenderContext }) {
  return <ClassroomHost hostId="CLASSROOM_DOCK" viewer="TEACHER" className="sv1-classroom-dock-host" {...props} />;
}

export function GlobalAgentInputHost({ children }: { children: ReactNode }) {
  const item: ClassroomComponentPlanItem = {
    componentId: "xiaojiao.global.input-dock",
    hostId: "GLOBAL_AGENT_DOCK",
  };
  const trustedViewerContext = createClassroomComponentTrustedViewerContext({
    hostId: "GLOBAL_AGENT_DOCK",
    viewer: "TEACHER",
    contextRevision: 0,
  });
  const decision = decideClassroomComponentPlacement(item, trustedViewerContext);
  if (!decision.allowed) return null;
  return <div data-classroom-host="GLOBAL_AGENT_DOCK" data-trusted-viewer="TEACHER">{children}</div>;
}
