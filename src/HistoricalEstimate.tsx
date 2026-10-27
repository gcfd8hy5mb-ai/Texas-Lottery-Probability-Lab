import React,{useMemo} from 'react';
type Draw={date:string;nums:number[];bonus?:number};
type Props={draws:Draw[];max:number;pickCount:number;bonusMax?:number;game:string};
function pick(history:Draw[],max:number,count:number,bonusMax?:number){
 const frequency=new Array(max+1).fill(0);
 const bonusFrequency=new Array((bonusMax||0)+1).fill(0);
 history.forEach(d=>{d.nums.forEach(n=>frequency[n]++);if(bonusMax&&d.bonus!==undefined)bonusFrequency[d.bonus]++});
 const main=Array.from({length:max},(_,i)=>i+1).sort((a,b)=>frequency[b]-frequency[a]||a-b).slice(0,count).sort((a,b)=>a-b);
 const bonus=bonusMax?Array.from({length:bonusMax},(_,i)=>i+1).sort((a,b)=>bonusFrequency[b]-bonusFrequency[a]||a-b)[0]:undefined;
 return {main,bonus};
}
function pct(a:number,n:number){return n?((a/n)*100).toFixed(1)+'%':'N/A'}
export default function HistoricalEstimate({draws,max,pickCount,bonusMax,game}:Props){
 const analysis=useMemo(()=>{
  if(draws.length<130)return null;
  const choice=pick(draws.slice(-100),max,pickCount,bonusMax);
  const evaluation=draws.slice(Math.max(100,draws.length-500));
  // For every held-out draw, derive the pick entirely from its 100 PRECEDING draws.
  let atLeastOne=0,atLeastTwo=0,atLeastThree=0,bonusMatches=0,exactMatches=0;
  for(let i=Math.max(100,draws.length-500);i<draws.length;i++){
   const prior=draws.slice(i-100,i);
   const predicted=pick(prior,max,pickCount,bonusMax);
   const hits=predicted.main.filter(n=>draws[i].nums.includes(n)).length;
   if(hits>=1)atLeastOne++;if(hits>=2)atLeastTwo++;if(hits>=3)atLeastThree++;
   if(bonusMax&&predicted.bonus===draws[i].bonus)bonusMatches++;
   if(hits===pickCount&&(!bonusMax||predicted.bonus===draws[i].bonus))exactMatches++;
  }
  return {choice,n:evaluation.length,atLeastOne,atLeastTwo,atLeastThree,bonusMatches,exactMatches};
 },[draws,max,pickCount,bonusMax]);
 if(!analysis)return <p style={{color:'#b9cddd',fontSize:12}}>At least 130 compatible drawings are needed for a historical performance estimate.</p>;
 const {choice,n,atLeastTwo,atLeastThree,bonusMatches,exactMatches}=analysis;
 return <div style={{background:'#112236',border:'1px solid #7596b3',borderRadius:12,padding:14,display:'grid',gap:10}}>
 <div style={{fontSize:11,fontWeight:750,letterSpacing:1.2,color:'#b6daf4'}}>MODEL PICK · LATEST 100 DRAWINGS</div>
 <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>{choice.main.map(value=><b key={value} style={{border:'1px solid #88b5d6',background:'#233f56',borderRadius:40,minWidth:32,padding:'9px 7px',textAlign:'center'}}>{value}</b>)}{choice.bonus!==undefined&&<><span style={{color:'#a5b8c8'}}>+</span><b style={{border:'1px solid #d5aa81',background:'#56402a',borderRadius:40,padding:'9px 11px'}}>{choice.bonus}</b></>}</div>
 <div style={{fontSize:12,color:'#c0d0de',lineHeight:1.55}}>Chosen from the most frequent numbers in the latest 100 {game} draws. The percentages below measure how this <b>selection method</b> performed when repeatedly tested on later, unseen historical drawings—not the true future winning probability of this exact ticket.</div>
 <div style={{fontSize:11,fontWeight:700,color:'#b6daf4'}}>HISTORICAL MODEL RESULTS · {n} WALK-FORWARD TESTS</div>
 <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
 {[{title:'2+ main matches',value:pct(atLeastTwo,n),count:atLeastTwo},{title:'3+ main matches',value:pct(atLeastThree,n),count:atLeastThree},...(bonusMax?[{title:'Bonus ball match',value:pct(bonusMatches,n),count:bonusMatches}]:[]),{title:'Exact jackpot matches',value:exactMatches+' / '+n,count:exactMatches}].map(item=><div key={item.title} style={{border:'1px solid #46627a',padding:10,borderRadius:9}}><small style={{fontSize:11,color:'#b8cad9'}}>{item.title}</small><strong style={{display:'block',fontSize:22,marginTop:5}}>{item.value}</strong><small style={{fontSize:10,color:'#b1c5d5'}}>{item.count} of {n} tests</small></div>)}
 </div>
 <p style={{fontSize:11,lineHeight:1.6,color:'#b9cada',margin:0}}>A new model pick was calculated before each test using its prior 100 drawings, with no future data used to choose it. Match frequencies can fluctuate substantially; jackpot events are too rare to estimate from this sample. These results are retrospective measurements, not evidence of an advantage over random picks.</p>
 </div>;
}
