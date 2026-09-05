const {Game,mulberry32}=require('../engine.js');
const bots=require('../bots.js');
const seed=Number(process.argv[2]||3);
const g=new Game(seed);const rng=mulberry32(seed*2654435761+12345);
let i=0;
while(!g.over && i<200){
  const mv=g.legalMoves(); if(!mv.length)break;
  const m=bots.ketoBig(g,rng,mv);
  const before=g.ketosis;
  const r=g.applyMove(m);
  console.log(`#${r.move} meter ${before}->${r.meterAfter} ${r.tierBefore}->${r.stateAfter} steps ${r.steps} g${r.gained} P${r.protein}/C${r.carb} pts ${r.pts} ref ${r.refund} left ${r.movesLeftAfter} fz ${g.frenzyMoves} armK${g.armKeto?1:0} armD${g.armDeep?1:0}`);
  i++;
}
console.log('over',g.overReason,'moves',g.movesTaken,'score',g.score,'frenzies',g.frenzies);
