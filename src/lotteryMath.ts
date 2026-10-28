// Exact lottery combinatorics shared by the interactive calculator and build-time tests.
// This module deliberately contains no prediction or historical-data logic.
export type Matrix={pool:number;pick:number;bonusPool?:number;ordered?:boolean};
export function combinations(n:number,k:number):number{
 if(!Number.isInteger(n)||!Number.isInteger(k)||n<0||k<0||k>n)return 0;
 let x=1;for(let i=1;i<=Math.min(k,n-k);i++)x=x*(n-i+1)/i;
 return Math.round(x);
}
export function validateMatrix(g:Matrix):boolean{
 return Number.isInteger(g.pool)&&Number.isInteger(g.pick)&&g.pick>=1&&g.pick<=g.pool&&g.pool<=100&&(!g.ordered||g.pool<=36)&&(!g.bonusPool||(Number.isInteger(g.bonusPool)&&g.bonusPool>=1&&g.bonusPool<=100));
}
export function totalOutcomes(g:Matrix):number{
 if(!validateMatrix(g))return NaN;
 return (g.ordered?g.pool**g.pick:combinations(g.pool,g.pick))*(g.bonusPool||1);
}
export function probabilityExactly(g:Matrix,hits:number,bonus:'yes'|'no'|'any'='any'):number{
 if(!validateMatrix(g)||!Number.isInteger(hits)||hits<0||hits>g.pick)return 0;
 const base=g.ordered
  ?combinations(g.pick,hits)*(1/g.pool)**hits*(1-1/g.pool)**(g.pick-hits)
  :combinations(g.pick,hits)*combinations(g.pool-g.pick,g.pick-hits)/combinations(g.pool,g.pick);
 if(!g.bonusPool)return base;
 const b=g.bonusPool;
 return base*(bonus==='yes'?1/b:bonus==='no'?1-1/b:1);
}
export function probabilityAtLeast(g:Matrix,hits:number,bonus:'yes'|'no'|'any'='any'):number{
 if(!validateMatrix(g))return NaN;
 let total=0;for(let i=Math.max(0,hits);i<=g.pick;i++)total+=probabilityExactly(g,i,bonus);
 return Math.max(0,Math.min(1,total));
}
export function distribution(g:Matrix,bonus:'yes'|'no'|'any'='any'):{
 hits:number;probability:number;expectedPer1000:number
}[]{
 return Array.from({length:g.pick+1},(_,hits)=>{
  const probability=probabilityExactly(g,hits,bonus);
  return {hits,probability,expectedPer1000:probability*1000};
 });
}
export function atLeastOne(probability:number,independentTrials:number):number{
 if(!Number.isFinite(probability)||!Number.isFinite(independentTrials)||probability<0||probability>1||independentTrials<0)return NaN;
 if(probability===0||independentTrials===0)return 0;
 if(probability===1)return 1;
 return -Math.expm1(independentTrials*Math.log1p(-probability));
}
export function binomialExactly(n:number,k:number,p:number):number{
 if(!Number.isInteger(n)||n<0||n>10000||!Number.isInteger(k)||k<0||k>n||p<0||p>1)return 0;
 if(p===0)return k===0?1:0;
 if(p===1)return k===n?1:0;
 // Use log-gamma-free log combinations: accurate for finite practical horizons.
 let logC=0;for(let i=1;i<=Math.min(k,n-k);i++)logC+=Math.log(n-i+1)-Math.log(i);
 return Math.exp(logC+k*Math.log(p)+(n-k)*Math.log1p(-p));
}
export function wilsonInterval(successes:number,trials:number,z=1.96):[number,number]{
 if(trials<=0)return [0,1];
 const phat=successes/trials,den=1+z*z/trials,center=(phat+z*z/(2*trials))/den;
 const half=z*Math.sqrt(phat*(1-phat)/trials+z*z/(4*trials*trials))/den;
 return [Math.max(0,center-half),Math.min(1,center+half)];
}
// Random drawing of one fixed entry; simulation is independent of imported history.
export function simulate(g:Matrix,trials:number,minimumHits:number,bonus:'yes'|'no'|'any'='any',rng:()=>number=Math.random){
 if(!validateMatrix(g))throw new Error('Invalid lottery matrix');
 if(!Number.isInteger(trials)||trials<1||trials>100000)throw new Error('Choose 1–100,000 trials');
 let successes=0;
 const histogram=Array(g.pick+1).fill(0) as number[];
 for(let trial=0;trial<trials;trial++){
  let hits=0;
  if(g.ordered){
   for(let pos=0;pos<g.pick;pos++)if(Math.floor(rng()*g.pool)===0)hits++;
  }else{
   // Sequential hypergeometric sampling; no arrays, and no replacement.
   let winning=g.pick,other=g.pool-g.pick;
   for(let pos=0;pos<g.pick;pos++){
    if(rng()*(winning+other)<winning){hits++;winning--;}else other--;
   }
  }
  histogram[hits]++;
  const bonusHit=!g.bonusPool||Math.floor(rng()*g.bonusPool)===0;
  if(hits>=minimumHits&&(!g.bonusPool||bonus==='any'||(bonus==='yes'?bonusHit:!bonusHit)))successes++;
 }
 return {successes,trials,rate:successes/trials,histogram,interval:wilsonInterval(successes,trials)};
}
