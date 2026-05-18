type RumbleEffect = {
  duration: number;
  weakMagnitude: number;
  strongMagnitude: number;
};

type RumbleActuator = {
  playEffect?: (type: 'dual-rumble', effect: RumbleEffect) => Promise<unknown>;
};

type RumblePad = Gamepad & {
  vibrationActuator?: RumbleActuator;
  hapticActuators?: RumbleActuator[];
};

let lastRumbleAt = 0;

/**
 * Global intensity multiplier applied to every rumble call. Lets us tune the
 * overall haptic strength without touching individual call sites. Magnitudes
 * are still clamped to [0,1] after multiplication, so values > 1 just push
 * weak rumbles closer to max instead of overshooting.
 */
const RUMBLE_INTENSITY = 4.0;

export function rumbleGamepad(durationMs: number, weak = 0.35, strong = 0.75): void {
  if (typeof navigator === 'undefined' || !navigator.getGamepads) return;

  const now = performance.now();
  if (now - lastRumbleAt < 25) return;
  lastRumbleAt = now;

  const effect: RumbleEffect = {
    duration: Math.max(1, durationMs),
    weakMagnitude: Math.max(0, Math.min(1, weak * RUMBLE_INTENSITY)),
    strongMagnitude: Math.max(0, Math.min(1, strong * RUMBLE_INTENSITY)),
  };

  for (const pad of navigator.getGamepads() as Array<RumblePad | null>) {
    const actuator = pad?.vibrationActuator ?? pad?.hapticActuators?.[0];
    void actuator?.playEffect?.('dual-rumble', effect).catch(() => {});
  }
}
