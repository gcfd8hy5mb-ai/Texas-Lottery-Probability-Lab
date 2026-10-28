import React,{useEffect,useState} from 'react';
import PrizeTierLab from './PrizeTierLab';
import AdvancedMathLab from './AdvancedMathLab';
import {probabilityAtLeast,distribution,simulate,totalOutcomes,atLeastOne,binomialExactly,wilsonInterval,type Matrix} from './lotteryMath';
type Draw={date:string;nums:number[];bonus?:number};
type Game={name:string;count:number;max:number;bonusMax?:number;ordered?:boolean};
type Candidate={nums:number[];bonus?:number;train:number;hold:number;score:number;reasons:string[];stable:number;recent:number;tests:number;method:string};
type Result={picks:Candidate[];tested:number;periods:{name:string;wins:number;periods:number;rate:number;expected:number}[];train:number;hold:number;lastDate:string;patterns:string[];threshold:number;expected:number;holdStart:string;discoveryEnd:string;randomHold:number;randomTrials:number;methodCount:number;math:MathReport;portfolio:{observed:number;controls:number;mean:number;lower:number;upper:number;tail:number;draws:number}};
const files:Record<string,string>={'Lotto Texas':'lotto-texas.json','Powerball':'powerball.json','Mega Millions':'mega-millions.json','Texas Two Step':'texas-two-step.json','Cash Five':'cash-five.json','All or Nothing':'all-or-nothing.json','Pick 3':'pick-3.json','Daily 4':'daily-4.json'};
const panel:React.CSSProperties={background:'#192b3d',border:'1px solid #354c62',borderRadius:14,padding:14,display:'grid',gap:11};
const light='#b6d4e8';
const matrixFor=(g:Game):Matrix=>({pool:g.ordered?10:g.max,pick:g.count,ordered:!!g.ordered,bonusPool:g.bonusMax});
type MathReport={
 fullSpace:number;jackpotProbability:number;thresholdProbability:number;
 distribution:{hits:number;probability:number;expectedPer1000:number}[];
 simulated:number;trials:number;simulationInterval:[number,number];simulationExpected:number;
 crossCheck:'consistent'|'inconclusive'|'review';holdoutNoMatch:number;holdoutAtLeastOne:number;
 expectedDrawMatches:number;bonusIncluded:boolean
};

function prng(seed:number){let s=seed>>>0;return ()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
function generate(g:Game,next:()=>number,weights?:number[]):number[]{
 const nums:number[]=[];
 if(g.ordered){for(let p=0;p<g.count;p++){if(weights){let best=0,bv=-1;for(let n=0;n<10;n++){const v=Math.pow(Math.max(.01,weights[p*10+n]),1)*Math.pow(next(),.8);if(v>bv){bv=v;best=n;}}nums.push(best);}else nums.push(Math.floor(next()*10));}return nums;}
 const options=Array.from({length:g.max},(_,i)=>i+1);
 for(let i=0;i<g.count;i++){let total=0;const ws=options.map(n=>{const w=weights?Math.max(.01,weights[n]):1;total+=w;return w;});let r=next()*total,j=0;while(j<ws.length-1&&r>=ws[j]){r-=ws[j];j++;}nums.push(options[j]);options.splice(j,1);}
 return nums.sort((a,b)=>a-b);
}
function maskKey(nums:number[],bonus?:number){return nums.join('-')+'|'+(bonus||0);}
function match(nums:number[],draw:Draw,ordered:boolean){return ordered?nums.reduce((n,v,i)=>n+Number(v===draw.nums[i]),0):nums.reduce((n,v)=>n+Number(draw.nums.includes(v)),0);}
function patterns(draws:Draw[],g:Game){
 const freq=new Array(g.ordered?g.count*10:g.max+1).fill(0),recent=freq.slice(),last=freq.map(()=>-1);
 const pairs=new Map<string,number>();
 for(let i=0;i<draws.length;i++){const d=draws[i],nums=d.nums;
  nums.forEach((n,p)=>{const ix=g.ordered?p*10+n:n;freq[ix]++;recent[ix]+=(i+1)/draws.length;last[ix]=i;});
  for(let a=0;a<nums.length;a++)for(let b=a+1;b<nums.length;b++){const k=g.ordered?a+':'+nums[a]+'|'+b+':'+nums[b]:Math.min(nums[a],nums[b])+'-'+Math.max(nums[a],nums[b]);pairs.set(k,(pairs.get(k)||0)+1);}
 }
 const gap=last.map(i=>draws.length-1-i);
 const normal=g.ordered?.1:g.count/g.max;
 const rate=freq.map(f=>f/draws.length);
 const bestPair=[...pairs.entries()].sort((a,b)=>b[1]-a[1])[0];
 const parity=Array.from({length:g.count+1},(_,n)=>draws.filter(d=>d.nums.filter(v=>v%2).length===n).length);
 const commonParity=parity.indexOf(Math.max(...parity));
 return {freq,recent,gap,rate,normal,pair:bestPair?.[0]||'',pairCount:bestPair?.[1]||0,parity:commonParity};
}
function weightsFor(g:Game,stats:ReturnType<typeof patterns>,mode:number){
 const source=mode===1?stats.freq:mode===2?stats.freq.map(x=>1/(x+1)):mode===3?stats.recent:mode===4?stats.gap:stats.freq.map(()=>1);
 return source.map(x=>Math.max(.05,mode===2?x*20:mode===4?1+x:1+x));
}
function rateFor(nums:number[],draws:Draw[],g:Game,threshold:number){let n=0;for(const d of draws)if(match(nums,d,!!g.ordered)>=threshold)n++;return n;}
function percent(p:number){return (100*p).toFixed(p<.001?3:1)+'%';}
function uncertainty(p:number,n:number){return 1.96*Math.sqrt(n*p*(1-p));}
function wilson(success:number,n:number){if(!n)return [0,1];const z=1.96,q=success/n,den=1+z*z/n,mid=(q+z*z/(2*n))/den,half=z*Math.sqrt(q*(1-q)/n+z*z/(4*n*n))/den;return [Math.max(0,mid-half),Math.min(1,mid+half)];}
function label(nums:number[],g:Game){return g.ordered?nums.join(''):nums.join(' · ');}
function parityCount(nums:number[]){return nums.filter(n=>n%2).length;}
export default function AutoPickLab({games,onSave,initialGame='Lotto Texas'}:{games:Game[];onSave:(game:string,nums:number[],bonus?:number)=>void;initialGame?:string}){
 const [game,setGame]=useState(initialGame),[window,setWindow]=useState('500'),[size,setSize]=useState('50000');
 const [prizeOpen,setPrizeOpen]=useState(true);
 const [data,setData]=useState<Draw[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const [running,setRunning]=useState(false),[progress,setProgress]=useState(0),[stage,setStage]=useState(''),[result,setResult]=useState<Result|null>(null),[detail,setDetail]=useState<'picks'|'patterns'|'tests'>('picks');
 const g=games.find(v=>v.name===game)!;
 useEffect(()=>{let active=true;setLoading(true);setData([]);setResult(null);setError('');
 fetch(import.meta.env.BASE_URL+'data/'+files[game],{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('History file unavailable');return r.json()}).then(v=>{if(active){if(!Array.isArray(v.draws)||v.draws.length<50)throw Error('Not enough valid drawings');setData(v.draws);setLoading(false);}}).catch(e=>{if(active){setError(String(e.message||e));setLoading(false);}});return()=>{active=false;};},[game]);
 const counts=[100,250,500,1000,2000].filter(n=>n<=data.length),chosen=counts.includes(Number(window))?Number(window):counts[counts.length-1]||0;
 const comboOptions=g.ordered?[Math.pow(10,g.count)]:[10000,25000,50000,100000,150000,250000];
 const requestedCount=g.ordered?Math.pow(10,g.count):Number(size);
 function selectGame(name:string){
  if(running||name===game)return;
  setGame(name);setPrizeOpen(true);setResult(null);setProgress(0);setDetail('picks');setStage('');setError('');
  // Draw options are re-evaluated from each game's verified historical archive.
  setWindow('500');
  setSize('50000');
 }
 async function run(){
  if(running||loading||!chosen)return;
  setRunning(true);setResult(null);setProgress(0);setDetail('picks');
  try{
   const draws=data.slice(-chosen),split=Math.floor(draws.length*.7),train=draws.slice(0,split),hold=draws.slice(split);
   const threshold=g.ordered?Math.max(1,g.count-1):Math.min(g.count,3);
   const matrix=matrixFor(g);
   const stats=patterns(train,g),expected=probabilityAtLeast(matrix,threshold),next=prng(0x32786^data.length^chosen);
   setStage('Analyzing frequency, pairs, parity and gaps');
   const desc=[
    'Most frequent number and digit-position patterns',
    'Most frequent repeating number pairs',
    'Longest gaps and overdue numbers',
    'Odd/even distribution',
    'Recent-result weighting',
    'Historical performance against random expectation'
   ];
   const methods=[{name:'Hot frequency',mode:1},{name:'Cold frequency',mode:2},{name:'Recent weighting',mode:3},{name:'Gap weighting',mode:4}];
   const periodsToTest=10;
   const periodLength=Math.max(6,Math.floor((train.length-30)/periodsToTest));
   const periodScores=methods.map(method=>{
    let wins=0,success=0,total=0;
    for(let p=0;p<periodsToTest;p++){
     const start=Math.max(30,train.length-periodsToTest*periodLength+p*periodLength),end=Math.min(train.length,start+periodLength);
     let hits=0;
     for(let i=start;i<end;i++){
      const history=draws.slice(Math.max(0,i-100),i),s=patterns(history,g);
      const r=prng(0x93810^i^method.mode),ticket=generate(g,r,weightsFor(g,s,method.mode));
      if(match(ticket,draws[i],!!g.ordered)>=threshold)hits++;
     }
     const n=end-start;if(n>0){total+=n;success+=hits;if(hits/n>expected)wins++;}
    }
    return {name:method.name,wins,periods:periodsToTest,rate:total?success/total:0,expected};
   });
   setStage('Searching distinct combinations');
   const seen=new Set<string>(),top:Candidate[]=[];
   const mid=Math.floor(train.length/2),trainOlder=train.slice(0,mid),trainNewer=train.slice(mid);
   // History is sorted into two discovery halves for consistency scoring.
   const requested=g.ordered?Math.pow(10,g.count):Math.min(250000,Math.max(10000,Number(size)||50000));
   const limit=requested;
   const generationWeights=[undefined,1,2,3,4].map(mode=>mode===undefined?undefined:weightsFor(g,stats,mode));
   // Keep the ordered games exhaustive; larger games use the selected search limit.
   for(let i=0;i<limit;){
    const end=Math.min(i+150,limit);
    while(i<end){
     const mode=i%5;
     const nums=g.ordered?Array.from({length:g.count},(_,p)=>Math.floor(i/Math.pow(10,g.count-1-p))%10):generate(g,next,generationWeights[mode]);
     const bonus=g.bonusMax?1+Math.floor(next()*g.bonusMax):undefined;
     const key=maskKey(nums,bonus);
     i++;
     if(seen.has(key))continue;
     seen.add(key);
     // Count each historical drawing once rather than rescanning the full
     // training set for the older and newer half. This reduces mobile CPU work.
     let early=0,recent=0;
     for(let j=0;j<train.length;j++){
      if(match(nums,train[j],!!g.ordered)>=threshold){
       if(j<mid)early++;else recent++;
      }
     }
     const training=early+recent;
     const earlyRate=early/Math.max(1,trainOlder.length),recentRate=recent/Math.max(1,trainNewer.length);
     const stability=1-Math.min(1,Math.abs(earlyRate-recentRate));
     const pcount=parityCount(nums);
     const pairHit=stats.pair&&(g.ordered?false:stats.pair.split('-').every(n=>nums.includes(Number(n))))?1:0;
     const reasons:string[]=[];
     if(pcount===stats.parity)reasons.push('Matches the most common historical odd/even split');
     if(pairHit)reasons.push('Includes a frequently repeated historical pair');
     let hot=0,cold=0,gaps=0;
     nums.forEach((n,p)=>{const ix=g.ordered?p*10+n:n;if(stats.rate[ix]>stats.normal)hot++;else cold++;if(stats.gap[ix]>train.length*.1)gaps++;});
     if(hot)reasons.push(hot+' numbers/digits occurred above their expected frequency');
     if(cold)reasons.push(cold+' numbers/digits occurred below their expected frequency');
     if(gaps)reasons.push(gaps+' numbers/digits had longer-than-usual gaps');
     const signals=Number(pcount===stats.parity)+Number(!!pairHit)+Number(hot>=Math.ceil(g.count/2))+Number(gaps>=Math.ceil(g.count/3));
     const score=.65*(training/Math.max(1,train.length))+.25*Math.min(earlyRate,recentRate)+.08*stability+.02*signals/4;
     const method=['Uniform random','Hot frequency','Cold frequency','Recent weighting','Gap weighting'][mode];
     if(top.length<150||score>top[top.length-1].score){
      top.push({nums,bonus,train:training,hold:0,score,reasons:reasons.slice(0,3),stable:stability,recent,tests:signals,method});
      top.sort((a,b)=>b.score-a.score||label(a.nums,g).localeCompare(label(b.nums,g)));
      if(top.length>150)top.pop();
     }
    }
    setProgress(Math.min(100,Math.round(i/limit*100)));
    if(i%1000===0)setStage('Testing '+i.toLocaleString()+' combinations');
    await new Promise<void>(resolve=>setTimeout(resolve,0));
   }
   // Discovery-only strategy tests and candidate ranking: do not peek at the holdout.
   // The final five are selected only from discovery statistics and ranked BEFORE holdout.
   // Different generation methods increase diversity, while the holdout remains untouched.
   const winners:Candidate[]=[];
   const usedMethods=new Set<string>();
   for(const candidate of top){
    if(winners.length>=5)break;
    if(!usedMethods.has(candidate.method)){winners.push(candidate);usedMethods.add(candidate.method);}
   }
   for(const candidate of top){
    if(winners.length>=5)break;
    if(!winners.includes(candidate))winners.push(candidate);
   }
   winners.forEach(p=>p.hold=rateFor(p.nums,hold,g,threshold));
   let randomHold=0;
   const randomTrials=hold.length*64;
   for(let h=0;h<hold.length;h++)for(let r=0;r<64;r++){
    const ticket=generate(g,prng((Math.imul(h+1,2246822519)^Math.imul(r+1,3266489917)^0x6da4e1d9)>>>0));
    if(match(ticket,hold[h],!!g.ordered)>=threshold)randomHold++;
   }
   // Compare the entire preselected five-ticket portfolio to 256 equally sized
   // random portfolios on the untouched holdout, preserving within-draw overlap.
   // This is a descriptive randomization comparison, not future predictive evidence.
   setStage('Calibrating top five against 256 random portfolios');
   const observed=winners.reduce((sum,p)=>sum+p.hold,0);
   const controls:number[]=[];
   for(let simulation=0;simulation<256;simulation++){
    const nextControl=prng((0x51f3a1d7^Math.imul(simulation+1,2654435761))>>>0);
    const controlTickets:{nums:number[];bonus?:number}[]=[];
    const unique=new Set<string>();
    while(controlTickets.length<winners.length){
     const nums=generate(g,nextControl);
     const key=maskKey(nums);
     if(unique.has(key))continue;
     unique.add(key);
     controlTickets.push({nums});
    }
    let successes=0;
    for(const ticket of controlTickets)successes+=rateFor(ticket.nums,hold,g,threshold);
    controls.push(successes);
    if(simulation%16===15)await new Promise<void>(resolve=>setTimeout(resolve,0));
   }
   const sorted=[...controls].sort((a,b)=>a-b);
   const portfolio={observed,controls:controls.length,mean:controls.reduce((a,b)=>a+b,0)/controls.length,lower:sorted[Math.floor(.025*(sorted.length-1))],upper:sorted[Math.ceil(.975*(sorted.length-1))],tail:(controls.filter(x=>x>=observed).length+1)/(controls.length+1),draws:hold.length};
   // The shared exact mathematics engine also powers the standalone Advanced Lab.
   // Monte Carlo uses simulated fair draws and never trains on the historical holdout.
   setStage('Running mathematical distributions and independent simulations');
   const matchDistribution=distribution(matrix);
   const fullSpace=totalOutcomes(matrix);
   const jackpotProbability=(game==='All or Nothing'?2:1)/fullSpace;
   const trials=50000;
   const monte=simulate(matrix,trials,threshold,'any',prng((0x7311c0de^chosen^data.length)>>>0));
   const interval=monte.interval;
   // Do not claim a failed test with fewer than five expected simulation matches.
   const simulationExpected=trials*expected;
   const crossCheck:MathReport['crossCheck']=simulationExpected<5?'inconclusive':(expected>=interval[0]&&expected<=interval[1]?'consistent':'review');
   const holdoutNoMatch=binomialExactly(hold.length,0,expected);
   const holdoutAtLeastOne=atLeastOne(expected,hold.length);
   const math:MathReport={fullSpace,jackpotProbability,thresholdProbability:expected,
    distribution:matchDistribution,simulated:monte.successes,trials,
    simulationInterval:interval,simulationExpected,crossCheck,
    holdoutNoMatch,holdoutAtLeastOne,expectedDrawMatches:hold.length*expected,
    bonusIncluded:false
   };
   setStage('Finalizing historical comparisons');
   setResult({picks:winners,tested:seen.size,periods:periodScores,train:train.length,hold:hold.length,lastDate:draws[draws.length-1].date,patterns:desc,threshold,expected,holdStart:hold[0].date,discoveryEnd:train[train.length-1].date,randomHold,randomTrials,methodCount:usedMethods.size,portfolio,math});
   setProgress(100);
  }catch(e){setError(String(e));}finally{setRunning(false);}
 }
 const tabButton=(id:'picks'|'patterns'|'tests',title:string)=><button onClick={()=>setDetail(id)} style={{border:'none',borderRadius:8,padding:'9px 7px',fontSize:12,background:detail===id?'#a9cfee':'#14283a',color:detail===id?'#102033':light,fontWeight:detail===id?700:500}}>{title}</button>;
 return <div style={{display:'grid',gap:12}}>
  <div style={panel}>
   <b>1. Choose your game</b>
   <div role="group" aria-label="Choose lottery for Auto Pick" style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:8}}>
    {games.map(item=><button key={item.name} type="button" aria-pressed={game===item.name} disabled={running} onClick={()=>selectGame(item.name)} style={{background:game===item.name?'#29475f':'#112537',border:'1px solid '+(game===item.name?'#acd4f0':'#476075'),borderRadius:9,padding:'11px 8px',color:'#e9f4fb',minHeight:56,fontSize:12,fontWeight:game===item.name?750:500,textAlign:'left',display:'grid',gap:4,opacity:running && game!==item.name ? 0.55 : 1}}>
      <span>{game===item.name?'✓ ':''}{item.name}</span>
      <span style={{fontSize:10,color:'#a9c9df'}}>{item.count}{item.ordered?' ordered digits':' numbers'}{item.bonusMax?' + bonus':''}</span>
    </button>)}
   </div>
   <small style={{color:'#aecce0'}}>Selected: <b style={{color:'#e5f4ff'}}>{game}</b>. The settings and full test below apply only to this game.</small>
  </div>
  <div style={{...panel,gap:8,borderColor:'#7193ac'}}>
    <button type="button" aria-expanded={prizeOpen} onClick={()=>setPrizeOpen(v=>!v)} style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,background:'transparent',border:0,padding:'2px 0',color:'#e2f2fc',fontWeight:750,fontSize:14,textAlign:'left'}}>
      <span>🏆 {game} prize odds & payouts</span>
      <span style={{fontSize:11,color:'#b1d2e8'}}>{prizeOpen?'Hide details ▲':'Show details ▼'}</span>
    </button>
    {!prizeOpen&&<small style={{color:'#b9cfe0'}}>Tap to see prize tiers, paid-prize odds, and estimated payouts before running tests.</small>}
    {prizeOpen&&<><small style={{color:'#b8d3e5',fontSize:11}}>Published prize information for your selected game. This is separate from historical Auto Pick recommendations.</small><PrizeTierLab game={game} lines={1} draws={1}/></>}
   </div>
  <AdvancedMathLab key={game} game={game}/>
  {!result&&!running&&<><div style={{...panel,background:'linear-gradient(130deg,#233c53,#192b3d)',borderColor:'#65849e'}}>
   <div style={{fontSize:11,letterSpacing:1.1,color:'#b3d8ef'}}>✦ COMPLETE ANALYSIS & AUTO PICK</div>
   <strong style={{fontSize:19}}>All your lottery tests. One button.</strong>
   <p style={{fontSize:12,color:'#c6d8e5',lineHeight:1.65,margin:0}}>Scan the historical patterns, validate strategies on later drawings, search combinations, run exact mathematical and simulated probability checks, and compare the tests to rank five historical research choices.</p>
  </div>

  <div style={panel}><b>2. Analysis settings — {game}</b><label style={{fontSize:12,color:light}}>Historical drawings<select disabled={loading} value={chosen} onChange={e=>setWindow(e.target.value)} style={{display:'block',width:'100%',padding:12,marginTop:6,borderRadius:9,background:'#102235',color:'#e9f5ff',border:'1px solid #536e87'}}>{counts.map(n=><option value={n} key={n}>Last {n.toLocaleString()} drawings</option>)}</select></label>
   <label style={{fontSize:12,color:light}}>Combinations to check<select value={requestedCount} onChange={e=>setSize(e.target.value)} disabled={!!g.ordered} style={{display:'block',width:'100%',padding:12,marginTop:6,borderRadius:9,background:'#102235',color:'#e9f5ff',border:'1px solid #536e87'}}>{comboOptions.map(n=><option key={n} value={n}>{n.toLocaleString()} {g.ordered?'(all ordered combinations)':'distinct attempts'}</option>)}</select></label>
   <small style={{color:'#afc9dc'}}>✓ Up to 250,000 combination attempts (default 50,000). Frequency, pairs, gaps, odd/even, exact probability, full distributions, 50,000 simulated draws, independent-draw binomial checks, 10-period backtesting, random controls and top-five ranking.</small>
  </div><div style={panel}><b>3. Run complete analysis</b><button disabled={loading||!!error} onClick={()=>{void run();}} style={{padding:14,border:'none',borderRadius:10,background:'#a9cfee',fontWeight:800,color:'#102235'}}>▶ Run All {game} Tests & Get Recommendations</button>{loading&&<small>Loading official drawings…</small>}{error&&<small style={{color:'#f0b6ae'}}>{error}</small>}</div></>}
  {running&&<div style={panel}><div style={{fontSize:12,color:'#add0e6'}}>✦ RUNNING COMPLETE ANALYSIS</div><h3 style={{margin:0}}>{game}</h3><div style={{height:9,borderRadius:9,background:'#102033',overflow:'hidden'}}><div style={{width:progress+'%',height:'100%',background:'#a9cfee'}}/></div><div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:light}}><span>{stage}</span><b>{progress}%</b></div>{['Number frequencies','Repeating pairs','Gaps and overdue numbers','Odd/even distributions','Ten historical periods','Combination search','Mathematical distributions and simulations','Recommendation ranking'].map((name,i)=><div key={name} style={{color:i<5||progress>i*15?'#cfe0ed':'#7c95aa',fontSize:12}}>{i<5||progress>i*15?'✓':'○'} {name}</div>)}</div>}
  {result&&<><div style={{...panel,borderColor:'#64829a'}}><strong style={{fontSize:17}}>✓ Analysis complete</strong><small style={{color:'#b9d2e3'}}>{game} · {result.tested.toLocaleString()} unique combinations · Through {result.lastDate}</small><button onClick={()=>{setResult(null);setProgress(0);}} style={{background:'#233e54',border:'1px solid #617f97',borderRadius:8,padding:10,color:'#e1f1fa'}}>Run another test / choose game</button></div>
   <div style={{...panel,borderColor:'#7294a9',background:'#142a3d',gap:9}}>
    <b style={{fontSize:14,color:'#d9effb'}}>All-test comparison · top five</b>
    <small style={{color:'#b8d5e8'}}>The ranking compares historical match rate, consistency between two discovery periods, pattern signals, and generation methods. Five candidates are selected before the unseen results are revealed.</small>
    <small style={{color:'#c7e2f1'}}>Compared {result.tested.toLocaleString()} distinct entries, {result.periods.length} strategy families/checks, 10 chronological windows, {result.randomTrials.toLocaleString()} random control tickets, and {result.portfolio.controls} independent random portfolios.</small>
    <b style={{fontSize:14,color:'#d9effb'}}>Unseen-draw validity check</b>
    <small style={{color:'#b8d5e8'}}>Discovery: {result.train} draws through {result.discoveryEnd} · Unseen: {result.hold} later draws ({result.holdStart}–{result.lastDate}).</small>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
      <div style={{background:'#1f3b50',padding:10,borderRadius:9}}><small>Chance expectation</small><strong style={{display:'block',marginTop:5,fontSize:19}}>{percent(result.expected)}</strong><small>{result.threshold}+ {g.ordered?'correct positions':'main matches'}</small></div>
      <div style={{background:'#1f3b50',padding:10,borderRadius:9}}><small>Random control</small><strong style={{display:'block',marginTop:5,fontSize:19}}>{percent(result.randomHold/result.randomTrials)}</strong><small>{result.randomHold}/{result.randomTrials} trials</small></div>
    </div>
    <small style={{color:'#b0cade',lineHeight:1.55}}>A fixed ticket would average {(result.hold*result.expected).toFixed(1)} qualifying matches in {result.hold} draws. An approximate 95% random-noise range for one preselected ticket is {Math.max(0,result.hold*result.expected-uncertainty(result.expected,result.hold)).toFixed(1)}–{(result.hold*result.expected+uncertainty(result.expected,result.hold)).toFixed(1)} matches; this does not adjust for searching thousands of tickets.</small>
    <div style={{display:'grid',gap:6,borderTop:'1px solid #47637a',paddingTop:10}}>
      <b style={{fontSize:13,color:'#d2e9f7'}}>Top-five portfolio vs random portfolios</b>
      <small style={{color:'#c0d8e9'}}>Your 5 selected combinations: <b>{result.portfolio.observed}</b> qualifying line-results across {result.hold} unseen draws.</small>
      <small style={{color:'#c0d8e9'}}>Random groups of five: average <b>{result.portfolio.mean.toFixed(1)}</b>; middle 95% ranged from <b>{result.portfolio.lower} to {result.portfolio.upper}</b> line-results.</small>
      <small style={{color:'#b2d2e6'}}>In {result.portfolio.controls} random portfolios, the estimated fraction matching or exceeding the selected result was <b>{percent(result.portfolio.tail)}</b> (including a conservative one-sample adjustment).</small>
      <small style={{color:'#9fbacd',lineHeight:1.55}}>This comparison preserves correlations between tickets within each drawing. It is descriptive, not a formal multiple-testing-adjusted p-value. Repeatedly checking the same holdout reduces its value as an independent test.</small>
    </div>
    <small style={{color:'#9fbacd',lineHeight:1.6}}>Bonus balls are excluded from this benchmark. Historical differences do not improve future odds for any valid combination.</small>
   </div>
   <div style={{...panel,borderColor:'#6c94af',gap:9}}>
    <b style={{fontSize:14,color:'#dceffa'}}>Advanced mathematical tests — automatically included</b>
    <small style={{color:'#bed9e9'}}>These checks run every time you press Run All Tests. They establish the fair-draw baseline for the top-five report, rather than supplying extra ranking points to particular numbers.</small>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
     <div style={{background:'#0f293d',borderRadius:9,padding:10}}><small style={{color:'#a8c9dc'}}>Exact match threshold</small><b style={{display:'block',fontSize:18,marginTop:4}}>{percent(result.math.thresholdProbability)}</b><small style={{color:'#9db9d0'}}>{result.threshold}+ {g.ordered?'digit positions':'main matches'} · one line</small></div>
     <div style={{background:'#0f293d',borderRadius:9,padding:10}}><small style={{color:'#a8c9dc'}}>Exact top-prize odds</small><b style={{display:'block',fontSize:14,marginTop:5}}>1 in {Math.round(1/result.math.jackpotProbability).toLocaleString()}</b><small style={{color:'#9db9d0'}}>{result.math.fullSpace.toLocaleString()} possible full outcomes{game==='All or Nothing'?' · two top outcomes':''}</small></div>
    </div>
    <div style={{display:'grid',gap:5,background:'#102537',borderRadius:9,padding:10}}>
     <b style={{fontSize:12}}>Monte Carlo: {result.math.trials.toLocaleString()} fair simulated drawings</b>
     <small style={{color:'#c0d7e8'}}>Observed: {result.math.simulated.toLocaleString()} matches ({percent(result.math.simulated/result.math.trials)}) · Mathematical expectation: {result.math.simulationExpected.toFixed(1)} matches.</small>
     <small style={{color:'#c0d7e8'}}>95% simulation interval: {percent(result.math.simulationInterval[0])}–{percent(result.math.simulationInterval[1])}.</small>
     <small style={{color:'#b4d1e4'}}>{result.math.crossCheck==='consistent'?'Simulation agrees with exact probability within the sample uncertainty.':result.math.crossCheck==='inconclusive'?'Match event is too rare for this simulation size to be conclusive. Exact combinatorics remain authoritative.':'Simulation differed from the exact benchmark more than the nominal interval allows. This can occur by chance; inspect the results rather than claiming predictive value.'}</small>
    </div>
    <div style={{display:'grid',gap:5,background:'#102537',borderRadius:9,padding:10}}>
     <b style={{fontSize:12}}>Binomial model across {result.hold} independent draws</b>
     <small style={{color:'#bed7e8'}}>Expected matches for one fixed ticket: {result.math.expectedDrawMatches.toFixed(2)} · Chance of no qualifying matches: {percent(result.math.holdoutNoMatch)} · Chance of at least one: {percent(result.math.holdoutAtLeastOne)}.</small>
    </div>
    <details><summary style={{color:'#b8ddf4',fontSize:12,cursor:'pointer',padding:'6px 0'}}>Full exact-match probability distribution</summary>
     <div style={{display:'grid',gap:5,marginTop:8}}>{result.math.distribution.map(v=><div key={v.hits} style={{display:'flex',justifyContent:'space-between',gap:7,fontSize:11,color:'#c5dce9'}}><span>{v.hits} correct {g.ordered?'positions':'main numbers'}</span><b>{percent(v.probability)}</b></div>)}</div>
     <small style={{color:'#a5c1d4',fontSize:10}}>Main number/digit distribution only; bonus-ball match odds are evaluated separately in Prize Odds & Payouts.</small>
    </details>
    <small style={{color:'#9db9cd',lineHeight:1.5}}>All five selections face the same exact fair-draw odds. The mathematical calculators check the reliability of the research, not which numbers will win. Monte Carlo and binomial calculations are for a fixed ticket, not five overlapping tickets.</small>
   </div>
   <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:5}}>{tabButton('picks','Top Picks')}{tabButton('patterns','Patterns Found')}{tabButton('tests','Test Results')}</div>
   {detail==='picks'&&result.picks.map((p,i)=><div key={maskKey(p.nums,p.bonus)} style={panel}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><b style={{color:'#c8e5f8'}}>#{i+1} · Most relevant historical match</b><small style={{color:'#b6cedf'}}>Discovery rank {i+1}/5</small></div><div style={{display:'flex',gap:5,flexWrap:'wrap'}}>{p.nums.map((n,j)=><span key={j} style={{height:33,minWidth:33,padding:4,borderRadius:22,display:'grid',placeItems:'center',background:'#263e52',border:'1px solid #7092ae',color:'white',fontWeight:700,fontSize:12}}>{n}</span>)}{p.bonus!==undefined&&<span style={{padding:8,borderRadius:20,background:'#694249',fontSize:12}}>+{p.bonus}</span>}</div><div style={{background:'#0f2537',borderRadius:9,padding:10,display:'grid',gap:5}}>
       <small style={{color:'#b7d7ea'}}>Discovery: {p.train}/{result.train} · Unseen: {p.hold}/{result.hold} ({percent(p.hold/result.hold)})</small>
       <small style={{color:'#d9edfa'}}>Approx. 95% interval for unseen match rate: {percent(wilson(p.hold,result.hold)[0])}–{percent(wilson(p.hold,result.hold)[1])}</small>
       <small style={{color:'#d9edfa'}}>Random expectation: {percent(result.expected)} · about {(result.hold*result.expected).toFixed(1)} of {result.hold} draws</small>
       <small style={{color:'#a9c7d9'}}>{Math.abs(p.hold-result.hold*result.expected)<=uncertainty(result.expected,result.hold)?'Within basic chance variation':'Outside basic chance variation; many tickets were searched, so this is not proof of predictive ability'}.</small>
      </div><b style={{fontSize:11}}>Why it made the top five:</b>{[...p.reasons, 'Performed across two older discovery segments: '+p.train+'/'+result.train+' matches in total', 'Discovery stability score: '+(p.stable*100).toFixed(0)+'% (higher means similar match rates across discovery halves)', 'Selection approach: '+p.method].map((reason,j)=><small key={j} style={{color:'#b6cadb'}}>• {reason}</small>)}<small style={{color:'#96aabd'}}>Ranking score is based on past drawings, not future winning odds.</small><button onClick={()=>onSave(game,p.nums,p.bonus)} style={{padding:10,background:'#a9cfee',color:'#102033',border:'none',borderRadius:9,fontWeight:700}}>Save Pick</button></div>)}
   {detail==='patterns'&&<div style={panel}><b>Patterns tested</b>{result.patterns.map(p=><div key={p} style={{padding:'9px 0',borderBottom:'1px solid #354c62',fontSize:12,color:'#c6d9e8'}}>✓ {p}</div>)}<small style={{color:'#9fbacc'}}>These patterns occur naturally in random sequences and may not repeat. Strategy checks use discovery data only.</small></div>}
   {detail==='tests'&&<div style={panel}><b>Strategy consistency: ten chronological periods</b><small style={{color:light}}>Historical performance of automatically selected strategies. Rates measured against a random-draw expectation, not proof of an edge.</small>{result.periods.map(p=><div key={p.name} style={{borderTop:'1px solid #425d73',paddingTop:9,display:'grid',gap:3}}><div style={{display:'flex',justifyContent:'space-between'}}><b style={{fontSize:12}}>{p.name}</b><b style={{fontSize:12}}>{p.wins}/{p.periods} periods</b></div><small style={{color:'#accadb'}}>Observed match rate {(p.rate*100).toFixed(1)}% · Chance expectation {(p.expected*100).toFixed(1)}%</small></div>)}<small style={{color:'#9fbacc'}}>Strategy checks use only earlier discovery data; later unseen drawings are reserved for final validation. Testing several strategies can produce apparent advantages by chance.</small></div>}
  </>}
  <p style={{fontSize:11,color:'#9db4c6',lineHeight:1.6}}>No pattern or algorithm is known to predict fair lottery draws. Picks are historical ranking suggestions only. Saving does not purchase a ticket.</p>
 </div>;
}
