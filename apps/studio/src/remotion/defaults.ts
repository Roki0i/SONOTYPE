import type {SceneProps, Note} from './types';
const melody = [74,77,81,79,77,74,72,69,74,77,81,84,81,79,77,74,76,79,83,81,79,76,74,71,76,79,83,86,83,81,79,76];
export const demoNotes: Note[] = [
  ...melody.map((pitch, i) => ({pitch, time: i * .5, duration: .43})),
  ...Array.from({length: 8}, (_, i) => ({pitch: 48 + (i % 4) * 2, time: i * 2, duration: 1.8})),
];
// A synthetic demo visualization: not measured waveform data.
export const makeDemoLevels = (frames = 450): number[] => Array.from({length: frames}, (_, i) => {
  const t = i / 30;
  const transient = Math.max(0, 1 - ((t % .5) / .5) * 2);
  return Math.min(1, .15 + transient * .7 + .08 * Math.sin(i * .25) ** 2);
});
export const demoProps: SceneProps = {title: 'ORIGINAL DEMO', theme: 'arctic', audioSrc: '', notes: demoNotes, levels: makeDemoLevels()};
