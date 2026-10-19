const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');require('./shim.cjs');
const out=path.resolve(__dirname,'../../output/deadline'),hash=s=>crypto.createHash('sha256').update(s).digest('hex'),results=[];
(async()=>{
 newWorld(4242,'Coventry City');const raw=process.env.LEGACY_FILE?fs.readFileSync(process.env.LEGACY_FILE,'utf8'):JSON.stringify(WORLD);const old=JSON.parse(raw);seedRng(4242);adoptWorld(old);
 const legacy={inputSHA256:hash(raw),loadedSHA256:hash(JSON.stringify(WORLD)),financeSHA256:hash(JSON.stringify(WORLD.clubs.map(c=>c.finance))),squadSHA256:hash(JSON.stringify(WORLD.clubs.map(c=>c.squad)))};
 if(process.env.LEGACY_ONLY){fs.writeFileSync(process.env.QA_REPORT,JSON.stringify(legacy,null,2));clearTimeout(SAVE_TIMER);process.exit(0)}
 if(process.env.LEGACY_BASELINE)assert.deepEqual(legacy,JSON.parse(fs.readFileSync(process.env.LEGACY_BASELINE)),'same old save must load identically before and after this fix');results.push('old save load and finances/rosters unchanged');
 const baseline=JSON.stringify(WORLD),maps={idb:new Map(),ls:new Map(),cache:new Map()};
 global.idbGet=async k=>maps.idb.get(k);global.idbSet=async(k,v)=>maps.idb.set(k,v);global.cacheGet=async k=>maps.cache.get(k);global.cacheSet=async(k,v)=>maps.cache.set(k,v);global.localStorage={getItem:k=>maps.ls.get(k),setItem:(k,v)=>maps.ls.set(k,v)};
 for(const winter of [false,true]){
  adoptWorld(JSON.parse(baseline));WORLD.day=winter?winterDay():0;WORLD.day=windowEndDay();WORLD.fixtures=WORLD.fixtures.filter(f=>f.day!==WORLD.day);seedRng(5001);advance();assert.equal(WORLD.deadlineMarketKey,WORLD.season+':'+WORLD.day);const date=WORLD.day,quotes=hash(JSON.stringify(WORLD.offers)),fin=hash(JSON.stringify(WORLD.clubs.map(c=>c.finance)));
  await storeSave(JSON.stringify(WORLD),{club:UC().cn,season:WORLD.season,day:WORLD.day});const saved=await readSave();assert(saved);for(const m of Object.values(maps))assert(m.has(SAVEKEY));adoptWorld(JSON.parse(saved));assert.equal(prepareDeadlineMarket(),false);assert.equal(hash(JSON.stringify(WORLD.offers)),quotes);assert.equal(hash(JSON.stringify(WORLD.clubs.map(c=>c.finance))),fin);
  const original=global.marketDaily;global.marketDaily=()=>{throw Error('read-back generated deadline market a second time')};try{assert.equal(advance().t,'day')}finally{global.marketDaily=original}assert.equal(WORLD.day,date+1);assert(!inTransferWindow());assert.equal(WORLD.offers.length,0);results.push((winter?'winter':'summer')+' prepared marker and quotes survive actual three-layer store/read without duplicate market');
 }
 if(process.env.LEGACY_FILE)assert.equal(hash(fs.readFileSync(process.env.LEGACY_FILE,'utf8')),legacy.inputSHA256);
 fs.writeFileSync(path.join(out,'save.json'),JSON.stringify({passed:true,checks:results.length,legacy,originalFileUnchanged:true,results},null,2));console.log('PASS',results.length,'old-save and actual three-layer persistence checks');clearTimeout(SAVE_TIMER);process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});
