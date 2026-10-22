// Generate a disposable old-version fixture locally; never use or publish a user's save.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process');
const root=path.resolve(__dirname,'../..'),file=process.env.LEGACY_FILE||path.join(__dirname,'fixtures/legacy-world.json');
if(fs.existsSync(file)){console.log(file);process.exit(0);}
const v60='6bb0b633382230cb81bd91c6dae18f9a71ea0141';
const old=cp.execFileSync('git',['show',v60+':index.html'],{cwd:root,maxBuffer:8*1024*1024});
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'fm-v60-fixture-'));
try{
 fs.writeFileSync(path.join(dir,'index.html'),old);fs.copyFileSync(path.join(root,'data-real.js'),path.join(dir,'data-real.js'));
 process.env.FMFILE=path.join(dir,'index.html');require('../deadline/shim.cjs');newWorld(20261022,'Coventry City');let n=0;
 while(n<3){const r=advance();if(r.t==='match'){CURMATCH=runMatch(createMatch(r.fx.home,r.fx.away,{comp:r.fx.comp,round:r.fx.round,userSide:r.fx.home===WORLD.userClub?0:1,...knockoutOpts(r.fx)}));finishUserMatch();n++;}clearTimeout(SAVE_TIMER);}
 fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(WORLD));console.log(file);
}finally{fs.rmSync(dir,{recursive:true,force:true});}
process.exit(0);
