import React,{useEffect,useMemo,useState} from 'react';
type Draw={date:string;nums:number[];bonus?:number};
type Archive={draws:Draw[];source:string};
type Config={file:string;count:number;max:number;bonus?:number;ordered?:boolean;session?:string};
type Pick={nums:number[];bonus?:number};
type Strategy={name:string;kind:'hot'|'cold'|'recent'|'overdue'|'alternating'|'spread';offset:number};
const configs:Record<string,Config>={
 'Lotto Texas':{file:'lotto-texas.json',count:6,max:54},
 'Powerball':{file:'powerball.json',count:5,max:69,bonus:26},
 'Mega Millions':{file:'mega-millions.json',count:5,max:70,bonus:24},
 'Texas Two Step':{file:'texas-two-step.json',count:4,max:35,bonus:35},
 'Cash Five':{file:'cash-five.json',count:5,max:35},
 'All or Nothing':{file:'all-or-nothing.json',count:12,max:24,session:'Night'},
 'Pick 3':{file:'pick-3.json',count:3,max:9,ordered:true,session:'Night'},
 'Daily 4':{file:'daily-4.json',count:4,max:9,ordered:true,session:'Night'}
};
const strategies:Strategy[]=[
 {name:'Hot frequency',kind:'hot',offset:0},
 {name:'Recent frequency',kind:'recent',offset:0},
 {name:'Overdue numbers',kind:'overdue',offset:0},
 {name:'Cold frequency',kind:'cold',offset:0},
 {name:'Hot / cold mix',kind:'alternating',offset:0},
 {name:'Wide number spread',kind:'spread',offset:0},
 {name:'Hot alternative',kind:'hot',offset:1},
 {name:'Recent alternative',kind:'recent',offset:1},
 {name:'Overdue alternative',kind:'overdue',offset:1},
 {name:'Cold alternative',kind:'cold',offset:1},
 {name:'Mixed alternative',kind:'alternating',offset:1},
 {name:'Spread alternative',kind:'spread',offset:1},
 {name:'Hot variation 2',kind:'hot',offset:2},
 {name:'Recent variation 2',kind:'recent',offset:2},
 {name:'Overdue variation 2',kind:'overdue',offset:2},
 {name:'Cold variation 2',kind:'cold',offset:2}
];
const field:React.CSSProperties={width:'100%',background:'#102235',color:'#eaf5fc',border:'1px solid #536e87',borderRadius:9,padding:11,fontSize:15};
function choose(history:Draw[],c:Config,s:Strategy):Pick{
 const nums:number[]=[];const positions=c.ordered?c.count:1;
 for(let position=0;position<positions;position++){
  const freq=new Float64Array(c.max+1),weighted=new Float64Array(c.max+1),age=new Float64Array(c.max+1).fill(history.length);
  history.forEach((d,i)=>{
   const values=c.ordered?[d.nums[position]]:d.nums;
   for(const x of values){freq[x]++;weighted[x]+=(i+1)/history.length;age[x]=history.length-1-i;}
  });
  const options=Array.from({length:c.max+(c.ordered?1:0)},(_,i)=>i+(c.ordered?0:1));
  const score=(n:number)=>s.kind==='cold'?-freq[n]:s.kind==='recent'?weighted[n]:s.kind==='overdue'?age[n]:freq[n];
  options.sort((a,b)=>score(b)-score(a)||a-b);
  if(c.ordered){nums.push(options[s.offset]);continue;}
  if(s.kind==='alternating'){
   const used=new Set<number>();
   for(let j=0;j<c.count;j++){const index=j%2===0?Math.floor(j/2)+s.offset:options.length-1-Math.floor(j/2)-s.offset;const n=options[index];if(n!==undefined&&!used.has(n))used.add(n);}
   for(const n of options){if(used.size>=c.count)break;used.add(n);}nums.push(...used);
  }else if(s.kind==='spread'){
   const used=[options[s.offset]];
   while(used.length<c.count){
    const remaining=options.filter(n=>!used.includes(n));
    remaining.sort((a,b)=>Math.min(...used.map(x=>Math.abs(b-x)))-Math.min(...used.map(x=>Math.abs(a-x)))||score(b)-score(a));
    used.push(remaining[0]);
   }
   nums.push(...used);
  }else nums.push(...options.slice(s.offset,s.offset+c.count));
 }
 if(!c.ordered)nums.sort((a,b)=>a-b);
 let bonus:number|undefined;
 if(c.bonus){
  const bc=new Float64Array(c.bonus+1);
  history.forEach((d,i)=>{if(d.bonus!==undefined)bc[d.bonus]+=s.kind==='recent'?(i+1)/history.length:1;});
  bonus=Array.from({length:c.bonus},(_,i)=>i+1).sort((a,b)=>bc[b]-bc[a]||a-b)[s.offset];
 }
 return {nums,bonus};
}
function hits(p:Pick,d:Draw,c:Config){
 return c.ordered?p.nums.filter((x,i)=>x===d.nums[i]).length:p.nums.filter(x=>d.nums.includes(x)).length;
}
function randomPick(c:Config,seed:number):Pick{
 let state=seed>>>0;const rnd=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state;};
 let nums:number[];
 if(c.ordered)nums=Array.from({length:c.count},()=>rnd()%10);
 else{
  const values=Array.from({length:c.max},(_,i)=>i+1);
  for(let i=values.length-1;i>0;i--){const j=rnd()%(i+1);[values[i],values[j]]=[values[j],values[i]];}
  nums=values.slice(0,c.count);
 }
 return {nums,bonus:c.bonus?1+rnd()%c.bonus:undefined};
}
type Ranked={name:string;choice:Pick;successes:number;total:number;rate:number;baseline:number};
function pct(x:number){return (x*100).toFixed(1)+'%';}
function Sales(){
 const baseSales=894243,extraSales=313836,playPrice=1;
 const estimatedLines=Math.round(baseSales/playPrice);
 return <div style={{border:'1px solid #4c6479',borderRadius:11,padding:12,display:'grid',gap:7}}>
  <strong style={{fontSize:13,color:'#b9dbf2'}}>LAST VERIFIED LOTTO TEXAS JACKPOT WIN</strong>
  <div style={{fontSize:12,color:'#d2e3f0'}}>September 5, 2026 · 14, 17, 25, 26, 30, 37</div>
  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:9}}>
   <div><small style={{color:'#aec4d6'}}>Base-game sales</small><strong style={{display:'block'}}>${baseSales.toLocaleString()}</strong></div>
   <div><small style={{color:'#aec4d6'}}>Estimated paid lines</small><strong style={{display:'block'}}>{estimatedLines.toLocaleString()}</strong></div>
   <div><small style={{color:'#aec4d6'}}>Price per line</small><strong style={{display:'block'}}>${playPrice}</strong></div>
   <div><small style={{color:'#aec4d6'}}>Extra add-on sales</small><strong style={{display:'block'}}>${extraSales.toLocaleString()}</strong></div>
  </div>
  <small style={{fontSize:11,color:'#b7cddd',lineHeight:1.5}}>Calculation: base-game sales ÷ $1 per Lotto Texas play. This estimates paid drawing entries, not printed tickets or unique buyers. Extra revenue is excluded to avoid double-counting. Sales figures are historical and not a live feed.</small>
  <a href="https://www.texaslottery.com/export/sites/lottery/Games/Lotto_Texas/draw_sales.html" target="_blank" rel="noreferrer" style={{color:'#b4d7ed',fontSize:12}}>Official drawing sales reports ↗</a>
 </div>;
}
export default function ProbabilityLab({game}:{game:string}){
 const config=configs[game], [archive,setArchive]=useState<Archive|null>(null),[error,setError]=useState('');
 const [lookback,setLookback]=useState('100'),[testCount,setTestCount]=useState('250'),[topCount,setTopCount]=useState('5'),[target,setTarget]=useState('2');
 const [result,setResult]=useState<{rows:Ranked[];n:number;begin:string;end:string;baseline:number;drawings:number;matches:number}|null>(null);
 const [showDetails,setShowDetails]=useState(false);
 useEffect(()=>{let alive=true;setArchive(null);setError('');setResult(null);
 fetch(import.meta.env.BASE_URL+'data/'+config.file,{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()}).then((a:Archive)=>{
  if(!Array.isArray(a.draws)||a.draws.length<130)throw Error('Insufficient verified historical results');
  if(alive)setArchive(a);
 }).catch(e=>{if(alive)setError(String(e.message||e))});return()=>{alive=false};},[game,config.file]);
 const available=archive?.draws.length||0;
 const train=Math.max(20,Math.min(Number(lookback),Math.max(20,available-10)));
 const maxTests=Math.max(0,available-train);
 const numTests=Math.min(Number(testCount),maxTests);
 const matchGoal=Math.min(Number(target),config.count);
 const choices=Array.from({length:config.count},(_,i)=>i+1);
 const ranked=useMemo(()=>result?.rows||[],[result]);
 function run(){
  if(!archive||numTests<10)return;
  const history=archive.draws;
  const start=history.length-numTests;
  const counts=strategies.map(()=>0);let randomWins=0;
  for(let i=start;i<history.length;i++){
   const sample=history.slice(i-train,i);
   const outcome=history[i];
   strategies.forEach((strategy,j)=>{if(hits(choose(sample,config,strategy),outcome,config)>=matchGoal)counts[j]++;});
   for(let j=0;j<4;j++){const ticket=randomPick(config,(Math.imul(i+1,2654435761)^Math.imul(j+1,1597334677))>>>0);if(hits(ticket,outcome,config)>=matchGoal)randomWins++;}
  }
  const baseline=randomWins/(numTests*4);
  const rows=strategies.map((strategy,j)=>({name:strategy.name,choice:choose(history.slice(-train),config,strategy),successes:counts[j],total:numTests,rate:counts[j]/numTests,baseline}));
  rows.sort((a,b)=>b.rate-a.rate||b.successes-a.successes||a.name.localeCompare(b.name));
  const seen=new Set<string>();
  const unique=rows.filter(r=>{const key=r.choice.nums.join(',')+'|'+r.choice.bonus;if(seen.has(key))return false;seen.add(key);return true;});
  setResult({rows:unique.slice(0,Number(topCount)),n:numTests,begin:history[start].date,end:history[history.length-1].date,baseline,drawings:train,matches:matchGoal});setShowDetails(false);
 }
 return <section style={{background:'#192b3d',border:'1px solid #34485a',borderRadius:15,padding:15,display:'grid',gap:13}}>
  <div><div style={{fontSize:10,color:'#add9f6',letterSpacing:2}}>PROBABILITY TESTING LAB</div><h2 style={{fontSize:20,margin:'6px 0'}}>Test and rank combinations</h2><p style={{fontSize:12,color:'#b9c9d8',lineHeight:1.6,margin:0}}>Choose your data window and test count. The app ranks historical selection strategies and generates their current top combinations.</p></div>
  {error?<p role="alert" style={{color:'#ffd5c7'}}>Historical data is unavailable: {error}. No estimated percentages are displayed.</p>:!archive?<p style={{fontSize:12,color:'#b9cada'}}>Loading official history…</p>:<>
   <small style={{color:'#b9cada'}}>{available.toLocaleString()} verified drawings available{config.session?' · '+config.session+' session':''}</small>
   <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
    <label style={{fontSize:12,color:'#b9d9ec'}}>Drawings to study<select style={field} value={lookback} onChange={e=>{setLookback(e.target.value);setResult(null)}}>{[30,50,100,250,500,1000].filter(n=>n<available-10).map(n=><option key={n} value={n}>{n} drawings</option>)}</select></label>
    <label style={{fontSize:12,color:'#b9d9ec'}}>Backtests to run<select style={field} value={testCount} onChange={e=>{setTestCount(e.target.value);setResult(null)}}>{[30,50,100,250,500,1000,2000].map(n=><option key={n} value={n}>{n.toLocaleString()} tests</option>)}</select></label>
    <label style={{fontSize:12,color:'#b9d9ec'}}>Top choices<select style={field} value={topCount} onChange={e=>{setTopCount(e.target.value);setResult(null)}}>{[3,5,10].map(n=><option key={n} value={n}>Top {n}</option>)}</select></label>
    <label style={{fontSize:12,color:'#b9d9ec'}}>Match target<select style={field} value={target} onChange={e=>{setTarget(e.target.value);setResult(null)}}>{choices.map(n=><option key={n} value={n}>{n}+ {config.ordered?'positions':'main numbers'}</option>)}</select></label>
   </div>
   <button disabled={numTests<10} onClick={run} style={{border:0,background:'#afd3f1',color:'#102236',padding:13,borderRadius:10,fontWeight:750,fontSize:14}}>Run {numTests.toLocaleString()} historical tests</button>
   {result&&<div style={{display:'grid',gap:11}}>
    <div style={{borderBottom:'1px solid #40576e',paddingBottom:10}}>
     <b style={{fontSize:14}}>{result.n.toLocaleString()} historical test drawings analyzed</b>
     <div style={{fontSize:11,color:'#bed2e0',marginTop:5}}>{result.begin} – {result.end} · training window: {result.drawings} earlier draws · result: {result.matches}+ {config.ordered?'correct positions':'main matches'}</div>
     <div style={{fontSize:11,color:'#bed2e0',marginTop:4}}>Random comparison: {pct(result.baseline)} across {(result.n*4).toLocaleString()} random selections</div>
    </div>
    {ranked.map((row,i)=><div key={row.name} style={{background:'#102438',border:'1px solid #4b6980',borderRadius:12,padding:12,display:'grid',gap:8}}>
     <div style={{display:'flex',justifyContent:'space-between',gap:8}}><strong style={{fontSize:13}}>#{i+1} · {row.name}</strong><strong style={{fontSize:18,color:'#b6dbf5'}}>{pct(row.rate)}</strong></div>
     <div style={{display:'flex',flexWrap:'wrap',gap:5,alignItems:'center'}}>{row.choice.nums.map((n,j)=><span key={j} style={{border:'1px solid #7395ad',borderRadius:25,padding:'6px 9px',fontWeight:700,fontSize:13}}>{n}</span>)}{row.choice.bonus!==undefined&&<b style={{border:'1px solid #c19a70',borderRadius:24,padding:'6px 9px'}}>+ {row.choice.bonus}</b>}</div>
     <small style={{color:'#b8cbda'}}>{row.successes} of {row.total} historical predictions matched the selected target · {((row.rate-row.baseline)*100)>=0?'+':''}{((row.rate-row.baseline)*100).toFixed(1)} percentage points versus random.</small>
    </div>)}
    <button onClick={()=>setShowDetails(x=>!x)} style={{background:'transparent',color:'#b5d9f4',border:'1px solid #567287',borderRadius:9,padding:10}}>{showDetails?'Hide interpretation':'How these percentages work'}</button>
    {showDetails&&<p style={{fontSize:12,color:'#bed2e1',lineHeight:1.6,margin:0}}>Each strategy was trained only on the previous {result.drawings} drawings, then measured against the next historical result. The percentage is the fraction of {result.n} tests that matched your chosen threshold, not the probability that the displayed exact ticket will win. Strategies are ranked using the same tests, so the top one may be lucky or overfit. Jackpot-winning probabilities do not improve based on past frequencies.</p>}
   </div>}
  </>}
  {game==='Lotto Texas'?<div style={{border:'1px solid #47647a',borderRadius:11,padding:12,display:'grid',gap:7}}>
   <b style={{fontSize:13,color:'#b9dcf4'}}>LAST VERIFIED JACKPOT WIN · SEPTEMBER 5, 2026</b>
   <span style={{fontSize:12}}>Winning numbers: 14 · 17 · 25 · 26 · 30 · 37</span>
   <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:9}}><div><small>Base drawing sales</small><strong style={{display:'block'}}>$894,243</strong></div><div><small>Estimated paid lines</small><strong style={{display:'block'}}>894,243</strong></div><div><small>Per-play cost</small><strong style={{display:'block'}}>$1</strong></div><div><small>Extra add-on revenue</small><strong style={{display:'block'}}>$313,836</strong></div></div>
   <small style={{color:'#b4c9d8',lineHeight:1.5}}>Calculation: $894,243 base sales ÷ $1 per play = 894,243 implied drawing entries. Extra revenue is excluded. A line is not necessarily one printed ticket or one buyer. Figures refer to this drawing, not live sales.</small>
   <a href="https://www.texaslottery.com/export/sites/lottery/Games/Lotto_Texas/draw_sales.html" target="_blank" rel="noreferrer" style={{fontSize:12,color:'#b8daf1'}}>Official draw sales reports ↗</a>
  </div>:<small style={{color:'#aec3d5'}}>Verified jackpot-drawing sales are not yet connected for {game}; paid-line counts will only appear when official sales and the applicable base-play price are available.</small>}
 </section>;
}
