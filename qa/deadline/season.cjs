const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');require('./shim.cjs');
newWorld(20261019,'Coventry City');const start=WORLD.season,records=[],daily=new Map(),markets=new Map();let matches=0;
for(const [name,map] of [['dailyTick',daily],['marketDaily',markets]]){const fn=global[name];global[name]=function(...args){const k=WORLD.season+':'+WORLD.day;map.set(k,(map.get(k)||0)+1);assert.equal(map.get(k),1,name+' ran twice on '+k);return fn(...args)}}
for(let season=start;season<start+2;season++){
 let guard=0;const m=matches;
 while(WORLD.season===season){assert(++guard<650,'calendar stalled');const r=advance();assert.notEqual(r.t,'over');if(r.t==='match'){autoPickLineup(UC(),r.fx.comp);CURMATCH=runMatch(createMatch(r.fx.home,r.fx.away,{comp:r.fx.comp,round:r.fx.round,record:false,userSide:r.fx.home===WORLD.userClub?0:1,...knockoutOpts(r.fx)}));CURMATCH.fixture=r.fx;CURMATCH.fixtureKey=fixtureKey(r.fx);finishUserMatch();matches++;}}
 assert.equal(markets.get(season+':30'),1);assert.equal(markets.get(season+':183'),1);assert(WORLD.inbox||WORLD.history.length);
 for(const c of WORLD.clubs)assert(Number.isFinite(c.finance.balance)&&Number.isFinite(c.finance.cap0),'finite finance');
 const finances=JSON.stringify(WORLD.clubs.map(c=>c.finance)),squads=JSON.stringify(WORLD.clubs.map(c=>c.squad));adoptWorld(JSON.parse(JSON.stringify(WORLD)));assert.equal(JSON.stringify(WORLD.clubs.map(c=>c.finance)),finances);assert.equal(JSON.stringify(WORLD.clubs.map(c=>c.squad)),squads);
 const record={season,nextSeason:WORLD.season,days:[...daily.keys()].filter(k=>k.startsWith(season+':')).length,marketDays:[...markets.keys()].filter(k=>k.startsWith(season+':')).length,userMatches:matches-m,eachDeadlineMarketOnce:true};records.push(record);console.log('PASS season',JSON.stringify(record));
}
const file=process.env.FMFILE||path.resolve(__dirname,'../../index.html');fs.writeFileSync(path.resolve(__dirname,'../../output/deadline/season.json'),JSON.stringify({passed:true,checks:records.length,sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),records},null,2));clearTimeout(SAVE_TIMER);process.exit(0);
