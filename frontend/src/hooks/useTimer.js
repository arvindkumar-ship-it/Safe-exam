import { useEffect, useRef, useState } from "react";

// Sirf display. Asli expiry server decide karta hai (onExpire => submit call).
// offset = serverTime - Date.now() ek baar; client clock skew isse cancel ho jata hai.
export function useTimer({ expiresAt, serverTime, onExpire }) {
  const offset = useRef(null);
  if (offset.current === null) offset.current = new Date(serverTime).getTime() - Date.now();
  const expiresMs = new Date(expiresAt).getTime();
  const calc = () => Math.max(0, Math.ceil((expiresMs - (Date.now() + offset.current)) / 1000));

  const [remainingSeconds, setRemaining] = useState(calc);
  const fired = useRef(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    const tick = () => {
      const r = calc();
      setRemaining(r);
      if (r <= 0 && !fired.current) {
        fired.current = true;
        onExpireRef.current?.();
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresMs]);

  return { remainingSeconds, isExpired: remainingSeconds <= 0 };
}
