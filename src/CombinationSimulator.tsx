import React,{useEffect,useMemo,useState} from 'react';
import RepeatabilityLab,{type RepeatSummary} from './RepeatabilityLab';
type Draw={date:string;nums:number[];bonus?:number};
type Archive={draws:Draw[];source:string};
type GameConfig={file:string;count:number;max:number;bonus?:number;ordered?:boolean;session?:string};
type Ticket={nums:number[];bonus?:number};
type Candidate={ticket:Ticket;trainHits:number;trainScore:number;verifiedHits:number;verifiedScore:number;method:string};
type Result={ranked:Candidate[];train:Draw[];holdout:Draw[];tested:number;unique:number;goal:number;window:number;date:string;baselineHits:number;baselineTrials:number;baselineRate:number};
const configs:Record<string,GameConfig>={
 'Lotto Texas':{file:'lotto-texas.json',count:6,max:54},
 'Powerball':{file:'powerball.json',count:5,max:69,bonus:26},
 'Mega Millions':{file:'mega-millions.json',count:5,max:70,bonus:24},
 'Texas Two Step':{file:'texas-two-step.json',count:4,max:35,bonus:35},
 'Cash Five':{file:'cash-five.json',count:5,max:35},
 'All or Nothing':{file:'all-or-nothing.json',count:12,max:24,session:'Night'},
 'Pick 3':{file:'pick-3.json',count:3,max:9,ordered:true,session:'Night'},
 'Daily 4':{file:'daily-4.json',count:4,max:9,ordered:true,session:'Night'}
};
type Profile={label:string;defaultSearch:number;maxSearch:number;defaultWindow:number;note:string;digitExhaustive?:boolean};
const profiles:Record<string,Profile>={
 'Lotto Texas':{label:'6-number Lotto engine',defaultSearch:10000,maxSearch:100000,defaultWindow:100,note:'Search up to 100,000 unique 6-of-54 combinations.'},
 'Powerball':{label:'Powerball + red ball engine',defaultSearch:10000,maxSearch:100000,defaultWindow:100,note:'Every candidate includes an eligible red Powerball.'},
 'Mega Millions':{label:'Mega Ball engine',defaultSearch:10000,maxSearch:100000,defaultWindow:100,note:'Every candidate includes its Mega Ball.'},
 'Texas Two Step':{label:'Two Step + bonus engine',defaultSearch:10000,maxSearch:100000,defaultWindow:100,note:'Four main numbers and a separate bonus number.'},
 'Cash Five':{label:'Five-number engine',defaultSearch:10000,maxSearch:100000,defaultWindow:100,note:'Five distinct numbers, ranked against Cash Five results.'},
 'All or Nothing':{label:'12-number engine',defaultSearch:10000,maxSearch:100000,defaultWindow:100,note:'Twelve numbers per combination, using Night drawings in the current archive.'},
 'Pick 3':{label:'Complete 3-digit engine',defaultSearch:1000,maxSearch:1000,defaultWindow:100,note:'Exhaustively checks all 1,000 ordered three-digit entries, including repeated digits.',digitExhaustive:true},
 'Daily 4':{label:'Complete 4-digit engine',defaultSearch:10000,maxSearch:10000,defaultWindow:100,note:'Exhaustively checks all 10,000 ordered four-digit entries, including repeated digits.',digitExhaustive:true}
};
function combinations(n:number,k:number){let count=1;for(let i=1;i<=k;i++)count=count*(n-i+1)/i;return Math.round(count);}
function fullSpace(cfg:GameConfig){return cfg.ordered?Math.pow(10,cfg.count):combinations(cfg.max,cfg.count)*(cfg.bonus||1);}
function enumeratedDigits(n:number,count:number):Ticket {const nums=new Array(count).fill(0);for(let i=count-1;i>=0;i--){nums[i]=n%10;n=Math.floor(n/10);}return {nums};}
const control:React.CSSProperties={color:'#f0f7fc',background:'#102235',border:'1px solid #536e87',borderRadius:9,padding:'10px 8px',fontSize:14,width:'100%'};
function generator(seed:number){let state=seed>>>0;return ()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};}
function chooseWeighted(options:number[],weights:number[],next:()=>number){
 const total=weights.reduce((s,x)=>s+x,0);let roll=next()*total;
 for(let i=0;i<weights.length;i++){roll-=weights[i];if(roll<=0)return i;}
 return options.length-1;
}
function generateCandidate(cfg:GameConfig,train:Draw[],counts:number[][],bonusCounts:number[],next:()=>number,method:number):Ticket{
 const nums:number[]=[];
 const recent=train.slice(-Math.min(30,train.length));
 // A mix of random, frequency-weighted, cold-weighted and mutated past winning combinations.
 if(!cfg.ordered&&method===3&&train.length){
  const base=recent[Math.floor(next()*recent.length)];
  nums.push(...base.nums.slice(0,cfg.count));
  const mutate=1+Math.floor(next()*Math.min(cfg.count,3));
  for(let i=0;i<mutate;i++){
   const ix=Math.floor(next()*nums.length);
   let replacement=1+Math.floor(next()*cfg.max);let tries=0;
   while(nums.includes(replacement)&&tries++<100)replacement=1+Math.floor(next()*cfg.max);
   if(!nums.includes(replacement))nums[ix]=replacement;
  }
 }else for(let pos=0;pos<cfg.count;pos++){
  const pool=Array.from({length:cfg.max+(cfg.ordered?1:0)},(_,i)=>i+(cfg.ordered?0:1)).filter(n=>cfg.ordered||!nums.includes(n));
  const row=counts[cfg.ordered?pos:0];
  const weights=pool.map(n=>method===0?1:method===2?1/(1+row[n]):1+row[n]*3);
  nums.push(pool[chooseWeighted(pool,weights,next)]);
 }
 if(!cfg.ordered)nums.sort((a,b)=>a-b);
 let bonus:number|undefined;
 if(cfg.bonus){
  const pool=Array.from({length:cfg.bonus},(_,i)=>i+1);
  bonus=pool[chooseWeighted(pool,pool.map(n=>method===0?1:1+bonusCounts[n]*3),next)];
 }
 return {nums,bonus};
}
function statistics(draws:Draw[],cfg:GameConfig){
 const counts=Array.from({length:cfg.ordered?cfg.count:1},()=>Array(cfg.max+1).fill(0) as number[]);
 const bonus=Array((cfg.bonus||0)+1).fill(0) as number[];
 for(const d of draws){
  if(cfg.ordered)d.nums.forEach((n,i)=>counts[i][n]++);
  else for(const n of d.nums)counts[0][n]++;
  if(cfg.bonus&&d.bonus!==undefined)bonus[d.bonus]++;
 }
 return {counts,bonus};
}
function matches(ticket:Ticket,draw:Draw,ordered:boolean){
 let hits=0;
 if(ordered){for(let i=0;i<ticket.nums.length;i++)if(ticket.nums[i]===draw.nums[i])hits++;}
 else for(const n of ticket.nums)if(draw.nums.includes(n))hits++;
 return hits;
}
function evaluate(ticket:Ticket,draws:Draw[],ordered:boolean,threshold:number){
 let successes=0,score=0;
 for(const draw of draws){
  const count=matches(ticket,draw,ordered);
  if(count>=threshold)successes++;
  // Secondary sort makes ties reproducible without changing the selected match threshold.
  score+=count;
 }
 return {successes,score};
}
function makeBaselineTicket(cfg:GameConfig,seed:number):Ticket{
 const next=generator(seed);
 const nums:number[]=[];
 if(cfg.ordered){
  for(let i=0;i<cfg.count;i++)nums.push(Math.floor(next()*10));
 }else{
  const pool=Array.from({length:cfg.max},(_,i)=>i+1);
  for(let i=pool.length-1;i>0;i--){const j=Math.floor(next()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
  nums.push(...pool.slice(0,cfg.count));
 }
 return {nums,bonus:cfg.bonus?1+Math.floor(next()*cfg.bonus):undefined};
}
function formatRate(a:number,n:number){return n?(a*100/n).toFixed(1)+'%':'—';}
function combination(n:number,k:number){if(k<0||k>n)return 0;let v=1;for(let i=1;i<=k;i++)v=v*(n-i+1)/i;return v;}
function chanceRandom(cfg:GameConfig,threshold:number){
 let total=0;
 if(cfg.ordered){
  for(let m=threshold;m<=cfg.count;m++)total+=combination(cfg.count,m)*Math.pow(0.1,m)*Math.pow(0.9,cfg.count-m);
 }else{
  const denom=combination(cfg.max,cfg.count);
  for(let m=threshold;m<=cfg.count;m++)total+=combination(cfg.count,m)*combination(cfg.max-cfg.count,cfg.count-m)/denom;
 }
 return total;
}
function expectedText(p:number,n:number){const expected=p*n;return expected<0.01?'<0.01':expected.toFixed(expected<10?2:1);}

const methods=['Uniform random','Historical frequency','Cold-weighted','Mutated past winner'];
export default function CombinationSimulator({game,onSavePick}:{game:string;onSavePick?:(nums:number[],bonus?:number)=>void}){
 const cfg=configs[game];const profile=profiles[game];const [archive,setArchive]=useState<Archive|null>(null);const [error,setError]=useState('');
 const [windowSize,setWindowSize]=useState(String(profile.defaultWindow)),[searchSize,setSearchSize]=useState(String(profile.defaultSearch)),[topSize,setTopSize]=useState('5'),[target,setTarget]=useState(cfg.ordered?'2':'3');
 const [running,setRunning]=useState(false);const [progress,setProgress]=useState(0);
 const [result,setResult]=useState<Result|null>(null);
 const [repeatability,setRepeatability]=useState<RepeatSummary[]>([]);
 useEffect(()=>{let active=true;setArchive(null);setError('');setResult(null);setRepeatability([]);setRunning(false);
 fetch(import.meta.env.BASE_URL+'data/'+cfg.file,{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()}).then((data:Archive)=>{if(!Array.isArray(data.draws)||data.draws.length<30)throw Error('Invalid or incomplete archive');if(active)setArchive(data);}).catch(e=>{if(active)setError(String(e.message||e));});return()=>{active=false};},[game,cfg.file]);
 const maxDraws=archive?.draws.length||0;
 const chosenWindow=Math.min(Number(windowSize),maxDraws);
 const allowedWindows=[30,50,100,250,500,1000,2000,5000].filter(n=>n<=maxDraws);
 const trainingTotal=Math.max(1,Math.floor(chosenWindow*.7));
 const verificationTotal=chosenWindow-trainingTotal;
 const targetNum=Math.min(Number(target),cfg.count);
 const top=useMemo(()=>result?.ranked||[],[result]);
 const expectedRandom=chanceRandom(cfg,targetNum);
 async function runSearch(){
  if(!archive||running)return;
  const all=archive.draws;
  const window=all.slice(-chosenWindow);
  if(window.length<30)return;
  const split=Math.floor(window.length*.7);
  const train=window.slice(0,split),holdout=window.slice(split);
  const {counts,bonus}=statistics(train,cfg);
  const nRequested=Math.min(Number(searchSize),profile.maxSearch,fullSpace(cfg)),next=generator(0x42f0921^all.length^Number(searchSize)^chosenWindow);
  const seen=new Set<string>();
  const candidates:Candidate[]=[];
  setResult(null);setRunning(true);setProgress(0);
  try{
   // Digit lotteries have finite small spaces. Exhaustive enumeration avoids repeats.
   const batch=250;
   if(profile.digitExhaustive){
    for(let i=0;i<nRequested;i+=batch){
     const end=Math.min(i+batch,nRequested);
     for(let number=i;number<end;number++){
      const ticket=enumeratedDigits(number,cfg.count);
      const training=evaluate(ticket,train,!!cfg.ordered,targetNum);
      candidates.push({ticket,trainHits:training.successes,trainScore:training.score,verifiedHits:0,verifiedScore:0,method:'Entire ordered number space'});
      seen.add(ticket.nums.join('-'));
     }
     setProgress(end);
     await new Promise<void>(resolve=>setTimeout(resolve,0));
    }
   }else{
    for(let i=0,attempts=0;i<nRequested&&attempts<nRequested*25;){
     const end=Math.min(i+batch,nRequested);
     while(i<end&&attempts<nRequested*25){
      attempts++;
      const mode=(attempts-1)%methods.length;
      const ticket=generateCandidate(cfg,train,counts,bonus,next,mode);
      const key=ticket.nums.join('-')+'|'+(ticket.bonus||0);
      if(seen.has(key))continue;
      seen.add(key);
      const training=evaluate(ticket,train,!!cfg.ordered,targetNum);
      candidates.push({ticket,trainHits:training.successes,trainScore:training.score,verifiedHits:0,verifiedScore:0,method:methods[mode]});
      i++;
     }
     setProgress(i);
     await new Promise<void>(resolve=>setTimeout(resolve,0));
    }
   }
   // Holdout random baseline is independent of candidate generation/ranking.
   // Compare equal targets against exactly the same newer drawings.
   let baselineHits=0;
   const BASELINE_PER_DRAW=64;
   for(let i=0;i<holdout.length;i++){
    for(let repetition=0;repetition<BASELINE_PER_DRAW;repetition++){
     const seed=(Math.imul(i+split+1,2654435761)^Math.imul(repetition+1,2246822519)^0x75a13)>>>0;
     const randomTicket=makeBaselineTicket(cfg,seed);
     if(matches(randomTicket,holdout[i],!!cfg.ordered)>=targetNum)baselineHits++;
    }
   }
   // Rank with TRAINING only; validation outcomes do not influence the order.
   candidates.sort((a,b)=>b.trainHits-a.trainHits||b.trainScore-a.trainScore||a.ticket.nums.join('-').localeCompare(b.ticket.nums.join('-')));
   const leaders=candidates.slice(0,Number(topSize));
   for(const ticket of leaders){const verified=evaluate(ticket.ticket,holdout,!!cfg.ordered,targetNum);ticket.verifiedHits=verified.successes;ticket.verifiedScore=verified.score;}
   setResult({ranked:leaders,train,holdout,tested:candidates.length,unique:seen.size,goal:targetNum,window:window.length,date:all[all.length-1].date,baselineHits,baselineTrials:holdout.length*BASELINE_PER_DRAW,baselineRate:baselineHits/(holdout.length*BASELINE_PER_DRAW)});
  }finally{setRunning(false);}
 }
 return <section style={{background:'#192b3d',border:'1px solid #34485a',borderRadius:15,padding:15,display:'grid',gap:13}}>
  <div><div style={{fontSize:10,color:'#afd8f4',letterSpacing:2}}>COMBINATION SEARCH LAB</div><h2 style={{fontSize:19,margin:'7px 0'}}>{profile.label}</h2><p style={{color:'#b8cede',fontSize:12,lineHeight:1.6,margin:0}}>{profile.note} Rank on older drawings and validate on later unseen drawings.</p></div>
  {error?<p role="alert" style={{color:'#ffd1c0'}}>Official archive unavailable: {error}</p>:!archive?<p style={{color:'#b8cede',fontSize:12}}>Loading verified drawing archive…</p>:<>
   <small style={{color:'#b8cede'}}>Unique eligible tickets: {fullSpace(cfg).toLocaleString()} · {maxDraws.toLocaleString()} historical drawings available{cfg.session?' · '+cfg.session+' only':''} · through {archive.draws[archive.draws.length-1]?.date}</small>
   <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:9}}>
    <label style={{fontSize:12,color:'#b4d7ef'}}>Drawings to analyze<select style={control} value={allowedWindows.includes(Number(windowSize))?windowSize:String(allowedWindows[allowedWindows.length-1])} disabled={running} onChange={e=>{setWindowSize(e.target.value);setResult(null);setRepeatability([])}}>{allowedWindows.map(n=><option value={n} key={n}>{n.toLocaleString()} draws</option>)}</select></label>
    <label style={{fontSize:12,color:'#b4d7ef'}}>Combinations to test<select style={control} value={searchSize} disabled={running} onChange={e=>{setSearchSize(e.target.value);setResult(null)}}>{(profile.digitExhaustive?[profile.maxSearch]:[1000,2500,5000,10000,25000,50000,100000].filter(n=>n<=profile.maxSearch)).map(n=><option value={n} key={n}>{n.toLocaleString()} {profile.digitExhaustive?'(all possible)':'combinations'}</option>)}</select></label>
    <label style={{fontSize:12,color:'#b4d7ef'}}>Show best<select style={control} value={topSize} disabled={running} onChange={e=>{setTopSize(e.target.value);setResult(null)}}>{[3,5,10].map(n=><option value={n} key={n}>Top {n} picks</option>)}</select></label>
    <label style={{fontSize:12,color:'#b4d7ef'}}>Success means<select style={control} value={target} disabled={running} onChange={e=>{setTarget(e.target.value);setResult(null);setRepeatability([])}}>{Array.from({length:cfg.count},(_,i)=>i+1).map(n=><option key={n} value={n}>{n}+ {cfg.ordered?'correct positions':'main numbers'}</option>)}</select></label>
   </div>
   {Number(searchSize)>=50000&&<small style={{color:'#e6caad'}}>High-volume testing on an iPhone may be slower. Results are processed in batches to keep the interface responsive.</small>}
   <small style={{color:'#b5d3e5'}}>A random ticket is expected to hit {targetNum}+ {cfg.ordered?'positions':'main numbers'} in {(expectedRandom*100).toFixed(expectedRandom<0.001?3:1)}% of independent drawings ({expectedText(expectedRandom,verificationTotal)} expected matches in the {verificationTotal} unseen drawings).</small>
   <small style={{color:'#c0d1df'}}>Using {trainingTotal.toLocaleString()} draws for ranking, {verificationTotal.toLocaleString()} newer draws for an independent check. Bonus ball does not count toward the match threshold.</small>
   <RepeatabilityLab key={game+'-'+windowSize+'-'+target} draws={archive.draws} game={game} count={cfg.count} max={cfg.max} ordered={!!cfg.ordered} lookback={Math.min(chosenWindow,1000)} target={targetNum} onResults={setRepeatability}/>
   <button disabled={running||chosenWindow<30} onClick={()=>{void runSearch();}} style={{background:'#aed4f2',color:'#102033',border:0,borderRadius:10,padding:13,fontWeight:750,fontSize:14}}>{running?'Testing '+progress.toLocaleString()+' / '+Number(searchSize).toLocaleString()+'…':'Search '+Number(searchSize).toLocaleString()+' combinations'}</button>
   {result&&<div style={{display:'grid',gap:10}}>
    <div style={{borderBottom:'1px solid #466078',paddingBottom:9}}><strong style={{fontSize:13}}>{result.tested.toLocaleString()} distinct combinations tested{profile.digitExhaustive&&result.tested===fullSpace(cfg)?' — COMPLETE number space':''}</strong><p style={{color:'#b8cede',fontSize:11,margin:'6px 0 0'}}>Historical window: {result.window} drawings ending {result.date}. Ranked using {result.train.length} older draws; checked against {result.holdout.length} later draws.</p></div>
    <div style={{background:'#122b40',border:'1px solid #51718a',borderRadius:9,padding:11,fontSize:12,color:'#c8dce9',lineHeight:1.6}}><b>Unseen-drawing random baseline:</b> {formatRate(result.baselineHits,result.baselineTrials)} ({result.baselineHits.toLocaleString()} matches out of {result.baselineTrials.toLocaleString()} randomized tickets; 64 per newer drawing). This uses the same held-out results as the recommended combinations.</div>
    <div style={{background:'#122b40',border:'1px solid #51718a',borderRadius:9,padding:11,fontSize:12,color:'#c8dce9',lineHeight:1.6}}><b>Random-chance reference:</b> {formatRate(chanceRandom(cfg,result.goal)*100,100)} per ticket per drawing for {result.goal}+ {cfg.ordered?'correct digit positions':'main numbers'}. Across {result.holdout.length} unseen drawings, about {expectedText(chanceRandom(cfg,result.goal),result.holdout.length)} successes would be expected for one random ticket. Zero observed successes can be normal.</div>
    {repeatability.length>0&&<div style={{background:'#132b40',border:'1px solid #4e7088',borderRadius:10,padding:11,display:'grid',gap:6}}>
     <b style={{fontSize:12,color:'#b7d9ef'}}>Repeatability is linked to these recommendations</b>
     <small style={{color:'#b9d0df',lineHeight:1.6}}>The badges below describe historically related strategy families, not the individual ticket's chance of winning. The repeatability test does not change the ranking of combinations. A family exceeding random in several periods may still be due to chance.</small>
    </div>}
    {top.map((entry,index)=><div key={entry.ticket.nums.join(',')+'|'+entry.ticket.bonus} style={{background:'#102438',border:'1px solid #4c6b82',borderRadius:11,padding:12,display:'grid',gap:9}}>
     <strong style={{color:'#c1dff3',fontSize:13}}>#{index+1} · {entry.method}</strong>
     {repeatability.length>0&&(()=>{const family=entry.method==='Historical frequency'?'hot':entry.method==='Cold-weighted'?'cold':null;const info=repeatability.find(x=>x.method===family);return <div style={{fontSize:11,color:'#c4d9e7',lineHeight:1.55}}>{info?<><b>Related strategy: {family==='hot'?'Hot frequency':'Cold frequency'}</b> · Above random in <b>{info.periodsAbove}/{info.periods}</b> periods · Historical method match rate {(info.pooledRate*100).toFixed(1)}% versus random {(info.randomPooledRate*100).toFixed(1)}% across {info.draws} tests. This is a strategy-family comparison, not a test of this exact ticket.</>:<span>No directly comparable repeatability strategy for this generator.</span>}</div>;})()}
     <div style={{display:'flex',gap:5,flexWrap:'wrap',alignItems:'center'}}>{entry.ticket.nums.map((n,i)=><b key={i} style={{padding:'7px 10px',border:'1px solid #8cabc3',borderRadius:30,fontSize:14}}>{n}</b>)}{entry.ticket.bonus!==undefined&&<b style={{padding:'7px 10px',border:'1px solid #c99f75',borderRadius:30,fontSize:14}}>+ {entry.ticket.bonus}</b>}</div>
     {onSavePick&&<button onClick={()=>onSavePick([...entry.ticket.nums],entry.ticket.bonus)} style={{border:'1px solid #7094b1',borderRadius:9,padding:10,background:'#1b3b55',color:'#d8edfb',fontWeight:700}}>Save this recommended combination</button>}
     <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
      <div><small style={{color:'#acc6d8'}}>Ranking-history match rate</small><strong style={{display:'block',fontSize:22}}>{formatRate(entry.trainHits,result.train.length)}</strong><small style={{color:'#aebfd0'}}>{entry.trainHits} successes, {result.train.length-entry.trainHits} misses / {result.train.length} draws</small></div>
      <div><small style={{color:'#acc6d8'}}>Unseen-history match rate</small><strong style={{display:'block',fontSize:22}}>{formatRate(entry.verifiedHits,result.holdout.length)}</strong><small style={{color:'#aebfd0'}}>{entry.verifiedHits} successes, {result.holdout.length-entry.verifiedHits} misses / {result.holdout.length} draws</small><small style={{display:'block',marginTop:5,color:'#b9d7e8'}}>Compared with random: {((entry.verifiedHits/result.holdout.length-result.baselineRate)*100)>=0?'+':''}{((entry.verifiedHits/result.holdout.length-result.baselineRate)*100).toFixed(1)} percentage points</small></div>
     </div>
    </div>)}
    <p style={{fontSize:11,color:'#bacbd9',lineHeight:1.6,margin:0}}>The ranking percentage is the fraction of historical draws where this exact combination met your {result.goal}+ match target. The separate check uses newer draws excluded from ranking. Random tickets also face those same later draws. A positive or negative percentage-point difference can be normal sampling variation, especially for a small holdout; it is not proof of an edge. For ordered digit games, partial matches count only in the correct positions. A 0.0% unseen rate means no successes were observed in that small period, not a zero chance next time. Searching thousands of combinations will always find some unusually strong-looking historical matches by chance; these percentages are not estimates of future jackpot-winning probability.</p>
   </div>}
  </>}
 </section>;
}
