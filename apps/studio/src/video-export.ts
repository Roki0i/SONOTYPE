import {TemplateScene} from './remotion/TemplateScene';
import type {SceneProps} from './remotion/types';
import {checkWebMp4Support} from './mp4-support';

export const VIDEO_FPS=30;

type ExportOptions={
  isPages:boolean;
  props:SceneProps;
  seconds:number;
  audioFile:File|null;
  coverFile:File|null;
  demoAudioUrl:string;
  onProgress:(progress:number)=>void;
};

/** Render a video with the same composition in the browser or via the local API. */
export async function renderMp4({
  isPages,props,seconds,audioFile,coverFile,demoAudioUrl,onProgress
}:ExportOptions):Promise<Blob>{
  if(isPages){
    // Check again at export time in case browser support changed since editor load.
    const issue=await checkWebMp4Support();
    if(issue)throw Error(issue);
    const {renderMediaOnWeb}=await import('@remotion/web-renderer');
    const {getBlob}=await renderMediaOnWeb({
      composition:{id:'OTO-Web-Export',component:TemplateScene,
        width:1080,height:1920,fps:VIDEO_FPS,
        durationInFrames:seconds*VIDEO_FPS,defaultProps:props},
      inputProps:props,
      container:'mp4',videoCodec:'h264',audioCodec:'aac',
      outputTarget:'arraybuffer',
      onProgress:({progress})=>onProgress(progress)
    });
    return getBlob();
  }

  // Local mode uses its existing loopback Remotion export server.
  const file=audioFile??new File([await(await fetch(demoAudioUrl)).blob()],
    'demo.wav',{type:'audio/wav'});
  const form=new FormData();
  form.append('audio',file);
  if(coverFile)form.append('cover',coverFile);
  form.append('props',JSON.stringify({
    title:props.title,artist:props.artist,templateId:props.templateId,
    theme:props.theme,seconds,startFrame:props.startFrame,
    notes:props.notes,levels:props.levels,spectrum:props.spectrum,bands:props.bands,
    beatStrength:props.beatStrength
  }));
  const response=await fetch('/api/export',{method:'POST',body:form});
  if(!response.ok){
    const error=await response.json().catch(()=>({error:'書き出しに失敗しました'}));
    throw Error(typeof error.error==='string'?error.error:'書き出しに失敗しました');
  }
  return response.blob();
}
