import type {TemplateId} from '../templates.mjs';
export type Theme = 'arctic' | 'mint' | 'violet';
export type Note = {pitch: number; time: number; duration: number};
export type SceneProps = {
  title:string;
  theme:Theme;
  audioSrc:string;
  startFrame?:number;
  notes:Note[];
  levels:number[];
  spectrum:number[][];
  bands:number[][];
  templateId?:TemplateId;
  artist?:string;
  coverSrc?:string;
};
