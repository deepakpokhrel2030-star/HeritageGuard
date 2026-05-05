/* HeritageGuard app.js — complete with Azure Logic App + Blob Storage + Computer Vision + AI Search */

let USERS = [
  { id:'u1', first:'Deepak',  last:'Pokhrel',  email:'admin@heritaguard.org',       pw:'admin1234', role:'admin',       org:'HeritageGuard',  joined:'2026-01-10' },
  { id:'u2', first:'Sarah',   last:'Okonkwo',  email:'contributor@heritaguard.org',  pw:'demo1234',  role:'contributor', org:'UNESCO',         joined:'2026-02-14' },
  { id:'u3', first:'James',   last:'Thornton', email:'james@britishmuseum.org',      pw:'demo1234',  role:'contributor', org:'British Museum', joined:'2026-02-28' },
]

const TL = { image:'Image', video:'4K Video', '3dscan':'3D Scan', lidar:'LiDAR Survey', document:'Document' }
const TI = { image:'🖼️', video:'🎬', '3dscan':'📦', lidar:'🛰', document:'📄' }

let ASSETS=[],me=null,curPage='home',prevPage='home',curAsset=null,typeFilter='',stimer=null,modalCb=null,USE_LIVE=true,curView='grid',countersAnimated=false,archivePage=1
const PAGE_SIZE=8

/* ============================================================
   BOOT
   ============================================================ */
async function boot(){
  history.replaceState({page:'home'},'','#home')
  goPage('home',false)
  renderSkeletons('featured-grid',4)
  try{ASSETS=USE_LIVE?await getAllAssets():await fetch('assets.json').then(r=>r.json())}catch(e){ASSETS=[];console.warn(e)}
  try{
    const saved=localStorage.getItem('hg_session')
    if(saved){const {id}=JSON.parse(saved);const u=USERS.find(u=>u.id===id);if(u)signIn(u,true)}
  }catch(e){localStorage.removeItem('hg_session')}
  renderFeatured()
  const el=document.getElementById('home-total');if(el)el.textContent=ASSETS.length
  const el2=document.getElementById('ic-total');if(el2)el2.textContent=ASSETS.length
  initCounters()
}

/* ============================================================
   NAVIGATION
   ============================================================ */
function goPage(n,push=true){
  document.querySelectorAll('.pg').forEach(p=>p.classList.add('hidden'))
  const pg=document.getElementById('pg-'+n);if(pg)pg.classList.remove('hidden')
  document.querySelectorAll('.nl').forEach(b=>b.classList.remove('active'))
  const nb=document.getElementById('nl-'+n);if(nb)nb.classList.add('active')
  prevPage=curPage;curPage=n
  if(push)history.pushState({page:n},'','#'+n)
  window.scrollTo({top:0,behavior:'smooth'})
  if(n==='archive')renderArchive()
  if(n==='admin')renderAdmin()
  if(n==='home'){renderFeatured();if(!countersAnimated)initCounters()}
  if(n==='profile')renderProfile()
  if(n==='upload')setTimeout(initDragDrop,50)
}
function openRegister(){goPage('login');authTab('reg')}
function needAuth(){if(!me){toast('Please sign in to upload assets.','warn');goPage('login');return}if(me.role==='viewer'){toast('Your account does not have upload permission.','warn');return}goPage('upload')}
function goArchiveType(t){typeFilter=t;goPage('archive');setTimeout(()=>{document.querySelectorAll('.tp').forEach(b=>b.classList.remove('active'));const tb=document.querySelector(`.tp[data-t="${t}"]`);if(tb)tb.classList.add('active');applyFilters()},50)}

/* ============================================================
   UI HELPERS
   ============================================================ */
let _tt=null
function toast(msg,type='success'){const el=document.getElementById('toast');el.textContent=msg;el.className=type;el.classList.remove('hidden');clearTimeout(_tt);_tt=setTimeout(()=>el.classList.add('hidden'),3000)}
function showLoad(){document.getElementById('loader').classList.remove('hidden')}
function hideLoad(){document.getElementById('loader').classList.add('hidden')}

/* ============================================================
   MODAL
   ============================================================ */
function openModal(title,msg,label,cb){
  document.getElementById('modal-title').textContent=title
  document.getElementById('modal-msg').textContent=msg
  document.getElementById('modal-ok').textContent=label
  modalCb=cb
  document.getElementById('modal').classList.remove('hidden')
}
function closeModal(){document.getElementById('modal').classList.add('hidden');modalCb=null}

/* ============================================================
   HOME
   ============================================================ */
function renderFeatured(){
  const list=ASSETS.filter(a=>a.featured)
  const el=document.getElementById('featured-grid');if(el)el.innerHTML=list.map((a,i)=>cardHTML(a,i)).join('')
  const c=document.getElementById('home-total');if(c)c.textContent=ASSETS.length
}

/* ============================================================
   AZURE AI SEARCH — proxy via Logic App to avoid CORS
   ============================================================ */
async function searchWithAzureAI(query){
  try{
    const r=await fetch(CONFIG.SEARCH.endpoint,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({search:query})
    })
    if(!r.ok)return null
    const data=await r.json()
    return data.value||[]
  }catch(e){
    console.error('Azure Search error:',e)
    return null
  }
}

/* ============================================================
   ARCHIVE
   ============================================================ */
function renderArchive(){applyFilters().catch(console.error)}

async function applyFilters(){
  const q=(document.getElementById('sq')?.value||'').trim()
  const loc=(document.getElementById('sl')?.value||'').trim().toLowerCase()
  const tag=(document.getElementById('st')?.value||'').trim().toLowerCase()
  const sort=(document.getElementById('sort-sel')?.value||'newest')

  let res=[...ASSETS]
  let usedAzureSearch=false

  /* STEP 1 — Use Azure AI Search when there's a text query */
  if(q&&q.length>1){
    const searchResults=await searchWithAzureAI(q)
    if(searchResults&&searchResults.length>0){
      const ids=new Set(searchResults.map(r=>r.id))
      res=ASSETS.filter(a=>ids.has(a.id))
      if(res.length===0)res=searchResults
      usedAzureSearch=true
    } else if(searchResults!==null){
      /* Azure Search returned no results — fall back to local filter */
      res=ASSETS.filter(a=>
        (a.title||'').toLowerCase().includes(q.toLowerCase())||
        (a.description||'').toLowerCase().includes(q.toLowerCase())||
        (a.location||'').toLowerCase().includes(q.toLowerCase())||
        (a.tags||[]).some(t=>t.toLowerCase().includes(q.toLowerCase()))||
        (a.aiTags||[]).some(t=>t.toLowerCase().includes(q.toLowerCase()))
      )
    }
  }

  /* STEP 2 — Apply remaining filters */
  if(typeFilter)res=res.filter(a=>a.type===typeFilter)
  if(loc)res=res.filter(a=>(a.location||'').toLowerCase().includes(loc)||(a.region||'').toLowerCase().includes(loc))
  if(tag)res=res.filter(a=>(a.tags||[]).some(t=>t.toLowerCase().includes(tag)))

  /* STEP 3 — Sort */
  if(sort==='oldest')res.sort((a,b)=>(a.uploadedAt||'').localeCompare(b.uploadedAt||''))
  else if(sort==='newest')res.sort((a,b)=>(b.uploadedAt||'').localeCompare(a.uploadedAt||''))
  else if(sort==='title')res.sort((a,b)=>(a.title||'').localeCompare(b.title||''))
  else if(sort==='type')res.sort((a,b)=>(a.type||'').localeCompare(b.type||''))
  else if(sort==='region')res.sort((a,b)=>(a.region||'').localeCompare(b.region||''))

  /* STEP 4 — Get DOM elements (AFTER all async work) */
  const grid=document.getElementById('archive-grid')
  const none=document.getElementById('no-results')
  const cnt=document.getElementById('res-count')
  if(!grid)return

  /* STEP 5 — Show/hide Azure AI Search banner */
  const existing=document.getElementById('ai-search-banner')
  if(existing)existing.remove()
  if(usedAzureSearch){
    const banner=document.createElement('div')
    banner.id='ai-search-banner'
    banner.style.cssText='background:linear-gradient(135deg,#0078d4,#005a9e);color:#fff;padding:.6rem 1rem;border-radius:8px;margin-bottom:1rem;font-size:.85rem;display:flex;align-items:center;gap:.5rem;flex-wrap:wrap'
    banner.innerHTML='<span>⚡</span><strong>Powered by Azure AI Search</strong><span style="opacity:.8">— semantic search across titles, descriptions, locations, tags and AI-generated labels</span>'
    grid.parentNode.insertBefore(banner,grid)
    cnt.textContent=`🔍 Azure AI Search: ${res.length} result${res.length!==1?'s':''} found`
  }

  /* STEP 6 — Paginate and render */
  const total=res.length
  const totalPages=Math.max(1,Math.ceil(total/PAGE_SIZE))
  if(archivePage>totalPages)archivePage=totalPages
  const start=(archivePage-1)*PAGE_SIZE
  const pageRes=res.slice(start,start+PAGE_SIZE)

  if(!usedAzureSearch){
    cnt.textContent=`${total} asset${total!==1?'s':''} found · Page ${archivePage} of ${totalPages}`
  }

  if(!total){
    grid.innerHTML=''
    none.classList.remove('hidden')
    renderPagination(1,1,true)
    return
  }
  none.classList.add('hidden')
  grid.className='grid'+(curView==='list'?' list-view':'')
  grid.innerHTML=pageRes.map((a,i)=>cardHTML(a,i)).join('')
  renderPagination(archivePage,totalPages,false)
}

function renderPagination(current,total,hide){
  const el=document.getElementById('pagination')
  if(!el)return
  if(hide||total<=1){el.innerHTML='';return}
  const start=Math.max(1,current-2),end=Math.min(total,current+2)
  let html=`<div class="pgn"><button class="pgn-btn pgn-arrow" onclick="setArchivePage(${current-1})" ${current===1?'disabled':''}>← Prev</button><div class="pgn-pages">`
  if(start>1){html+=`<button class="pgn-btn pgn-num" onclick="setArchivePage(1)">1</button>`; if(start>2)html+=`<span class="pgn-dots">…</span>`}
  for(let i=start;i<=end;i++)html+=`<button class="pgn-btn pgn-num${i===current?' active':''}" onclick="setArchivePage(${i})">${i}</button>`
  if(end<total){if(end<total-1)html+=`<span class="pgn-dots">…</span>`;html+=`<button class="pgn-btn pgn-num" onclick="setArchivePage(${total})">${total}</button>`}
  html+=`</div><button class="pgn-btn pgn-arrow" onclick="setArchivePage(${current+1})" ${current===total?'disabled':''}>Next →</button></div>`
  el.innerHTML=html
}
function setArchivePage(n){
  if(n<1)return
  archivePage=n
  applyFilters()
  document.getElementById('pg-archive')?.scrollIntoView({behavior:'smooth',block:'start'})
}
function debSearch(){archivePage=1;clearTimeout(stimer);stimer=setTimeout(()=>applyFilters(),250)}
function setType(btn,t){archivePage=1;document.querySelectorAll('.tp').forEach(b=>b.classList.remove('active'));btn.classList.add('active');typeFilter=t;applyFilters()}
function clearSearch(){
  const b=document.getElementById('ai-search-banner')
  if(b)b.remove()
  archivePage=1
  ;['sq','sl','st'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=''})
  typeFilter=''
  document.querySelectorAll('.tp').forEach(b=>b.classList.remove('active'))
  const all=document.querySelector('.tp[data-t=""]')
  if(all)all.classList.add('active')
  applyFilters()
}

/* ============================================================
   CARD HTML
   ============================================================ */
function cardHTML(a,i){
  const esc=s=>(s||'').replace(/'/g,"\\'").replace(/"/g,'&quot;')
  const icon=TI[a.type]||'📁',label=TL[a.type]||a.type
  const thumb=a.thumbnail?`<img src="${a.thumbnail}" alt="${esc(a.title)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`:'';
  const fb=`<div style="display:${a.thumbnail?'none':'flex'};width:100%;height:100%;align-items:center;justify-content:center;font-size:2.6rem">${icon}</div>`
  const canAct=me&&(me.id===a.uploadedBy||me.role==='admin')
  const acts=canAct?`<button class="btn-sm-outline btn-sm" onclick="event.stopPropagation();editFromCard('${a.id}')">Edit</button><button class="btn-danger-sm btn-sm" onclick="event.stopPropagation();delFromCard('${a.id}','${esc(a.title)}')">Delete</button>`:''
  return`<div class="card" style="animation-delay:${i*.04}s" onclick="openDetail('${a.id}')"><div class="card-thumb">${thumb}${fb}<div class="card-type-badge">${label}</div></div><div class="card-body"><div class="card-meta"><span></span><span class="card-date">${a.uploadedAt||''}</span></div><div class="card-title">${a.title||''}</div><div class="card-loc">${a.location||''}</div><div class="card-acts"><button class="btn-sm-outline btn-sm" onclick="event.stopPropagation();openDetail('${a.id}')">View</button>${acts}</div></div></div>`
}

/* ============================================================
   DETAIL
   ============================================================ */
function openDetail(id,push=true){
  const a=ASSETS.find(x=>x.id===id);if(!a)return;curAsset=a
  const back=document.getElementById('det-back');back.onclick=()=>goPage(prevPage==='detail'?'archive':prevPage)
  const canAct=me&&(me.id===a.uploadedBy||me.role==='admin')
  document.getElementById('det-acts').classList.toggle('hidden',!canAct)
  renderDetBody(a)
  renderRelated(a)
  goPage('detail',push)
  if(push)history.replaceState({page:'detail',id},'','#detail-'+id)
}
function renderDetBody(a){
  const icon=TI[a.type]||'📁',label=TL[a.type]||a.type
  let media
  if(a.type==='video'){
    const dur=a.specs?.Duration?`<span class="dvp-dur">${a.specs.Duration}</span>`:''
    media=`<div class="det-video-wrap" id="det-video-wrap">
      ${a.thumbnail?`<img class="det-video-poster" src="${a.thumbnail}" alt="${a.title}"/>`:''}
      <div class="det-play-overlay" onclick="playVideo()">
        <div class="det-play-btn"><svg width="28" height="28" viewBox="0 0 28 28" fill="white"><polygon points="8,4 24,14 8,24"/></svg></div>
        <div class="det-video-meta">${dur}<span class="dvp-label">🎬 Click to play</span></div>
      </div>
    </div>`
  } else if(a.type==='document'&&a.thumbnail&&a.thumbnail.startsWith('https://')){
    media=`<div class="det-ph" style="flex-direction:column;gap:1rem">
      <div style="font-size:3rem">📄</div>
      <p style="color:var(--t2);font-size:.9rem">PDF Document stored in Azure Blob Storage</p>
      <a href="${a.thumbnail}" target="_blank" rel="noopener" class="btn-primary" style="text-decoration:none;padding:.6rem 1.4rem;border-radius:8px;background:var(--au);color:#fff;font-weight:600">📂 Open Document</a>
      <a href="${a.thumbnail}" download class="btn-outline" style="text-decoration:none;padding:.6rem 1.4rem;border-radius:8px">↓ Download</a>
    </div>`
  } else if(a.type==='3dscan'&&a.thumbnail&&a.thumbnail.startsWith('https://')){
    media=`<div class="det-ph" style="flex-direction:column;gap:1rem">
      <div style="font-size:3rem">📦</div>
      <p style="color:var(--t2);font-size:.9rem">3D Scan file stored in Azure Blob Storage</p>
      <a href="${a.thumbnail}" download class="btn-outline" style="text-decoration:none;padding:.6rem 1.4rem;border-radius:8px">↓ Download 3D File</a>
    </div>`
  } else if(a.type==='lidar'&&a.thumbnail&&a.thumbnail.startsWith('https://')){
    media=`<div class="det-ph" style="flex-direction:column;gap:1rem">
      <div style="font-size:3rem">🛰</div>
      <p style="color:var(--t2);font-size:.9rem">LiDAR Survey file stored in Azure Blob Storage</p>
      <a href="${a.thumbnail}" download class="btn-outline" style="text-decoration:none;padding:.6rem 1.4rem;border-radius:8px">↓ Download LiDAR Data</a>
    </div>`
  } else if(a.thumbnail&&a.thumbnail.startsWith('https://')){
    media=`<img class="det-img" src="${a.thumbnail}" alt="${a.title}" onerror="this.outerHTML='<div class=\\'det-ph\\'>${icon}</div>'">`
  } else {
    media=`<div class="det-ph">${icon}</div>`
  }
  const tagsHTML=(a.tags||[]).map(t=>`<span class="tag">${t}</span>`).join('')
  const specsHTML=a.specs&&Object.keys(a.specs).length?`<div class="det-block"><div class="det-block-label">${label} Specifications</div><div class="spec-grid">${Object.entries(a.specs).map(([k,v])=>`<div class="si"><span class="si-v">${v}</span><span class="si-k">${k}</span></div>`).join('')}</div></div>`:''
  const aiHTML=(a.aiTags||[]).length?`<div class="det-block"><div class="det-block-label">🤖 AI-Generated Tags (Azure Computer Vision)</div><div class="tags">${(a.aiTags||[]).map(t=>`<span class="tag" style="background:var(--aug);border-color:var(--au)">${t}</span>`).join('')}</div></div>`:''
  document.getElementById('det-body').innerHTML=`${media}<div class="det-eyebrow">${label} · ${a.uploadedAt||'—'} · by ${a.uploadedByName||'—'}</div><h1 class="det-title">${a.title||''}</h1><div class="det-metas"><div class="dm"><span class="dm-l">Location</span><span class="dm-v">${a.location||'—'}</span></div><div class="dm"><span class="dm-l">Region</span><span class="dm-v">${a.region||'—'}</span></div><div class="dm"><span class="dm-l">Type</span><span class="dm-v">${label}</span></div><div class="dm"><span class="dm-l">Uploaded by</span><span class="dm-v">${a.uploadedByName||'—'}</span></div></div><p class="det-desc">${a.description||'No description provided.'}</p><div class="tags">${tagsHTML}</div>${specsHTML}${aiHTML}`
}

/* ============================================================
   VIDEO PLAYBACK
   ============================================================ */
function playVideo(){
  if(!curAsset)return
  const wrap=document.getElementById('det-video-wrap')
  if(!wrap)return
  const src=curAsset.videoUrl||curAsset.thumbnail||''
  if(src&&src.includes('youtube.com')){
    const embedSrc=src.includes('/embed/')?src:src.replace('watch?v=','embed/')
    wrap.innerHTML=`<iframe class="det-video-frame" src="${embedSrc}?autoplay=1&rel=0&modestbranding=1" frameborder="0" allow="autoplay;encrypted-media;fullscreen;picture-in-picture" allowfullscreen></iframe>`
  } else if(src&&src.startsWith('https://')&&!src.startsWith('blob:')){
    wrap.innerHTML=`<video class="det-video-frame" src="${src}" controls autoplay style="width:100%;height:100%;background:#000;border-radius:8px">Your browser does not support video playback.</video>`
  } else {
    wrap.innerHTML=`<div class="det-video-unavail"><div class="dvu-icon">🎬</div><p class="dvu-title">Streamed via Azure Media Services</p><p class="dvu-sub">This ${curAsset.specs?.Duration||''} documentary is stored in Azure Blob Storage and streamed on demand.</p><button class="btn-outline" onclick="toast('Stream access request sent.','success')">Request Access</button></div>`
  }
}

/* ============================================================
   AUTH
   ============================================================ */
function authTab(t){
  document.getElementById('f-in').classList.toggle('hidden',t!=='in')
  document.getElementById('f-reg').classList.toggle('hidden',t!=='reg')
  document.getElementById('at-in').classList.toggle('active',t==='in')
  document.getElementById('at-reg').classList.toggle('active',t==='reg')
  setTimeout(()=>{const f=document.getElementById(t==='in'?'in-em':'rg-fn');if(f)f.focus()},50)
}
function fillDemo(e,p){authTab('in');document.getElementById('in-em').value=e;document.getElementById('in-pw').value=p;toast('Demo credentials filled — click Sign in','success')}

async function doLogin(){
  const email=document.getElementById('in-em').value.trim()
  const pw=document.getElementById('in-pw').value
  if(!email||!pw){toast('Please enter your email and password.','error');return}
  showLoad()
  try{
    const r=await fetch(CONFIG.ENDPOINTS.loginUser,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({email,password:pw})
    })
    const data=await r.json()
    const users=Array.isArray(data)?data:(data.Documents||data.value||[])
    if(!users.length){hideLoad();toast('Incorrect email or password.','error');return}
    const u=users[0]
    const user={id:u.id,first:u.firstName,last:u.lastName,email:u.email,pw:u.password,role:u.role||'contributor',org:u.org||'',joined:u.joined||''}
    if(!USERS.find(x=>x.id===user.id))USERS.push(user)
    hideLoad()
    signIn(user)
  }catch(e){
    hideLoad()
    console.error('Login error:',e)
    const u=USERS.find(u=>u.email===email&&u.pw===pw)
    if(!u){toast('Incorrect email or password.','error');return}
    signIn(u)
  }
}

async function doRegister(){
  const fn=document.getElementById('rg-fn').value.trim()
  const ln=document.getElementById('rg-ln').value.trim()
  const em=document.getElementById('rg-em').value.trim()
  const pw=document.getElementById('rg-pw').value
  const pw2=document.getElementById('rg-pw2').value
  const org=document.getElementById('rg-org').value.trim()
  if(!fn||!ln||!em||!pw||!pw2){toast('Please fill in all required fields.','error');return}
  if(pw.length<8){toast('Password must be at least 8 characters.','error');return}
  if(pw!==pw2){toast('Passwords do not match.','error');return}
  showLoad()
  try{
    const newUser={id:'u'+Date.now(),firstName:fn,lastName:ln,email:em,password:pw,role:'contributor',org:org||'Public',joined:new Date().toISOString().split('T')[0]}
    await fetch(CONFIG.ENDPOINTS.registerUser,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(newUser)})
    USERS.push({id:newUser.id,first:fn,last:ln,email:em,pw,role:'contributor',org:org||'Public',joined:newUser.joined})
    hideLoad()
    toast('Account created! You can now sign in.','success')
    authTab('in')
    document.getElementById('in-em').value=em
    document.getElementById('in-pw').value=''
  }catch(e){
    hideLoad()
    console.error('Register error:',e)
    USERS.push({id:'u'+Date.now(),first:fn,last:ln,email:em,pw,role:'contributor',org:org||'Public',joined:new Date().toISOString().split('T')[0]})
    toast('Account created! You can now sign in.','success')
    authTab('in')
    document.getElementById('in-em').value=em
  }
}

function forgotPassword(){toast('Password reset — contact your archive administrator.','warn')}
function togglePw(id,btn){
  const inp=document.getElementById(id);if(!inp)return
  const show=inp.type==='password';inp.type=show?'text':'password'
  btn.innerHTML=show
    ?`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`
    :`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`
}
function checkStrength(val){
  const bar=document.getElementById('pw-strength-bar'),lbl=document.getElementById('pw-strength-label')
  if(!bar||!lbl)return
  if(!val){bar.style.width='0%';lbl.textContent='';return}
  let s=0
  if(val.length>=8)s++;if(val.length>=12)s++
  if(/[A-Z]/.test(val))s++;if(/[0-9]/.test(val))s++;if(/[^A-Za-z0-9]/.test(val))s++
  const lvls=[{w:'20%',c:'#ef4444',l:'Weak'},{w:'40%',c:'#f97316',l:'Fair'},{w:'60%',c:'#eab308',l:'Good'},{w:'85%',c:'#22c55e',l:'Strong'},{w:'100%',c:'#16a34a',l:'Very strong'}]
  const lvl=lvls[Math.min(s,4)]
  bar.style.width=lvl.w;bar.style.background=lvl.c
  lbl.textContent=lvl.l;lbl.style.color=lvl.c
}
function signIn(u,silent=false){
  me=u
  document.getElementById('nav-guest').classList.add('hidden')
  document.getElementById('nav-user').classList.remove('hidden')
  document.getElementById('chip-name').textContent=u.first+' '+u.last
  document.getElementById('chip-av').textContent=u.first[0].toUpperCase()
  document.getElementById('nl-upload').classList.remove('hidden')
  document.getElementById('nl-admin').classList.toggle('hidden',u.role!=='admin')
  localStorage.setItem('hg_session',JSON.stringify({id:u.id}))
  if(!silent){toast('Welcome back, '+u.first+'!','success');goPage('home')}
}
function doLogout(){
  me=null
  localStorage.removeItem('hg_session')
  document.getElementById('nav-guest').classList.remove('hidden')
  document.getElementById('nav-user').classList.add('hidden')
  document.getElementById('nl-upload').classList.add('hidden')
  document.getElementById('nl-admin').classList.add('hidden')
  toast('Signed out.','success');goPage('home')
}

/* ============================================================
   AZURE COMPUTER VISION — Auto-tag images on upload
   ============================================================ */
async function analyseImageWithCV(blobUrl){
  try{
    toast('Analysing image with Azure Computer Vision...','success')
    const apiUrl=CONFIG.CV.endpoint+'vision/v3.2/analyze?visualFeatures=Tags,Description,Categories&language=en'
    const r=await fetch(apiUrl,{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'Ocp-Apim-Subscription-Key':CONFIG.CV.key
      },
      body:JSON.stringify({url:blobUrl})
    })
    if(!r.ok){
      console.warn('CV analysis failed:',r.status,await r.text())
      return[]
    }
    const data=await r.json()
    const tags=(data.tags||[])
      .filter(t=>t.confidence>0.6)
      .map(t=>t.name)
      .slice(0,10)
    toast('AI tags generated: '+tags.slice(0,3).join(', ')+' ✓','success')
    return tags
  }catch(e){
    console.error('CV error:',e)
    return[]
  }
}

/* ============================================================
   VIDEO THUMBNAIL GENERATOR
   ============================================================ */
function generateVideoThumbnail(file){
  return new Promise((resolve,reject)=>{
    const video=document.createElement('video')
    const canvas=document.createElement('canvas')
    const url=URL.createObjectURL(file)
    video.src=url
    video.muted=true
    video.playsInline=true
    video.crossOrigin='anonymous'
    video.addEventListener('loadedmetadata',()=>{
      video.currentTime=Math.min(1,video.duration*0.1)
    })
    video.addEventListener('seeked',()=>{
      canvas.width=video.videoWidth||1280
      canvas.height=video.videoHeight||720
      const ctx=canvas.getContext('2d')
      ctx.drawImage(video,0,0,canvas.width,canvas.height)
      URL.revokeObjectURL(url)
      canvas.toBlob(async(blob)=>{
        if(!blob){reject(new Error('Canvas empty'));return}
        const thumbName='thumb-'+Date.now()+'.jpg'
        const uploadUrl=CONFIG.BLOB.baseUrl+'/'+thumbName+CONFIG.BLOB.sasToken
        try{
          const r=await fetch(uploadUrl,{
            method:'PUT',
            headers:{'x-ms-blob-type':'BlockBlob','Content-Type':'image/jpeg'},
            body:blob
          })
          if(r.ok){resolve(CONFIG.BLOB.baseUrl+'/'+thumbName)}
          else{reject(new Error('Thumb upload failed: '+r.status))}
        }catch(e){reject(e)}
      },'image/jpeg',0.85)
    })
    video.addEventListener('error',()=>{
      URL.revokeObjectURL(url)
      reject(new Error('Video load failed'))
    })
    video.load()
  })
}

/* ============================================================
   UPLOAD
   Step 1: Upload to Azure Blob Storage (with progress)
   Step 2: Generate video thumbnail OR run Computer Vision
   Step 3: Save metadata to Cosmos DB via Logic App
   ============================================================ */
function chkSpecs(t){document.getElementById('spec-card').classList.toggle('hidden',t!=='3dscan'&&t!=='lidar')}
function onFilePick(input){
  const drop=document.getElementById('fzone'),ui=document.getElementById('fzone-ui')
  if(input.files&&input.files[0]){
    const f=input.files[0]
    drop.classList.add('ok')
    if(f.type.startsWith('image/')){
      const reader=new FileReader()
      reader.onload=e=>{ui.innerHTML=`<img src="${e.target.result}" style="max-height:160px;border-radius:8px;object-fit:cover;width:100%;margin-bottom:.6rem"/><p class="fzone-main" style="color:var(--gr)">✓ ${f.name}</p><p class="fzone-sub">${(f.size/1024/1024).toFixed(2)} MB · Click to change</p>`}
      reader.readAsDataURL(f)
    }else{
      ui.innerHTML=`<div class="fzone-icon" style="color:var(--gr)">✓</div><p class="fzone-main">${f.name}</p><p class="fzone-sub">${(f.size/1024/1024).toFixed(2)} MB · Click to change</p>`
    }
  }
}

async function doUpload(){
  if(!me){toast('Please sign in first.','error');return}
  const title=document.getElementById('u-ti').value.trim()
  const desc=document.getElementById('u-de').value.trim()
  const loc=document.getElementById('u-lo').value.trim()
  const region=document.getElementById('u-re').value
  const type=document.getElementById('u-ty').value
  const tags=document.getElementById('u-ta').value.trim()
  const file=document.getElementById('u-fi')
  if(!title||!loc||!region||!type){toast('Please fill in all required fields.','error');return}
  if(!file.files[0]){toast('Please select a file.','error');return}
  showLoad()

  /* STEP 1 — Upload to Azure Blob Storage with progress */
  let blobUrl=''
  try{
    const f=file.files[0]
    const blobName=Date.now()+'-'+f.name.replace(/\s+/g,'-')
    const uploadUrl=CONFIG.BLOB.baseUrl+'/'+blobName+CONFIG.BLOB.sasToken
    const sizeMB=(f.size/1024/1024).toFixed(1)
    toast(f.size>50*1024*1024?`Uploading ${sizeMB}MB — large file, please wait...`:'Uploading to Azure Blob Storage...','success')
    blobUrl=await new Promise((resolve,reject)=>{
      const xhr=new XMLHttpRequest()
      xhr.open('PUT',uploadUrl)
      xhr.setRequestHeader('x-ms-blob-type','BlockBlob')
      xhr.setRequestHeader('Content-Type',f.type||'application/octet-stream')
      xhr.upload.addEventListener('progress',e=>{
        if(e.lengthComputable){
          const pct=Math.round((e.loaded/e.total)*100)
          toast(`Uploading: ${pct}% (${(e.loaded/1024/1024).toFixed(1)}MB / ${sizeMB}MB)`,'success')
        }
      })
      xhr.addEventListener('load',()=>{
        if(xhr.status===201||xhr.status===200){resolve(CONFIG.BLOB.baseUrl+'/'+blobName)}
        else{reject(new Error('Upload failed: '+xhr.status))}
      })
      xhr.addEventListener('error',()=>reject(new Error('Network error during upload')))
      xhr.addEventListener('abort',()=>reject(new Error('Upload cancelled')))
      xhr.send(f)
    })
    toast('File uploaded to Azure Blob Storage ✓','success')
  }catch(e){
    console.error('Blob upload error:',e)
    toast('Blob upload failed — saving without file','warn')
  }

  /* STEP 2 — Video thumbnail OR Computer Vision */
  let thumbnailUrl=blobUrl
  let videoUrl=''
  let aiTags=[type,(loc.split(',')[0]||'').trim().toLowerCase()]

  if(type==='video'&&file.files[0]&&blobUrl){
    videoUrl=blobUrl
    toast('Generating video thumbnail...','success')
    try{
      thumbnailUrl=await generateVideoThumbnail(file.files[0])
      toast('Video thumbnail generated ✓','success')
    }catch(e){
      console.warn('Thumbnail generation failed:',e)
      thumbnailUrl=''
    }
  } else if(type==='image'&&blobUrl){
    await new Promise(resolve=>setTimeout(resolve,2000))
    const cvTags=await analyseImageWithCV(blobUrl)
    if(cvTags.length>0){
      aiTags=[...new Set([...aiTags,...cvTags])]
    }
  }

  /* STEP 3 — Build specs */
  const specs={}
  if(type==='3dscan'||type==='lidar'){
    const ac=document.getElementById('u-ac')?.value.trim()
    const me2=document.getElementById('u-me')?.value.trim()
    const eq=document.getElementById('u-eq')?.value.trim()
    if(ac)specs['Accuracy']=ac
    if(me2)specs['Capture method']=me2
    if(eq)specs['Equipment']=eq
  }
  if(type==='video'){
    specs['Resolution']='4K UHD'
    specs['Processing']='Scene detection & subtitles generated'
  }

  const newAsset={
    id:'a'+Date.now(),
    title,
    description:desc,
    location:loc,
    region,
    type,
    tags:tags?tags.split(',').map(t=>t.trim()).filter(Boolean):[],
    aiTags,
    specs,
    thumbnail:thumbnailUrl,
    videoUrl:videoUrl,
    uploadedAt:new Date().toISOString().split('T')[0],
    uploadedBy:me.id,
    uploadedByName:me.first+' '+me.last,
    featured:false
  }

  /* STEP 4 — Save to Cosmos DB */
  try{
    if(USE_LIVE){
      await createAsset(newAsset)
      ASSETS=await getAllAssets()
    }else{
      ASSETS.unshift(newAsset)
    }
    hideLoad()
    toast('Asset uploaded to Azure successfully! ✓','success')
    resetUpload()
    goPage('archive')
  }catch(e){
    hideLoad()
    console.error('Metadata save failed:',e)
    ASSETS.unshift(newAsset)
    toast('Saved locally (API error: '+e.message+')','warn')
    resetUpload()
    goPage('archive')
  }
}

function resetUpload(){
  ['u-ti','u-de','u-lo','u-ta','u-ac','u-me','u-eq'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=''})
  document.getElementById('u-ty').value=''
  document.getElementById('u-re').value=''
  document.getElementById('u-fi').value=''
  const drop=document.getElementById('fzone');if(drop)drop.classList.remove('ok')
  const ui=document.getElementById('fzone-ui');if(ui)ui.innerHTML='<div class="fzone-icon">↑</div><p class="fzone-main">Drag & drop or click to upload</p><p class="fzone-sub">Images · 4K Video · 3D Scans (.obj/.glb) · LiDAR (.las/.laz) · PDF</p>'
  document.getElementById('spec-card').classList.add('hidden')
}

/* ============================================================
   EDIT
   ============================================================ */
function openEditPg(){if(!curAsset)return;const a=curAsset;document.getElementById('e-ti').value=a.title||'';document.getElementById('e-de').value=a.description||'';document.getElementById('e-lo').value=a.location||'';document.getElementById('e-re').value=a.region||'';document.getElementById('e-ty').value=a.type||'image';document.getElementById('e-ta').value=(a.tags||[]).join(', ');goPage('edit')}
function editFromCard(id){const a=ASSETS.find(x=>x.id===id);if(!a)return;curAsset=a;openEditPg()}

async function doUpdate(){
  if(!curAsset)return
  const title=document.getElementById('e-ti').value.trim()
  const desc=document.getElementById('e-de').value.trim()
  const loc=document.getElementById('e-lo').value.trim()
  const region=document.getElementById('e-re').value
  const type=document.getElementById('e-ty').value
  const tags=document.getElementById('e-ta').value.trim()
  if(!title||!loc){toast('Title and location are required.','error');return}
  showLoad()
  const updated={...curAsset,title,description:desc,location:loc,region,type,tags:tags?tags.split(',').map(t=>t.trim()).filter(Boolean):[]}
  try{
    if(USE_LIVE){
      await updateAsset(updated.id,updated)
      ASSETS=await getAllAssets()
      curAsset=ASSETS.find(a=>a.id===updated.id)||updated
    }else{
      const idx=ASSETS.findIndex(a=>a.id===curAsset.id)
      if(idx!==-1){ASSETS[idx]=updated;curAsset=ASSETS[idx]}
    }
    hideLoad()
    toast('Asset updated and saved to Cosmos DB ✓','success')
    renderDetBody(curAsset)
    goPage('detail')
  }catch(e){
    hideLoad()
    console.error('Update failed:',e)
    const idx=ASSETS.findIndex(a=>a.id===curAsset.id)
    if(idx!==-1){ASSETS[idx]=updated;curAsset=ASSETS[idx]}
    toast('Updated locally (API error: '+e.message+')','warn')
    renderDetBody(curAsset)
    goPage('detail')
  }
}

/* ============================================================
   DELETE ASSET
   ============================================================ */
function confirmDelAsset(){if(!curAsset)return;openModal('Delete this asset?',`"${curAsset.title}" will be permanently removed from Azure.`,'Delete',()=>execDel(curAsset.id,curAsset.region))}
function delFromCard(id,title){
  const a=ASSETS.find(x=>x.id===id)
  const region=a?.region||'Asia'
  openModal('Delete this asset?',`"${title}" will be permanently removed from Azure.`,'Delete',()=>execDel(id,region))
}
async function execDel(id,region){
  showLoad()
  try{
    if(USE_LIVE){
      await deleteAsset(id,region)
      ASSETS=await getAllAssets()
    }else{
      const idx=ASSETS.findIndex(a=>a.id===id)
      if(idx!==-1)ASSETS.splice(idx,1)
    }
    if(curAsset&&curAsset.id===id)curAsset=null
    hideLoad()
    toast('Asset deleted from Cosmos DB ✓','success')
    goPage('archive')
  }catch(e){
    hideLoad()
    console.error('Delete failed:',e)
    const idx=ASSETS.findIndex(a=>a.id===id)
    if(idx!==-1)ASSETS.splice(idx,1)
    if(curAsset&&curAsset.id===id)curAsset=null
    toast('Deleted locally (API error: '+e.message+')','warn')
    goPage('archive')
  }
}

/* ============================================================
   DELETE USER
   ============================================================ */
async function delUser(uid,name){
  if(me&&me.id===uid){toast("You can't remove your own account.",'error');return}
  openModal('Remove user?',`"${name}" will be permanently removed from Cosmos DB.`,'Remove',async()=>{
    showLoad()
    const u=USERS.find(u=>u.id===uid)
    try{
      const url=CONFIG.ENDPOINTS.deleteUser+'&id='+encodeURIComponent(uid)+'&email='+encodeURIComponent(u?.email||'')
      await fetch(url,{method:'DELETE',headers:{'Content-Type':'application/json'}})
      const idx=USERS.findIndex(u=>u.id===uid)
      if(idx!==-1)USERS.splice(idx,1)
      hideLoad()
      toast('User removed from Cosmos DB ✓','success')
      renderAdmin()
    }catch(e){
      hideLoad()
      console.error('Delete user error:',e)
      const idx=USERS.findIndex(u=>u.id===uid)
      if(idx!==-1)USERS.splice(idx,1)
      toast('User removed locally (API error)','warn')
      renderAdmin()
    }
  })
}

/* ============================================================
   PROFILE
   ============================================================ */
function renderProfile(){
  if(!me){goPage('login');return}
  document.getElementById('p-av-big').textContent=me.first[0].toUpperCase()
  document.getElementById('p-full').textContent=me.first+' '+me.last
  document.getElementById('p-role').textContent=me.role
  document.getElementById('p-org-disp').textContent=me.org||'—'
  const mine=ASSETS.filter(a=>a.uploadedBy===me.id)
  document.getElementById('p-count').textContent=mine.length
  document.getElementById('p-joined').textContent=me.joined||'—'
  document.getElementById('p-fn').value=me.first||''
  document.getElementById('p-ln').value=me.last||''
  document.getElementById('p-em').value=me.email||''
  document.getElementById('p-org').value=me.org||''
  ;['p-cp','p-np','p-np2'].forEach(id=>{document.getElementById(id).value=''})
  const badge=document.getElementById('pnav-badge');if(badge)badge.textContent=mine.length
  const grid=document.getElementById('my-grid'),none=document.getElementById('no-mine')
  if(!mine.length){grid.innerHTML='';none.classList.remove('hidden')}else{none.classList.add('hidden');grid.innerHTML=mine.map((a,i)=>cardHTML(a,i)).join('')}
  profileTab('account')
}
function profileTab(t){
  document.getElementById('ptab-account').classList.toggle('hidden',t!=='account')
  document.getElementById('ptab-uploads').classList.toggle('hidden',t!=='uploads')
  document.getElementById('pnav-account').classList.toggle('active',t==='account')
  document.getElementById('pnav-uploads').classList.toggle('active',t==='uploads')
}

async function saveProfile(){
  if(!me)return
  const fn=document.getElementById('p-fn').value.trim()
  const ln=document.getElementById('p-ln').value.trim()
  const em=document.getElementById('p-em').value.trim()
  const org=document.getElementById('p-org').value.trim()
  if(!fn||!ln||!em){toast('Name and email are required.','error');return}
  if(USERS.find(u=>u.email===em&&u.id!==me.id)){toast('That email is already in use.','error');return}
  showLoad()
  try{
    const updated={id:me.id,firstName:fn,lastName:ln,email:em,password:me.pw,role:me.role,org:org||'Public',joined:me.joined||''}
    await fetch(CONFIG.ENDPOINTS.updateUser,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(updated)})
    const idx=USERS.findIndex(u=>u.id===me.id)
    if(idx!==-1){USERS[idx]={...USERS[idx],first:fn,last:ln,email:em,org:org||'Public'};me=USERS[idx]}
    document.getElementById('chip-name').textContent=me.first+' '+me.last
    document.getElementById('chip-av').textContent=me.first[0].toUpperCase()
    hideLoad()
    toast('Profile saved to Cosmos DB ✓','success')
    renderProfile()
  }catch(e){
    hideLoad()
    console.error('Profile update error:',e)
    const idx=USERS.findIndex(u=>u.id===me.id)
    if(idx!==-1){USERS[idx]={...USERS[idx],first:fn,last:ln,email:em,org:org||'Public'};me=USERS[idx]}
    document.getElementById('chip-name').textContent=me.first+' '+me.last
    toast('Profile updated locally (API error)','warn')
    renderProfile()
  }
}

async function changePass(){
  if(!me)return
  const cp=document.getElementById('p-cp').value
  const np=document.getElementById('p-np').value
  const np2=document.getElementById('p-np2').value
  if(!cp||!np||!np2){toast('Please fill in all password fields.','error');return}
  if(cp!==me.pw){toast('Current password is incorrect.','error');return}
  if(np.length<8){toast('New password must be at least 8 characters.','error');return}
  if(np!==np2){toast('New passwords do not match.','error');return}
  showLoad()
  try{
    const updated={id:me.id,firstName:me.first,lastName:me.last,email:me.email,password:np,role:me.role,org:me.org||'Public',joined:me.joined||''}
    await fetch(CONFIG.ENDPOINTS.updateUser,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(updated)})
    const idx=USERS.findIndex(u=>u.id===me.id)
    if(idx!==-1){USERS[idx].pw=np;me=USERS[idx]}
    ;['p-cp','p-np','p-np2'].forEach(id=>{document.getElementById(id).value=''})
    hideLoad()
    toast('Password updated in Cosmos DB ✓','success')
  }catch(e){
    hideLoad()
    console.error('Password update error:',e)
    const idx=USERS.findIndex(u=>u.id===me.id)
    if(idx!==-1){USERS[idx].pw=np;me=USERS[idx]}
    ;['p-cp','p-np','p-np2'].forEach(id=>{document.getElementById(id).value=''})
    toast('Password updated locally (API error)','warn')
  }
}

/* ============================================================
   ADMIN
   ============================================================ */
let adminView='u'
function adminTab(t){adminView=t;document.getElementById('adv-u').classList.toggle('hidden',t!=='u');document.getElementById('adv-a').classList.toggle('hidden',t!=='a');document.getElementById('adt-u').classList.toggle('active',t==='u');document.getElementById('adt-a').classList.toggle('active',t==='a')}
function renderAdmin(){
  if(!me||me.role!=='admin'){toast('Admin access required.','error');goPage('home');return}
  document.getElementById('ub').textContent=USERS.length;document.getElementById('ab').textContent=ASSETS.length
  document.getElementById('t-users').innerHTML=USERS.map(u=>`<tr><td style="color:#0c0e1c;font-weight:600">${u.first} ${u.last}</td><td>${u.email}</td><td><span class="role-badge ${u.role}">${u.role}</span></td><td>${u.org||'—'}</td><td>${u.joined||'—'}</td><td><div class="row-acts">${u.id!==me.id?`<button class="btn-danger-sm" onclick="delUser('${u.id}','${u.first} ${u.last}')">Remove</button>`:`<span style="font-size:.72rem;color:var(--t3)">You</span>`}</div></td></tr>`).join('')
  document.getElementById('t-assets').innerHTML=ASSETS.map(a=>`<tr><td style="color:#0c0e1c;font-weight:600;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${a.title}</td><td>${TL[a.type]||a.type}</td><td>${a.location||'—'}</td><td>${a.uploadedByName||'—'}</td><td>${a.uploadedAt||'—'}</td><td><div class="row-acts"><button class="btn-sm-outline btn-sm" onclick="openDetail('${a.id}')">View</button><button class="btn-danger-sm" onclick="delFromCard('${a.id}','${(a.title||'').replace(/'/g,"\\'")}')">Delete</button></div></td></tr>`).join('')
}

/* ============================================================
   VIEW TOGGLE
   ============================================================ */
function setView(v){
  curView=v
  document.getElementById('vb-grid').classList.toggle('active',v==='grid')
  document.getElementById('vb-list').classList.toggle('active',v==='list')
  const grid=document.getElementById('archive-grid')
  if(grid){grid.className='grid'+(v==='list'?' list-view':'')}
}

/* ============================================================
   RELATED ASSETS
   ============================================================ */
function renderRelated(a){
  const rel=ASSETS.filter(x=>x.id!==a.id&&(x.type===a.type||x.region===a.region)).slice(0,3)
  const wrap=document.getElementById('det-related'),grid=document.getElementById('related-grid')
  if(!wrap||!grid)return
  if(!rel.length){wrap.classList.add('hidden');return}
  wrap.classList.remove('hidden')
  grid.innerHTML=rel.map((r,i)=>cardHTML(r,i)).join('')
}

/* ============================================================
   SHARE & DOWNLOAD
   ============================================================ */
function shareAsset(){
  if(!curAsset)return
  const txt=`HeritageGuard — ${curAsset.title} · ${curAsset.location}`
  if(navigator.clipboard){navigator.clipboard.writeText(txt).then(()=>toast('Link copied to clipboard','success'))}
  else{toast('Asset: '+curAsset.title,'success')}
}
function downloadAsset(){
  if(!curAsset)return
  if(curAsset.thumbnail){
    const a=document.createElement('a');a.href=curAsset.thumbnail;a.download=(curAsset.title||'asset').replace(/\s+/g,'_')+'.jpg';a.target='_blank';a.click()
  }else{toast('No downloadable file attached to this record.','warn')}
}

/* ============================================================
   SKELETON LOADING
   ============================================================ */
function renderSkeletons(gridId,count){
  const grid=document.getElementById(gridId);if(!grid)return
  grid.innerHTML=Array.from({length:count},()=>`<div class="skel-card"><div class="skel skel-thumb"></div><div class="skel-body"><div class="skel skel-line long"></div><div class="skel skel-line med"></div><div class="skel skel-line short"></div></div></div>`).join('')
}

/* ============================================================
   ANIMATED COUNTERS
   ============================================================ */
function initCounters(){
  const els=document.querySelectorAll('.hs-n')
  if(!els.length||countersAnimated)return
  const obs=new IntersectionObserver(entries=>{
    entries.forEach(e=>{
      if(e.isIntersecting&&!countersAnimated){
        countersAnimated=true
        els.forEach(el=>{
          const raw=el.textContent.trim()
          const cleaned=raw.replace(/,/g,'')
          const num=parseFloat(cleaned.replace(/[^0-9.]/g,''))
          if(isNaN(num))return
          const suffix=cleaned.replace(/[0-9.]/g,'')
          const isFloat=!Number.isInteger(num)
          const dur=1400;let startTime=null
          const fmt=v=>isFloat?v.toFixed(1):Math.round(v).toLocaleString()
          const step=ts=>{
            if(!startTime)startTime=ts
            const p=Math.min((ts-startTime)/dur,1)
            const ease=1-Math.pow(1-p,3)
            el.textContent=fmt(ease*num)+suffix
            if(p<1)requestAnimationFrame(step)
            else{el.textContent=raw}
          }
          requestAnimationFrame(step)
        })
        obs.disconnect()
      }
    })
  },{threshold:.4})
  const strip=document.querySelector('.hero-stats')
  if(strip)obs.observe(strip)
}

/* ============================================================
   DRAG & DROP UPLOAD
   ============================================================ */
function initDragDrop(){
  const zone=document.getElementById('fzone');if(!zone)return
  zone.addEventListener('dragover',e=>{e.preventDefault();zone.style.borderColor='var(--au2)';zone.style.background='var(--aug)'})
  zone.addEventListener('dragleave',()=>{zone.style.borderColor='';zone.style.background=''})
  zone.addEventListener('drop',e=>{
    e.preventDefault();zone.style.borderColor='';zone.style.background=''
    const fi=document.getElementById('u-fi')
    if(e.dataTransfer.files.length){
      const dt=new DataTransfer()
      dt.items.add(e.dataTransfer.files[0])
      fi.files=dt.files
      onFilePick(fi)
    }
  })
}

/* ============================================================
   SCROLL PROGRESS
   ============================================================ */
window.addEventListener('scroll',()=>{
  const prog=document.getElementById('scroll-prog');if(!prog)return;
  const scrolled=(window.scrollY/(document.documentElement.scrollHeight-window.innerHeight))*100;
  prog.style.width=Math.min(scrolled,100)+'%';
},{passive:true})

/* ============================================================
   BROWSER BACK / FORWARD
   ============================================================ */
window.addEventListener('popstate',e=>{
  if(!e.state){goPage('home',false);return}
  if(e.state.page==='detail'&&e.state.id){openDetail(e.state.id,false)}
  else{goPage(e.state.page||'home',false)}
})

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded',()=>{
  document.getElementById('modal-ok').addEventListener('click',()=>{const cb=modalCb;closeModal();if(cb)cb()})
  boot()
})