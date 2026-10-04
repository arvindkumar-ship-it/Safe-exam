import { useCallback, useEffect, useRef, useState } from "react";
import { useOnlineStatus } from "./useOnlineStatus";

// status: IDLE | SAVING | SAVED | FAILED | OFFLINE
// Offline queue abhi memory me hai (B-19 isse IndexedDB+encryption me upgrade karega).
export function useAutosave({ attemptId, saveFn, initialVersions = {}, debounceMs = 500 }) {
  const [status, setStatus] = useState("IDLE");
  const [versions, setVersions] = useState(initialVersions);
  const versionsRef = useRef({ ...initialVersions });
  const pending = useRef(new Map()); // questionId -> latest value
  const timer = useRef(null);
  const chain = useRef(Promise.resolve()); // saves serial chalein (version race nahi)
  const online = useOnlineStatus();
  const saveRef = useRef(saveFn);
  saveRef.current = saveFn;

  const setVersion = (qid, v) => {
    versionsRef.current[qid] = v;
    setVersions({ ...versionsRef.current });
  };

  async function saveOne(qid) {
    const value = pending.current.get(qid);
    for (let tries = 0; tries < 2; tries += 1) {
      try {
        const res = await saveRef.current(qid, { answerValue: value, version: versionsRef.current[qid] ?? 0 });
        setVersion(qid, res?.version ?? (versionsRef.current[qid] ?? 0) + 1);
        if (pending.current.get(qid) === value) pending.current.delete(qid);
        return true;
      } catch (e) {
        if (e?.code === "ANSWER_VERSION_CONFLICT" && e.details?.version !== undefined && tries === 0) {
          setVersion(qid, e.details.version); // server version adopt, apni latest value phir bhejo
          continue;
        }
        return false;
      }
    }
    return false;
  }

  const flush = useCallback(() => {
    clearTimeout(timer.current);
    chain.current = chain.current.then(async () => {
      if (pending.current.size === 0) return;
      if (typeof navigator !== "undefined" && navigator.onLine === false) return setStatus("OFFLINE");
      setStatus("SAVING");
      let failed = false;
      for (const qid of [...pending.current.keys()]) {
        if (!(await saveOne(qid))) failed = true;
      }
      setStatus(failed ? "FAILED" : pending.current.size ? "SAVING" : "SAVED");
    });
    return chain.current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const queueAnswer = useCallback(
    (questionId, answerValue) => {
      pending.current.set(questionId, answerValue);
      setStatus(typeof navigator !== "undefined" && navigator.onLine === false ? "OFFLINE" : "SAVING");
      clearTimeout(timer.current);
      timer.current = setTimeout(flush, debounceMs);
    },
    [debounceMs, flush],
  );

  useEffect(() => {
    if (online && pending.current.size > 0) flush(); // wapas online => queue bhejo
  }, [online, flush]);

  useEffect(() => () => clearTimeout(timer.current), []);

  return { status, queueAnswer, retryNow: flush, flush, versions, attemptId };
}
