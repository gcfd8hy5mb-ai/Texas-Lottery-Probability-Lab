import React,{useEffect,useMemo,useState} from 'react';
type Draw={date:string;nums:number[];bonus?:number};
type Archive={game:string;source:string;ruleStart:string;max:number;bonusMax:number|null;pickCount:number;ordered:boolean;session:string|null;count:number;first:string;last:string;draws:Draw[]};
const files:Record<string,string>={'Texas Two Step':'texas-two-step.json','Cash Five':'cash-five.json','All or Nothing':'all-or-nothing.json','Pick 3':'pick-3.json','Daily 4':'daily-4.json'};
const options=[['30','30 drawings'],['100','100 drawings'],['year','1 year'],['5years','5 years'],['all','All history']];
function sample(history:Draw[],g:Archive,window:number){
 const recent=history.slice(-window);
 const choice:number[]=[];
 for(let position=0;position<g.pickCount;position++){
  const counts=new Array(g.max+1).fill(0);
  if(g.ordered){for(const draw of recent)counts[draw.nums[position]]++;}
  else{for(const draw of recent)for(const n of draw.nums)counts[n]++;}
  const eligible=Array.from({length:g.max+(g.ordered?1:0)},(_,j)=>j+(g.ordered?0:1))
   .filter(n=>g.ordered||!choice.includes(n));
  eligible.sort((a,b)=>counts[b]-counts[a]||a-b);
  choice.push(eligible[0]);
 }
 if(!g.ordered)choice.sort((a,b)=>a-b);
 let bonus:number|undefined;
 if(g.bonusMax){
  const counts=new Array(g.bonusMax+1).fill(0);
  for(const d of recent)if(d.bonus!==undefined)counts[d.bonus]++;
  bonus=Array.from({length:g.bonusMax},(_,j)=>j+1).sort((a,b)=>counts[b]-counts[a]||a-b)[0];
 }
 return {nums:choice,bonus};
}
function random(g:Archive,seed:number){
 let s=seed>>>0;
 const next=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s;};
 const nums:number[]=[];
 if(g.ordered){for(let i=0;i<g.pickCount;i++)nums.push(next()%10);}
 else{const bag=Array.from({length:g.max},(_,i)=>i+1);for(let i=bag.length-1;i>0;i--){const k=next()%(i+1);[bag[i],bag[k]]=[bag[k],bag[i]];}nums.push(...bag.slice(0,g.pickCount));}
 return {nums,bonus:g.bonusMax?1+next()%g.bonusMax:undefined};
}
function hits(p:{nums:number[];bonus?:number},d:Draw,ordered:boolean){return ordered?p.nums.filter((v,i)=>v===d.nums[i]).length:p.nums.filter(v=>d.nums.includes(v)).length;}
export default function ExtraGameHistory({game}:{game:string}){
 const [data,setData]=useState<Archive|null>(null),[error,setError]=useState(''),[range,setRange]=useState('100'),[showStats,setShowStats]=useState(false);
 useEffect(()=>{let active=true;setData(null);setError('');setRange('100');const file=files[game];if(!file)return;
 fetch(import.meta.env.BASE_URL+'data/'+file,{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()}).then((d:Archive)=>{if(d.game!==game||!Array.isArray(d.draws)||d.draws.length<100)throw Error('Unverified or missing records');if(active)setData(d)}).catch(e=>{if(active)setError(String(e.message||e))});return()=>{active=false};},[game]);
 const analysis=useMemo(()=>{if(!data)return null;const all=data.draws;
 const window=range==='30'?30:100;
 let first=all.length-100;
 if(range==='30'||range==='100')first=all.length-Number(range);
 else if(range==='all')first=0;
 else{const cutoff=new Date(data.last+'T00:00:00Z');cutoff.setUTCFullYear(cutoff.getUTCFullYear()-(range==='year'?1:5));first=all.findIndex(x=>x.date>=cutoff.toISOString().slice(0,10));if(first<0)first=0;}
 first=Math.max(window,first);
 const chosen=sample(all,data,window);
 const labels=data.ordered?[['2+ correct positions',2],['Exact digits in order',data.pickCount]]:data.pickCount===12?[['8+ main matches',8],['10+ main matches',10],['All 12 matches',12]]:[['2+ main matches',2],['3+ main matches',3],['All main matches',data.pickCount]];
 const model=new Array(labels.length).fill(0),baseline=new Array(labels.length).fill(0);
 const RANDOMS=8;
 for(let i=first;i<all.length;i++){
  const chosenHistory=all.slice(i-window,i);const guess=sample(chosenHistory,data,window);
  const modelHits=hits(guess,all[i],data.ordered);
  labels.forEach(([,n],j)=>{if(modelHits>=Number(n))model[j]++;});
  for(let j=0;j<RANDOMS;j++){const control=random(data,(Math.imul(i+1,2654435761)^Math.imul(j+1,1597334677))>>>0);const rh=hits(control,all[i],data.ordered);labels.forEach(([,n],k)=>{if(rh>=Number(n))baseline[k]++;});}
 }
 return {window,chosen,first,n:all.length-first,labels,model,baseline,baselineN:(all.length-first)*RANDOMS,rangeDraws:all.length-Math.max(0,first),start:all[first]?.date};},[data,range]);
 const p=(n:number,den:number)=>den?(n/den*100).toFixed(1)+'%':'—';
 return <section style={{background:'#192b3d',border:'1px solid #34485a',borderRadius:15,padding:16,display:'grid',gap:12}}>
  <div style={{fontSize:10,letterSpacing:2,color:'#add4f1'}}>OFFICIAL HISTORICAL RESEARCH</div><strong style={{fontSize:18}}>{game}{data?.session?' · '+data.session:''}</strong>
  {error?<p role="alert" style={{color:'#ffcfbd'}}>Unable to load official history: {error}. No estimates will be shown until the archive is verified.</p>:!data||!analysis?<p>Loading official drawing history…</p>:<>
   <p style={{fontSize:12,color:'#bed0df',margin:0,lineHeight:1.6}}>{data.count.toLocaleString()} verified {data.session?data.session+' ':''}drawings · {data.first} to {data.last}{data.ruleStart?' · compatible period begins '+data.ruleStart:''}.</p>
   <label style={{display:'grid',gap:6,color:'#aed3ec',fontSize:12}}>Analyze range<select aria-label="Analyze range" value={range} onChange={e=>{setRange(e.target.value);setShowStats(false)}} style={{borderRadius:9,padding:12,color:'#f5f8fb',fontSize:15,border:'1px solid #607b90',background:'#112336'}}>{options.map(([v,label])=><option key={v} value={v}>{label}</option>)}</select></label>
   <div style={{background:'#112236',border:'1px solid #557992',borderRadius:12,padding:12,display:'grid',gap:9}}>
    <b style={{fontSize:12,color:'#b5d9f0'}}>MODEL PICK · LAST {analysis.window} DRAWINGS</b>
    <div style={{display:'flex',flexWrap:'wrap',gap:6}}>{analysis.chosen.nums.map((v,i)=><b key={i} style={{border:'1px solid #84adcb',borderRadius:30,padding:'8px 11px',fontSize:15}}>{v}</b>)}{analysis.chosen.bonus!==undefined&&<b style={{border:'1px solid #d0a176',borderRadius:30,padding:'8px 11px',fontSize:15}}>+ {analysis.chosen.bonus}</b>}</div>
    <p style={{fontSize:11,color:'#b9cbd9',margin:0}}>{data.ordered?'Digit positions are analyzed separately; repeats are allowed.':'Most frequent main numbers in the selected training window.'} This is a historical experiment, not an enhanced lottery-winning probability.</p>
    <button onClick={()=>setShowStats(v=>!v)} style={{border:0,borderRadius:9,padding:11,background:'#a9cfee',color:'#102033',fontWeight:700}}>{showStats?'Hide model comparison':'View model vs random'}</button>
    {showStats&&<><b style={{fontSize:11,color:'#b9dcf3'}}>{analysis.n.toLocaleString()} OUT-OF-SAMPLE DRAWINGS · FROM {analysis.start}</b><div style={{display:'grid',gap:7}}>{analysis.labels.map(([label],j)=><div key={label} style={{borderTop:'1px solid #3c5367',paddingTop:8,fontSize:12}}><div>{label}</div><div style={{display:'flex',justifyContent:'space-between',gap:10,marginTop:5}}><span>Model <b>{p(analysis.model[j],analysis.n)}</b></span><span>Random <b>{p(analysis.baseline[j],analysis.baselineN)}</b></span></div></div>)}</div><small style={{color:'#abc2d3',lineHeight:1.5}}>Each model selection is trained on earlier drawings only. Random comparisons use eight reproducible combinations per test. Small differences are expected even with no predictive advantage. For ordered digits, matching a digit in the wrong position does not count.</small></>}
   </div>
   {data.session&&<small style={{color:'#adc4d4'}}>This first release analyzes the {data.session} session only. Morning, Day, and Evening histories will be added separately so their frequencies remain distinguishable.</small>}
   <a href={data.source} target="_blank" rel="noreferrer" style={{color:'#a9d4f4',fontSize:12}}>View official Texas Lottery CSV ↗</a>
  </>}
 </section>;
}
