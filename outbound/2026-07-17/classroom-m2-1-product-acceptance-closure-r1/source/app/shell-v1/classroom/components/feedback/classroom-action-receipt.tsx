import type { ClassroomFactEvent } from "../../../../../domain/classroom-evidence/lightweight-evidence-triage";
import type { ClassroomExecutionReceipt } from "../../adapters/classroom-web-fixture-adapter";

export function LightweightEvidenceToast({
  fact,
}: {
  fact: ClassroomFactEvent | null;
}) {
  if (!fact) return null;
  return (
    <div className="sv1-classroom-evidence-toast" role="status">
      <i>✓</i>
      <span>已记下，下课后再一起看。</span>
    </div>
  );
}

export function ClassroomExecutionReceiptToast({
  receipt,
  onDismiss,
}: {
  receipt: Readonly<ClassroomExecutionReceipt> | null;
  onDismiss?: () => void;
}) {
  if (!receipt) return null;
  return (
    <div
      className={`sv1-classroom-execution-receipt ${receipt.status.toLowerCase()}`}
      role={receipt.status === "FAILED" ? "alert" : "status"}
      data-fixture-only="true"
    >
      <i>{receipt.status === "FAILED" ? "!" : "✓"}</i>
      <span>
        <b>{receipt.title}</b>
        <small>{receipt.detail} · 模拟操作，不产生正式记录</small>
      </span>
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="关闭操作回执">
          ×
        </button>
      )}
    </div>
  );
}
