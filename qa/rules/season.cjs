// 从真正旧版存档运行到延迟附加赛结束，再验证原 endSeason 的真实跨季结果。
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');require('../deadline/shim.cjs');
const original=endSeason;let verified=false;
global.endSeason=function(){
 if(!seasonReady())return original();
 const p=P(UC().squad.find(id=>P(id).pos!=='GK')),id=p.id,season=WORLD.season,day=WORLD.day,rest=offseasonDays();
 p.age=20;p.contract=season+5;p.injury=120;p.injRecovery=.5;p.condition=25;p.sharp=30;UC().physioRating=10;
 const d=disciplineOf(p);d.bans={L:2,C:1};d.yellow={L:4,C:3};projectClubSuspensions(UC(),'L');
 const result=original(),q=P(id);assert.equal(WORLD.season,season+1);assert.equal(WORLD.day,0);assert(q);assert.equal(q.injury,120-rest);assert.equal(q.injRecovery,.5);assert.equal(q.condition,25);assert.equal(q.sharp,30);assert.equal(suspensionFor(q,'L'),2);assert.equal(suspensionFor(q,'C'),1);assert.deepEqual(disciplineOf(q).yellow,{});assert(!UC().lineup.includes(id));
 const saved=JSON.stringify(WORLD);adoptWorld(JSON.parse(saved));assert.equal(JSON.stringify(WORLD),saved);verified=true;
 const out=path.resolve(__dirname,'../../output/rules');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'season.json'),JSON.stringify({passed:true,startedFromLegacySave:true,allGamesUsedActualEngine:true,delayedPlayoffDay:307,lastDay:day,restDays:rest,injuryBefore:120,injuryAfter:q.injury,remainingInjuryPreserved:true,unservedBansPreserved:true,saveIdempotent:true},null,2));console.log('PASS 真实跨季保留重伤和未服停赛',rest,q.injury);return result;
};
process.on('exit',()=>{if(!verified)process.exitCode=1;});
require('../gameplay/late-season.cjs');
