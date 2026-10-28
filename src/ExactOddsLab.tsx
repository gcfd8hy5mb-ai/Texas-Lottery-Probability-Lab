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
function money(v:number){return '$'+v.toLocaleString('en-US',{maximumFractionDigits:2,minimumFractionDigits:0});}
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
 const allDraws=effective===null?null:1-Math.pow(1-effective,nDraws);
 const played=nLines*nDraws;
 const expectedMatches=probability*played;
 const noMatchForOneLine=Math.pow(1-probability,nDraws);
 const compare=[1,5,10,25,100].filter(n=>n<=space);
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
  <div style={{display:'grid',gap:9,border:'1px solid #5f819a',borderRadius:11,padding:12,background:'#11283b'}}>
   <strong style={{fontSize:13,color:'#d4eafa'}}>Smart probability insights</strong>
   <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:9}}>
    <div style={{background:'#203a4e',padding:10,borderRadius:9}}><small style={{color:'#adc8da'}}>Expected qualifying line-results</small><b style={{display:'block',fontSize:17,marginTop:5}}>{expectedMatches<.01?expectedMatches.toExponential(2):expectedMatches.toLocaleString('en-US',{maximumFractionDigits:2})}</b></div>
    <div style={{background:'#203a4e',padding:10,borderRadius:9}}><small style={{color:'#adc8da'}}>One line: no match in {nDraws} draws</small><b style={{display:'block',fontSize:17,marginTop:5}}>{formatProbability(noMatchForOneLine)}</b></div>
   </div>
   <small style={{color:'#b4ccde',lineHeight:1.6}}>These are expectations for {played.toLocaleString()} line-results, not the chance that at least one of several different tickets wins. Partial-match events can overlap. A match is not necessarily a paid prize.</small>
   <b style={{fontSize:12}}>Top-prize comparison — unique combinations</b>
   <div style={{display:'grid',gridTemplateColumns:'45px 1fr 75px',gap:6,color:'#afcbdf',fontSize:10}}><span>Lines</span><span>Chance per draw</span><span>Cost*</span></div>
   {compare.map(n=><div key={n} style={{display:'grid',gridTemplateColumns:'45px 1fr 75px',gap:6,fontSize:11,borderTop:'1px solid #355269',paddingTop:6}}>
    <b>{n}</b><span>{formatProbability(Math.min(1,n*jackpot))}</span><b>{g.price===undefined?'Varies':money(n*g.price)}</b>
   </div>)}
   <small style={{fontSize:10,lineHeight:1.5,color:'#9bbbd0'}}>Expected results are not guaranteed. *Base cost for one draw. {g.special?'All or Nothing coverage is a maximum; complementary lines overlap.':'Distinct lines cover distinct exact jackpot combinations.'} Raising spending does not make any single combination more likely.</small>
   {nLines>space&&<small style={{color:'#e5b7a6'}}>Only {space.toLocaleString()} distinct entries are possible; repeated lines cannot add new top-prize coverage.</small>}
  </div>
  {effective!==null&&<div style={{display:'grid',gap:6,border:'1px solid #4f6b80',borderRadius:10,padding:11}}>
   <strong style={{fontSize:12,color:'#e6f4fb'}}>Top-prize coverage from different combinations</strong>
   <div style={{fontSize:12,color:'#bdd7e7'}}>Per drawing{g.special?' (upper bound)':''}: <b>{formatProbability(effective)}</b> ({odds(effective)})</div>
   <div style={{fontSize:12,color:'#bdd7e7'}}>Over {nDraws.toLocaleString()} independent drawings{g.special?' (upper bound)':''}: <b>{formatProbability(allDraws||0)}</b></div>
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
