import React,{useEffect,useState} from 'react';
type Draw={date:string;nums:number[];bonus?:number};
type Game={name:string;count:number;max:number;bonusMax?:number;ordered?:boolean};
type Candidate={nums:number[];bonus?:number;train:number;hold:number;score:number;reasons:string[]};
type Result={picks:Candidate[];tested:number;periods:{name:string;wins:number;periods:number;rate:number;expected:number}[];train:number;hold:number;lastDate:string;patterns:string[]};
const files:Record<string,string>={'Lotto Texas':'lotto-texas.json','Powerball':'powerball.json','Mega Millions':'mega-millions.json','Texas Two Step':'texas-two-step.json','Cash Five':'cash-five.json','All or Nothing':'all-or-nothing.json','Pick 3':'pick-3.json','Daily 4':'daily-4.json'};
const panel:React.CSSProperties={background:'#192b3d',border:'1px solid #354c62',borderRadius:14,padding:14,display:'grid',gap:11};
const light='#b6d4e8';
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
function chance(g:Game,threshold:number){let a=0;const choose=(n:number,k:number)=>{if(k<0||k>n)return 0;let v=1;for(let i=1;i<=k;i++)v=v*(n-i+1)/i;return v;};
 for(let m=threshold;m<=g.count;m++){a+=g.ordered?choose(g.count,m)*(.1**m)*(.9**(g.count-m)):choose(g.count,m)*choose(g.max-g.count,g.count-m)/choose(g.max,g.count);}
 return a;
}
function label(nums:number[],g:Game){return g.ordered?nums.join(''):nums.join(' · ');}
function parityCount(nums:number[]){return nums.filter(n=>n%2).length;}
export default function AutoPickLab({games,onSave}:{games:Game[];onSave:(game:string,nums:number[],bonus?:number)=>void}){
 const [game,setGame]=useState('Lotto Texas'),[window,setWindow]=useState('500'),[size,setSize]=useState('10000');
 const [data,setData]=useState<Draw[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const [running,setRunning]=useState(false),[progress,setProgress]=useState(0),[stage,setStage]=useState(''),[result,setResult]=useState<Result|null>(null),[detail,setDetail]=useState<'picks'|'patterns'|'tests'>('picks');
 const g=games.find(v=>v.name===game)!;
 useEffect(()=>{let active=true;setLoading(true);setData([]);setResult(null);setError('');
 fetch(import.meta.env.BASE_URL+'data/'+files[game],{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('History file unavailable');return r.json()}).then(v=>{if(active){if(!Array.isArray(v.draws)||v.draws.length<50)throw Error('Not enough valid drawings');setData(v.draws);setLoading(false);}}).catch(e=>{if(active){setError(String(e.message||e));setLoading(false);}});return()=>{active=false;};},[game]);
 const counts=[100,250,500,1000,2000].filter(n=>n<=data.length),chosen=counts.includes(Number(window))?Number(window):counts[counts.length-1]||0;
 const comboOptions=g.ordered?[Math.pow(10,g.count)]:[1000,5000,10000,25000,50000,100000];
 const requestedCount=g.ordered?Math.pow(10,g.count):Number(size);
 function selectGame(name:string){
  if(running||name===game)return;
  setGame(name);setResult(null);setProgress(0);setDetail('picks');setStage('');setError('');
  // Draw options are re-evaluated from each game's verified historical archive.
  setWindow('500');
  setSize('10000');
 }
 async function run(){
  if(running||loading||!chosen)return;
  setRunning(true);setResult(null);setProgress(0);setDetail('picks');
  try{
   const draws=data.slice(-chosen),split=Math.floor(draws.length*.7),train=draws.slice(0,split),hold=draws.slice(split);
   const threshold=g.ordered?Math.max(1,g.count-1):Math.min(g.count,3);
   const stats=patterns(train,g),expected=chance(g,threshold),next=prng(0x32786^data.length^chosen);
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
   const periodLength=Math.max(20,Math.floor((draws.length-60)/5));
   const periodScores=methods.map(method=>{
    let wins=0,success=0,total=0;
    for(let p=0;p<5;p++){
     const start=Math.max(30,draws.length-5*periodLength+p*periodLength),end=Math.min(draws.length,start+periodLength);
     let hits=0;
     for(let i=start;i<end;i++){
      const history=draws.slice(Math.max(0,i-100),i),s=patterns(history,g);
      const r=prng(0x93810^i^method.mode),ticket=generate(g,r,weightsFor(g,s,method.mode));
      if(match(ticket,draws[i],!!g.ordered)>=threshold)hits++;
     }
     const n=end-start;if(n>0){total+=n;success+=hits;if(hits/n>expected)wins++;}
    }
    return {name:method.name,wins,periods:5,rate:total?success/total:0,expected};
   });
   setStage('Searching distinct combinations');
   const seen=new Set<string>(),top:Candidate[]=[];
   const requested=g.ordered?Math.pow(10,g.count):Math.min(100000,Number(size));
   const limit=requested;
   // Keep the ordered games exhaustive; larger games use the selected search limit.
   for(let i=0;i<limit;){
    const end=Math.min(i+200,limit);
    while(i<end){
     const mode=i%5;
     const nums=g.ordered?Array.from({length:g.count},(_,p)=>Math.floor(i/Math.pow(10,g.count-1-p))%10):generate(g,next,mode?weightsFor(g,stats,mode):undefined);
     const bonus=g.bonusMax?1+Math.floor(next()*g.bonusMax):undefined;
     const key=maskKey(nums,bonus);
     i++;
     if(seen.has(key))continue;
     seen.add(key);
     const training=rateFor(nums,train,g,threshold);
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
     const score=training/Math.max(1,train.length)+pairHit*.003+(pcount===stats.parity?.002:0)+hot*.0001;
     if(top.length<30||score>top[top.length-1].score){
      top.push({nums,bonus,train:training,hold:0,score,reasons:reasons.slice(0,3)});
      top.sort((a,b)=>b.score-a.score||label(a.nums,g).localeCompare(label(b.nums,g)));
      if(top.length>30)top.pop();
     }
    }
    setProgress(Math.min(100,Math.round(i/limit*100)));
    if(i%1000===0)setStage('Testing '+i.toLocaleString()+' combinations');
    await new Promise<void>(resolve=>setTimeout(resolve,0));
   }
   // A held-out result is never used to choose or rank the recommended ticket.
   top.forEach(p=>p.hold=rateFor(p.nums,hold,g,threshold));
   setStage('Finalizing historical comparisons');
   setResult({picks:top.slice(0,10),tested:seen.size,periods:periodScores,train:train.length,hold:hold.length,lastDate:draws[draws.length-1].date,patterns:desc});
   setProgress(100);
  }catch(e){setError(String(e));}finally{setRunning(false);}
 }
 const tabButton=(id:'picks'|'patterns'|'tests',title:string)=><button onClick={()=>setDetail(id)} style={{border:'none',borderRadius:8,padding:'9px 7px',fontSize:12,background:detail===id?'#a9cfee':'#14283a',color:detail===id?'#102033':light,fontWeight:detail===id?700:500}}>{title}</button>;
 return <div style={{display:'grid',gap:12}}>
  <div style={panel}>
   <b>1. Choose your game</b>
   <div role="group" aria-label="Choose lottery for Auto Pick" style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:8}}>
    {games.map(item=><button key={item.name} type="button" aria-pressed={game===item.name} disabled={running} onClick={()=>selectGame(item.name)} style={{background:game===item.name?'#29475f':'#112537',border:'1px solid '+(game===item.name?'#acd4f0':'#476075'),borderRadius:9,padding:'11px 8px',color:'#e9f4fb',minHeight:56,fontSize:12,fontWeight:game===item.name?750:500,textAlign:'left',display:'grid',gap:4,opacity:running&&game!==item.name?.55:1}}>
      <span>{game===item.name?'✓ ':''}{item.name}</span>
      <span style={{fontSize:10,color:'#a9c9df'}}>{item.count}{item.ordered?' ordered digits':' numbers'}{item.bonusMax?' + bonus':''}</span>
    </button>)}
   </div>
   <small style={{color:'#aecce0'}}>Selected: <b style={{color:'#e5f4ff'}}>{game}</b>. The settings and full test below apply only to this game.</small>
  </div>
  {!result&&!running&&<><div style={{...panel,background:'linear-gradient(130deg,#233c53,#192b3d)',borderColor:'#65849e'}}>
   <div style={{fontSize:11,letterSpacing:1.1,color:'#b3d8ef'}}>✦ COMPLETE ANALYSIS & AUTO PICK</div>
   <strong style={{fontSize:19}}>All your lottery tests. One button.</strong>
   <p style={{fontSize:12,color:'#c6d8e5',lineHeight:1.65,margin:0}}>Scan the historical patterns, validate strategies on later drawings, search combinations, and rank up to 10 number choices.</p>
  </div>

  <div style={panel}><b>2. Analysis settings — {game}</b><label style={{fontSize:12,color:light}}>Historical drawings<select disabled={loading} value={chosen} onChange={e=>setWindow(e.target.value)} style={{display:'block',width:'100%',padding:12,marginTop:6,borderRadius:9,background:'#102235',color:'#e9f5ff',border:'1px solid #536e87'}}>{counts.map(n=><option value={n} key={n}>Last {n.toLocaleString()} drawings</option>)}</select></label>
   <label style={{fontSize:12,color:light}}>Combinations to check<select value={requestedCount} onChange={e=>setSize(e.target.value)} disabled={!!g.ordered} style={{display:'block',width:'100%',padding:12,marginTop:6,borderRadius:9,background:'#102235',color:'#e9f5ff',border:'1px solid #536e87'}}>{comboOptions.map(n=><option key={n} value={n}>{n.toLocaleString()} {g.ordered?'(all ordered combinations)':'distinct attempts'}</option>)}</select></label>
   <small style={{color:'#afc9dc'}}>✓ Frequency, pairs, gaps, odd/even, multi-period checks and combination search included.</small>
  </div><div style={panel}><b>3. Run complete analysis</b><button disabled={loading||!!error} onClick={()=>{void run();}} style={{padding:14,border:'none',borderRadius:10,background:'#a9cfee',fontWeight:800,color:'#102235'}}>▶ Run All {game} Tests & Get Recommendations</button>{loading&&<small>Loading official drawings…</small>}{error&&<small style={{color:'#f0b6ae'}}>{error}</small>}</div></>}
  {running&&<div style={panel}><div style={{fontSize:12,color:'#add0e6'}}>✦ RUNNING COMPLETE ANALYSIS</div><h3 style={{margin:0}}>{game}</h3><div style={{height:9,borderRadius:9,background:'#102033',overflow:'hidden'}}><div style={{width:progress+'%',height:'100%',background:'#a9cfee'}}/></div><div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:light}}><span>{stage}</span><b>{progress}%</b></div>{['Number frequencies','Repeating pairs','Gaps and overdue numbers','Odd/even distributions','Five historical periods','Combination search','Recommendation ranking'].map((name,i)=><div key={name} style={{color:i<5||progress>i*15?'#cfe0ed':'#7c95aa',fontSize:12}}>{i<5||progress>i*15?'✓':'○'} {name}</div>)}</div>}
  {result&&<><div style={{...panel,borderColor:'#64829a'}}><strong style={{fontSize:17}}>✓ Analysis complete</strong><small style={{color:'#b9d2e3'}}>{game} · {result.tested.toLocaleString()} unique combinations · Through {result.lastDate}</small><button onClick={()=>{setResult(null);setProgress(0);}} style={{background:'#233e54',border:'1px solid #617f97',borderRadius:8,padding:10,color:'#e1f1fa'}}>Run another test / choose game</button></div>
   <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:5}}>{tabButton('picks','Top Picks')}{tabButton('patterns','Patterns Found')}{tabButton('tests','Test Results')}</div>
   {detail==='picks'&&result.picks.map((p,i)=><div key={maskKey(p.nums,p.bonus)} style={panel}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><b style={{color:'#c8e5f8'}}>#{i+1} Recommended numbers</b><small style={{color:'#b6cedf'}}>Historical rank {i+1}/10</small></div><div style={{display:'flex',gap:5,flexWrap:'wrap'}}>{p.nums.map((n,j)=><span key={j} style={{height:33,minWidth:33,padding:4,borderRadius:22,display:'grid',placeItems:'center',background:'#263e52',border:'1px solid #7092ae',color:'white',fontWeight:700,fontSize:12}}>{n}</span>)}{p.bonus!==undefined&&<span style={{padding:8,borderRadius:20,background:'#694249',fontSize:12}}>+{p.bonus}</span>}</div><small style={{color:'#aecbde'}}>Discovery match: {p.train}/{result.train} · Unseen match: {p.hold}/{result.hold} drawings</small><b style={{fontSize:11}}>Why this combination ranked highly:</b>{p.reasons.map((reason,j)=><small key={j} style={{color:'#b6cadb'}}>• {reason}</small>)}<small style={{color:'#96aabd'}}>Ranking score is based on past drawings, not future winning odds.</small><button onClick={()=>onSave(game,p.nums,p.bonus)} style={{padding:10,background:'#a9cfee',color:'#102033',border:'none',borderRadius:9,fontWeight:700}}>Save Pick</button></div>)}
   {detail==='patterns'&&<div style={panel}><b>Patterns tested</b>{result.patterns.map(p=><div key={p} style={{padding:'9px 0',borderBottom:'1px solid #354c62',fontSize:12,color:'#c6d9e8'}}>✓ {p}</div>)}<small style={{color:'#9fbacc'}}>These patterns occur naturally in random sequences and may not repeat.</small></div>}
   {detail==='tests'&&<div style={panel}><b>Strategy consistency: five chronological periods</b><small style={{color:light}}>Historical performance of automatically selected strategies. Rates measured against a random-draw expectation, not proof of an edge.</small>{result.periods.map(p=><div key={p.name} style={{borderTop:'1px solid #425d73',paddingTop:9,display:'grid',gap:3}}><div style={{display:'flex',justifyContent:'space-between'}}><b style={{fontSize:12}}>{p.name}</b><b style={{fontSize:12}}>{p.wins}/{p.periods} periods</b></div><small style={{color:'#accadb'}}>Observed match rate {(p.rate*100).toFixed(1)}% · Chance expectation {(p.expected*100).toFixed(1)}%</small></div>)}<small style={{color:'#9fbacc'}}>The strategy checks use earlier results at each step. Evaluating several strategies can produce apparent advantages by chance.</small></div>}
  </>}
  <p style={{fontSize:11,color:'#9db4c6',lineHeight:1.6}}>No pattern or algorithm is known to predict fair lottery draws. Picks are historical ranking suggestions only. Saving does not purchase a ticket.</p>
 </div>;
}
