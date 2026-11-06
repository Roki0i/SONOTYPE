import {Composition, staticFile} from 'remotion';
import {TemplateScene} from './TemplateScene';
import {demoProps} from './defaults';

export const RemotionRoot = () => (
  <Composition id="OTO-Demo" component={TemplateScene} width={1080} height={1920}
    fps={30} durationInFrames={450} defaultProps={{...demoProps, audioSrc: staticFile('demo.wav'), templateId:'signal' as const, artist:'', coverSrc:''}}/>
);
