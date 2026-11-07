export type SocialId='shorts' | 'reels' | 'tiktok';
export interface SocialPreset {
  id:SocialId;
  name:string;
  filename:string;
  /** Approximate editing overlay; varies with app version and UI. */
  safe:{top:number;right:number;bottom:number;left:number};
}
export declare const SOCIAL_PRESETS:readonly SocialPreset[];
export declare const SOCIAL_IDS:readonly SocialId[];
export declare function isSocialId(value:unknown):value is SocialId;
