const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');require('./shim.cjs');
const maps={idb:new Map(),ls:new Map(),cache:new Map()},fails=new Set();let delay=0,inflight=0,peak=0,writes=0;
function install(){global.localStorage={getItem:k=>maps.ls.get(k)||null,setItem:(k,v)=>{if(fails.has('ls'))throw Error('quota');maps.ls.set(k,v)},removeItem:k=>maps.ls.delete(k)};
 global.idbGet=async k=>maps.idb.get(k)||null;global.cacheGet=async k=>maps.cache.get(k)||null;
 global.idbSet=async(k,v)=>{inflight++;peak=Math.max(peak,inflight);if(delay)await new Promise(r=>setTimeout(r,delay));inflight--;if(fails.has('idb'))throw Error('idb failure');maps.idb.set(k,v);writes++;};
 global.cacheSet=async(k,v)=>{if(fails.has('cache'))throw Error('cache failure');maps.cache.set(k,v);};global.idbDel=async k=>maps.idb.delete(k);global.cacheDel=async k=>maps.cache.delete(k);
}
function reset(){for(const m of Object.values(maps))m.clear();fails.clear();SAVE_ENABLED=true;install();}
function meta(){return {club:UC().cn,season:WORLD.season,day:WORLD.day};}
const results=[];function ok(n){console.log('PASS',n);results.push(n);}
(async()=>{reset();newWorld(4242,'Coventry City');const legacy=JSON.stringify(WORLD);maps.idb.set(SAVEKEY,legacy);maps.idb.set(METAKEY,JSON.stringify({...meta(),at:1}));
 WORLD.day=5;fails.add('idb');await storeSave(JSON.stringify(WORLD),meta());assert.equal(JSON.parse(await readSave()).day,5);ok('A02 successful newer LS/cache beat stale IndexedDB');
 fails.clear();await healSave();assert.equal(maps.idb.get(SAVEKEY),maps.ls.get(SAVEKEY));ok('A02 stale layer healed from latest valid body');
 const good=maps.idb.get(SAVEKEY);WORLD.day=6;await storeSave(JSON.stringify(WORLD),meta());const newest=maps.idb.get(SAVEKEY);maps.idb.set(SAVEKEY,newest+'broken');maps.ls.set(SAVEKEY,good);maps.cache.set(SAVEKEY,good);assert.equal(JSON.parse(await readSave()).day,5);ok('A02 corrupt newest body falls back by checksum');
 maps.idb.set(SAVEKEY,newest);maps.idb.set(METAKEY,'{"day":0,"at":0}');assert.equal((await readMeta()).day,6);ok('A02 embedded metadata wins over stale index');
 reset();maps.cache.set(SAVEKEY,await zipSave(legacy));maps.cache.set(METAKEY,JSON.stringify({...meta(),day:0,at:10}));assert.equal(JSON.parse(await readSave()).day,0);ok('A02 legacy compressed and raw JSON readable');
 reset();delay=10;WORLD.day=8;const first=storeSave(JSON.stringify(WORLD),meta());WORLD.day=9;const second=storeSave(JSON.stringify(WORLD),meta());await Promise.all([first,second]);assert.equal(JSON.parse(await readSave()).day,9);assert.equal(peak,1);ok('A02 concurrent saves serialized in invocation order');
 WORLD.day=10;const pending=storeSave(JSON.stringify(WORLD),meta());await new Promise(r=>setTimeout(r,5));await deleteSave();await pending;markDirty();flushAutosave(true);await new Promise(r=>setTimeout(r,1700));assert(Object.values(maps).every(m=>!m.has(SAVEKEY)));assert(!SAVE_ENABLED);ok('A10 deletion cancels pending and drains inflight saves; no autosave recreation');
 reset();fails.add('idb');fails.add('cache');fails.add('ls');await assert.rejects(storeSave(JSON.stringify(WORLD),meta()),/三层存储/);ok('A02 total failure reported');
 reset();const raw='{bad';maps.idb.set(SAVEKEY,raw);maps.cache.set(SAVEKEY,legacy);assert.equal(JSON.parse(await readSave()).day,0);ok('A02 invalid old layer never masks valid legacy body');
 fs.writeFileSync(path.resolve(__dirname,'../../output/deadline/storage.json'),JSON.stringify(results,null,2));clearTimeout(SAVE_TIMER);process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});
