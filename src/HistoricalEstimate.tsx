import React,{useMemo} from 'react';
type Draw={date:string;nums:number[];bonus?:number};
type Props={draws:Draw[];max:number;pickCount:number;bonusMax?:number;game:string};
type HitCounts={two:number;three:number;bonus:number;jackpot:number};
const RANDOM_TRIALS=64;
function pick(history:Draw[],max:number,count:number,bonusMax?:number){
 const frequency=new Array(max+1).fill(0);
 const bonusFrequency=new Array((bonusMax||0)+1).fill(0);
 history.forEach(d=>{d.nums.forEach(n=>frequency[n]++);if(bonusMax&&d.bonus!==undefined)bonusFrequency[d.bonus]++;});
 const main=Array.from({length:max},(_,i)=>i+1).sort((a,b)=>frequency[b]-frequency[a]||a-b).slice(0,count).sort((a,b)=>a-b);
 const bonus=bonusMax?Array.from({length:bonusMax},(_,i)=>i+1).sort((a,b)=>bonusFrequency[b]-bonusFrequency[a]||a-b)[0]:undefined;
 return {main,bonus};
}
function randomPick(max:number,count:number,seed:number,bonusMax?:number){
 const pool=Array.from({length:max},(_,i)=>i+1);
 let state=seed>>>0;
 function next(){state=(Math.imul(state,1664525)+1013904223)>>>0;return state;}
 for(let j=pool.length-1;j>0;j--){const k=next()%(j+1);[pool[j],pool[k]]=[pool[k],pool[j]];}
 const main=pool.slice(0,count);
 const bonus=bonusMax?1+next()%bonusMax:undefined;
 return {main,bonus};
}
function addHits(counts:HitCounts,selected:{main:number[];bonus?:number},actual:Draw,allCount:number,hasBonus:boolean){
 const matches=selected.main.filter(n=>actual.nums.includes(n)).length;
 if(matches>=2)counts.two++;
 if(matches>=3)counts.three++;
 if(hasBonus&&selected.bonus===actual.bonus)counts.bonus++;
 if(matches===allCount&&(!hasBonus||selected.bonus===actual.bonus))counts.jackpot++;
}
function percent(count:number,total:number){return total?(count/total*100).toFixed(1)+'%':'—';}
function uncertainty(modelRate:number,randomRate:number,n:number){
 const se=Math.sqrt((modelRate*(1-modelRate)+randomRate*(1-randomRate))/n);
 return Math.abs(modelRate-randomRate)<=1.96*se;
}
export default function HistoricalEstimate({draws,max,pickCount,bonusMax,game}:Props){
 const analysis=useMemo(()=>{
  if(draws.length<130)return null;
  const choice=pick(draws.slice(-100),max,pickCount,bonusMax);
  const first=Math.max(100,draws.length-500);
  const n=draws.length-first;
  const model:HitCounts={two:0,three:0,bonus:0,jackpot:0};
  const random:HitCounts={two:0,three:0,bonus:0,jackpot:0};
  for(let i=first;i<draws.length;i++){
   const past=draws.slice(i-100,i);
   const actual=draws[i];
   addHits(model,pick(past,max,pickCount,bonusMax),actual,pickCount,!!bonusMax);
   for(let rep=0;rep<RANDOM_TRIALS;rep++){
    // Repeatable independently shuffled tickets, tested on the same draw.
    const seed=(Math.imul(i+1,2654435761)^Math.imul(rep+1,2246822519))>>>0;
    addHits(random,randomPick(max,pickCount,seed,bonusMax),actual,pickCount,!!bonusMax);
   }
  }
  return {choice,n,model,random,randomN:n*RANDOM_TRIALS};
 },[draws,max,pickCount,bonusMax]);
 if(!analysis)return <p style={{color:'#b9cddd',fontSize:12}}>At least 130 compatible drawings are needed for a historical performance comparison.</p>;
 const {choice,n,model,random,randomN}=analysis;
 const rows:[string,keyof HitCounts][]=[['2+ main matches','two'],['3+ main matches','three'],...(bonusMax?[['Bonus ball match','bonus'] as [string,keyof HitCounts]]:[])];
 const meaningful=rows.some(([,key])=>!uncertainty(model[key]/n,random[key]/randomN,n));
 return <div style={{background:'#112236',border:'1px solid #7596b3',borderRadius:12,padding:14,display:'grid',gap:11}}>
  <div style={{fontSize:11,fontWeight:750,letterSpacing:1.2,color:'#b6daf4'}}>MODEL PICK · LATEST 100 DRAWINGS</div>
  <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>{choice.main.map(value=><b key={value} style={{border:'1px solid #88b5d6',background:'#233f56',borderRadius:40,minWidth:32,padding:'9px 7px',textAlign:'center'}}>{value}</b>)}{choice.bonus!==undefined&&<><span style={{color:'#a5b8c8'}}>+</span><b style={{border:'1px solid #d5aa81',background:'#56402a',borderRadius:40,padding:'9px 11px'}}>{choice.bonus}</b></>}</div>
  <p style={{fontSize:12,color:'#c0d0de',lineHeight:1.55,margin:0}}>Selected from the most frequent numbers across the latest 100 {game} drawings. Compare how this selection <b>method</b> performed in earlier walk-forward tests against random tickets tested on exactly the same draws.</p>
  <div style={{fontSize:11,fontWeight:700,color:'#b6daf4'}}>MODEL VS RANDOM · {n} HOLDOUT DRAWINGS</div>
  <div style={{overflowX:'auto'}}>
   <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,textAlign:'left'}}>
    <thead><tr style={{color:'#a9cde4'}}><th style={{padding:'8px 4px'}}>Match level</th><th style={{padding:'8px 4px'}}>Model</th><th style={{padding:'8px 4px'}}>Random</th><th style={{padding:'8px 4px'}}>Difference</th></tr></thead>
    <tbody>{rows.map(([label,key])=>{
      const a=model[key]/n,b=random[key]/randomN,d=(a-b)*100;
      return <tr key={key} style={{borderTop:'1px solid #38516a'}}><td style={{padding:'10px 4px'}}>{label}</td><td style={{padding:'10px 4px',fontWeight:700}}>{percent(model[key],n)}</td><td style={{padding:'10px 4px'}}>{percent(random[key],randomN)}</td><td style={{padding:'10px 4px',color:'#c9d9e7'}}>{d>=0?'+':''}{d.toFixed(1)} pp</td></tr>;
    })}</tbody>
   </table>
  </div>
  <p style={{fontSize:11,color:'#b3c9da',lineHeight:1.55,margin:0}}>{meaningful?'One or more historical differences exceed a rough statistical-noise threshold, but this is not evidence of predictive advantage; retesting on future draws is required.':'Observed differences are within a rough statistical-noise threshold; no reliable model advantage is demonstrated.'}</p>
  <div style={{borderTop:'1px solid #38516a',paddingTop:10,display:'grid',gap:5}}>
   <b style={{fontSize:12,color:'#b9d9ec'}}>Exact jackpot matches in backtesting</b>
   <span style={{fontSize:12}}>Model: {model.jackpot} of {n} draws · Random: {random.jackpot} of {randomN.toLocaleString()} simulations</span>
   <small style={{color:'#b6c8d8'}}>Jackpot wins are too rare for these samples to estimate the future jackpot probability. Zero observed jackpots does not mean zero probability.</small>
  </div>
  <small style={{fontSize:11,color:'#b6c8d8',lineHeight:1.6}}>Each model pick uses only the previous 100 draws. The random baseline uses {RANDOM_TRIALS} reproducible, independently shuffled combinations per draw ({randomN.toLocaleString()} simulations). “pp” means percentage points. This is retrospective model performance, not a higher chance of winning for the displayed numbers. The noise check is approximate and not a formal significance test.</small>
 </div>;
}
