export const MONITORING_NOTICE =
  "Exam monitoring is active. Focus changes and fullscreen exits may be recorded for review.";

// Exam shuru karne se pehle dikhta hai. Non-accusatory: risk score / fraud jaisa kuch nahi.
export default function ConsentNotice() {
  return (
    <div className="notice" data-testid="consent-notice">
      <p>{MONITORING_NOTICE}</p>
      <p>
        Recorded events are only a signal for a human reviewer. They are not a final decision, and you can
        raise an appeal after the exam.
      </p>
    </div>
  );
}
