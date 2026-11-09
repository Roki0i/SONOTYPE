import {lazy, Suspense, useEffect, useRef, useState} from 'react';
import type {TemplateId} from './templates.mjs';

// Render the real Remotion thumbnail only as it approaches the viewport.
const Preview=lazy(async()=>{
  const {TemplatePreview}=await import('./TemplatePreview');
  return {default:TemplatePreview};
});

export function DeferredTemplatePreview({templateId}:{templateId:TemplateId}){
  const element=useRef<HTMLSpanElement>(null);
  const [shouldLoad,setShouldLoad]=useState(false);
  useEffect(()=>{
    const node=element.current;
    if(!node)return;
    if(!('IntersectionObserver' in window)){
      setShouldLoad(true);
      return;
    }
    const observer=new IntersectionObserver(entries=>{
      if(entries.some(entry=>entry.isIntersecting)){
        setShouldLoad(true);
        observer.disconnect();
      }
    },{rootMargin:'180px'});
    observer.observe(node);
    return ()=>observer.disconnect();
  },[]);
  return <span ref={element} className="deferred-template-preview" aria-hidden="true">
    <Suspense fallback={<span className="template-preview"/>}>
      {shouldLoad?<Preview templateId={templateId}/>:<span className="template-preview"/>}
    </Suspense>
  </span>;
}
