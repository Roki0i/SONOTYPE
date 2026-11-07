/**
 * Platform presets are publishing guides, not API-certified cropping boundaries.
 * All three output the same H.264/AAC 9:16 MP4 in the current MVP.
 */
export const SOCIAL_PRESETS = Object.freeze([
  {id:'shorts',name:'YouTube Shorts',filename:'shorts',safe:{top:0.13,right:0.18,bottom:0.23,left:0.09}},
  {id:'reels',name:'Instagram Reels',filename:'reels',safe:{top:0.14,right:0.19,bottom:0.24,left:0.09}},
  {id:'tiktok',name:'TikTok',filename:'tiktok',safe:{top:0.13,right:0.21,bottom:0.25,left:0.09}},
]);
export const SOCIAL_IDS=Object.freeze(SOCIAL_PRESETS.map(p=>p.id));
export function isSocialId(value) {return typeof value==='string' && SOCIAL_IDS.includes(value);}
