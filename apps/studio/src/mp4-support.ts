// Shared browser-only capability check for the Pages UI and MP4 export.
export const WEB_MP4_CONFIG={
  container:'mp4',videoCodec:'h264',audioCodec:'aac',
  width:1080,height:1920,outputTarget:'arraybuffer'
} as const;

type WebMp4SupportResult={canRender:boolean;issues:readonly {message:string}[]};

export function webMp4SupportIssue(result:WebMp4SupportResult):string|null{
  if(result.canRender)return null;
  const details=result.issues.map(issue=>issue.message.trim()).filter(Boolean).join(' / ');
  return 'このブラウザでは音声付きMP4を書き出せません'+
    (details?': '+details:'。別の対応ブラウザでお試しください。');
}

export async function checkWebMp4Support():Promise<string|null>{
  const {canRenderMediaOnWeb}=await import('@remotion/web-renderer');
  return webMp4SupportIssue(await canRenderMediaOnWeb(WEB_MP4_CONFIG));
}
