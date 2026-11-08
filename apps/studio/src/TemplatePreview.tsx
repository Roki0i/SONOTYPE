import {Thumbnail} from '@remotion/player';
import {TemplateScene} from './remotion/TemplateScene';
import {demoAnalysis, demoNotes} from './remotion/defaults';
import type {SceneProps} from './remotion/types';
import type {TemplateId} from './templates.mjs';

// Real composition frames, with no media loading or playback in the picker.
// Keep data and IDs shared with the editor so the visual samples cannot drift.
const previewData: Record<TemplateId, SceneProps> = {
  signal: {
    title:'SONOTYPE DEMO', artist:'ORIGINAL SOUND', templateId:'signal',
    theme:'arctic', audioSrc:'', notes:demoNotes, ...demoAnalysis
  },
  'retro-grid': {
    title:'SONOTYPE DEMO', artist:'ORIGINAL SOUND', templateId:'retro-grid',
    theme:'arctic', audioSrc:'', notes:demoNotes, ...demoAnalysis
  },
  'lofi-player': {
    title:'SONOTYPE DEMO', artist:'ORIGINAL SOUND', templateId:'lofi-player',
    theme:'arctic', audioSrc:'', notes:demoNotes, ...demoAnalysis
  },
  'cover-focus': {
    title:'SONOTYPE DEMO', artist:'ORIGINAL SOUND', templateId:'cover-focus',
    theme:'arctic', audioSrc:'', notes:demoNotes, ...demoAnalysis
  },
  'dopa-rush': {
    title:'SONOTYPE DEMO', artist:'ORIGINAL SOUND', templateId:'dopa-rush',
    theme:'arctic', audioSrc:'', notes:demoNotes, ...demoAnalysis
  }
};

export function TemplatePreview({templateId}:{templateId:TemplateId}){
  return <span className="template-preview" aria-hidden="true">
    <Thumbnail
      component={TemplateScene}
      inputProps={previewData[templateId]}
      compositionWidth={1080}
      compositionHeight={1920}
      durationInFrames={450}
      fps={30}
      frameToDisplay={70}
      style={{width:'100%'}}
    />
  </span>;
}
