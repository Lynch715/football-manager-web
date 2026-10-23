const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
require('../deadline/shim.cjs');
const fate=prospectFate,observations={newcomerReviewsSkipped:0,fullSeasonReviews:0,adultWindowsPreserved:0};
global.prospectFate=function(p){
 const before=p.pa,days=developmentDays(p),games=playingTimeOf(p).total.games;
 const result=fate(p);
 if(days<180){assert.equal(p.pa,before);observations.newcomerReviewsSkipped++;}
 if(days>=180&&games>=12)observations.fullSeasonReviews++;
 if(p.age>=25&&p.age<=27){assert.equal(p.pa,before);observations.adultWindowsPreserved++;}
 return result;
};
process.on('exit',code=>{
 if(code)return;assert(observations.newcomerReviewsSkipped>0&&observations.fullSeasonReviews>0&&observations.adultWindowsPreserved>0);
 fs.writeFileSync(path.resolve(__dirname,'../../output/growth/two-seasons.json'),JSON.stringify({passed:true,actualEngine:true,seasons:2,...observations},null,2));
 console.log('PASS growth through actual season rollovers',JSON.stringify(observations));
});
require('../deadline/season.cjs');
