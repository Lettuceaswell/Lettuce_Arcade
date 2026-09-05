const {runOne,summarize}=require('../sim.js');
const base={carbWaiverNoProtein:true};
for(const deep of [1,2,3]){
  for(const bot of ['keto','ketoBig','casual']){
    const cfg=Object.assign({},base,{refund:{keto:2,deep:deep,frenzy:5}});
    const rows=[];for(let s=1;s<=300;s++)rows.push(runOne(s,bot,cfg).row);
    const x=summarize(rows);
    console.log('LEGACY(waiver) refund.deep='+deep,bot.padEnd(8),'medMoves',String(x.medianMoves).padStart(5),'p90',String(x.p90Moves).padStart(5),'max',String(x.maxMoves).padStart(5),'pctBudget',(x.pctBudgetEnd*100).toFixed(0)+'%','avgFz',x.avgFrenzies.toFixed(1));
  }
}
for(const deep of [1,2,3,4,5]){
  for(const bot of ['ketoBig']){
    const cfg={refund:{keto:2,deep:deep,frenzy:5}};
    const rows=[];for(let s=1;s<=300;s++)rows.push(runOne(s,bot,cfg).row);
    const x=summarize(rows);
    console.log('SHIPPED refund.deep='+deep,bot.padEnd(8),'medMoves',String(x.medianMoves).padStart(5),'p90',String(x.p90Moves).padStart(5),'max',String(x.maxMoves).padStart(5),'pctBudget',(x.pctBudgetEnd*100).toFixed(0)+'%','avgFz',x.avgFrenzies.toFixed(1));
  }
}
