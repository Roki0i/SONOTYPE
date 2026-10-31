import type {SceneProps, Note} from './types';
import measuredDemo from '../../public/demo-analysis.json';
const melody = [74,77,81,79,77,74,72,69,74,77,81,84,81,79,77,74,76,79,83,81,79,76,74,71,76,79,83,86,83,81,79,76];
export const demoNotes: Note[] = [
  ...melody.map((pitch, i) => ({pitch, time: i * .5, duration: .43})),
  ...Array.from({length: 8}, (_, i) => ({pitch: 48 + (i % 4) * 2, time: i * 2, duration: 1.8})),
];
// Generated from the original demo.wav by scripts/prepare-demo.mjs.
export const demoAnalysis = measuredDemo;
export const demoProps: SceneProps = {
  title: 'ORIGINAL DEMO', theme: 'arctic', audioSrc: '',
  notes: demoNotes, ...demoAnalysis
};
