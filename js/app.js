/* HeritageGuard app.js — final */

let USERS = [
  { id:'u1', first:'Deepak',  last:'Pokhrel',  email:'admin@heritaguard.org',       pw:'admin1234', role:'admin',       org:'HeritageGuard',  joined:'2026-01-10' },
  { id:'u2', first:'Sarah',   last:'Okonkwo',  email:'contributor@heritaguard.org',  pw:'demo1234',  role:'contributor', org:'UNESCO',         joined:'2026-02-14' },
  { id:'u3', first:'James',   last:'Thornton', email:'james@britishmuseum.org',      pw:'demo1234',  role:'contributor', org:'British Museum', joined:'2026-02-28' },
]

const TL = { image:'Image', video:'4K Video', '3dscan':'3D Scan', lidar:'LiDAR Survey', document:'Document' }
const TI = { image:'🖼️', video:'🎬', '3dscan':'📦', lidar:'🛰', document:'📄' }

let ASSETS=[],me=null,curPage='home',prevPage='home',curAsset=null,typeFilter='',stimer=null,modalCb=null,USE_LIVE=false

/* BOOT */
async function boot(){
  try{ASSETS=USE_LIVE?await getAllAssets():await fetch('assets.json').then(r=>r.json())}catch(e){ASSETS=[];console.warn(e)}
  renderFeatured()
  const el=document.getElementById('home-total');if(el)el.textContent=ASSETS.length
}

/* NAVIGATION */
function goPage(n){
  document.querySelectorAll('.pg').forEach(p=>p.classList.add('hidden'))
  const pg=document.getElementById('pg-'+n);if(pg)pg.classList.remove('hidden')
  document.querySelectorAll('.nl').forEach(b=>b.classList.remove('active'))
  const nb=document.getElementById('nl-'+n);if(nb)nb.classList.add('active')
  prevPage=curPage;curPage=n
  window.scrollTo({top:0,behavior:'smooth'})
  if(n==='archive')renderArchive()
  if(n==='admin')renderAdmin()
  if(n==='home')renderFeatured()
  if(n==='profile')renderProfile()
}
function openRegister(){goPage('login');authTab('reg')}
function needAuth(){if(!me){toast('Please sign in to upload assets.','warn');goPage('login');return}if(me.role==='viewer'){toast('Your account does not have upload permission.','warn');return}goPage('upload')}
function goArchiveType(t){typeFilter=t;goPage('archive');setTimeout(()=>{document.querySelectorAll('.tp').forEach(b=>b.classList.remove('active'));const tb=document.querySelector(`.tp[data-t="${t}"]`);if(tb)tb.classList.add('active');applyFilters()},50)}

/* UI HELPERS */
let _tt=null
function toast(msg,type='success'){const el=document.getElementById('toast');el.textContent=msg;el.className=type;el.classList.remove('hidden');clearTimeout(_tt);_tt=setTimeout(()=>el.classList.add('hidden'),3000)}
function showLoad(){document.getElementById('loader').classList.remove('hidden')}
function hideLoad(){document.getElementById('loader').classList.add('hidden')}

/* MODAL */
function openModal(title,msg,label,cb){
  document.getElementById('modal-title').textContent=title
  document.getElementById('modal-msg').textContent=msg
  document.getElementById('modal-ok').textContent=label
  modalCb=cb
  document.getElementById('modal').classList.remove('hidden')
}
function closeModal(){document.getElementById('modal').classList.add('hidden');modalCb=null}

/* HOME */
function renderFeatured(){
  const list=ASSETS.filter(a=>a.featured)
  const el=document.getElementById('featured-grid');if(el)el.innerHTML=list.map((a,i)=>cardHTML(a,i)).join('')
  const c=document.getElementById('home-total');if(c)c.textContent=ASSETS.length
}

/* ARCHIVE */
function renderArchive(){applyFilters()}
function applyFilters(){
  const q=(document.getElementById('sq')?.value||'').trim().toLowerCase()
  const loc=(document.getElementById('sl')?.value||'').trim().toLowerCase()
  const tag=(document.getElementById('st')?.value||'').trim().toLowerCase()
  let res=[...ASSETS]
  if(typeFilter)res=res.filter(a=>a.type===typeFilter)
  if(loc)res=res.filter(a=>(a.location||'').toLowerCase().includes(loc)||(a.region||'').toLowerCase().includes(loc))
  if(tag)res=res.filter(a=>(a.tags||[]).some(t=>t.toLowerCase().includes(tag)))
  if(q)res=res.filter(a=>(a.title||'').toLowerCase().includes(q)||(a.location||'').toLowerCase().includes(q)||(a.description||'').toLowerCase().includes(q)||(a.tags||[]).some(t=>t.toLowerCase().includes(q))||(a.aiTags||[]).some(t=>t.toLowerCase().includes(q)))
  const grid=document.getElementById('archive-grid'),none=document.getElementById('no-results'),cnt=document.getElementById('res-count')
  if(!grid)return
  cnt.textContent=res.length+' asset'+(res.length!==1?'s':'')+' found'
  if(!res.length){grid.innerHTML='';none.classList.remove('hidden');return}
  none.classList.add('hidden');grid.innerHTML=res.map((a,i)=>cardHTML(a,i)).join('')
}
function debSearch(){clearTimeout(stimer);stimer=setTimeout(applyFilters,250)}
function setType(btn,t){document.querySelectorAll('.tp').forEach(b=>b.classList.remove('active'));btn.classList.add('active');typeFilter=t;applyFilters()}
function clearSearch(){['sq','sl','st'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=''});typeFilter='';document.querySelectorAll('.tp').forEach(b=>b.classList.remove('active'));const all=document.querySelector('.tp[data-t=""]');if(all)all.classList.add('active');applyFilters()}

/* CARD HTML */
function cardHTML(a,i){
  const esc=s=>(s||'').replace(/'/g,"\\'").replace(/"/g,'&quot;')
  const icon=TI[a.type]||'📁',label=TL[a.type]||a.type
  const thumb=a.thumbnail?`<img src="${a.thumbnail}" alt="${esc(a.title)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`:'';
  const fb=`<div style="display:${a.thumbnail?'none':'flex'};width:100%;height:100%;align-items:center;justify-content:center;font-size:2.6rem">${icon}</div>`
  const canAct=me&&(me.id===a.uploadedBy||me.role==='admin')
  const acts=canAct?`<button class="btn-ghost btn-sm" onclick="event.stopPropagation();editFromCard('${a.id}')">Edit</button><button class="btn-red-sm btn-sm" onclick="event.stopPropagation();delFromCard('${a.id}','${esc(a.title)}')">Delete</button>`:''
  return`<div class="card" style="animation-delay:${i*.04}s" onclick="openDetail('${a.id}')"><div class="card-thumb">${thumb}${fb}<div class="card-type-badge">${label}</div></div><div class="card-body"><div class="card-meta"><span></span><span class="card-date">${a.uploadedAt||''}</span></div><div class="card-title">${a.title||''}</div><div class="card-loc">${a.location||''}</div><div class="card-acts"><button class="btn-ghost btn-sm" onclick="event.stopPropagation();openDetail('${a.id}')">View</button>${acts}</div></div></div>`
}

/* DETAIL */
function openDetail(id){
  const a=ASSETS.find(x=>x.id===id);if(!a)return;curAsset=a
  const back=document.getElementById('det-back');back.onclick=()=>goPage(prevPage==='detail'?'archive':prevPage)
  const canAct=me&&(me.id===a.uploadedBy||me.role==='admin')
  document.getElementById('det-acts').classList.toggle('hidden',!canAct)
  renderDetBody(a);goPage('detail')
}
function renderDetBody(a){
  const icon=TI[a.type]||'📁',label=TL[a.type]||a.type
  const media=a.thumbnail?`<img class="det-img" src="${a.thumbnail}" alt="${a.title}" onerror="this.outerHTML='<div class=\\'det-ph\\'>${icon}</div>'">`:`<div class="det-ph">${icon}</div>`
  const tagsHTML=(a.tags||[]).map(t=>`<span class="tag">${t}</span>`).join('')
  const specsHTML=a.specs&&Object.keys(a.specs).length?`<div class="det-block"><div class="det-block-label">${label} Specifications</div><div class="spec-grid">${Object.entries(a.specs).map(([k,v])=>`<div class="si"><span class="si-v">${v}</span><span class="si-k">${k}</span></div>`).join('')}</div></div>`:''
  const aiHTML=(a.aiTags||[]).length?`<div class="det-block"><div class="det-block-label">Auto-generated tags</div><div class="tags">${(a.aiTags||[]).map(t=>`<span class="tag">${t}</span>`).join('')}</div></div>`:''
  document.getElementById('det-body').innerHTML=`${media}<div class="det-eyebrow">${label} · ${a.uploadedAt||'—'} · by ${a.uploadedByName||'—'}</div><h1 class="det-title">${a.title||''}</h1><div class="det-metas"><div class="dm"><span class="dm-l">Location</span><span class="dm-v">${a.location||'—'}</span></div><div class="dm"><span class="dm-l">Region</span><span class="dm-v">${a.region||'—'}</span></div><div class="dm"><span class="dm-l">Type</span><span class="dm-v">${label}</span></div><div class="dm"><span class="dm-l">Uploaded by</span><span class="dm-v">${a.uploadedByName||'—'}</span></div></div><p class="det-desc">${a.description||'No description provided.'}</p><div class="tags">${tagsHTML}</div>${specsHTML}${aiHTML}`
}

/* AUTH */
function authTab(t){document.getElementById('f-in').classList.toggle('hidden',t!=='in');document.getElementById('f-reg').classList.toggle('hidden',t!=='reg');document.getElementById('at-in').classList.toggle('active',t==='in');document.getElementById('at-reg').classList.toggle('active',t==='reg')}
function fillDemo(e,p){document.getElementById('in-em').value=e;document.getElementById('in-pw').value=p}
function doLogin(){
  const email=document.getElementById('in-em').value.trim(),pw=document.getElementById('in-pw').value
  if(!email||!pw){toast('Please enter your email and password.','error');return}
  showLoad();setTimeout(()=>{hideLoad();const u=USERS.find(u=>u.email===email&&u.pw===pw);if(!u){toast('Incorrect email or password.','error');return}signIn(u)},600)
}
function doRegister(){
  const fn=document.getElementById('rg-fn').value.trim(),ln=document.getElementById('rg-ln').value.trim(),em=document.getElementById('rg-em').value.trim(),pw=document.getElementById('rg-pw').value,org=document.getElementById('rg-org').value.trim()
  if(!fn||!ln||!em||!pw){toast('Please fill in all required fields.','error');return}
  if(pw.length<8){toast('Password must be at least 8 characters.','error');return}
  if(USERS.find(u=>u.email===em)){toast('An account with this email already exists.','error');return}
  showLoad();setTimeout(()=>{hideLoad();USERS.push({id:'u'+Date.now(),first:fn,last:ln,email:em,pw,role:'contributor',org:org||'Public',joined:new Date().toISOString().split('T')[0]});toast('Account created! You can now sign in.','success');authTab('in');document.getElementById('in-em').value=em;document.getElementById('in-pw').value=''},600)
}
function signIn(u){
  me=u
  document.getElementById('nav-guest').classList.add('hidden')
  document.getElementById('nav-user').classList.remove('hidden')
  document.getElementById('chip-name').textContent=u.first+' '+u.last
  document.getElementById('chip-av').textContent=u.first[0].toUpperCase()
  document.getElementById('nl-upload').classList.remove('hidden')
  document.getElementById('nl-admin').classList.toggle('hidden',u.role!=='admin')
  toast('Welcome back, '+u.first+'!','success');goPage('home')
}
function doLogout(){me=null;document.getElementById('nav-guest').classList.remove('hidden');document.getElementById('nav-user').classList.add('hidden');document.getElementById('nl-upload').classList.add('hidden');document.getElementById('nl-admin').classList.add('hidden');toast('Signed out.','success');goPage('home')}

/* UPLOAD */
function chkSpecs(t){document.getElementById('spec-card').classList.toggle('hidden',t!=='3dscan'&&t!=='lidar')}
function onFilePick(input){
  const drop=document.getElementById('fzone'),ui=document.getElementById('fzone-ui')
  if(input.files&&input.files[0]){const f=input.files[0];drop.classList.add('ok');ui.innerHTML=`<div class="fzone-arrow" style="color:var(--green)">✓</div><p class="fzone-main">${f.name}</p><p class="fzone-sub">${(f.size/1024/1024).toFixed(2)} MB</p>`}
}
function doUpload(){
  if(!me){toast('Please sign in first.','error');return}
  const title=document.getElementById('u-ti').value.trim(),desc=document.getElementById('u-de').value.trim(),loc=document.getElementById('u-lo').value.trim(),region=document.getElementById('u-re').value,type=document.getElementById('u-ty').value,tags=document.getElementById('u-ta').value.trim(),file=document.getElementById('u-fi')
  if(!title||!loc||!region||!type){toast('Please fill in all required fields.','error');return}
  if(!file.files[0]){toast('Please select a file.','error');return}
  showLoad();setTimeout(()=>{
    hideLoad()
    const specs={}
    if(type==='3dscan'||type==='lidar'){const ac=document.getElementById('u-ac')?.value.trim(),me2=document.getElementById('u-me')?.value.trim(),eq=document.getElementById('u-eq')?.value.trim();if(ac)specs['Accuracy']=ac;if(me2)specs['Capture method']=me2;if(eq)specs['Equipment']=eq}
    if(type==='video'){specs['Resolution']='4K UHD';specs['Processing']='Scene detection & subtitles generated'}
    ASSETS.unshift({id:'a'+Date.now(),title,description:desc,location:loc,region,type,tags:tags?tags.split(',').map(t=>t.trim()).filter(Boolean):[],aiTags:[type,(loc.split(',')[0]||'').trim().toLowerCase()],specs,thumbnail:type==='image'?URL.createObjectURL(file.files[0]):'',uploadedAt:new Date().toISOString().split('T')[0],uploadedBy:me.id,uploadedByName:me.first+' '+me.last,featured:false})
    toast('Asset uploaded successfully!','success');resetUpload();goPage('archive')
  },800)
}
function resetUpload(){['u-ti','u-de','u-lo','u-ta','u-ac','u-me','u-eq'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=''});document.getElementById('u-ty').value='';document.getElementById('u-re').value='';document.getElementById('u-fi').value='';const drop=document.getElementById('fzone');if(drop)drop.classList.remove('ok');const ui=document.getElementById('fzone-ui');if(ui)ui.innerHTML='<div class="fzone-arrow">↑</div><p class="fzone-main">Click to choose file</p><p class="fzone-sub">Images · 4K Video · 3D Scans · LiDAR · PDF</p>';document.getElementById('spec-card').classList.add('hidden')}

/* EDIT */
function openEditPg(){if(!curAsset)return;const a=curAsset;document.getElementById('e-ti').value=a.title||'';document.getElementById('e-de').value=a.description||'';document.getElementById('e-lo').value=a.location||'';document.getElementById('e-re').value=a.region||'';document.getElementById('e-ty').value=a.type||'image';document.getElementById('e-ta').value=(a.tags||[]).join(', ');goPage('edit')}
function editFromCard(id){const a=ASSETS.find(x=>x.id===id);if(!a)return;curAsset=a;openEditPg()}
function doUpdate(){
  if(!curAsset)return
  const title=document.getElementById('e-ti').value.trim(),desc=document.getElementById('e-de').value.trim(),loc=document.getElementById('e-lo').value.trim(),region=document.getElementById('e-re').value,type=document.getElementById('e-ty').value,tags=document.getElementById('e-ta').value.trim()
  if(!title||!loc){toast('Title and location are required.','error');return}
  showLoad();setTimeout(()=>{hideLoad();const idx=ASSETS.findIndex(a=>a.id===curAsset.id);if(idx!==-1){ASSETS[idx]={...ASSETS[idx],title,description:desc,location:loc,region,type,tags:tags?tags.split(',').map(t=>t.trim()).filter(Boolean):[]};curAsset=ASSETS[idx]};toast('Asset updated.','success');renderDetBody(curAsset);goPage('detail')},500)
}

/* DELETE */
function confirmDelAsset(){if(!curAsset)return;openModal('Delete this asset?',`"${curAsset.title}" will be permanently removed.`,'Delete',()=>execDel(curAsset.id))}
function delFromCard(id,title){openModal('Delete this asset?',`"${title}" will be permanently removed.`,'Delete',()=>execDel(id))}
function execDel(id){showLoad();setTimeout(()=>{hideLoad();const idx=ASSETS.findIndex(a=>a.id===id);if(idx!==-1)ASSETS.splice(idx,1);if(curAsset&&curAsset.id===id)curAsset=null;toast('Asset deleted.','success');goPage('archive')},400)}
function delUser(uid,name){if(me&&me.id===uid){toast("You can't remove your own account.",'error');return};openModal('Remove user?',`"${name}" will be permanently removed.`,'Remove',()=>{showLoad();setTimeout(()=>{hideLoad();const idx=USERS.findIndex(u=>u.id===uid);if(idx!==-1)USERS.splice(idx,1);toast('User removed.','success');renderAdmin()},400)})}

/* PROFILE */
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
  const grid=document.getElementById('my-grid'),none=document.getElementById('no-mine')
  if(!mine.length){grid.innerHTML='';none.classList.remove('hidden')}else{none.classList.add('hidden');grid.innerHTML=mine.map((a,i)=>cardHTML(a,i)).join('')}
}
function saveProfile(){
  if(!me)return
  const fn=document.getElementById('p-fn').value.trim(),ln=document.getElementById('p-ln').value.trim(),em=document.getElementById('p-em').value.trim(),org=document.getElementById('p-org').value.trim()
  if(!fn||!ln||!em){toast('Name and email are required.','error');return}
  if(USERS.find(u=>u.email===em&&u.id!==me.id)){toast('That email is already in use.','error');return}
  showLoad();setTimeout(()=>{hideLoad();const idx=USERS.findIndex(u=>u.id===me.id);if(idx!==-1){USERS[idx]={...USERS[idx],first:fn,last:ln,email:em,org:org||'Public'};me=USERS[idx]};document.getElementById('chip-name').textContent=me.first+' '+me.last;document.getElementById('chip-av').textContent=me.first[0].toUpperCase();toast('Profile updated!','success');renderProfile()},500)
}
function changePass(){
  if(!me)return
  const cp=document.getElementById('p-cp').value,np=document.getElementById('p-np').value,np2=document.getElementById('p-np2').value
  if(!cp||!np||!np2){toast('Please fill in all password fields.','error');return}
  if(cp!==me.pw){toast('Current password is incorrect.','error');return}
  if(np.length<8){toast('New password must be at least 8 characters.','error');return}
  if(np!==np2){toast('New passwords do not match.','error');return}
  showLoad();setTimeout(()=>{hideLoad();const idx=USERS.findIndex(u=>u.id===me.id);if(idx!==-1){USERS[idx].pw=np;me=USERS[idx]};['p-cp','p-np','p-np2'].forEach(id=>{document.getElementById(id).value=''});toast('Password updated successfully!','success')},500)
}

/* ADMIN */
let adminView='u'
function adminTab(t){adminView=t;document.getElementById('adv-u').classList.toggle('hidden',t!=='u');document.getElementById('adv-a').classList.toggle('hidden',t!=='a');document.getElementById('adt-u').classList.toggle('active',t==='u');document.getElementById('adt-a').classList.toggle('active',t==='a')}
function renderAdmin(){
  if(!me||me.role!=='admin'){toast('Admin access required.','error');goPage('home');return}
  document.getElementById('ub').textContent=USERS.length;document.getElementById('ab').textContent=ASSETS.length
  document.getElementById('t-users').innerHTML=USERS.map(u=>`<tr><td style="color:var(--white);font-weight:500">${u.first} ${u.last}</td><td>${u.email}</td><td><span class="role-badge ${u.role}">${u.role}</span></td><td>${u.org||'—'}</td><td>${u.joined||'—'}</td><td><div class="row-acts">${u.id!==me.id?`<button class="btn-red-sm" onclick="delUser('${u.id}','${u.first} ${u.last}')">Remove</button>`:`<span style="font-size:.72rem;color:var(--text3)">You</span>`}</div></td></tr>`).join('')
  document.getElementById('t-assets').innerHTML=ASSETS.map(a=>`<tr><td style="color:var(--white);font-weight:500;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${a.title}</td><td>${TL[a.type]||a.type}</td><td>${a.location||'—'}</td><td>${a.uploadedByName||'—'}</td><td>${a.uploadedAt||'—'}</td><td><div class="row-acts"><button class="btn-ghost btn-sm" onclick="openDetail('${a.id}')">View</button><button class="btn-red-sm" onclick="delFromCard('${a.id}','${(a.title||'').replace(/'/g,"\\'")}')">Delete</button></div></td></tr>`).join('')
}

/* INIT */
document.addEventListener('DOMContentLoaded',()=>{
  document.getElementById('modal-ok').addEventListener('click',()=>{const cb=modalCb;closeModal();if(cb)cb()})
  boot()
})