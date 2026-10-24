const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
require('../deadline/shim.cjs');
const original=endSeason,originalTick=tickProjects;let verified=false,completionVerified=false;
global.tickProjects=function(days){
  if(!(days>1))return originalTick(days);
  const c=UC(),rep=c.rep,cap=c.cap;const result=originalTick(days);
  assert.equal(c.rep,clamp(rep+1,1,100));assert.equal(c.cap,cap+2000);completionVerified=true;return result;
};
global.endSeason=function(){
  if(!seasonReady())return original();
  const c=UC(),season=WORLD.season,day=WORLD.day,rest=offseasonDays(),cap=c.cap;
  c.coachRating=10;c.physioRating=10;
  c.projects=[
    {type:'fac',k:'coachRating',n:'教练团队',to:11,left:rest,total:100,cost:100},
    {type:'fac',k:'physioRating',n:'医疗中心',to:11,left:rest+100,total:200,cost:200},
    {type:'stad',n:'球场扩建',seats:2000,left:rest,total:200,cost:300}
  ];
  const result=original();assert(result);assert.equal(WORLD.season,season+1);assert.equal(WORLD.day,0);
  assert.equal(c.coachRating,11);assert.equal(c.physioRating,10);assert.equal(c.cap,cap+2000);
  assert(completionVerified);assert.equal(c.projects.length,1);assert.equal(c.projects[0].left,100);
  const save=JSON.stringify(WORLD);adoptWorld(JSON.parse(save));assert.equal(JSON.stringify(WORLD),save);
  verified=true;const out=process.env.QA_OUT||path.resolve(__dirname,'../../output/construction');fs.mkdirSync(out,{recursive:true});
  const report={passed:true,actualEngine:true,legacySave:true,lastDay:day,restDays:rest,facilitiesCompleted:true,stadiumCompleted:true,longProjectLeft:100,saveIdempotent:true};
  fs.writeFileSync(path.join(out,'season.json'),JSON.stringify(report,null,2));console.log('PASS 真实跨季建设',JSON.stringify(report));return result;
};
process.on('exit',()=>{if(!verified)process.exitCode=1;});
require('../gameplay/late-season.cjs');
