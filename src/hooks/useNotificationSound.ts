import { useCallback, useRef } from 'react';

export function useNotificationSound() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastPlayedRef = useRef<number>(0);

  const playNotificationSound = useCallback(() => {
    // Throttle: don't play more than once per second
    const now = Date.now();
    if (now - lastPlayedRef.current < 1000) return;
    lastPlayedRef.current = now;

    try {
      // Create or reuse AudioContext
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const ctx = audioContextRef.current;
      
      // Resume if suspended (browser policy)
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;

      // Create a pleasant notification sound (two-tone chime)
      const oscillator1 = ctx.createOscillator();
      const oscillator2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator1.connect(gainNode);
      oscillator2.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Pleasant frequencies (C5 and E5 - major third)
      oscillator1.frequency.setValueAtTime(523.25, now); // C5
      oscillator2.frequency.setValueAtTime(659.25, now); // E5

      oscillator1.type = 'sine';
      oscillator2.type = 'sine';

      // Volume envelope - soft and pleasant
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.15, now + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

      oscillator1.start(now);
      oscillator2.start(now);
      oscillator1.stop(now + 0.4);
      oscillator2.stop(now + 0.4);
    } catch (error) {
      console.warn('Could not play notification sound:', error);
    }
  }, []);

  return { playNotificationSound };
}
