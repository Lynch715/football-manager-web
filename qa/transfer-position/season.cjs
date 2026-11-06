const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');require('../deadline/shim.cjs');
const original=endSeason;let verified=false;
global.endSeason=function(){
 if(!seasonReady())return original();
 const c=UC(),season=WORLD.season;while(c.squad.length>28)toFreeAgent(P(c.squad.at(-1)),c);
 c.finance.balance=1e11;c.finance.locked=0;c.finance.cap0=1e11;
 const p=Object.values(WORLD.players).find(p=>p.clubId>=0&&p.clubId!==c.id&&!p.loan);
 const from=p.clubId,wage=1000; p.contract=season;p.age=34;
 assert(signPrecontract(p,c,wage,3));const reserved=JSON.stringify(p.precontract),before=JSON.stringify(WORLD);
 adoptWorld(JSON.parse(before));SAVE_ENABLED=false;assert.equal(JSON.stringify(P(p.id).precontract),reserved);
 const result=original();assert(result);assert.equal(WORLD.season,season+1);assert.equal(WORLD.day,0);
 const q=P(p.id);assert(q,'已预签球员不应退役或被删除');assert.equal(q.clubId,UC().id);assert(UC().squad.includes(q.id));assert(!C(from).squad.includes(q.id));assert(!WORLD.freeAgents.includes(q.id));assert(!q.precontract);assert.equal(q.wage,wage);assert.equal(q.contract,season+3);assert.equal(WORLD.transferLog.filter(t=>t.pid===q.id&&t.to===UC().id).length,1);
 const raw=JSON.stringify(WORLD);adoptWorld(JSON.parse(raw));SAVE_ENABLED=false;assert.equal(JSON.stringify(WORLD),raw);processPrecontractArrivals();assert.equal(JSON.stringify(WORLD),raw);verified=true;
 const out=process.env.QA_OUT||path.resolve(__dirname,'../../output/transfer-position');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'season.json'),JSON.stringify({passed:true,actualSeasonEnd:true,legacySave:true,season:WORLD.season,day:WORLD.day,playerId:q.id,owner:from,arrivedAt:q.clubId,wage:q.wage,contract:q.contract,saveIdempotent:true},null,2));console.log('PASS 真实赛季结算兑现预签，保护合同、年限、工资及旧档');return result;
};
process.on('exit',()=>{if(!verified)process.exitCode=1;});require('../gameplay/late-season.cjs');
