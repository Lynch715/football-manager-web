// Compare the same deterministic season rollover before and after the fix.
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');require('../deadline/shim.cjs');
newWorld(20261024,'Coventry City');WORLD.day=308;
WORLD.fixtures.forEach(f=>{f.played=true;f.hg=1;f.ag=0;});
WORLD.cups.forEach(c=>c.winner=WORLD.leagues[lgIndex(c.nation,0)].clubIds[0]);
Object.values(WORLD.euro).forEach(e=>{e.winner=WORLD.clubs[0].id;e.stage='done';});
ensurePlayoffs().forEach(p=>{p.started=p.done=true;p.winner=leagueTable(lgIndex(p.nation,p.tier+1))[2].id;p.up16=leagueTable(lgIndex(p.nation,p.tier))[15].id;});
seedRng(20261024);assert(endSeason());
const result={clubs:WORLD.clubs.map(c=>({id:c.id,finance:c.finance,squad:c.squad})),players:Object.values(WORLD.players).map(p=>({id:p.id,a:p.a,ca:p.ca,pa:p.pa,dev:p.dev,wage:p.wage,contract:p.contract,age:p.age,clubId:p.clubId}))};
const raw=JSON.stringify(result),hash=s=>crypto.createHash('sha256').update(s).digest('hex');
if(process.env.BASELINE)assert.equal(hash(raw),hash(fs.readFileSync(process.env.BASELINE,'utf8')),'finances, rosters and training changed');
if(process.env.QA_REPORT)fs.writeFileSync(process.env.QA_REPORT,raw);
console.log(JSON.stringify({passed:true,baselineCompared:!!process.env.BASELINE,clubs:result.clubs.length,players:result.players.length,financesRostersAndTrainingIdentical:!!process.env.BASELINE}));clearTimeout(SAVE_TIMER);process.exit(0);
