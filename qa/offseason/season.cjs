const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');require('../deadline/shim.cjs');
const original=endSeason;let verified=false;
global.endSeason=function(){
 if(!seasonReady())return original();
 const c=UC(),season=WORLD.season,day=WORLD.day,rest=offseasonDays(),cap=c.cap;
 const p=P(c.lineup[1]),target=Object.values(WORLD.players).filter(p=>p.clubId>=0&&p.clubId!==c.id).sort((a,b)=>b.ca-a.ca)[0];
 p.age=target.age=22;p.contract=target.contract=season+5;p.injury=Math.floor(rest*.85);p.injRecovery=0;
 c.physioRating=c.scoutRating=3;c.coachRating=10;
 c.projects=[{type:'fac',k:'physioRating',n:'医疗中心',to:4,left:1,total:60,cost:1},
  {type:'fac',k:'scoutRating',n:'球探网络',to:4,left:10,total:60,cost:1},
  {type:'fac',k:'coachRating',n:'教练团队',to:11,left:rest+100,total:200,cost:1},
  {type:'stad',n:'球场扩建',seats:2000,left:rest,total:200,cost:1}];
 WORLD.shortlist=[{id:target.id,know:10}];
 const bidders=WORLD.clubs.filter(q=>q.id!==c.id).slice(0,2);
 WORLD.interest=[{pid:p.id,club:bidders[0].id,heat:1,since:season*400+190},{pid:p.id,club:bidders[1].id,heat:1,since:season*400+200}];
 const result=original();assert(result);assert.equal(WORLD.season,season+1);assert.equal(WORLD.day,0);
 assert.equal(p.injury,0);assert.equal(c.physioRating,4);assert.equal(c.scoutRating,4);assert.equal(c.cap,cap+2000);
 assert.equal(c.projects.length,1);assert.equal(c.projects[0].left,100);assert.equal(WORLD.shortlist[0].know,100);
 assert.equal(WORLD.interest.length,1);assert.equal(WORLD.interest[0].club,bidders[1].id);
 const raw=JSON.stringify(WORLD);adoptWorld(JSON.parse(raw));assert.equal(JSON.stringify(WORLD),raw);verified=true;
 const out=process.env.QA_OUT||path.resolve(__dirname,'../../output/offseason');fs.mkdirSync(out,{recursive:true});
 const report={passed:true,actualEngine:true,legacySave:true,lastDay:day,restDays:rest,injuryAfter:p.injury,scoutKnowledge:WORLD.shortlist[0].know,expiredInterestRemoved:true,validInterestKept:true,constructionCompleted:true,saveIdempotent:true};
 fs.writeFileSync(path.join(out,'season.json'),JSON.stringify(report,null,2));console.log('PASS 真实跨季五项修复',JSON.stringify(report));return result;
};
process.on('exit',()=>{if(!verified)process.exitCode=1;});require('../gameplay/late-season.cjs');
