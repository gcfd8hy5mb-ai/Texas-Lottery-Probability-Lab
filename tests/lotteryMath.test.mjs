import test from 'node:test';
import assert from 'node:assert/strict';
import {combinations,totalOutcomes,probabilityExactly,probabilityAtLeast,distribution,atLeastOne,binomialExactly,simulate} from '../src/lotteryMath.ts';
const close=(a,b,tol=1e-11)=>assert.ok(Math.abs(a-b)<=tol, `Expected ${a} ≈ ${b}`);
test('known current jackpot matrices',()=>{
 assert.equal(combinations(54,6),25827165);
 assert.equal(totalOutcomes({pool:69,pick:5,bonusPool:26}),292201338);
 assert.equal(totalOutcomes({pool:70,pick:5,bonusPool:24}),290472336);
 assert.equal(totalOutcomes({pool:24,pick:12}),2704156);
 assert.equal(totalOutcomes({pool:10,pick:4,ordered:true}),10000);
});
test('exact hypergeometric distribution sums to one',()=>{
 for(const matrix of [{pool:54,pick:6},{pool:69,pick:5,bonusPool:26},{pool:35,pick:5},{pool:24,pick:12},{pool:10,pick:4,ordered:true}]){
  close(distribution(matrix).reduce((sum,x)=>sum+x.probability,0),1);
  for(let k=0;k<=matrix.pick;k++){
   close(probabilityAtLeast(matrix,k),distribution(matrix).filter(x=>x.hits>=k).reduce((s,x)=>s+x.probability,0));
  }
 }
});
test('bonus branches partition main match event',()=>{
 const g={pool:69,pick:5,bonusPool:26};
 for(let k=0;k<=5;k++){
  close(probabilityExactly(g,k,'yes')+probabilityExactly(g,k,'no'),probabilityExactly(g,k));
 }
});
test('brute-force small lottery matches analytic probabilities',()=>{
 const g={pool:5,pick:2};
 const outcomes=[];
 for(let a=1;a<=5;a++)for(let b=a+1;b<=5;b++)outcomes.push([a,b]);
 for(let k=0;k<=2;k++){
  const brute=outcomes.filter(arr=>arr.filter(x=>x===1||x===2).length===k).length/outcomes.length;
  close(brute,probabilityExactly(g,k));
 }
});
test('ordered digits use position-dependent binomial distribution',()=>{
 const g={pool:10,pick:3,ordered:true};
 close(probabilityExactly(g,3),1/1000);
 close(probabilityExactly(g,2),27/1000);
});
test('multi-draw independent binomial math',()=>{
 close(atLeastOne(.2,3),1-.8**3);
 close(binomialExactly(3,0,.2),.8**3);
 close(binomialExactly(3,1,.2),3*.2*.8**2);
 close(atLeastOne(1e-10,1e6),1-Math.exp(-1e-4),1e-8);
});
test('simulation agrees with exact common outcomes and returns finite uncertainty',()=>{
 let state=11;
 const rng=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 const g={pool:9,pick:3};
 const trials=20000,hit=1;
 const sim=simulate(g,trials,hit,'any',rng);
 const expected=probabilityAtLeast(g,hit);
 assert.ok(Math.abs(sim.rate-expected)<.025);
 assert.ok(sim.interval[0]<=sim.rate&&sim.interval[1]>=sim.rate);
 assert.equal(sim.histogram.reduce((a,b)=>a+b,0),trials);
});
