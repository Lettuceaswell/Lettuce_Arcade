const {runOne,summarize}=require('../sim.js');
const cfgs={
 shipped:{},
 'pre-v28 (no cascade floor)':{cascadeTierFloor:false},
 'pre-v20 (carb waiver, no floor)':{carbWaiverNoProtein:true,cascadeTierFloor:false},
 'carb waiver only':{carbWaiverNoProtein:true},
};
for(const [name,c] of Object.entries(cfgs)){
  for(const bot of ['keto','ketoBig','casual']){
    const rows=[];for(let s=1;s<=400;s++)rows.push(runOne(s,bot,Object.keys(c).length?c:undefined).row);
    const s=summarize(rows);
    console.log(name.padEnd(34),bot.padEnd(8),'medMoves',String(s.medianMoves).padStart(5),'p90',String(s.p90Moves).padStart(5),'max',String(s.maxMoves).padStart(5),'medScore',s.medianScore,'avgFrenzy',s.avgFrenzies.toFixed(2),'pctBudget',(s.pctBudgetEnd*100).toFixed(0)+'%');
  }
}
