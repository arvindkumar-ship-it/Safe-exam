import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import ExamInstructions from "../features/attempt/ExamInstructions";
import ExamShell from "../features/attempt/ExamShell";
import ConsentNotice from "../features/monitoring/ConsentNotice";
import MonitoringBanner, { MonitoringWarning, WARNING_TEXT } from "../features/monitoring/MonitoringBanner";
import { jsonResponse, mockFetch } from "../testUtils";

afterEach(() => vi.unstubAllGlobals());

const attemptView = (extra = {}) => ({
  id: "a1", exam: { id: "e1", title: "Math", durationSeconds: 3600 }, status: "ACTIVE",
  startedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 3600_000).toISOString(),
  serverTime: new Date().toISOString(), monitoringPolicy: {},
  questions: [
    { id: "q1", type: "MCQ_SINGLE", prompt: "2+2?", options: [{ id: "o1", text: "3" }, { id: "o2", text: "4" }], marks: 1, position: 1, answer: null },
    { id: "q2", type: "SHORT_TEXT", prompt: "Capital of India?", options: null, marks: 2, position: 2, answer: null },
  ],
  ...extra,
});

describe("ExamInstructions", () => {
  it("disables start until consent is ticked", async () => {
    const onStart = vi.fn();
    render(<ExamInstructions exam={{ title: "Math", durationSeconds: 3600 }} onStart={onStart} />);
    const btn = screen.getByRole("button", { name: /start exam/i });
    expect(btn).toBeDisabled();
    await userEvent.click(screen.getByRole("checkbox"));
    expect(btn).toBeEnabled();
    await userEvent.click(btn);
    expect(onStart).toHaveBeenCalledWith(true);
  });
});

describe("ExamShell", () => {
  it("renders questions, saves a selected option and keeps it when navigating", async () => {
    const f = mockFetch(() => jsonResponse({ questionId: "q1", version: 1, savedAt: "x" }));
    render(<ExamShell attempt={attemptView()} consentGiven />);
    expect(screen.getByText(/2\+2\?/)).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText("4"));
    await waitFor(() => expect(f).toHaveBeenCalled());
    const [url, opts] = f.mock.calls[0];
    expect(url).toContain("/attempts/a1/answers/q1");
    expect(JSON.parse(opts.body)).toEqual({ answerValue: "o2", version: 0 });
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText(/Capital of India/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Previous" }));
    expect(screen.getByLabelText("4")).toBeChecked();
  });

  it("restores saved answers from the server view", () => {
    const view = attemptView();
    view.questions[0].answer = { answerValue: "o1", version: 3 };
    render(<ExamShell attempt={view} consentGiven />);
    expect(screen.getByLabelText("3")).toBeChecked();
    expect(screen.getByText("1 / 2 answered")).toBeInTheDocument();
  });

  it("asks for confirmation and submits with an Idempotency-Key", async () => {
    const onSubmitted = vi.fn();
    const f = mockFetch(() => jsonResponse({ submissionId: "s1", answeredCount: 0, totalQuestions: 2 }));
    render(<ExamShell attempt={attemptView()} consentGiven onSubmitted={onSubmitted} />);
    await userEvent.click(screen.getByRole("button", { name: /submit exam/i }));
    expect(screen.getByRole("dialog")).toHaveTextContent(/answered 0 of 2/i);
    expect(f).not.toHaveBeenCalled(); // confirm se pehle kuch nahi
    await userEvent.click(screen.getByRole("button", { name: /submit now/i }));
    await waitFor(() => expect(onSubmitted).toHaveBeenCalled());
    expect(f.mock.calls[0][1].headers["Idempotency-Key"]).toBeTruthy();
  });

  it("shows the monitoring banner and a visible timer", () => {
    render(<ExamShell attempt={attemptView()} consentGiven />);
    expect(screen.getByTestId("monitoring-banner")).toBeInTheDocument();
    expect(screen.getByTestId("timer")).toBeInTheDocument();
  });
});

describe("monitoring UI shell", () => {
  it("shows the exact banner and consent text", () => {
    render(<><MonitoringBanner /><ConsentNotice /></>);
    expect(screen.getByTestId("monitoring-banner")).toHaveTextContent(
      "Exam monitoring is active. Focus changes and fullscreen exits may be recorded for review.");
    expect(screen.getByTestId("consent-notice")).toHaveTextContent(/recorded for review/);
  });

  it("warning is a single accessible alert, non-accusatory, not spammed", () => {
    const { rerender } = render(<MonitoringWarning show />);
    expect(screen.getAllByRole("alert")).toHaveLength(1);
    rerender(<MonitoringWarning show />);
    expect(screen.getAllByRole("alert")).toHaveLength(1);
    expect(screen.getByRole("alert")).toHaveTextContent(WARNING_TEXT);
    expect(screen.getByRole("alert").textContent).not.toMatch(/risk|fraud|cheat/i);
    rerender(<MonitoringWarning show={false} />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
