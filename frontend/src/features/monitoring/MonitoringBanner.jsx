import { MONITORING_NOTICE } from "./ConsentNotice";

export default function MonitoringBanner() {
  return (
    <div className="notice" data-testid="monitoring-banner">
      {MONITORING_NOTICE}
    </div>
  );
}

export const WARNING_TEXT = "Your exam window lost focus. This event has been recorded for review.";

// Ek hi role="alert" element rehta hai; "show" baar baar badalne par spam nahi hota.
export function MonitoringWarning({ show }) {
  if (!show) return null;
  return (
    <div role="alert" className="warning">
      {WARNING_TEXT}
    </div>
  );
}
