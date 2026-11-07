import React from 'react';
import {AbsoluteFill, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Audio} from '@remotion/media';
import type {SceneProps, Theme} from './types';

const colors: Record<Theme, {accent: string; light: string; background: string; navy: string}> = {
  arctic: {accent: '#3084db', light: '#b9e7ff', background: '#f1f7fc', navy: '#122d46'},
  mint: {accent: '#00a993', light: '#b3f4e0', background: '#eefbf6', navy: '#103e39'},
  violet: {accent: '#8b65e1', light: '#e0cfff', background: '#f6f1fb', navy: '#302546'},
};
const clamp = (x: number) => Math.min(1, Math.max(0, x));
const panel: React.CSSProperties = {padding: 28, background: '#fff', border: '2px solid #d2e0ec'};
const titleStyle: React.CSSProperties = {fontSize: 19, letterSpacing: 1.5, fontWeight: 700, color: '#69859e'};

export const SignalScene: React.FC<SceneProps> = ({title, theme, audioSrc, startFrame=0, notes, levels, spectrum, bands}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const t = frame / fps;
  const c = colors[theme];
  const resolvedAudioSrc = audioSrc.startsWith('static:') ? staticFile(audioSrc.slice(7)) : audioSrc;
  const level = clamp(levels[frame] ?? 0);
  const bins = spectrum[frame] ?? Array(26).fill(0);
  const [low, mid, high] = bands[frame] ?? [0, 0, 0];
  return (
    <AbsoluteFill style={{background: c.background, fontFamily: 'Consolas, monospace', color: c.navy}}>
      {resolvedAudioSrc ? <Audio src={resolvedAudioSrc} trimBefore={startFrame}/> : null}
      <div style={{height: 533, background: c.navy, color: '#e9f7ff', padding: 50}}>
        <div style={{fontSize: 28, fontWeight: 900, letterSpacing: 3}}>OTO / SIGNAL STUDIO</div>
        <div style={{color: c.light, fontSize: 18, marginTop: 17}}>MUSIC / DATA / FRAME ENGINE</div>
        <div style={{display: 'flex', justifyContent: 'space-between', marginTop: 42, marginBottom: 16, fontSize: 19}}>
          <span>PIANO ROLL</span><span>{notes.length} NOTES</span>
        </div>
        <svg width="978" height="270" viewBox="0 0 978 270" style={{background: '#0d2236'}}>
          {Array.from({length: 15}, (_, i)=><line key={'v'+i} x1={i*70} x2={i*70} y1="0" y2="270" stroke="#344e65"/>)}
          {Array.from({length: 12}, (_, i)=><line key={'h'+i} x1="0" x2="978" y1={i*24} y2={i*24} stroke="#344e65"/>)}
          {notes.filter(n=>n.pitch>=48&&n.pitch<=88&&n.time+n.duration>=t-2&&n.time<t+3).map((n,i)=>(
            <rect key={i} x={(n.time-t+2)*195} y={260-(n.pitch-48)*6.4}
              width={Math.max(4,n.duration*195)} height={6} rx="2"
              fill={n.time<=t&&n.time+n.duration>=t?c.light:c.accent}/>
          ))}
          <line x1="390" y1="0" x2="390" y2="270" stroke="#f0faff" strokeWidth="3"/>
        </svg>
        <div style={{display:'flex',justifyContent:'space-between',marginTop:12,fontSize:17,color:c.light}}>
          <span>FRAME {String(frame).padStart(4,'0')}</span>
          <span>{t.toFixed(2)}s / {(durationInFrames/fps).toFixed(1)}s</span>
        </div>
      </div>
      <div style={{padding:'54px 50px'}}>
        <div style={{fontSize:22,color:c.accent,fontWeight:800}}>SIGNAL / ANALYTICS</div>
        <div style={{fontSize:58,fontWeight:900,marginTop:22,marginBottom:36}}>MUSIC IS DATA.</div>
        <div style={{...panel,height:352}}>
          <div style={titleStyle}>AMPLITUDE / FRAME LEVEL</div>
          <div style={{height:216,marginTop:27,display:'flex',gap:3,alignItems:'center'}}>
            {Array.from({length:87},(_,i)=>{
              const f=Math.max(0,frame-86+i);
              const amp=clamp(levels[f] ?? 0);
              return <div key={i} style={{width:8,height:4+amp*205,background:c.accent}}/>;
            })}
          </div>
        </div>
        <div style={{display:'flex',gap:18,marginTop:22}}>
          <div style={{...panel,width:626,height:364}}>
            <div style={titleStyle}>SPECTRUM / 1024-POINT FFT</div>
            <div style={{display:'flex',height:255,alignItems:'end',gap:9}}>
              {bins.map((value,i)=>(
                <div key={i} style={{width:15,height:3+clamp(value)*232,
                  background:i%4===0?c.light:c.accent}}/>
              ))}
            </div>
          </div>
          <div style={{...panel,flex:1,height:364}}>
            <div style={titleStyle}>ENERGY</div>
            <div style={{width:218,height:218,borderRadius:'50%',display:'grid',placeItems:'center',marginTop:27,
              background:'conic-gradient('+c.accent+' '+(level*100)+'%, #dce9f3 0)'}}>
              <div style={{width:167,height:167,borderRadius:'50%',background:'#fff',display:'grid',placeItems:'center',
                fontSize:52,fontWeight:900}}>{Math.round(level*100)}</div>
            </div>
          </div>
        </div>
        <div style={{display:'flex',gap:18,marginTop:22}}>
          {([['LOW / BASS',low],['MID / BODY',mid],['HIGH / AIR',high]] as const).map(([name,value])=>(
            <div key={name} style={{...panel,width:315,height:224}}>
              <div style={titleStyle}>{name}</div>
              <div style={{fontSize:53,fontWeight:900,marginTop:16}}>{Math.round(value*100)}%</div>
              <div style={{background:'#dce9f3',height:14,marginTop:20}}>
                <div style={{width:(value*100)+'%',height:'100%',background:c.accent}}/>
              </div>
            </div>
          ))}
        </div>
        <div style={{...panel,height:196,marginTop:22}}>
          <div style={titleStyle}>NOTE ACTIVITY / RECENT SIGNAL</div>
          <div style={{display:'flex',alignItems:'end',height:104,gap:9,paddingTop:22}}>
            {Array.from({length:54},(_,i)=>{
              const amp=clamp(levels[Math.max(0,frame-54+i)] ?? 0);
              return <div key={i} style={{width:9,height:3+amp*75,background:c.accent}}/>;
            })}
          </div>
        </div>
      </div>
      <div style={{position:'absolute',bottom:0,left:0,right:0,height:52,padding:'16px 50px',
        display:'flex',justifyContent:'space-between',background:c.navy,color:c.light,fontSize:17,fontWeight:800}}>
        <span>OTO / STUDIO v0.2</span><span>{title.slice(0,28).toUpperCase()}</span>
      </div>
    </AbsoluteFill>
  );
};
