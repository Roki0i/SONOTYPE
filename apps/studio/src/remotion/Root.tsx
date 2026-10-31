import {Composition, staticFile} from 'remotion';
import {SignalScene} from './SignalScene';
import {demoProps} from './defaults';

export const RemotionRoot = () => (
  <Composition id="OTO-Demo" component={SignalScene} width={1080} height={1920}
    fps={30} durationInFrames={450} defaultProps={{...demoProps, audioSrc: staticFile('demo.wav')}}/>
);
