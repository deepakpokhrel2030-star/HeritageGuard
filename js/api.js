/* api.js */
async function getAllAssets(){
  const r=await fetch(CONFIG.ENDPOINTS.getAssets,{method:'GET',headers:{'Content-Type':'application/json'}});
  if(!r.ok)throw new Error(r.status);
  const data=await r.json();
  if(data&&Array.isArray(data.Documents))return data.Documents;
  if(data&&Array.isArray(data.value))return data.value;
  if(Array.isArray(data))return data;
  return[];
}
async function getAssetById(id){
  const r=await fetch(CONFIG.ENDPOINTS.getAsset+'?id='+encodeURIComponent(id),{method:'GET',headers:{'Content-Type':'application/json'}});
  if(!r.ok)throw new Error(r.status);
  const data=await r.json();
  if(data&&data.Documents)return data.Documents[0];
  return data;
}
async function createAsset(asset){
  const r=await fetch(CONFIG.ENDPOINTS.createAsset,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(asset)});
  if(!r.ok)throw new Error(r.status);
  return r.json();
}
async function updateAsset(id,data){
  const r=await fetch(CONFIG.ENDPOINTS.updateAsset,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,...data})});
  if(!r.ok)throw new Error(r.status);
  return r.json();
}
async function deleteAsset(id,region){
  const url=CONFIG.ENDPOINTS.deleteAsset+'&id='+encodeURIComponent(id)+'&region='+encodeURIComponent(region||'Asia');
  const r=await fetch(url,{method:'DELETE',headers:{'Content-Type':'application/json'}});
  if(!r.ok)throw new Error(r.status);
  return r.status;
}