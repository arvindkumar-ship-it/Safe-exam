import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { attemptApi } from "../../api/attemptApi";
import Button from "../../components/Button";
import ErrorMessage from "../../components/ErrorMessage";
import { useAutosave } from "../../hooks/useAutosave";
import ExamTimer from "./ExamTimer";
import MonitoringSlot from "./MonitoringSlot";
import QuestionCard from "./QuestionCard";
import QuestionNavigator, { isAnswered } from "./QuestionNavigator";
import SaveStatus from "./SaveStatus";
import SubmitDialog from "./SubmitDialog";

const HEARTBEAT_MS = 30000;
const FINAL = ["SUBMITTED", "AUTO_SUBMITTED", "TERMINATED"];
const newKey = () => (globalThis.crypto?.randomUUID ? crypto.randomUUID() : `k-${Date.now()}-${Math.random()}`);

export default function ExamShell({ attempt, consentGiven, onSubmitted }) {
  const questions = attempt.questions;
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState(() =>
    Object.fromEntries(questions.filter((q) => q.answer).map((q) => [q.id, q.answer.answerValue])));
  const initialVersions = useMemo(
    () => Object.fromEntries(questions.filter((q) => q.answer).map((q) => [q.id, q.answer.version])),
    [questions],
  );
  const { status, queueAnswer, retryNow, flush } = useAutosave({
    attemptId: attempt.id,
    saveFn: (qid, payload) => attemptApi.saveAnswer(attempt.id, qid, payload),
    initialVersions,
  });

  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [underReview, setUnderReview] = useState(attempt.status === "UNDER_REVIEW");
  const key = useRef(newKey()); // retry par same key => duplicate submission nahi
  const done = useRef(false);

  const finish = useCallback(async () => {
    if (done.current) return;
    setBusy(true);
    setError(null);
    try {
      await flush();
      const receipt = await attemptApi.submit(attempt.id, key.current);
      done.current = true;
      onSubmitted?.(receipt);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }, [attempt.id, flush, onSubmitted]);

  // heartbeat: server batata hai expired / review / submitted
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const hb = await attemptApi.heartbeat(attempt.id);
        if (!hb) return;
        if (FINAL.includes(hb.attemptStatus)) finish();
        else setUnderReview(hb.attemptStatus === "UNDER_REVIEW");
      } catch {
        /* network issue — autosave status already dikhata hai */
      }
    }, HEARTBEAT_MS);
    return () => clearInterval(id);
  }, [attempt.id, finish]);

  function change(question, value) {
    setAnswers((a) => ({ ...a, [question.id]: value }));
    queueAnswer(question.id, value);
  }

  const q = questions[index];
  const answered = questions.filter((x) => isAnswered(answers[x.id])).length;

  return (
    <div>
      <header className="card exam-header">
        <strong>{attempt.exam.title}</strong>
        <ExamTimer expiresAt={attempt.expiresAt} serverTime={attempt.serverTime} onExpire={finish} />
        <SaveStatus status={status} onRetry={retryNow} />
        {consentGiven && <MonitoringSlot />}
      </header>
      {underReview && (
        <p role="status" className="warning">Your attempt has been paused for review. Please wait for further instructions.</p>
      )}
      <div className="exam-layout">
        <div>
          <QuestionCard key={q.id} question={q} value={answers[q.id]} onChange={(v) => change(q, v)} />
          <div className="form-row">
            <Button variant="secondary" disabled={index === 0} onClick={() => setIndex(index - 1)}>Previous</Button>
            <Button variant="secondary" disabled={index === questions.length - 1} onClick={() => setIndex(index + 1)}>Next</Button>
            <Button onClick={() => setConfirming(true)}>Submit exam</Button>
          </div>
          {!confirming && <ErrorMessage error={error} />}
        </div>
        <aside className="card">
          <p>{answered} / {questions.length} answered</p>
          <QuestionNavigator questions={questions} answers={answers} currentIndex={index} onSelect={setIndex} />
        </aside>
      </div>
      {confirming && (
        <SubmitDialog
          answered={answered} total={questions.length} busy={busy} error={error}
          onCancel={() => setConfirming(false)} onConfirm={finish}
        />
      )}
    </div>
  );
}
