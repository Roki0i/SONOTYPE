export type Theme = 'arctic' | 'mint' | 'violet';
export type Note = {pitch: number; time: number; duration: number};
export type SceneProps = {title: string; theme: Theme; audioSrc: string; notes: Note[]; levels: number[]};
