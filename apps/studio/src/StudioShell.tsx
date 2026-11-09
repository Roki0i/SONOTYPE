import {lazy, Suspense, useEffect, useState} from 'react';
import {LandingPage} from './LandingPage';
import type {TemplateId} from './templates.mjs';

// Do not download the video editor or Remotion player on the initial home view.
const StudioEditor=lazy(async()=>{
  const {App}=await import('./App');
  return {default:App};
});

export function StudioShell(){
  const [route,setRoute]=useState<'home'|'editor'>(window.location.hash==='#editor'?'editor':'home');
  const [initialTemplateId,setInitialTemplateId]=useState<TemplateId|undefined>();

  useEffect(()=>{
    const sync=()=>setRoute(window.location.hash==='#editor'?'editor':'home');
    window.addEventListener('hashchange',sync);
    return ()=>window.removeEventListener('hashchange',sync);
  },[]);

  const openEditor=(templateId?:TemplateId)=>{
    setInitialTemplateId(templateId);
    window.location.hash='editor';
    setRoute('editor');
  };

  if(route==='home')return <LandingPage onStart={()=>openEditor()} onPick={openEditor}/>;
  return <Suspense fallback={<main role="status" className="studio-loading">編集画面を読み込んでいます…</main>}>
    <StudioEditor initialTemplateId={initialTemplateId}/>
  </Suspense>;
}
