import React,{useMemo,useState} from 'react';

type Draw={date:string;nums:number[];bonus?:number};
type Profile={draws:Draw[];game:string;count:number;max:number;ordered:boolean;lookback:number;target:number};
type Mode='hot'|'cold'|'recent'|'overdue';
const methods:{id:Mode;name:string}[]=[
 {id:'hot',name:'Hot frequency'},
 {id:'cold',name:'Cold frequency'},
 {id:'recent',name:'Recent weighting'},
 {id:'overdue',name:'Overdue numbers'}
];
const style:React.CSSProperties={border:'1px solid #47637c',borderRadius:10,padding:12};
function pick(prior:Draw[],count:number,max:number,ordered:boolean,mode:Mode){
 const selected:number[]=[];
 for(let pos=0;pos<(ordered?count:1);pos++){
  const counts=new Array(max+1).fill(0),lastSeen=new Array(max+1).fill(-1),recent=new Array(max+1).fill(0);
  for(let i=0;i<prior.length;i++){
   const values=ordered?[prior[i].nums[pos]]:prior[i].nums;
   for(const n of values){counts[n]++;lastSeen[n]=i;recent[n]+=(i+1)/prior.length;}
  }
  const options=Array.from({length:max+(ordered?1:0)},(_,i)=>i+(ordered?0:1));
  options.sort((a,b)=>{
   const value=(n:number)=>mode==='hot'?counts[n]:mode==='cold'?-counts[n]:mode==='recent'?recent[n]:prior.length-1-lastSeen[n];
   return value(b)-value(a)||a-b;
  });
  if(ordered)selected.push(options[0]);
  else selected.push(...options.slice(0,count));
 }
 return selected;
}
function matches(selected:number[],draw:Draw,ordered:boolean){
 if(ordered)return selected.filter((n,i)=>n===draw.nums[i]).length;
 return selected.filter(n=>draw.nums.includes(n)).length;
}
function randomTicket(count:number,max:number,ordered:boolean,seed:number){
 let state=seed>>>0;
 const next=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 if(ordered)return Array.from({length:count},()=>Math.floor(next()*10));
 const pool=Array.from({length:max},(_,i)=>i+1);
 for(let i=pool.length-1;i>0;i--){const j=Math.floor(next()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
 return pool.slice(0,count);
}
type Period={from:string;to:string;draws:number;randomRate:number;rates:Record<Mode,number>};
function evaluate(draws:Draw[],count:number,max:number,ordered:boolean,lookback:number,target:number):Period[]{
 const available=draws.length-lookback;
 if(available<25)return [];
 const windows=Math.min(5,Math.floor(available/25));
 const per=Math.min(100,Math.floor(available/windows));
 const start=draws.length-per*windows;
 const output:Period[]=[];
 for(let window=0;window<windows;window++){
  const first=start+window*per;
  const successes:Record<Mode,number>={hot:0,cold:0,recent:0,overdue:0};
  let randomSuccess=0;
  const RANDOM_PER_DRAW=32;
  for(let i=first;i<first+per;i++){
   const prior=draws.slice(i-lookback,i),actual=draws[i];
   for(const strategy of methods){
    if(matches(pick(prior,count,max,ordered,strategy.id),actual,ordered)>=target)successes[strategy.id]++;
   }
   for(let rep=0;rep<RANDOM_PER_DRAW;rep++){
    const seed=(Math.imul(i+1,2654435761)^Math.imul(rep+1,2246822519)^0x528ff)>>>0;
    if(matches(randomTicket(count,max,ordered,seed),actual,ordered)>=target)randomSuccess++;
   }
  }
  output.push({from:draws[first].date,to:draws[first+per-1].date,draws:per,randomRate:randomSuccess/(per*RANDOM_PER_DRAW),rates:{hot:successes.hot/per,cold:successes.cold/per,recent:successes.recent/per,overdue:successes.overdue/per}});
 }
 return output;
}
const fmt=(rate:number)=>(rate*100).toFixed(1)+'%';
export default function RepeatabilityLab({draws,game,count,max,ordered,lookback,target}:Profile){
 const [visible,setVisible]=useState(false);
 const periods=useMemo(()=>visible?evaluate(draws,count,max,ordered,lookback,target):[],[visible,draws,count,max,ordered,lookback,target]);
 const rows=useMemo(()=>methods.map(mode=>{
  const rates=periods.map(p=>p.rates[mode.id]);
  const total=periods.reduce((sum,p)=>sum+p.rates[mode.id]*p.draws,0);
  const drawsCount=periods.reduce((sum,p)=>sum+p.draws,0);
  const beats=periods.filter(p=>p.rates[mode.id]>p.randomRate).length;
  return {name:mode.name,id:mode.id,average:drawsCount?total/drawsCount:0,beats};
 }).sort((a,b)=>b.beats-a.beats||b.average-a.average),[periods]);
 return <div style={{...style,display:'grid',gap:10,background:'#122436'}}>
  <strong style={{color:'#b6d8ef',fontSize:14}}>Repeatability across historical periods</strong>
  <p style={{fontSize:12,color:'#b6cadb',lineHeight:1.5,margin:0}}>Does the same selection method repeatedly outperform randomly generated tickets when each prediction uses only earlier results? Test five separate chronological periods, or fewer if history is limited.</p>
  <button disabled={!draws.length} onClick={()=>setVisible(v=>!v)} style={{border:0,borderRadius:9,padding:11,background:'#b3d4ef',color:'#122335',fontWeight:700}}>{visible?'Hide repeatability':'Run repeatability test'}</button>
  {visible&&(periods.length===0?<small style={{color:'#d4c7bd'}}>More than {lookback+25} compatible drawings are required.</small>:<>
   <div style={{fontSize:11,color:'#b1cddd'}}>{game} · {lookback} earlier drawings per prediction · {target}+ {ordered?'correct positions':'main-number matches'} · {periods.length} non-overlapping evaluation periods</div>
   <div style={{display:'grid',gap:6}}>{rows.map(row=><div key={row.id} style={{border:'1px solid #49667e',padding:10,borderRadius:9}}>
    <div style={{display:'flex',justifyContent:'space-between',gap:10}}><b style={{fontSize:12}}>{row.name}</b><b style={{fontSize:13}}>{row.beats} / {periods.length} periods</b></div>
    <small style={{color:'#bad0df'}}>Above the observed random baseline · pooled historical success: {fmt(row.average)}</small>
   </div>)}</div>
   <details><summary style={{fontSize:12,color:'#b8dbf3',cursor:'pointer'}}>See performance in each period</summary>
    <div style={{display:'grid',gap:8,marginTop:10}}>{periods.map(p=><div key={p.from} style={{borderTop:'1px solid #49647c',paddingTop:8}}>
     <b style={{fontSize:11}}>{p.from} – {p.to} ({p.draws} drawings)</b>
     <div style={{fontSize:11,color:'#bfd5e4',marginTop:3}}>Random baseline: {fmt(p.randomRate)} · 32 random tickets tested per drawing</div>
     {methods.map(m=><div key={m.id} style={{fontSize:11,color:'#bdccdb'}}>{m.name}: {fmt(p.rates[m.id])}</div>)}
    </div>)}</div>
   </details>
   <small style={{color:'#b9cddc',lineHeight:1.6}}>Each historical prediction is calculated using only its {lookback} preceding drawings. The evaluation periods do not overlap, although their training windows may overlap. Results compare methods, not individual current tickets. Beating random in several periods can still occur by chance, especially when testing multiple strategies. It does not establish increased future winning odds.</small>
  </>)}
 </div>;
}
