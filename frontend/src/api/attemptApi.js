import { apiRequest } from "./client";

export const attemptApi = {
  startAttempt: (examId) => apiRequest("/attempts/start", { method: "POST", body: { examId } }),
  getAttempt: (id) => apiRequest(`/attempts/${id}`),
  mine: (examId) => apiRequest(`/attempts/mine${examId ? `?examId=${examId}` : ""}`),
  saveAnswer: (attemptId, questionId, { answerValue, version }) =>
    apiRequest(`/attempts/${attemptId}/answers/${questionId}`, { method: "PUT", body: { answerValue, version } }),
  submit: (attemptId, idempotencyKey) =>
    apiRequest(`/attempts/${attemptId}/submit`, {
      method: "POST",
      body: {},
      headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {},
    }),
  heartbeat: (attemptId) => apiRequest(`/attempts/${attemptId}/heartbeat`, { method: "POST", body: {} }),
  getResult: (attemptId) => apiRequest(`/attempts/${attemptId}/result`),
};
