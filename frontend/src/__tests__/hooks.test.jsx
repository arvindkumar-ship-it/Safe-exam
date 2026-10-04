import { act, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ExamTimer from "../features/attempt/ExamTimer";
import { useAutosave } from "../hooks/useAutosave";
import { useTimer } from "../hooks/useTimer";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("useTimer", () => {
  it("counts down and fires onExpire once", () => {
    const now = Date.now();
    const onExpire = vi.fn();
    const { result } = renderHook(() =>
      useTimer({ expiresAt: new Date(now + 3000).toISOString(), serverTime: new Date(now).toISOString(), onExpire }));
    expect(result.current.remainingSeconds).toBe(3);
    act(() => vi.advanceTimersByTime(2000));
    expect(result.current.remainingSeconds).toBe(1);
    act(() => vi.advanceTimersByTime(5000));
    expect(result.current.isExpired).toBe(true);
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it("uses the server offset, not the client clock", () => {
    const now = Date.now();
    // client clock 1 ghanta aage hai
    const serverTime = new Date(now - 3600_000).toISOString();
    const expiresAt = new Date(now - 3600_000 + 90_000).toISOString();
    const { result } = renderHook(() => useTimer({ expiresAt, serverTime }));
    expect(result.current.remainingSeconds).toBe(90);
  });

  it("is visible and highlights the last minute", () => {
    const now = Date.now();
    render(<ExamTimer expiresAt={new Date(now + 45_000).toISOString()} serverTime={new Date(now).toISOString()} />);
    expect(screen.getByTestId("timer")).toHaveTextContent("00:45");
    expect(screen.getByTestId("timer")).toHaveClass("timer-warn");
  });
});

describe("useAutosave", () => {
  it("debounces rapid changes into one save", async () => {
    const saveFn = vi.fn(async () => ({ version: 1 }));
    const { result } = renderHook(() => useAutosave({ attemptId: "a", saveFn }));
    act(() => { result.current.queueAnswer("q1", "o1"); result.current.queueAnswer("q1", "o2"); });
    await act(async () => { await vi.advanceTimersByTimeAsync(600); });
    expect(saveFn).toHaveBeenCalledTimes(1);
    expect(saveFn).toHaveBeenCalledWith("q1", { answerValue: "o2", version: 0 });
    expect(result.current.status).toBe("SAVED");
    expect(result.current.versions.q1).toBe(1);
  });

  it("reports FAILED and retry works", async () => {
    const saveFn = vi.fn().mockRejectedValueOnce(new Error("net")).mockResolvedValue({ version: 1 });
    const { result } = renderHook(() => useAutosave({ attemptId: "a", saveFn }));
    act(() => result.current.queueAnswer("q1", "o1"));
    await act(async () => { await vi.advanceTimersByTimeAsync(600); });
    expect(result.current.status).toBe("FAILED");
    await act(async () => { await result.current.retryNow(); });
    expect(result.current.status).toBe("SAVED");
  });

  it("queues while offline and sends when back online", async () => {
    const saveFn = vi.fn(async () => ({ version: 1 }));
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    const { result } = renderHook(() => useAutosave({ attemptId: "a", saveFn }));
    act(() => result.current.queueAnswer("q1", "o1"));
    await act(async () => { await vi.advanceTimersByTimeAsync(600); });
    expect(saveFn).not.toHaveBeenCalled();
    expect(result.current.status).toBe("OFFLINE");
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    await act(async () => { window.dispatchEvent(new Event("online")); await vi.advanceTimersByTimeAsync(10); });
    expect(saveFn).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe("SAVED");
  });

  it("adopts the server version on conflict and re-sends the latest value", async () => {
    const conflict = Object.assign(new Error("c"), { code: "ANSWER_VERSION_CONFLICT", details: { version: 5, answerValue: "old" } });
    const saveFn = vi.fn().mockRejectedValueOnce(conflict).mockResolvedValue({ version: 6 });
    const { result } = renderHook(() => useAutosave({ attemptId: "a", saveFn }));
    act(() => result.current.queueAnswer("q1", "mine"));
    await act(async () => { await vi.advanceTimersByTimeAsync(600); });
    expect(saveFn).toHaveBeenLastCalledWith("q1", { answerValue: "mine", version: 5 });
    expect(result.current.versions.q1).toBe(6);
    expect(result.current.status).toBe("SAVED");
  });
});
