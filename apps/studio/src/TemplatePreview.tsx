import {Thumbnail} from '@remotion/player';
import {TemplateScene} from './remotion/TemplateScene';
import {demoAnalysis, demoNotes} from './remotion/defaults';
import type {SceneProps} from './remotion/types';
import type {TemplateId} from './templates.mjs';

// Use a real, non-playing composition frame for each template thumbnail.
function createPreviewProps(templateId:TemplateId):SceneProps {
  return {
    title:'SONOTYPE DEMO',
    artist:'ORIGINAL SOUND',
    templateId,
    theme:'arctic',
    audioSrc:'',
    notes:demoNotes,
    ...demoAnalysis
  };
}

// Stable inputProps avoid recreating the Remotion thumbnails on every render.
const previewData:Record<TemplateId,SceneProps>={
  signal:createPreviewProps('signal'),
  'retro-grid':createPreviewProps('retro-grid'),
  'lofi-player':createPreviewProps('lofi-player'),
  'cover-focus':createPreviewProps('cover-focus'),
  'dopa-rush':createPreviewProps('dopa-rush')
};

export function TemplatePreview({templateId}:{templateId:TemplateId}){
  return (
    <span className="template-preview" aria-hidden="true">
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
    </span>
  );
}
