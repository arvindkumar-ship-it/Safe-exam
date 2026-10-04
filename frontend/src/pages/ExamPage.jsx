import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { attemptApi } from "../api/attemptApi";
import { examApi } from "../api/examApi";
import ErrorMessage from "../components/ErrorMessage";
import Loading from "../components/Loading";
import ExamInstructions from "../features/attempt/ExamInstructions";
import ExamShell from "../features/attempt/ExamShell";

export default function ExamPage() {
  const { examId } = useParams();
  const [exam, setExam] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [consent, setConsent] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    examApi.getExam(examId).then(setExam).catch(setError);
  }, [examId]);

  async function start(consentGiven) {
    setError(null);
    setStarting(true);
    try {
      // start dobara bulane par server wahi attempt (resume) deta hai
      const a = await attemptApi.startAttempt(examId);
      setConsent(consentGiven);
      setAttempt(a);
    } catch (e) {
      setError(e);
    } finally {
      setStarting(false);
    }
  }

  if (receipt)
    return (
      <main>
        <h1>Exam submitted</h1>
        <p>You answered {receipt.answeredCount} of {receipt.totalQuestions} questions.</p>
        <Link to="/student">Back to dashboard</Link>
      </main>
    );
  if (attempt) return <main><ExamShell attempt={attempt} consentGiven={consent} onSubmitted={setReceipt} /></main>;
  return (
    <main>
      <ErrorMessage error={error} />
      {!exam && !error && <Loading />}
      {exam && <ExamInstructions exam={exam} onStart={start} busy={starting} />}
    </main>
  );
}
