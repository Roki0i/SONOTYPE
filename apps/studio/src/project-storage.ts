/**
 * One local, user-initiated project snapshot. The actual media Files are stored
 * in IndexedDB on this device, not transmitted to OTO servers or localStorage.
 */
import {isTemplateId, type TemplateId} from './templates.mjs';
import {isSocialId, type SocialId} from './social-presets.mjs';
import type {Note,Theme} from './remotion/types';

const DB_NAME='oto-signal-studio';
const STORE='projects';
const KEY='latest';
export type ProjectSettings={
  title:string;
  artist:string;
  templateId:TemplateId;
  theme:Theme;
  seconds:8|15|30;
  platform:SocialId;
  startFrame:number;
};
export type StoredProject={
  version:1;
  updatedAt:number;
  settings:ProjectSettings;
  notes:Note[];
  audio:File|null;
  cover:File|null;
};
const themes=new Set(['arctic','mint','violet']);
const times=new Set([8,15,30]);
const fileOkay=(v:unknown,kind:'audio'|'cover')=>{
  if(v===null)return true;
  if(!(v instanceof File))return false;
  return kind==='audio'?
    v.size>0&&v.size<=25*1024*1024&&/\.(wav|mp3|m4a|aac|ogg)$/i.test(v.name):
    v.size>0&&v.size<=5*1024*1024&&/\.(png|jpe?g|webp)$/i.test(v.name)&&
    ['image/png','image/jpeg','image/webp'].includes(v.type);
};

export function isStoredProject(raw:unknown):raw is StoredProject{
  if(!raw||typeof raw!=='object')return false;
  const p=raw as Partial<StoredProject>;
  if(p.version!==1||typeof p.updatedAt!=='number'||!Number.isFinite(p.updatedAt))return false;
  if(!p.settings||typeof p.settings!=='object')return false;
  const s=p.settings;
  if(typeof s.title!=='string'||s.title.length>64||/[\x00-\x1f]/.test(s.title)||
    typeof s.artist!=='string'||s.artist.length>64||/[\x00-\x1f]/.test(s.artist)||
    !isTemplateId(s.templateId)||!themes.has(s.theme as string)||
    !times.has(s.seconds as number)||!isSocialId(s.platform)||
    !Number.isInteger(s.startFrame)||s.startFrame<0||s.startFrame>3600*30)return false;
  if(!Array.isArray(p.notes)||p.notes.length>20000||
    !p.notes.every(n=>n&&Number.isInteger(n.pitch)&&n.pitch>=0&&n.pitch<=127&&
      Number.isFinite(n.time)&&n.time>=0&&n.time<=3600&&
      Number.isFinite(n.duration)&&n.duration>0&&n.duration<=120))return false;
  return fileOkay(p.audio,'audio')&&fileOkay(p.cover,'cover');
}

async function openDatabase():Promise<IDBDatabase>{
  if(typeof indexedDB==='undefined')throw Error('このブラウザは保存機能に対応していません');
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,1);
    req.onupgradeneeded=()=>{
      if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE);
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error??new Error('保存データベースを開けません'));
    req.onblocked=()=>reject(Error('別のタブで保存データベースを使用しています'));
  });
}
async function transaction<T>(
  mode:IDBTransactionMode,
  fn:(store:IDBObjectStore,resolve:(value:T)=>void,reject:(error:Error)=>void)=>void
):Promise<T>{
  const db=await openDatabase();
  return new Promise<T>((resolve,reject)=>{
    let settled=false;
    const settle=(callback:()=>void)=>{
      if(settled)return;
      settled=true;
      db.close();
      callback();
    };
    try{
      const tx=db.transaction(STORE,mode);
      const store=tx.objectStore(STORE);
      fn(store,value=>settle(()=>resolve(value)),err=>settle(()=>reject(err)));
      tx.onerror=()=>settle(()=>reject(tx.error??Error('保存データの操作に失敗しました')));
      tx.onabort=()=>settle(()=>reject(tx.error??Error('保存操作が中断されました')));
    }catch(e){
      settle(()=>reject(e instanceof Error?e:Error('保存データにアクセスできません')));
    }
  });
}

export async function saveProject(project:StoredProject):Promise<void>{
  if(!isStoredProject(project))throw Error('保存する設定が正しくありません');
  return transaction<void>('readwrite',(store,resolve)=>{
    const req=store.put(project,KEY);
    // Completion confirms that browser storage accepted the full media snapshot.
    if(req.transaction)req.transaction.oncomplete=()=>resolve(undefined);
  });
}
export async function loadProject():Promise<StoredProject|null>{
  const data=await transaction<unknown>('readonly',(store,resolve)=>{
    const req=store.get(KEY);
    req.onsuccess=()=>resolve(req.result??null);
  });
  if(data===null)return null;
  if(!isStoredProject(data))throw Error('保存データを読み取れません。形式が古いか破損しています');
  return data;
}
export async function clearProject():Promise<void>{
  return transaction<void>('readwrite',(store,resolve)=>{
    const req=store.delete(KEY);
    if(req.transaction)req.transaction.oncomplete=()=>resolve(undefined);
  });
}
