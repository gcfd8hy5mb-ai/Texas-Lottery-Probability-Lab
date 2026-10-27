import React,{useEffect,useMemo,useState} from 'react';

type Draw={date:string;nums:number[];bonus?:number};
type Archive={draws:Draw[];source:string};
type Rule={file:string;max:number;count:number;ordered?:boolean;session?:string};
type Evidence={title:string;pattern:string;training:number;validation:number;expected:number;matches:number;tests:number;definition:string;status:string};
const rules:Record<string,Rule>={
 'Lotto Texas':{file:'lotto-texas.json',max:54,count:6},
 'Powerball':{file:'powerball.json',max:69,count:5},
 'Mega Millions':{file:'mega-millions.json',max:70,count:5},
 'Texas Two Step':{file:'texas-two-step.json',max:35,count:4},
 'Cash Five':{file:'cash-five.json',max:35,count:5},
 'All or Nothing':{file:'all-or-nothing.json',max:24,count:12,session:'Night'},
 'Pick 3':{file:'pick-3.json',max:9,count:3,ordered:true,session:'Night'},
 'Daily 4':{file:'daily-4.json',max:9,count:4,ordered:true,session:'Night'}
};
function choose(n:number,k:number):number{
 if(k<0||k>n)return 0;
 let value=1;
 for(let i=1;i<=k;i++)value=value*(n-i+1)/i;
 return value;
}
function countOdds(rule:Rule,odds:number){
 if(rule.ordered){
  let total=0;
  for(let x=0;x<=rule.count;x++)if(x===odds)total+=choose(rule.count,x)/Math.pow(2,rule.count);
  return total;
 }
 const oddOptions=Math.ceil(rule.max/2),evenOptions=Math.floor(rule.max/2);
 return choose(oddOptions,odds)*choose(evenOptions,rule.count-odds)/choose(rule.max,rule.count);
}
function lastIndexWhere(draws:Draw[],check:(draw:Draw)=>boolean){for(let i=draws.length-1;i>=0;i--)if(check(draws[i]))return i;return -1;}
function occurs(draw:Draw,n:number,position:number|null){
 return position===null?draw.nums.includes(n):draw.nums[position]===n;
}
function percent(rate:number){return (rate*100).toFixed(1)+'%';}
function classify(observed:number,baseline:number,n:number){
 const se=Math.sqrt(Math.max(0.000001,baseline*(1-baseline))/Math.max(1,n));
 if(Math.abs(observed-baseline)<2*se)return 'Inconclusive on unseen draws';
 return observed>baseline?'Above chance expectation in unseen draws':'Below chance expectation in unseen draws';
}
function runPatterns(all:Draw[],rule:Rule,window:number):{cards:Evidence[];training:number;validation:number;from:string;to:string}{
 const subset=all.slice(-window);
 const split=Math.floor(subset.length*.7),older=subset.slice(0,split),newer=subset.slice(split);
 const {count,max,ordered}=rule;
 const numberOptions=Array.from({length:max+(ordered?1:0)},(_,i)=>i+(ordered?0:1));
 const positions=ordered?Array.from({length:count},(_,i)=>i):[null];
 const possibilities:{num:number;pos:number|null;count:number}[]=[];
 for(const pos of positions)for(const num of numberOptions)possibilities.push({num,pos,count:older.filter(d=>occurs(d,num,pos)).length});
 const expectedNumber=ordered?0.1:count/max;
 possibilities.sort((a,b)=>Math.abs(b.count/older.length-expectedNumber)-Math.abs(a.count/older.length-expectedNumber)||a.num-b.num);
 const hot=possibilities[0],hotLabel=ordered?`digit ${hot.num} at position ${(hot.pos||0)+1}`:`number ${hot.num}`;
 const hotHits=newer.filter(d=>occurs(d,hot.num,hot.pos)).length;
 const cards:Evidence[]=[{
  title:'Number frequency',pattern:hotLabel,training:hot.count/older.length,validation:hotHits/newer.length,expected:expectedNumber,matches:hotHits,tests:newer.length,
  definition:'The largest absolute frequency deviation in the discovery window; checked on later drawings.',status:classify(hotHits/newer.length,expectedNumber,newer.length)
 }];
 type Pair={a:number;b:number;posA:number|null;posB:number|null;count:number};
 let best:Pair|undefined;
 if(ordered){
  for(let aPos=0;aPos<count;aPos++)for(let bPos=aPos+1;bPos<count;bPos++){
   const observed=new Map<string,number>();
   older.forEach(d=>{const key=d.nums[aPos]+','+d.nums[bPos];observed.set(key,(observed.get(key)||0)+1);});
   for(const [key,n] of observed){const [a,b]=key.split(',').map(Number);if(!best||n>best.count)best={a,b,posA:aPos,posB:bPos,count:n};}
  }
 }else{
  const observed=new Map<string,number>();
  older.forEach(d=>{for(let i=0;i<d.nums.length;i++)for(let j=i+1;j<d.nums.length;j++){const a=Math.min(d.nums[i],d.nums[j]),b=Math.max(d.nums[i],d.nums[j]);const key=a+','+b;observed.set(key,(observed.get(key)||0)+1);}});
  for(const [key,n] of observed){const [a,b]=key.split(',').map(Number);if(!best||n>best.count)best={a,b,posA:null,posB:null,count:n};}
 }
 if(best){
  const pair=best;
  const found=newer.filter(d=>occurs(d,pair.a,pair.posA)&&occurs(d,pair.b,pair.posB)).length;
  const probability=ordered?0.01:count*(count-1)/(max*(max-1));
  cards.push({title:'Repeating number pair',pattern:ordered?`${pair.a} at position ${Number(pair.posA)+1} and ${pair.b} at position ${Number(pair.posB)+1}`:`${pair.a} + ${pair.b}`,
   training:pair.count/older.length,validation:found/newer.length,expected:probability,matches:found,tests:newer.length,
   definition:'The most frequent pair in discovery; positions matter in Pick 3 and Daily 4.',status:classify(found/newer.length,probability,newer.length)});
 }
 let overdue:{num:number;pos:number|null;gap:number}|undefined;
 for(const pos of positions)for(const n of numberOptions){
  const last=lastIndexWhere(older,d=>occurs(d,n,pos));
  const gap=older.length-1-last;
  if(!overdue||gap>overdue.gap)overdue={num:n,pos,gap};
 }
 // Forward test refreshes the most overdue number before each drawing.
 let gapHits=0;
 for(let i=split;i<subset.length;i++){
  const previous=subset.slice(0,i);
  let bestN=numberOptions[0],bestPos=positions[0],longest=-1;
  for(const pos of positions)for(const n of numberOptions){
   const last=lastIndexWhere(previous,d=>occurs(d,n,pos));
   const gap=previous.length-1-last;
   if(gap>longest){longest=gap;bestN=n;bestPos=pos;}
  }
  if(occurs(subset[i],bestN,bestPos))gapHits++;
 }
 if(overdue){
  cards.push({title:'Overdue gap',pattern:ordered?`initially digit ${overdue.num} at position ${Number(overdue.pos)+1}, absent ${overdue.gap} draws`:`initially number ${overdue.num}, absent ${overdue.gap} draws`,
   training:0,validation:gapHits/newer.length,expected:expectedNumber,matches:gapHits,tests:newer.length,
   definition:'For each newer draw, select the number with the longest preceding gap, using no future data. Training rate is not applicable.',status:classify(gapHits/newer.length,expectedNumber,newer.length)});
 }
 const oddCounts=older.map(d=>d.nums.filter(n=>n%2===1).length);
 const counts=Array.from({length:count+1},(_,n)=>({n,hits:oddCounts.filter(x=>x===n).length}));
 counts.sort((a,b)=>b.hits-a.hits||a.n-b.n);
 const leading=counts[0],oddHits=newer.filter(d=>d.nums.filter(n=>n%2===1).length===leading.n).length;
 const oddExpected=countOdds(rule,leading.n);
 cards.push({title:'Odd/even balance',pattern:`${leading.n} odd / ${count-leading.n} even`,training:leading.hits/older.length,
  validation:oddHits/newer.length,expected:oddExpected,matches:oddHits,tests:newer.length,
  definition:'Most frequent odd/even split in discovery, verified against a new period. Digit games use 0–9 with replacement.',status:classify(oddHits/newer.length,oddExpected,newer.length)});
 return {cards,training:older.length,validation:newer.length,from:subset[0].date,to:subset[subset.length-1].date};
}
type PeriodResult={from:string;to:string;cards:Evidence[];training:number;validation:number};
function runMultiPeriod(draws:Draw[],rule:Rule,size:number):PeriodResult[]{
 // Complete, non-overlapping periods only. Within each period, older draws discover
 // a candidate and newer draws validate it. Never select the reported winner by holdout fit.
 const periods=Math.min(5,Math.floor(draws.length/size));
 const start=draws.length-periods*size;
 const results:PeriodResult[]=[];
 for(let i=0;i<periods;i++){
  const sample=draws.slice(start+i*size,start+(i+1)*size);
  const scan=runPatterns(sample,rule,sample.length);
  results.push({from:scan.from,to:scan.to,cards:scan.cards,training:scan.training,validation:scan.validation});
 }
 return results;
}
export default function PatternDetectionLab({game}:{game:string}){
 const rule=rules[game];const [archive,setArchive]=useState<Archive|null>(null),[error,setError]=useState('');
 const [windowSize,setWindowSize]=useState('250'),[show,setShow]=useState(false),[multiShow,setMultiShow]=useState(false);
 useEffect(()=>{let alive=true;setArchive(null);setError('');setShow(false);setMultiShow(false);
 fetch(import.meta.env.BASE_URL+'data/'+rule.file,{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()}).then((data:Archive)=>{if(!Array.isArray(data.draws)||data.draws.length<30)throw Error('Insufficient historical records');if(alive)setArchive(data);}).catch(e=>{if(alive)setError(String(e.message||e));});return()=>{alive=false};},[game,rule.file]);
 const available=archive?.draws.length||0;
 const choices=[30,50,100,250,500,1000,2000].filter(n=>n<=available);
 const selected=choices.includes(Number(windowSize))?Number(windowSize):choices[choices.length-1];
 const results=useMemo(()=>show&&archive?runPatterns(archive.draws,rule,selected):null,[show,archive,rule,selected]);
 const repeat=useMemo(()=>multiShow&&archive?runMultiPeriod(archive.draws,rule,selected):[],[multiShow,archive,rule,selected]);
 return <section style={{background:'#192b3d',border:'1px solid #456179',borderRadius:15,padding:15,display:'grid',gap:12}}>
  <div><div style={{fontSize:10,letterSpacing:2,color:'#a7d5f6'}}>PATTERN DETECTION ENGINE</div><h2 style={{fontSize:18,margin:'6px 0'}}>Are the patterns repeatable?</h2><p style={{fontSize:12,color:'#bfd0de',lineHeight:1.55,margin:0}}>Detect unusual historical patterns and test them against newer results they were not selected from.</p></div>
  {error?<p style={{fontSize:12,color:'#f8d0c8'}}>Unavailable: {error}</p>:!archive?<p style={{fontSize:12}}>Loading official winning numbers…</p>:<>
   <label style={{fontSize:12,color:'#b8d8ee',display:'grid',gap:4}}>Drawings to investigate<select value={selected} onChange={e=>{setWindowSize(e.target.value);setShow(false);setMultiShow(false)}} style={{background:'#11273b',border:'1px solid #678098',borderRadius:8,padding:10,color:'#eff7ff',fontSize:14}}>{choices.map(n=><option value={n} key={n}>{n.toLocaleString()} drawings</option>)}</select></label>
   <button style={{background:'#b5d7f2',border:0,borderRadius:9,padding:12,color:'#112638',fontWeight:750}} onClick={()=>setShow(true)}>Detect & validate patterns</button>
   <div style={{display:'grid',gap:7,background:'#112638',border:'1px solid #4e6b81',borderRadius:10,padding:12}}>
    <strong style={{color:'#c9e5f7',fontSize:13}}>Multi-period pattern validation</strong>
    <small style={{color:'#bfd1df',lineHeight:1.6}}>Repeat the discovery-and-validation test across up to five separate historical periods of {selected.toLocaleString()} drawings each. Every period uses its own older results for discovery and newer results for verification.</small>
    <button onClick={()=>setMultiShow(true)} style={{padding:11,borderRadius:9,border:'1px solid #7faac8',background:'#1a3b55',color:'#e7f5ff',fontWeight:700}}>Test patterns across {Math.min(5,Math.floor(available/selected))} periods</button>
    {repeat.length>0&&<>
      <small style={{color:'#bfd4e5'}}>{repeat.length} non-overlapping periods · {repeat.reduce((n,p)=>n+p.training,0)} discovery drawings · {repeat.reduce((n,p)=>n+p.validation,0)} validation drawings</small>
      {['Number frequency','Repeating number pair','Overdue gap','Odd/even balance'].map(title=>{
        const cards=repeat.map(p=>p.cards.find(c=>c.title===title)).filter((v):v is Evidence=>!!v);
        const above=cards.filter(c=>c.validation>c.expected).length;
        const standout=cards.filter(c=>c.status==='Above chance expectation in unseen draws').length;
        const stablePattern=new Set(cards.map(c=>c.pattern)).size===1;
        return <div key={title} style={{borderTop:'1px solid #46637b',paddingTop:9,display:'grid',gap:5}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10}}><b style={{fontSize:12}}>{title}</b><b style={{fontSize:12,color:'#c3e2f6'}}>{above}/{cards.length} above expectation</b></div>
          <small style={{color:'#bacddd'}}>Unseen results exceeded the random expectation in {above} of {cards.length} periods; {standout} stood out under an approximate two-standard-error check.</small>
          <small style={{color:'#a8c3d6'}}>{stablePattern?'Same pattern selected in all periods':'The selected numbers or pattern details varied across periods'}</small>
        </div>;
      })}
      <details><summary style={{cursor:'pointer',color:'#c3dff2',fontSize:12}}>View each period and pattern</summary>
      <div style={{display:'grid',gap:9,marginTop:10}}>{repeat.map((p,i)=><div key={p.from} style={{border:'1px solid #49657b',borderRadius:8,padding:9,display:'grid',gap:5}}>
        <b style={{fontSize:12}}>Period {i+1}: {p.from} – {p.to}</b>
        <small style={{color:'#aec7d9'}}>{p.training} discovery / {p.validation} unseen drawings</small>
        {p.cards.map(card=><div key={card.title} style={{fontSize:11,color:'#c4d6e3',lineHeight:1.5}}><b>{card.title}:</b> {card.pattern} · unseen {percent(card.validation)} vs expected {percent(card.expected)} ({card.matches}/{card.tests})</div>)}
      </div>)}</div></details>
      <small style={{color:'#b6cad9',lineHeight:1.6}}>These are exploratory, uncorrected comparisons of changing pattern candidates, not independent proof that any fixed combination predicts future drawings. An above-expectation result can happen by chance. Discovery and validation sets do not overlap within or between periods.</small>
    </>}
   </div>
   {results&&<div style={{display:'grid',gap:10}}>
    <small style={{color:'#adc7db'}}>Period: {results.from} to {results.to} · Discovery: {results.training} older drawings · Holdout: {results.validation} newer drawings{rule.session?' · '+rule.session+' session only':''}</small>
    {results.cards.map(card=><div key={card.title} style={{border:'1px solid #4e6b81',background:'#112638',padding:12,borderRadius:11,display:'grid',gap:7}}>
     <b style={{fontSize:13,color:'#c8e5f7'}}>{card.title}</b>
     <strong style={{fontSize:14}}>{card.pattern}</strong>
     <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
      <div><small style={{color:'#a9c6d8'}}>Discovery frequency</small><b style={{display:'block'}}>{card.title==='Overdue gap'?'Not applicable':percent(card.training)}</b></div>
      <div><small style={{color:'#a9c6d8'}}>Unseen frequency</small><b style={{display:'block'}}>{percent(card.validation)}</b></div>
     </div>
     <small style={{color:'#aec9db'}}>Chance expectation: {percent(card.expected)} · {card.matches}/{card.tests} unseen drawings</small>
     <small style={{color:'#d2dfe9'}}>Finding: {card.status}</small>
     <small style={{color:'#9db8cd',lineHeight:1.5}}>{card.definition}</small>
    </div>)}
    <p style={{fontSize:11,color:'#b5cad8',lineHeight:1.6,margin:0}}>These are exploratory comparisons, not formally corrected significance tests. Selecting the most extreme frequency or pair from many candidates can create apparent patterns by chance. A difference on a small unseen sample does not prove predictability or improve a ticket's underlying drawing probability. Bonus balls are excluded from these four comparisons.</p>
   </div>}
  </>}
 </section>;
}
