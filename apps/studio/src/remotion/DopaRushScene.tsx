import {AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Audio} from '@remotion/media';
import type {SceneProps, Theme} from './types';

/**
 * High-energy short-video template.
 * Uses measured FFT/RMS data and bounded motion, not rapid full-screen flashes.
 * Audio and visuals use the same Remotion frame clock for preview and MP4.
 */
const PALETTE: Record<Theme,{primary:string;second:string;soft:string}> = {
  arctic: {primary:'#16E8EF',second:'#FF49B4',soft:'#C6FDFF'},
  mint: {primary:'#B2FF36',second:'#FF52CD',soft:'#EDFFC5'},
  violet: {primary:'#CF75FF',second:'#52DFFF',soft:'#F6DBFF'}
};
const cap=(v:number)=>Math.max(0,Math.min(1,v));
const words=['FEEL THE BEAT','FULL VOLUME','ON REPEAT','TURN IT UP'];

export const DopaRushScene:React.FC<SceneProps>=({
  title,artist='',theme,audioSrc,coverSrc='',levels,spectrum,bands
})=>{
  const frame=useCurrentFrame();
  const {fps,durationInFrames}=useVideoConfig();
  const seconds=frame/fps;
  const p=PALETTE[theme];
  const level=cap(levels[frame]??0);
  const low=cap(bands[frame]?.[0]??0);
  const energy=cap(level*.6+low*.4);
  const scale=1+energy*.075;
  const bins=spectrum[frame]??Array(26).fill(0);
  const ticker=words[Math.floor(seconds/.8)%words.length];
  const progress=(frame+1)/durationInFrames;
  const audio=audioSrc.startsWith('static:')?staticFile(audioSrc.slice(7)):audioSrc;
  const artwork=coverSrc.startsWith('static:')?staticFile(coverSrc.slice(7)):coverSrc;

  return <AbsoluteFill style={{
    background:'#070A17',color:'#fff',overflow:'hidden',
    fontFamily:'Inter,"Arial Black","Noto Sans JP",system-ui,sans-serif'
  }}>
    {audio?<Audio src={audio}/>:null}
    <AbsoluteFill style={{opacity:.8,backgroundImage:
      'radial-gradient(ellipse at 50% 35%,'+p.primary+'55,transparent 50%),'+
      'linear-gradient(145deg,#131232,#080913 80%)'}}/>
    <div style={{position:'absolute',inset:-500,
      transform:'rotate(-17deg) translateX('+(frame%150)*1.2+'px)',
      backgroundImage:'repeating-linear-gradient(90deg,transparent 0,transparent 134px,'+
        p.primary+'16 135px,'+p.primary+'16 137px)',opacity:.8}}/>

    <div style={{position:'absolute',top:218,left:120,right:175,display:'flex',
      alignItems:'center',justifyContent:'space-between',fontSize:24,fontWeight:900,letterSpacing:3}}>
      <span style={{background:p.primary,color:'#080C1D',padding:'13px 20px',borderRadius:7}}>
        BEAT REACTOR
      </span>
      <span style={{opacity:.8}}>OTO / SHORTS</span>
    </div>

    <div style={{position:'absolute',top:345,left:130,right:185,
      textAlign:'center',transform:'scale('+scale+')',transformOrigin:'center center'}}>
      <div style={{display:'grid',placeItems:'center',height:660,
        border:'8px solid '+p.primary,boxShadow:'15px 15px 0 '+p.second,
        overflow:'hidden',background:'#10152d'}}>
        {artwork?
          <Img src={artwork} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:
          <div style={{width:'100%',height:'100%',display:'grid',placeItems:'center',
            background:'conic-gradient(from '+(frame*1.1)+'deg,'+p.primary+','+p.second+','#10142b,'+p.primary+')'}}>
            <div style={{width:370,height:370,borderRadius:'50%',border:'45px solid #10142b',
              display:'grid',placeItems:'center',boxShadow:'0 0 0 25px #ffffff55'}}>
              <div style={{width:92,height:92,borderRadius:'50%',background:'#10142b'}}/>
            </div>
          </div>}
      </div>
    </div>

    <div style={{position:'absolute',top:1082,left:115,right:175}}>
      <div style={{display:'inline-block',fontSize:32,fontWeight:900,letterSpacing:3,
        background:p.second,color:'#0C101F',padding:'9px 18px',transform:'rotate(-2deg)'}}>
        {ticker}
      </div>
      <div style={{fontSize:87,fontWeight:1000,lineHeight:1.04,letterSpacing:-2,
        overflowWrap:'anywhere',textShadow:'5px 6px 0 #000',marginTop:25}}>
        {title.slice(0,42)}
      </div>
      <div style={{fontSize:34,fontWeight:800,color:p.soft,marginTop:19,
        overflowWrap:'anywhere'}}>{artist.slice(0,48)||'YOUR ARTIST'}</div>
    </div>

    <div style={{position:'absolute',top:1460,left:118,right:175,
      display:'flex',alignItems:'end',height:130,gap:6}}>
      {bins.map((v,i)=><div key={i} style={{flex:1,minWidth:3,
        height:Math.max(4,cap(v)*129),background:i%4===0?p.second:p.primary,
        borderRadius:3}}/>)}
    </div>
    <div style={{position:'absolute',top:1612,left:118,right:175,
      height:10,background:'#ffffff48',borderRadius:5}}>
      <div style={{height:'100%',width:(progress*100)+'%',background:p.primary,borderRadius:5}}/>
    </div>
    <div style={{position:'absolute',top:1640,left:118,right:175,
      display:'flex',justifyContent:'space-between',fontSize:25,fontWeight:850,letterSpacing:2}}>
      <span>{seconds.toFixed(1)} SEC</span><span>AMPLITUDE {Math.round(level*100)}%</span>
    </div>
  </AbsoluteFill>;
};
