import React,{useMemo,useState} from 'react';
type Rule={name:string;main:number;pool:number;bonus?:number;price?:number;ordered?:boolean;special?:boolean;source:string};
const rules:Rule[]=[
 {name:'Lotto Texas',main:6,pool:54,price:1,source:'https://www.texaslottery.com/export/sites/lottery/Games/Lotto_Texas/index.html'},
 {name:'Powerball',main:5,pool:69,bonus:26,price:2,source:'https://www.texaslottery.com/export/sites/lottery/Games/Powerball/index.html'},
 {name:'Mega Millions',main:5,pool:70,bonus:24,price:5,source:'https://www.texaslottery.com/export/sites/lottery/Games/Mega_Millions/index.html'},
 {name:'Texas Two Step',main:4,pool:35,bonus:35,price:1,source:'https://www.texaslottery.com/export/sites/lottery/Games/Texas_Two_Step/index.html'},
 {name:'Cash Five',main:5,pool:35,price:1,source:'https://www.texaslottery.com/export/sites/lottery/Games/Cash_Five/index.html'},
 {name:'All or Nothing',main:12,pool:24,price:2,special:true,source:'https://www.texaslottery.com/export/sites/lottery/Games/All_or_Nothing/index.html'},
 {name:'Pick 3',main:3,pool:10,ordered:true,source:'https://www.texaslottery.com/export/sites/lottery/Games/Pick_3/index.html'},
 {name:'Daily 4',main:4,pool:10,ordered:true,source:'https://www.texaslottery.com/export/sites/lottery/Games/Daily_4/index.html'}
];
function choose(n:number,k:number){if(k<0||k>n)return 0;let a=1;for(let j=1;j<=k;j++)a=a*(n-j+1)/j;return Math.round(a);}
const combSpace=(g:Rule)=>g.ordered?Math.pow(10,g.main):choose(g.pool,g.main)*(g.bonus||1);
function mainProbability(g:Rule,k:number){if(g.ordered)return choose(g.main,k)*Math.pow(.1,k)*Math.pow(.9,g.main-k);return choose(g.main,k)*choose(g.pool-g.main,g.main-k)/choose(g.pool,g.main);}
function eventProb(g:Rule,k:number,bonus:'yes'|'no'|'either',atLeast:boolean){let p=0;for(let m=atLeast?k:k;m<= (atLeast?g.main:k);m++){const b=mainProbability(g,m);p+=b*(g.bonus?(bonus==='yes'?1/g.bonus:bonus==='no'?1-1/g.bonus:1):1);}return p;}
function formatProbability(p:number){if(p===0)return '0%';if(p>=.001)return (p*100).toFixed(p>=.01?3:5)+'%';return (p*100).toPrecision(4)+'%';}
function money(v:number){return '
function odds(p:number){return p>0?'1 in '+Math.round(1/p).toLocaleString('en-US'):'Not possible';}
const panel:React.CSSProperties={display:'grid',gap:10,border:'1px solid #476176',borderRadius:13,background:'#15283b',padding:13};
const field:React.CSSProperties={padding:10,borderRadius:8,border:'1px solid #5b7790',background:'#0d1f31',color:'#edf6fb',fontSize:14,width:'100%'};
export default function ExactOddsLab({defaultGame}:{defaultGame:string}){
 const [chosen,setChosen]=useState(defaultGame);
 const [match,setMatch]=useState('jackpot');
 const [lines,setLines]=useState('10');
 const [draws,setDraws]=useState('1');
 const [bonus,setBonus]=useState<'yes'|'no'|'either'>('either');
 const [partial,setPartial]=useState<'exact'|'atleast'>('atleast');
 const [open,setOpen]=useState(false);
 const g=rules.find(r=>r.name===chosen)||rules[0];
 const space=combSpace(g);
 const nLines=Math.max(1,Math.min(1000000,Math.round(Number(lines)||1)));
 const nDraws=Math.max(1,Math.min(1000,Math.round(Number(draws)||1)));
 const jackpot= g.special?2/space:1/space;
 const k=match==='jackpot'?g.main:Math.min(Number(match),g.main);
 const currentBonus=g.bonus?match==='jackpot'?'yes':bonus:'either';
 const probability=match==='jackpot'?jackpot:eventProb(g,k,currentBonus,partial==='atleast');
 const effective=match==='jackpot'?Math.min(1,(g.special?2:1)*Math.min(nLines,space)/space):null;
 // For a single fixed top-prize outcome among distinct tickets, per-drawing events do not overlap.
 // Two disjoint outcomes exist for All or Nothing; at least one event is upper-bounded by 2n/space.
 const allDraws=effective===null?null:likelihoodAtLeastOne(effective,nDraws);
 const totalEntries=nLines*nDraws;
 const expectedThresholdMatches=probability*totalEntries;
 const oneLineOverDraws=likelihoodAtLeastOne(probability,nDraws);
 const scenarioCounts=[1,5,10,25,100].filter(n=>n<=space);
 const isBeyondSpace=nLines>space;

 const pctChange= useMemo(()=>Array.from({length:g.main+1},(_,i)=>({match:i,probability:mainProbability(g,i)})),[chosen]);
 const successLabels=g.ordered?'correct positions':'main numbers';
 return <section style={{...panel,gap:12}}>
  <div><div style={{color:'#a9d3f0',fontSize:10,fontWeight:750,letterSpacing:1.5}}>EXACT MATHEMATICAL ODDS</div>
   <h2 style={{fontSize:20,margin:'5px 0'}}>Probability calculator</h2>
   <p style={{fontSize:12,color:'#b5cbdc',lineHeight:1.6,margin:0}}>Calculate true draw probabilities using the game rules—not number-frequency predictions.</p></div>
  <label style={{fontSize:12,color:'#b9d7e9'}}>Lottery game<select style={field} value={chosen} onChange={e=>{setChosen(e.target.value);setMatch('jackpot');setBonus('either')}}>{rules.map(r=><option key={r.name} value={r.name}>{r.name}</option>)}</select></label>
  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:9}}>
   <div style={{background:'#0f2132',borderRadius:9,padding:10}}><small style={{color:'#a7c7d9'}}>Total possible entries</small><b style={{display:'block',fontSize:17,marginTop:5}}>{space.toLocaleString()}</b></div>
   <div style={{background:'#0f2132',borderRadius:9,padding:10}}><small style={{color:'#a7c7d9'}}>{g.special?'Either top outcome':'One-line top prize odds'}</small><b style={{display:'block',fontSize:14,marginTop:5}}>{odds(jackpot)}</b></div>
  </div>
  <label style={{fontSize:12,color:'#b9d7e9'}}>What counts as a match?
    <select value={match} onChange={e=>setMatch(e.target.value)} style={field}>
     <option value="jackpot">{g.special?'12 of 12 OR 0 of 12 (top prize)':'Exact top-prize / jackpot combination'}</option>
     {Array.from({length:g.main+1},(_,i)=>g.main-i).map(i=><option key={i} value={String(i)}>{i} {successLabels}</option>)}
    </select>
  </label>
  {match!=='jackpot'&&<div style={{display:'grid',gridTemplateColumns:g.bonus?'1fr 1fr':'1fr',gap:9}}>
   <label style={{fontSize:12,color:'#b9d7e9'}}>Match rule<select value={partial} onChange={e=>setPartial(e.target.value as 'exact'|'atleast')} style={field}><option value="atleast">At least {k}</option><option value="exact">Exactly {k}</option></select></label>
   {g.bonus&&<label style={{fontSize:12,color:'#b9d7e9'}}>Bonus result<select value={bonus} onChange={e=>setBonus(e.target.value as 'yes'|'no'|'either')} style={field}><option value="either">Either</option><option value="yes">Correct bonus</option><option value="no">Incorrect bonus</option></select></label>}
  </div>}
  <div style={{border:'1px solid #7096b5',borderRadius:11,padding:13,background:'#1d3850'}}>
   <div style={{fontSize:11,color:'#bfdaea'}}>Probability for one line on one draw</div>
   <strong style={{display:'block',fontSize:24,margin:'6px 0',color:'#e0f3ff'}}>{formatProbability(probability)}</strong>
   <div style={{color:'#b5d4e9',fontSize:12}}>{odds(probability)}</div>
   {g.special&&<small style={{display:'block',fontSize:10,color:'#bbd2e0',marginTop:7}}>All or Nothing has two distinct 12-number top-prize outcomes: match all 12 or match none.</small>}
  </div>
  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:9}}>
   <label style={{fontSize:12,color:'#b9d7e9'}}>Different lines per draw<input type="number" min="1" max="1000000" step="1" inputMode="numeric" style={field} value={lines} onChange={e=>setLines(e.target.value)}/></label>
   <label style={{fontSize:12,color:'#b9d7e9'}}>Number of draws<input type="number" min="1" max="1000" step="1" inputMode="numeric" style={field} value={draws} onChange={e=>setDraws(e.target.value)}/></label>
  </div>
  {g.price!==undefined&&<div style={{border:'1px solid #38546b',borderRadius:9,padding:11,fontSize:12,color:'#c9dce9',display:'flex',justifyContent:'space-between',gap:8}}><span>Estimated base play cost</span><b>{money(nLines*nDraws*g.price)}</b></div>}
  <div style={{...panel,background:'#102338',gap:9,borderColor:'#587e9a'}}>
   <div style={{fontSize:10,color:'#a9d5ee',letterSpacing:1.3,fontWeight:750}}>SMART PROBABILITY INTERPRETATION</div>
   <strong style={{fontSize:14,color:'#e0f3ff'}}>What these odds mean</strong>
   <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
    <div style={{padding:10,background:'#192f43',borderRadius:9}}><small style={{color:'#aecbdf'}}>Expected qualifying line-results</small><b style={{display:'block',fontSize:19,marginTop:5}}>{expectedLabel(expectedThresholdMatches)}</b><small style={{color:'#aac8d9'}}>Across {totalEntries.toLocaleString()} played line-results</small></div>
    <div style={{padding:10,background:'#192f43',borderRadius:9}}><small style={{color:'#aecbdf'}}>No qualifying match for one line</small><b style={{display:'block',fontSize:19,marginTop:5}}>{formatProbability(1-oneLineOverDraws)}</b><small style={{color:'#aac8d9'}}>Across {nDraws.toLocaleString()} independent draws</small></div>
   </div>
   <p style={{margin:0,fontSize:11,color:'#bbd2e3',lineHeight:1.6}}>{certaintyComment(probability)} Expected line-results count every winning line separately. It does <b>not</b> mean that at least one of your different tickets will qualify, because different lines can match the same drawing.</p>
   {match!=='jackpot'&&<div style={{fontSize:11,color:'#b4d0e2'}}>One fixed ticket over {nDraws.toLocaleString()} independent draws has a <b>{formatProbability(oneLineOverDraws)}</b> probability of reaching this match threshold at least once.</div>}
  </div>
  <div style={{...panel,background:'#102338',gap:8}}>
   <strong style={{fontSize:13,color:'#d7eafb'}}>Comparing different line counts — top-prize only</strong>
   <div style={{display:'grid',gridTemplateColumns:'62px minmax(0,1fr) auto',gap:6,fontSize:10,fontWeight:750,color:'#aacbe0'}}>
    <span>Lines</span><span>Chance per draw</span><span>Base cost*</span>
   </div>
   {scenarioCounts.map(count=>{
    const coverage=Math.min(1,count*jackpot);
    return <div key={count} style={{display:'grid',gridTemplateColumns:'62px minmax(0,1fr) auto',gap:6,alignItems:'center',padding:'5px 0',borderTop:'1px solid #294357',fontSize:11,color:'#d2e5f2'}}>
     <b>{count}</b><span>{formatProbability(coverage)} <small style={{color:'#9dbbd0'}}>({odds(coverage)})</small></span><b>{g.price===undefined?'Varies':money(count*g.price)}</b>
    </div>;
   })}
   <small style={{fontSize:10,color:'#9cb9ce',lineHeight:1.5}}>*One drawing, base play only. {g.special?'All or Nothing values are maximum possible coverage and depend on avoiding complementary duplicates.':'Assumes distinct, valid combinations and the full jackpot condition.'} Higher spending does not make a particular number combination more likely to be drawn.</small>
  </div>
  {isBeyondSpace&&<p style={{fontSize:11,color:'#ffd7b6',lineHeight:1.5,margin:0}}>Requested lines exceed the {space.toLocaleString()} possible different combinations. Coverage cannot exceed 100%; repeated lines do not increase the chance of at least one winning combination.</p>}
  {effective!==null&&<div style={{display:'grid',gap:6,border:'1px solid #4f6b80',borderRadius:10,padding:11}}>
   <strong style={{fontSize:12,color:'#e6f4fb'}}>Top-prize coverage for different combinations</strong>
   <div style={{fontSize:12,color:'#bdd7e7'}}>Per drawing{g.special?' (upper bound)':''}: <b>{formatProbability(effective)}</b> ({odds(effective)})</div>
   <div style={{fontSize:12,color:'#bdd7e7'}}>Over {nDraws.toLocaleString()} independent drawings{g.special?' (upper bound)':''}: <b>{formatProbability(allDraws||0)}</b></div>
   <small style={{color:'#9fb7ca',fontSize:10,lineHeight:1.5}}>{g.special?'All or Nothing coverage assumes no duplicate or complementary tickets; otherwise overlap lowers the chance.':'Coverage assumes every line is unique within a drawing. Playing the same ticket again does not improve the probability of at least one jackpot.'} Results across drawings assume independent fair draws.</small>
  </div>}
  {match!=='jackpot'&&<p style={{fontSize:11,color:'#b7cada',lineHeight:1.5,margin:0}}>For partial matches, the calculator gives exact odds for one entry. Different tickets can have overlapping partial-match outcomes, so multiplying this probability by your ticket count would be misleading.</p>}
  <button onClick={()=>setOpen(v=>!v)} style={{background:'#243f54',border:'1px solid #56778d',borderRadius:9,padding:11,color:'#dceefb',fontSize:12}}>{open?'Hide':'Show'} every possible main-number match</button>
  {open&&<div style={{display:'grid',gap:7}}>{pctChange.map(v=><div key={v.match} style={{display:'grid',gridTemplateColumns:'65px 1fr 72px',gap:7,alignItems:'center',fontSize:11,color:'#c4dbe9'}}>
   <span>{v.match} {g.ordered?'positions':'matched'}</span>
   <div style={{height:8,borderRadius:8,background:'#0c1e2c',overflow:'hidden'}}><div style={{height:'100%',width:(v.probability*100)+'%',background:'#9ccbeb'}}/></div>
   <span style={{textAlign:'right'}}>{formatProbability(v.probability)}</span>
  </div>)}</div>}
  <small style={{fontSize:10,lineHeight:1.6,color:'#9cb8cb'}}>Match distribution uses exact combinatorics ({g.ordered?'independent ordered digits':'hypergeometric draws without replacement'}). Jackpot figures assume the currently displayed game matrix. This does not estimate expected payouts, taxes, fees or the chance of any paid prize across all wager types. {g.ordered?'Digit wager pricing varies by bet type and amount.':''}</small>
  <a href={g.source} target="_blank" rel="noreferrer" style={{color:'#b4d5eb',fontSize:12,textDecoration:'underline'}}>Check official game rules and prizes ↗</a>
 </section>;
}
+v.toLocaleString('en-US',{maximumFractionDigits:2,minimumFractionDigits:0});}
function expectedLabel(n:number){if(n===0)return '0';if(n<.01)return n.toExponential(2);return n.toLocaleString('en-US',{maximumFractionDigits:n<10?3:1});}
function likelihoodAtLeastOne(p:number,trials:number){if(p<=0)return 0;if(p>=1)return 1;return -Math.expm1(trials*Math.log1p(-p));}
function certaintyComment(perDraw:number){
 if(perDraw>=.5)return 'For this match threshold, success is relatively common in individual fair drawings.';
 if(perDraw>=.05)return 'A match may occur regularly, but that does not necessarily mean it is a paid prize.';
 if(perDraw>=.001)return 'This match is uncommon for one ticket; short stretches with zero matches are normal.';
 return 'This is a rare event. Zero matches in a small set of drawings is expected, not a broken calculation.';
}

function odds(p:number){return p>0?'1 in '+Math.round(1/p).toLocaleString('en-US'):'Not possible';}
const panel:React.CSSProperties={display:'grid',gap:10,border:'1px solid #476176',borderRadius:13,background:'#15283b',padding:13};
const field:React.CSSProperties={padding:10,borderRadius:8,border:'1px solid #5b7790',background:'#0d1f31',color:'#edf6fb',fontSize:14,width:'100%'};
export default function ExactOddsLab({defaultGame}:{defaultGame:string}){
 const [chosen,setChosen]=useState(defaultGame);
 const [match,setMatch]=useState('jackpot');
 const [lines,setLines]=useState('10');
 const [draws,setDraws]=useState('1');
 const [bonus,setBonus]=useState<'yes'|'no'|'either'>('either');
 const [partial,setPartial]=useState<'exact'|'atleast'>('atleast');
 const [open,setOpen]=useState(false);
 const g=rules.find(r=>r.name===chosen)||rules[0];
 const space=combSpace(g);
 const nLines=Math.max(1,Math.min(1000000,Math.round(Number(lines)||1)));
 const nDraws=Math.max(1,Math.min(1000,Math.round(Number(draws)||1)));
 const jackpot= g.special?2/space:1/space;
 const k=match==='jackpot'?g.main:Math.min(Number(match),g.main);
 const currentBonus=g.bonus?match==='jackpot'?'yes':bonus:'either';
 const probability=match==='jackpot'?jackpot:eventProb(g,k,currentBonus,partial==='atleast');
 const effective=match==='jackpot'?Math.min(1,nLines*jackpot):null;
 // For a single fixed top-prize outcome among distinct tickets, per-drawing events do not overlap.
 // Two disjoint outcomes exist for All or Nothing; at least one event is upper-bounded by 2n/space.
 const allDraws=effective===null?null:1-Math.pow(1-effective,nDraws);
 const pctChange= useMemo(()=>Array.from({length:g.main+1},(_,i)=>({match:i,probability:mainProbability(g,i)})),[chosen]);
 const successLabels=g.ordered?'correct positions':'main numbers';
 return <section style={{...panel,gap:12}}>
  <div><div style={{color:'#a9d3f0',fontSize:10,fontWeight:750,letterSpacing:1.5}}>EXACT MATHEMATICAL ODDS</div>
   <h2 style={{fontSize:20,margin:'5px 0'}}>Probability calculator</h2>
   <p style={{fontSize:12,color:'#b5cbdc',lineHeight:1.6,margin:0}}>Calculate true draw probabilities using the game rules—not number-frequency predictions.</p></div>
  <label style={{fontSize:12,color:'#b9d7e9'}}>Lottery game<select style={field} value={chosen} onChange={e=>{setChosen(e.target.value);setMatch('jackpot');setBonus('either')}}>{rules.map(r=><option key={r.name} value={r.name}>{r.name}</option>)}</select></label>
  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:9}}>
   <div style={{background:'#0f2132',borderRadius:9,padding:10}}><small style={{color:'#a7c7d9'}}>Total possible entries</small><b style={{display:'block',fontSize:17,marginTop:5}}>{space.toLocaleString()}</b></div>
   <div style={{background:'#0f2132',borderRadius:9,padding:10}}><small style={{color:'#a7c7d9'}}>{g.special?'Either top outcome':'One-line top prize odds'}</small><b style={{display:'block',fontSize:14,marginTop:5}}>{odds(jackpot)}</b></div>
  </div>
  <label style={{fontSize:12,color:'#b9d7e9'}}>What counts as a match?
    <select value={match} onChange={e=>setMatch(e.target.value)} style={field}>
     <option value="jackpot">{g.special?'12 of 12 OR 0 of 12 (top prize)':'Exact top-prize / jackpot combination'}</option>
     {Array.from({length:g.main+1},(_,i)=>g.main-i).map(i=><option key={i} value={String(i)}>{i} {successLabels}</option>)}
    </select>
  </label>
  {match!=='jackpot'&&<div style={{display:'grid',gridTemplateColumns:g.bonus?'1fr 1fr':'1fr',gap:9}}>
   <label style={{fontSize:12,color:'#b9d7e9'}}>Match rule<select value={partial} onChange={e=>setPartial(e.target.value as 'exact'|'atleast')} style={field}><option value="atleast">At least {k}</option><option value="exact">Exactly {k}</option></select></label>
   {g.bonus&&<label style={{fontSize:12,color:'#b9d7e9'}}>Bonus result<select value={bonus} onChange={e=>setBonus(e.target.value as 'yes'|'no'|'either')} style={field}><option value="either">Either</option><option value="yes">Correct bonus</option><option value="no">Incorrect bonus</option></select></label>}
  </div>}
  <div style={{border:'1px solid #7096b5',borderRadius:11,padding:13,background:'#1d3850'}}>
   <div style={{fontSize:11,color:'#bfdaea'}}>Probability for one line on one draw</div>
   <strong style={{display:'block',fontSize:24,margin:'6px 0',color:'#e0f3ff'}}>{formatProbability(probability)}</strong>
   <div style={{color:'#b5d4e9',fontSize:12}}>{odds(probability)}</div>
   {g.special&&<small style={{display:'block',fontSize:10,color:'#bbd2e0',marginTop:7}}>All or Nothing has two distinct 12-number top-prize outcomes: match all 12 or match none.</small>}
  </div>
  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:9}}>
   <label style={{fontSize:12,color:'#b9d7e9'}}>Different lines per draw<input type="number" min="1" max="1000000" step="1" inputMode="numeric" style={field} value={lines} onChange={e=>setLines(e.target.value)}/></label>
   <label style={{fontSize:12,color:'#b9d7e9'}}>Number of draws<input type="number" min="1" max="1000" step="1" inputMode="numeric" style={field} value={draws} onChange={e=>setDraws(e.target.value)}/></label>
  </div>
  {g.price!==undefined&&<div style={{border:'1px solid #38546b',borderRadius:9,padding:11,fontSize:12,color:'#c9dce9',display:'flex',justifyContent:'space-between',gap:8}}><span>Estimated base play cost</span><b>{money(nLines*nDraws*g.price)}</b></div>}
  {effective!==null&&<div style={{display:'grid',gap:6,border:'1px solid #4f6b80',borderRadius:10,padding:11}}>
   <strong style={{fontSize:12,color:'#e6f4fb'}}>Top-prize coverage from different combinations</strong>
   <div style={{fontSize:12,color:'#bdd7e7'}}>Per drawing: <b>{formatProbability(effective)}</b> ({odds(effective)})</div>
   <div style={{fontSize:12,color:'#bdd7e7'}}>Over {nDraws.toLocaleString()} independent drawings: <b>{formatProbability(allDraws||0)}</b></div>
   <small style={{color:'#9fb7ca',fontSize:10,lineHeight:1.5}}>{g.special?'All or Nothing coverage assumes no duplicate or complementary tickets; otherwise overlap lowers the chance.':'Coverage assumes every line is unique within a drawing. Playing the same ticket again does not improve the probability of that ticket winning.'} Results across drawings assume independent fair draws.</small>
  </div>}
  {match!=='jackpot'&&<p style={{fontSize:11,color:'#b7cada',lineHeight:1.5,margin:0}}>For partial matches, the calculator gives exact odds for one entry. Different tickets can have overlapping partial-match outcomes, so multiplying this probability by your ticket count would be misleading.</p>}
  <button onClick={()=>setOpen(v=>!v)} style={{background:'#243f54',border:'1px solid #56778d',borderRadius:9,padding:11,color:'#dceefb',fontSize:12}}>{open?'Hide':'Show'} every possible main-number match</button>
  {open&&<div style={{display:'grid',gap:7}}>{pctChange.map(v=><div key={v.match} style={{display:'grid',gridTemplateColumns:'65px 1fr 72px',gap:7,alignItems:'center',fontSize:11,color:'#c4dbe9'}}>
   <span>{v.match} {g.ordered?'positions':'matched'}</span>
   <div style={{height:8,borderRadius:8,background:'#0c1e2c',overflow:'hidden'}}><div style={{height:'100%',width:(v.probability*100)+'%',background:'#9ccbeb'}}/></div>
   <span style={{textAlign:'right'}}>{formatProbability(v.probability)}</span>
  </div>)}</div>}
  <small style={{fontSize:10,lineHeight:1.6,color:'#9cb8cb'}}>Match distribution uses exact combinatorics ({g.ordered?'independent ordered digits':'hypergeometric draws without replacement'}). Jackpot figures assume the currently displayed game matrix. This does not estimate expected payouts, taxes, fees or the chance of any paid prize across all wager types. {g.ordered?'Digit wager pricing varies by bet type and amount.':''}</small>
  <a href={g.source} target="_blank" rel="noreferrer" style={{color:'#b4d5eb',fontSize:12,textDecoration:'underline'}}>Check official game rules and prizes ↗</a>
 </section>;
}
