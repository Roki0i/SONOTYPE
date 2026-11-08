import React from 'react';
import {AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Audio} from '@remotion/media';
import type {SceneProps, Theme} from './types';
import {SignalScene} from './SignalScene';
import {DopaRushScene} from './DopaRushScene';

const PALETTES: Record<Theme, {accent:string; pale:string; ink:string; paper:string}> = {
  arctic: {accent:'#6ac6e9',pale:'#d1eefd',ink:'#101e30',paper:'#f0f7fc'},
  mint: {accent:'#69d3ad',pale:'#d1f6e9',ink:'#132a27',paper:'#f0faf4'},
  violet: {accent:'#c6a4fb',pale:'#ede2ff',ink:'#231b36',paper:'#faf5ff'},
};
const clamp=(x:number)=>Math.min(1,Math.max(0,x));
const font:React.CSSProperties={fontFamily:'Inter, "Helvetica Neue", "Noto Sans JP", sans-serif'};
const mono:React.CSSProperties={fontFamily:'"SFMono-Regular", Consolas, monospace'};
const rounded=(num:number)=>String(num).padStart(2,'0');

function Cover({src, size, accent, dark=false}: {src:string; size:number; accent:string; dark?:boolean}){
  return <div style={{width:size,height:size,overflow:'hidden',position:'relative',flexShrink:0,
    background:dark?'#15181b':'#ced5dd',border:'1px solid #ffffff40',boxShadow:'0 12px 46px #00000035'}}>
    {src?<Img src={src} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:
      <div style={{position:'absolute',inset:0,display:'grid',placeItems:'center',
        background:'radial-gradient(circle at 40% 36%, #ffffff40, transparent 36%), linear-gradient(135deg, '+accent+' 0%, #101820 100%)'}}>
        <div style={{width:'70%',height:'70%',border:'35px solid #ffffff40',borderRadius:'50%',
          display:'grid',placeItems:'center',boxShadow:'0 0 0 3px #ffffff35'}}>
          <div style={{width:'30%',height:'30%',borderRadius:'50%',background:'#15191d',border:'8px solid #ffffff80'}}/>
        </div>
      </div>}
  </div>;
}

function BarMeter({bins,color,height=155,gap=6}: {bins:number[];color:string;height?:number;gap?:number}){
  return <div style={{display:'flex',alignItems:'end',gap,height,width:'100%'}}>
    {bins.map((value,i)=><div key={i} style={{flex:1,minWidth:2,height:Math.max(3,clamp(value)*height),
      background:color,opacity:i%3===0?.83:1}}/>)}
  </div>;
}

function WaveBars({levels,frame,color,height=190,count=56}: {levels:number[];frame:number;color:string;height?:number;count?:number}){
  return <div style={{display:'flex',alignItems:'center',height,width:'100%',gap:4}}>
    {Array.from({length:count},(_,i)=>{
      const position=frame-count+1+i;
      const value=clamp(levels[position]??0);
      return <div key={i} style={{flex:1,minWidth:2,height:3+value*(height-7),
        borderRadius:4,background:color,opacity:position>frame?.3:1}}/>;
    })}
  </div>;
}

function RetroPanel({caption,light=false,children}: {caption:string;light?:boolean;children:React.ReactNode}){
  return <div style={{background:light?'#eeeeec':'#242528',color:light?'#202124':'#f4f3ef',
    overflow:'hidden',padding:25,minWidth:0,minHeight:0,boxShadow:'0 4px 1px #00000025'}}>
    <div style={{textAlign:'center',fontSize:24,fontWeight:800,...mono,opacity:.8}}>{caption}</div>
    {children}
  </div>;
}

const SpectralCards:React.FC<{bass:number[];level:number;bins:number[];frame:number;accent:string;artist:string;title:string;cover:string;t:number;levels:number[]}> =
({bass,level,bins,frame,accent,artist,title,cover,t,levels})=>
  <div style={{padding:'150px 32px 82px',height:'100%',background:'#c7c7c3',color:'#171718',...font}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:24,fontWeight:800,letterSpacing:4,marginBottom:26}}>
      <span>SONOTYPE / VISUAL STUDIO</span><span>RETRO GRID 01</span>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gridTemplateRows:'repeat(3, 510px)',gap:14}}>
      <RetroPanel caption="◉  time" light>
        <div style={{height:405,display:'grid',placeItems:'center',fontSize:103,fontWeight:850,letterSpacing:-6,...mono}}>
          {rounded(Math.floor(t/60))}:{rounded(Math.floor(t%60))}
        </div>
      </RetroPanel>
      <RetroPanel caption="◉  wave">
        <div style={{marginTop:84}}><WaveBars levels={levels} frame={frame} color="#f4f4f0" height={240} count={34}/></div>
      </RetroPanel>
      <RetroPanel caption="◉  spectrum">
        <div style={{marginTop:62}}><BarMeter bins={bins} color="#f0eee9" height={275} gap={4}/></div>
      </RetroPanel>
      <RetroPanel caption="◉  profile">
        <div style={{fontSize:52,fontWeight:800,lineHeight:1.18,marginTop:72,overflowWrap:'anywhere'}}>
          {title.slice(0,36)}
        </div>
        <div style={{fontSize:29,marginTop:25,opacity:.7}}>{artist.slice(0,48)}</div>
      </RetroPanel>
      <RetroPanel caption="◉  player" light>
        <div style={{display:'grid',placeItems:'center',paddingTop:12}}>
          <Cover src={cover} size={240} accent={accent}/>
          <div style={{fontWeight:800,fontSize:24,marginTop:16,textAlign:'center'}}>{title.slice(0,36)}</div>
          <div style={{...mono,fontSize:25,letterSpacing:16,marginTop:20}}>◀ ▮▮ ■ ▶</div>
        </div>
      </RetroPanel>
      <RetroPanel caption="◉  levels">
        <div style={{fontSize:25,marginTop:72,...mono}}>
          {(['BASS','MID','HIGH'] as const).map((name,i)=><div key={name} style={{marginBottom:32}}>
            <div style={{display:'flex',justifyContent:'space-between'}}><span>{name}</span><span>{Math.round((bass[i]??0)*100)}%</span></div>
            <div style={{height:15,background:'#58595a',marginTop:12}}>
              <div style={{height:'100%',background:'#f2f1eb',width:(bass[i]??0)*100+'%'}}/>
            </div>
          </div>)}
        </div>
      </RetroPanel>
    </div>
    <div style={{display:'flex',justifyContent:'space-between',marginTop:32,fontSize:24,...mono}}>
      <span>SIGNAL // LIVE DATA</span><span>FRAME {String(frame).padStart(4,'0')} / {Math.round(level*100)}%</span>
    </div>
  </div>;

export const TemplateScene:React.FC<SceneProps>=(props)=>{
  // Preserve the original visualizer and frame-level MIDI regression unchanged.
  if(!props.templateId || props.templateId==='signal')return <SignalScene {...props}/>;
  if(props.templateId==='dopa-rush')return <DopaRushScene {...props}/>;
  return <ShowcaseScene {...props}/>;
};

const ShowcaseScene:React.FC<SceneProps> = ({templateId, title,artist='',theme,audioSrc,startFrame=0,coverSrc='',notes,levels,spectrum,bands})=>{
  const frame=useCurrentFrame();
  const {fps,durationInFrames}=useVideoConfig();
  const t=frame/fps, p=PALETTES[theme], level=clamp(levels[frame]??0);
  const bins=spectrum[frame]??Array(26).fill(0), bass=bands[frame]??[0,0,0];
  const resolvedAudio=audioSrc.startsWith('static:')?staticFile(audioSrc.slice(7)):audioSrc;
  const resolvedCover=coverSrc.startsWith('static:')?staticFile(coverSrc.slice(7)):coverSrc;
  const progress=clamp(frame/durationInFrames);

  return <AbsoluteFill style={{...font,overflow:'hidden'}}>
    {resolvedAudio?<Audio src={resolvedAudio} trimBefore={startFrame}/>:null}
    {templateId==='retro-grid'?
      <SpectralCards bass={bass} level={level} bins={bins} frame={frame} accent={p.accent}
        artist={artist} title={title} cover={resolvedCover} t={t} levels={levels}/>:
    templateId==='lofi-player'?
      <div style={{height:'100%',padding:'110px 75px',background:'#15191e',color:'#e8e5df',
        backgroundImage:'radial-gradient(circle at 76% 16%, '+p.accent+'25,transparent 50%), linear-gradient(135deg,#191d22,#080b0f)'}}>
        <div style={{fontSize:23,letterSpacing:8,color:p.accent,...mono}}>AFTER HOURS / 02</div>
        <div style={{width:924,marginTop:110,padding:28,background:'#292d31',
          border:'1px solid #88888838',boxShadow:'0 30px 65px #00000060'}}>
          <Cover src={resolvedCover} size={864} accent={p.accent} dark/>
        </div>
        <div style={{fontSize:30,letterSpacing:5,color:p.accent,marginTop:88,...mono}}>NOW PLAYING / SONOTYPE</div>
        <div style={{fontSize:76,fontWeight:800,lineHeight:1.13,marginTop:24,
          overflowWrap:'anywhere'}}>{title.slice(0,42)}</div>
        <div style={{fontSize:31,color:'#b5b3b1',marginTop:24}}>{artist.slice(0,54)||'Unknown artist'}</div>
        <div style={{marginTop:72}}><WaveBars frame={frame} levels={levels} color={p.accent} height={168} count={76}/></div>
        <div style={{height:5,background:'#4a5056',marginTop:55}}>
          <div style={{height:'100%',width:(progress*100)+'%',background:p.accent}}/>
        </div>
        <div style={{display:'flex',justifyContent:'space-between',fontSize:24,...mono,marginTop:17}}>
          <span>{rounded(Math.floor(t/60))}:{rounded(Math.floor(t%60))}</span>
          <span>{rounded(Math.floor(durationInFrames/fps/60))}:{rounded(Math.floor(durationInFrames/fps%60))}</span>
        </div>
        <div style={{textAlign:'center',fontSize:48,marginTop:50,letterSpacing:32}}>◀  ▮▮  ▶</div>
        <div style={{position:'absolute',bottom:58,left:75,right:75,display:'flex',justifyContent:'space-between',
          fontSize:22,letterSpacing:3,color:'#8e969b',...mono}}>
          <span>STAY WITH THE SOUND</span><span>SONOTYPE / STUDIO</span>
        </div>
      </div>:
      <div style={{height:'100%',background:p.paper,color:p.ink,padding:'100px 76px',
        backgroundImage:'radial-gradient(ellipse at 50% 30%, '+p.accent+'55, transparent 60%)'}}>
        <div style={{display:'flex',justifyContent:'space-between',fontSize:25,letterSpacing:3,...mono}}>
          <span>SONOTYPE / ARTWORK</span><span>03 — COVER FOCUS</span>
        </div>
        <div style={{marginTop:205,boxShadow:'0 50px 90px #15203340',width:928,background:'#fff',padding:35}}>
          <Cover src={resolvedCover} size={858} accent={p.accent}/>
        </div>
        <div style={{marginTop:100,fontSize:91,fontWeight:850,lineHeight:1.04,overflowWrap:'anywhere'}}>
          {title.slice(0,48)}
        </div>
        <div style={{marginTop:30,fontSize:35,opacity:.62}}>{artist.slice(0,64)||'Your music, visualized.'}</div>
        <div style={{marginTop:105}}><BarMeter bins={bins} color={p.ink} height={175} gap={8}/></div>
        <div style={{position:'absolute',bottom:66,left:76,right:76,display:'flex',
          alignItems:'center',justifyContent:'space-between',fontSize:24,...mono}}>
          <span>NOW PLAYING</span>
          <span>{rounded(Math.floor(t/60))}:{rounded(Math.floor(t%60))} / {Math.round(level*100)}%</span>
        </div>
      </div>}
  </AbsoluteFill>;
};
