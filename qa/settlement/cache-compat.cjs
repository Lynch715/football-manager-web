const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'../..'),sw=fs.readFileSync(path.join(root,'sw.js'),'utf8'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const version=sw.match(/const VERSION = "([^"]+)"/)?.[1],oldVersion='fmweb-v71-transfer-position';
 assert(version&&version!==oldVersion);
 const store=new Map([[oldVersion,new Map([['./index.html','old-code']])],['fmweb-saves',new Map([
   ['fmweb_save_v2','existing-progress'],['fmweb_save_v2_meta','existing-meta'],['fmweb_save_fp','existing-fingerprint'],
   ['fmweb_football_manager_cheat_backup_sample-1','existing-cheat-backup'],['fmweb_cheat_backup_sample-2','existing-legacy-backup']
 ])],[version,new Map([['./index.html','new-code']])]]);
 const events={},deleted=[],original=JSON.stringify([...store.get('fmweb-saves')]);
 const caches={keys:async()=>[...store.keys()],delete:async key=>{deleted.push(key);return store.delete(key);},open:async key=>({addAll:async()=>{},put:async()=>{}})};
 const context={self:{addEventListener:(name,fn)=>events[name]=fn,skipWaiting:async()=>{},clients:{claim:async()=>{}}},caches,location:{origin:'https://lynch715.github.io'},URL,setTimeout,clearTimeout,fetch:async()=>{throw Error('Unexpected fetch');}};
 vm.runInNewContext(sw,context);
 let done;events.activate({waitUntil:p=>done=p});await done;
 assert(store.has(version));assert(!store.has(oldVersion));assert.equal(JSON.stringify([...store.get('fmweb-saves')]),original);assert(!deleted.includes('fmweb-saves'));
 assert(html.includes('const SAVEKEY="fmweb_save_v2"'));assert(html.includes('const CACHE_NS="fmweb-saves"'));assert(!html.includes('controllerchange",()=>location.reload'));
 console.log('PASS resource cache upgrades to '+version+'; saves and cheat backups retained');
 const out=process.env.QA_OUT||path.join(root,'output/settlement');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'cache-compat.json'),JSON.stringify({passed:true,version,deleted,saveContentsUnchanged:true,storageKeysUnchanged:true,checks:3},null,2)+'\n');
})().catch(err=>{console.error(err);process.exit(1);});
