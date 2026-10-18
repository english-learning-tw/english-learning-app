import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import { getFirestore, doc, getDoc, getDocs, collection, setDoc, deleteDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';

const $ = id => document.getElementById(id);
const status = s => { if($('cloudStatus')) $('cloudStatus').textContent=s; };
const say = s => window.cloudV2?.toast(s);
const cfg = window.FIREBASE_CONFIG;
if (!cfg || !cfg.apiKey || !cfg.projectId || !cfg.appId) {
  status('本機模式：尚未設定 firebase-config.js。既有 23 份教材仍可使用。');
  for (const id of ['cloudLogin','cloudLogout','cloudSync','publishLessons','publishWords']) $(id).disabled=true;
} else {
  const app=initializeApp(cfg);
  const auth=getAuth(app), db=getFirestore(app);
  let currentUser=null, isAdmin=false, unsubLessons=null, unsubWords=null;
  const allowed=async user=>!!(user && (await getDoc(doc(db,'admins',user.uid))).exists());
  const authorize=()=>{if(!currentUser||!isAdmin)throw Error('請以已授權的管理員帳號登入');};
  const safeId=v=>/^[A-Za-z0-9_-]{1,120}$/.test(v);
  const publishedLessonRef=id=>doc(db,'publishedLessons',id);
  const publishedWordRef=id=>doc(db,'publishedWords',id);
  async function loadHtml(item){
    if(!item.url || !/^https:\/\//.test(item.url)) throw Error('教材連結必須是 HTTPS');
    const u=new URL(item.url,location.href);
    if(u.origin!==location.origin) throw Error('只允許本站 GitHub Pages 教材');
    const r=await fetch(u.href); if(!r.ok) throw Error('教材讀取失敗：'+r.status);
    const t=await r.text(); if(t.length>3*1024*1024) throw Error('教材過大');
    return t;
  }
  function subscriptions(){
    unsubLessons?.();unsubWords?.();
    unsubLessons=onSnapshot(collection(db,'publishedLessons'),snap=>{
      window.cloudRemoteLessons=snap.docs.map(d=>({id:d.id,...d.data(),cloud:true})).filter(x=>x.title&&x.url);
      window.cloudV2?.render(); showPublished();
    },e=>status('讀取雲端教材失敗：'+e.message));
    unsubWords=onSnapshot(collection(db,'publishedWords'),snap=>{
      window.cloudRemoteWords=snap.docs.map(d=>({id:d.id,...d.data()})).filter(x=>x.en&&x.zh);
      window.cloudV2?.render();showPublished();
    },e=>status('讀取雲端單字失敗：'+e.message));
  }
  function showPublished(){
    $('cloudPublished').textContent=`已發布：${(window.cloudRemoteLessons||[]).length} 份雲端 HTML 教材，${(window.cloudRemoteWords||[]).length} 筆雲端單字。`;
  }
  onAuthStateChanged(auth,async user=>{
    currentUser=user;isAdmin=false;
    if(user){try{isAdmin=await allowed(user)}catch(e){status('權限確認失敗：'+e.message)}}
    status(user?(isAdmin?'管理員已登入：'+user.email+'。可以發布教材。':'已登入但沒有管理員權限：'+user.email):'訪客模式：可閱讀已發布的教材；管理員請登入。');
    $('publishLessons').disabled=true;$('publishWords').disabled=!isAdmin;$('cloudLogout').disabled=!user;
    $('cloudLogin').disabled=!!user;
  });
  $('cloudLogin').onclick=async()=>{try{await signInWithEmailAndPassword(auth,$('adminEmail').value.trim(),$('adminPassword').value);$('adminPassword').value='';say('登入成功，正在確認管理員權限')}catch(e){say('登入失敗：'+e.message)}};
  $('cloudLogout').onclick=async()=>{try{await signOut(auth);say('已登出')}catch(e){say(e.message)}};
  $('cloudSync').onclick=()=>{subscriptions();say('已重新連接雲端資料')};
  $('publishLessons').onclick=()=>say('免費版 HTML 請透過 GitHub 上傳；使用「新增教材連結」在管理後台登錄後發布。');
  $('publishLessons').disabled=true;
  const form=document.getElementById('htmlLinkForm');
  if(form)form.onsubmit=async(e)=>{
    e.preventDefault();
    try{
      authorize();
      const title=$('linkTitle').value.trim(),cat=$('linkCategory').value.trim()||'自訂教材',file=$('linkFile').value.trim();
      if(!title || !/^[a-zA-Z0-9_-]+\.html?$/.test(file))throw Error('請填教材標題和英數字 HTML 檔名，如 travel_200.html');
      const url=new URL(file,location.href).href;
      const id='github-'+file.replace(/\.html?$/i,'');
      await setDoc(publishedLessonRef(id),{title,category:cat,url,updatedAt:new Date().toISOString(),publisherUid:currentUser.uid});
      say('教材連結發布成功，請確認 GitHub 已上傳該 HTML 檔案。');form.reset();
    }catch(err){say('發布失敗：'+err.message)}
  };
  $('publishWords').onclick=async()=>{
    try{
      authorize();const words=window.cloudV2.getWords();if(!words.length)return say('沒有本機單字可發布');
      if(!confirm(`確定公開發布 ${words.length} 筆單字？`))return;
      $('publishWords').disabled=true;let n=0;
      for(const w of words){if(!safeId(w.id))throw Error('單字 ID 不合法');
        await setDoc(publishedWordRef(w.id),{en:(w.en||'').slice(0,150),zh:(w.zh||'').slice(0,250),ipa:(w.ipa||'').slice(0,180),category:(w.category||'未分類').slice(0,80),example:(w.example||'').slice(0,500),translation:(w.translation||'').slice(0,500),updatedAt:new Date().toISOString(),publisherUid:currentUser.uid});n++;
      }say(`已發布 ${n} 筆單字`);
    }catch(e){say('發布單字失敗：'+e.message)}finally{$('publishWords').disabled=!isAdmin}
  };
  window.cloudApi={loadHtml};subscriptions();
}
