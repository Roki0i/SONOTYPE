/** Pure frame-clock timing shared by player and rendered composition. */
export function dopaRushTiming(beatStrength, frame, fps) {
  if (!beatStrength?.some(value => value > 0)) {
    return {pulse: 0, tickerIndex: Math.floor(frame / fps / .8)};
  }
  let tickerIndex = 0;
  let pulse = 0;
  for (let i = 0; i <= frame; i++) {
    const strength = Math.max(0, Math.min(1, beatStrength[i] ?? 0));
    if (strength > 0) tickerIndex++;
    if (frame - i < 4) pulse = Math.max(pulse, strength * (1 - (frame - i) / 4));
  }
  return {pulse, tickerIndex};
}
