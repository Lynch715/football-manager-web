const fs=require('node:fs'),path=require('node:path');
require('../deadline/shim.cjs');
newWorld(20261023,'Coventry City');
const c=UC(),samples=[];
for(const pos of POSITIONS) for(let i=0;i<8;i++){
 const p=makePlayer(48,pos,17,c.id);p.pa=170;p.prof=11;p.injury=0;
 samples.push(JSON.parse(JSON.stringify(p)));
}
const median=a=>a.slice().sort((a,b)=>a-b)[Math.floor(a.length/2)];
const results=[];
for(const role of [{name:'regular',share:.8,prof:11,coach:11},{name:'excellent',share:.8,prof:17,coach:17},{name:'bench',share:0,prof:11,coach:11},{name:'rotation',share:.35,prof:11,coach:11}]){
 const tracks=[];
 for(let i=0;i<samples.length;i++){
  const p=JSON.parse(JSON.stringify(samples[i]));p.prof=role.prof;WORLD.players[p.id]=p;c.squad=[p.id];c.coachRating=role.coach;c.trainFocus='balanced';c.trainIntensity=2;
  seedRng(8000+i);const line=[{age:p.age,ca:p.ca/2,pa:p.pa/2}];
  for(let yr=0;yr<13;yr++){
   WORLD.season=2026+yr;p.apps=0;
   for(let week=0;week<44;week++){
    WORLD.day=week*7;const g=Math.floor((week+1)*38/44),u=playingTimeOf(p),r={minutes:g*90*role.share,available:g*90,games:g};
    u.total={...r};u.clubs[c.id]={...r};p.apps=role.share?g:0;trainClub(c);
   }
   p.age++;prospectFate(p);line.push({age:p.age,ca:p.ca/2,pa:p.pa/2});
  }
  tracks.push(line);
 }
 results.push({role:role.name,samples:tracks.length,nearOriginalPABy28:tracks.filter(t=>t[11].ca>=82).length,
  medians:tracks[0].map((_,i)=>({age:17+i,ca:median(tracks.map(t=>t[i].ca)),pa:median(tracks.map(t=>t[i].pa))})),tracks});
}
const out=process.argv[2];if(out)fs.writeFileSync(out,JSON.stringify({source:process.env.FMFILE,results},null,2));
console.log(JSON.stringify(results.map(({tracks,...r})=>r),null,2));clearTimeout(SAVE_TIMER);process.exit(0);
