'use strict';
const $=id=>document.getElementById(id);let catalog=[],custom=[],words=[],db;
function toast(t){$('notice').textContent=t;$('notice').style.display='block';setTimeout(()=>$('notice').style.display='none',3000)}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function uid(){return 'u'+Date.now().toString(36)+Math.random().toString(36).slice(2,8)}
function tx(store,method,val){return new Promise((resolve,reject)=>{const t=db.transaction(store,method==='getAll'?'readonly':'readwrite'),r=t.objectStore(store)[method](...(method==='getAll'?[]:Array.isArray(val)?val:[val]));r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
function openDb(){return new Promise((resolve,reject)=>{const r=indexedDB.open('EnglishLearningV2',1);r.onupgradeneeded=()=>{let d=r.result;d.createObjectStore('lessons',{keyPath:'id'});d.createObjectStore('words',{keyPath:'id'})};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function reload(){custom=await tx('lessons','getAll');words=await tx('words','getAll');render()}
function allLessons(){const map=new Map(catalog.map(x=>[x.id,{...x}]));(window.cloudRemoteLessons||[]).forEach(x=>map.set(x.id,{...x,cloud:true}));custom.forEach(x=>map.set(x.id,{...x}));return [...map.values()].filter(x=>x.id!=='github-ai_pronunciation_challenge_800'&&!String(x.file||x.url||'').endsWith('/ai_pronunciation_challenge_800.html')&&x.file!=='ai_pronunciation_challenge_800.html').sort((a,b)=>a.title.localeCompare(b.title,'zh-Hant'))}
function options(sel,items,placeholder){const v=sel.value;sel.replaceChildren(new Option(placeholder,''));[...new Set(items.filter(Boolean))].sort().forEach(x=>sel.add(new Option(x,x)));sel.value=v}
function render(){const list=allLessons();options($('categoryFilter'),list.map(x=>x.category),'全部分類');options($('wordCategory'),words.map(x=>x.category),'全部分類');const replace=$('replaceId'),old=replace.value;replace.replaceChildren(new Option('新增教材',''));list.forEach(x=>replace.add(new Option(x.title,x.id)));replace.value=old;
const q=$('librarySearch').value.toLowerCase(),cat=$('categoryFilter').value;let filtered=list.filter(x=>(x.title+' '+x.category).toLowerCase().includes(q)&&(!cat||x.category===cat));$('libraryItems').replaceChildren();for(const x of filtered){const d=document.createElement('div');d.className='tile';const info=document.createElement('div');info.innerHTML=`<strong>${esc(x.title)}</strong><small>${esc(x.category||'未分類')} · ${x.builtin&&!custom.some(c=>c.id===x.id)?'內建教材':'自訂／更新教材'}</small>`;const btn=document.createElement('button');btn.className='primary';btn.textContent='開啟學習 →';btn.onclick=()=>openLesson(x);d.append(info,btn);$('libraryItems').append(d)}if(!filtered.length)$('libraryItems').innerHTML='<div class="empty">目前沒有符合的教材</div>';
const wq=$('wordSearch').value.toLowerCase(),wc=$('wordCategory').value;const filteredWords=[...new Map([...(window.cloudRemoteWords||[]),...words].map(x=>[x.id,x])).values()].filter(x=>(x.en+' '+x.zh+' '+x.category).toLowerCase().includes(wq)&&(!wc||x.category===wc));$('wordItems').replaceChildren();for(const x of filteredWords){let d=document.createElement('div');d.className='panel';d.innerHTML=`<div class="word">${esc(x.en)}</div><div class="muted">${esc(x.ipa)}　${esc(x.category)}</div><p><b>${esc(x.zh)}</b></p><p>${esc(x.example)}<br><span class="muted">${esc(x.translation)}</span></p>`;let b=document.createElement('button');b.textContent='🔊 單字發音';b.onclick=()=>speak(x.en);let e=document.createElement('button');e.textContent='🔊 例句';e.disabled=!x.example;e.onclick=()=>speak(x.example);d.append(b,' ',e);$('wordItems').append(d)}if(!filteredWords.length)$('wordItems').innerHTML='<div class="empty">尚無自訂單字。請到管理後台新增。<br>內建 HTML 教材的單字尚未轉入統一單字庫。</div>';
$('adminWords').replaceChildren();for(const x of words){let d=document.createElement('div');d.className='tile';let t=document.createElement('div');t.innerHTML=`<strong>${esc(x.en)} — ${esc(x.zh)}</strong><small>${esc(x.category)}</small>`;let a=document.createElement('div');a.className='actions';let b=document.createElement('button');b.textContent='編輯';b.onclick=()=>editWord(x);let c=document.createElement('button');c.textContent='刪除';c.className='red';c.onclick=async()=>{if(confirm('確定刪除這筆單字？')){await tx('words','delete',x.id);await reload()}};a.append(b,c);d.append(t,a);$('adminWords').append(d)}if(!words.length)$('adminWords').innerHTML='<p class="muted">尚無自訂單字</p>'}
function speak(text){if(!('speechSynthesis' in window))return toast('此裝置不支援瀏覽器語音');speechSynthesis.cancel();let u=new SpeechSynthesisUtterance(text);u.lang='en-US';u.rate=.82;speechSynthesis.speak(u)}
// FIX-20261018-B: hosted HTML opens directly, without the sandboxed iframe.
async function openLesson(x) {
  try {
    if (x.file) {
      const url = new URL(x.file, document.baseURI);
      if (url.origin !== location.origin || !/^https?:$/.test(url.protocol)) {
        throw new Error('教材網址必須位於本站');
      }
      // Same-tab navigation works on mobile and does not depend on popup settings.
      location.assign(url.href);
      return;
    }
    const frame = $('frame');
    frame.removeAttribute('src');
    frame.srcdoc = '';
    $('viewerTitle').textContent = x.title || '教材';
    $('viewer').classList.remove('hide');
    if (x.html != null) {
      frame.srcdoc = x.html;
    } else if (x.cloud && window.cloudApi) {
      frame.srcdoc = await window.cloudApi.loadHtml(x);
    } else {
      $('viewer').classList.add('hide');
      toast('教材沒有有效的檔案或內容');
    }
  } catch (err) {
    console.error('Unable to open lesson', err);
    toast('教材開啟失敗：' + err.message);
  }
}
$('closeViewer').onclick=()=>{$('frame').srcdoc='';$('frame').removeAttribute('src');$('viewer').classList.add('hide')};
function editWord(x){for(const id of ['en','zh','ipa','example','translation'])$(id).value=x[id]||'';$('cat').value=x.category||'';$('editId').value=x.id;document.querySelector('[data-tab="admin"]').click();$('wordForm').scrollIntoView({behavior:'smooth'})}
function clearWord(){$('wordForm').reset();$('editId').value=''}$('clearWord').onclick=clearWord;
$('wordForm').onsubmit=async ev=>{ev.preventDefault();const x={id:$('editId').value||uid(),en:$('en').value.trim(),zh:$('zh').value.trim(),ipa:$('ipa').value.trim(),category:$('cat').value.trim()||'未分類',example:$('example').value.trim(),translation:$('translation').value.trim(),updatedAt:new Date().toISOString()};if(!x.en||!x.zh)return toast('請填入英文及中文解釋');await tx('words','put',x);clearWord();await reload();toast('單字已儲存在本機')};
$('uploadFile').onchange=()=>{const f=$('uploadFile').files[0];if(f&&!$('uploadTitle').value)$('uploadTitle').value=f.name.replace(/\.html?$/i,'').replaceAll('_',' ')};
$('replaceId').onchange=()=>{const x=allLessons().find(x=>x.id===$('replaceId').value);if(x){$('uploadTitle').value=x.title;$('uploadCategory').value=x.category}};
$('uploadBtn').onclick=async()=>{const f=$('uploadFile').files[0];if(!f)return toast('請先選擇 HTML 檔案');if(!/\.html?$/i.test(f.name))return toast('只接受 .html 或 .htm');if(f.size>3*1024*1024)return toast('檔案需小於 3 MB');const html=await f.text(),title=$('uploadTitle').value.trim()||f.name,category=$('uploadCategory').value.trim()||'自訂教材';if(!/<html|<body|<!doctype/i.test(html))return toast('此檔案不像有效的 HTML 文件');const replace=$('replaceId').value;const x={id:replace||uid(),title,category,type:'html',builtin:false,html,updatedAt:new Date().toISOString()};await tx('lessons','put',x);$('uploadFile').value='';$('uploadTitle').value='';$('uploadCategory').value='';$('replaceId').value='';await reload();toast('HTML 教材已儲存，可在教材清單開啟')};
for(const b of document.querySelectorAll('nav button'))b.onclick=()=>{document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('active',x===b));for(const s of ['library','words','admin','backup'])$(s).classList.toggle('hide',s!==b.dataset.tab)};
for(const id of ['librarySearch','categoryFilter','wordSearch','wordCategory'])$(id).addEventListener(id.includes('Search')?'input':'change',render);
$('exportBtn').onclick=()=>{const data=JSON.stringify({app:'EnglishLearningV2',version:1,exportedAt:new Date().toISOString(),lessons:custom,words},null,2),url=URL.createObjectURL(new Blob([data],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='english_learning_v2_backup_'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
$('importBtn').onclick=async()=>{const f=$('importFile').files[0];if(!f)return toast('請選擇備份 JSON');try{const data=JSON.parse(await f.text());if(data.app!=='EnglishLearningV2'||!Array.isArray(data.lessons)||!Array.isArray(data.words))throw Error('備份格式不符');if(!confirm(`匯入 ${data.lessons.length} 個教材、${data.words.length} 筆單字？相同 ID 將覆蓋。`))return;for(const x of data.lessons){if(typeof x.id==='string'&&typeof x.title==='string'&&typeof x.html==='string')await tx('lessons','put',x)}for(const x of data.words){if(typeof x.id==='string'&&typeof x.en==='string'&&typeof x.zh==='string')await tx('words','put',x)}await reload();toast('備份匯入完成')}catch(e){toast('無法匯入：'+e.message)}};
(async()=>{try{catalog=await(await fetch('catalog.json')).json();db=await openDb();await reload();if('serviceWorker' in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./service-worker.js').catch(console.warn)}catch(e){console.error(e);toast('初始化失敗，請使用本機伺服器或 HTTPS 開啟')}})();

window.cloudV2={getLessons:()=>custom,getWords:()=>words,reload,render,toast,esc};
