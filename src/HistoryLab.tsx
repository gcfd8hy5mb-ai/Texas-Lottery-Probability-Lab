import React,{useMemo,useState} from 'react';
const source='https://www.texaslottery.com/export/sites/lottery/Games/Lotto_Texas/Winning_Numbers/index.html';
const draws=[
 {date:'2026-08-19',nums:[20,38,40,43,47,49]},
 {date:'2026-08-22',nums:[12,29,33,43,47,54]},
 {date:'2026-08-24',nums:[3,8,25,36,50,51]},
 {date:'2026-08-26',nums:[11,12,20,26,40,48]},
 {date:'2026-08-29',nums:[4,13,22,32,36,47]},
 {date:'2026-08-31',nums:[13,14,16,34,41,49]},
 {date:'2026-09-02',nums:[7,19,20,23,25,39]},
 {date:'2026-09-05',nums:[14,17,25,26,30,37]},
 {date:'2026-09-07',nums:[4,11,12,19,25,45]},
 {date:'2026-09-09',nums:[2,7,15,29,31,43]}
].filter(d=>d.nums.every(n=>n>=1&&n<=54));
// Every candidate is chosen from earlier draws only; no future data enters the strategy.
function scores(mode:'frequency'|'random'){let total=0;const results=[];for(let i=4;i<draws.length;i++){const history=draws.slice(0,i);const freq=new Array(55).fill(0);for(const d of history)for(const n of d.nums)freq[n]++;const ordered=Array.from({length:54},(_,j)=>j+1);if(mode==='frequency'){ordered.sort((a,b)=>freq[b]-freq[a]||a-b)}else{ // Deterministic pseudo-random baseline, reproducible between renders
let state=(i+1234)>>>0;for(let j=ordered.length-1;j>0;j--){state=(Math.imul(state,1664525)+1013904223)>>>0;const k=state%(j+1);[ordered[j],ordered[k]]=[ordered[k],ordered[j]];}
}
const pick=ordered.slice(0,6);const hits=pick.filter(n=>draws[i].nums.includes(n)).length;total+=hits;results.push({date:draws[i].date,hits})}return {total,results}}
export default function HistoryLab(){const [open,setOpen]=useState(false);const frequency=useMemo(()=>scores('frequency'),[]);const random=useMemo(()=>scores('random'),[]);const rows=draws.flatMap(d=>d.nums).reduce((m,n)=>(m[n]=(m[n]||0)+1,m),{} as Record<number,number>);const hot=Object.entries(rows).sort((a,b)=>b[1]-a[1]||Number(a[0])-Number(b[0])).slice(0,6);
return <section style={{background:'#192b3d',border:'1px solid #34485a',borderRadius:15,padding:17,display:'grid',gap:13}}>
 <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10}}><div><div style={{fontSize:10,letterSpacing:2,color:'#a9cfee'}}>HISTORICAL RESEARCH</div><h3 style={{fontSize:18,margin:'8px 0 0'}}>Lotto Texas Lab</h3></div><span style={{fontSize:10,color:'#b6c9d9',textAlign:'right'}}>Official archive sample<br/>Aug–Sep 2026</span></div>
 <p style={{color:'#b4c6d4',fontSize:12,lineHeight:1.6,margin:0}}>Compare simple strategies on a small snapshot of official Lotto Texas drawings. Results describe this sample only—not future winning probabilities.</p>
 <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{hot.map(([n,count])=><div key={n} style={{border:'1px solid #486078',padding:'8px 10px',borderRadius:10,textAlign:'center',minWidth:43}}><b style={{display:'block',fontSize:16}}>{n}</b><small style={{color:'#a7bacb',fontSize:9}}>{count}×</small></div>)}</div>
 <button onClick={()=>setOpen(v=>!v)} style={{cursor:'pointer',border:0,borderRadius:10,padding:12,background:'#a9cfee',color:'#102033',fontWeight:700}}>{open?'Hide backtest':'Compare strategies'}</button>
 {open&&<><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:9}}>{[{name:'Historical frequency',data:frequency},{name:'Random baseline',data:random}].map(v=><div key={v.name} style={{padding:12,border:'1px solid #41566b',borderRadius:10}}><small style={{fontSize:10,color:'#b5c5d3'}}>{v.name}</small><strong style={{fontSize:24,display:'block',marginTop:5}}>{v.data.total}</strong><small style={{fontSize:10,color:'#b5c5d3'}}>matched numbers in {v.data.results.length} tests</small></div>)}</div><p style={{fontSize:11,color:'#a9bdcc',lineHeight:1.6,margin:0}}>Walk-forward test: each selection uses only preceding drawings. The sample is too small to demonstrate an advantage. Random results depend on the chosen reproducible baseline. No evidence here that historical frequency improves future results.</p></>}
 <a href={source} target="_blank" rel="noreferrer" style={{fontSize:11,color:'#a9cfee'}}>Official Lotto Texas winning number archive ↗</a>
 </section>}