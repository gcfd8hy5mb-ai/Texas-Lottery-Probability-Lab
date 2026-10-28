import React,{useMemo,useState} from 'react';
import {atLeastOne,binomialExactly,combinations,distribution,probabilityAtLeast,probabilityExactly,simulate,totalOutcomes,validateMatrix,type Matrix} from './lotteryMath';
const names:Record<string,Matrix>={
 'Lotto Texas':{pool:54,pick:6},
 'Powerball':{pool:69,pick:5,bonusPool:26},
 'Mega Millions':{pool:70,pick:5,bonusPool:24},
 'Texas Two Step':{pool:35,pick:4,bonusPool:35},
 'Cash Five':{pool:35,pick:5},
 'All or Nothing':{pool:24,pick:12},
 'Pick 3':{pool:10,pick:3,ordered:true},
 'Daily 4':{pool:10,pick:4,ordered:true}
};
const shell:React.CSSProperties={background:'#132a3d',border:'1px solid #52748a',padding:12,borderRadius:12,display:'grid',gap:11};
const input:React.CSSProperties={background:'#0d2030',border:'1px solid #55758a',borderRadius:8,color:'#eff8fc',padding:10,width:'100%',minWidth:0,fontSize:14};
const small:React.CSSProperties={fontSize:11,lineHeight:1.55,color:'#b8cfdd'};
const pct=(p:number)=>p===0?'0%':p<.000001?(p*100).toExponential(2)+'%':(p*100).toFixed(p<.001?5:3)+'%';
const num=(n:number)=>n.toLocaleString('en-US',{maximumFractionDigits:2});
const oneIn=(p:number)=>p===0?'Impossible':'1 in '+num(Math.round(1/p));
const seed=()=>{let s=0x4c2a6f3d;return ()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};};
type Mode='distribution'|'multi'|'simulation'|'custom';
export default function AdvancedMathLab({game}:{game:string}){
 const [expanded,setExpanded]=useState(false),[mode,setMode]=useState<Mode>('distribution');
 const [custom,setCustom]=useState<Matrix>({pool:50,pick:5});
 const [isCustom,setIsCustom]=useState(false);
 const [hits,setHits]=useState(3),[bonus,setBonus]=useState<'yes'|'no'|'any'>('any');
 const [drawings,setDrawings]=useState('100'),[lines,setLines]=useState('10');
 const [trials,setTrials]=useState('10000');
 const [sim,setSim]=useState<ReturnType<typeof simulate>|null>(null);
 const g=isCustom?custom:names[game]||names['Lotto Texas'];
 const valid=validateMatrix(g);
 const hit=Math.min(Math.max(0,hits),g.pick);
 const bonusRule=g.bonusPool?bonus:'any';
 const outcomeSpace=totalOutcomes(g);
 const exact=valid?probabilityExactly(g,hit,bonusRule):0;
 const cumulative=valid?probabilityAtLeast(g,hit,bonusRule):0;
 const dist=useMemo(()=>valid?distribution(g):[],[g.pool,g.pick,g.ordered,g.bonusPool,valid]);
 const draws=Math.min(10000,Math.max(1,Number(drawings)||1));
 const ticketCount=Math.max(1,Math.min(1000000,Number(lines)||1));
 const isSpecial=!isCustom&&game==='All or Nothing';
 const jackpotPerLine=valid?(isSpecial?2:1)/outcomeSpace:0;
 const coverage=Math.min(1,ticketCount*jackpotPerLine);
 const coverageLabel=isSpecial?'Upper bound only: complementary tickets overlap.':'Exact for different jackpot combinations per draw.';
 const expectedWins=draws*cumulative;
 const changeMatrix=(field:'pool'|'pick'|'bonusPool',value:number)=>{
  setCustom(v=>({...v,[field]:Number.isFinite(value)?value:0}));setSim(null);
 };
 const all=binomialExactly(draws,0,cumulative);
 const simulateNow=()=>{
  if(!valid)return;
  setSim(simulate(g,Math.max(1000,Math.min(100000,Math.floor(Number(trials)||10000))),hit,bonusRule,seed()));
 };
 return <section style={{...shell,gap:9}}>
  <button type="button" aria-expanded={expanded} onClick={()=>setExpanded(v=>!v)}
   style={{background:'transparent',border:0,color:'#eff8fc',textAlign:'left',display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,padding:0}}>
   <span style={{display:'grid',gap:3}}><b style={{fontSize:14}}>Advanced Probability Lab</b><small style={{color:'#a9d5ee'}}>Four mathematical calculators · one game</small></span>
   <span style={{fontSize:12,color:'#a9d5ee'}}>{expanded?'Collapse ▲':'Explore ▼'}</span>
  </button>
  {expanded&&<>
   <p style={{...small,margin:0}}>Combines exact counting, hypergeometric/binomial distributions, multi-draw event probabilities, and independent simulations. These tools calculate odds, not future winning numbers.</p>
   <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:7}}>
    {([{id:'distribution',title:'Match distribution'},{id:'multi',title:'Multiple draws'},{id:'simulation',title:'Simulation'},{id:'custom',title:'Custom lottery'}] as const).map(m=><button key={m.id} onClick={()=>{setMode(m.id);if(m.id==='custom')setIsCustom(true);else setIsCustom(false);setSim(null)}} style={{border:'1px solid '+(mode===m.id?'#a8dbfa':'#547286'),background:mode===m.id?'#284b63':'#12293b',color:'#dff1fb',fontSize:12,borderRadius:9,padding:9,fontWeight:mode===m.id?750:500}}>{m.title}</button>)}
   </div>
   {mode==='custom'&&<div style={{display:'grid',gap:9}}>
    <label style={small}>Number pool<input type="number" value={custom.pool} min={2} max={100} onChange={e=>changeMatrix('pool',Number(e.target.value))} style={input}/></label>
    <label style={small}>Numbers picked<input type="number" value={custom.pick} min={1} max={100} onChange={e=>changeMatrix('pick',Number(e.target.value))} style={input}/></label>
    <label style={small}>Bonus ball pool (0 for none)<input type="number" value={custom.bonusPool||0} min={0} max={100} onChange={e=>setCustom(v=>({...v,bonusPool:Number(e.target.value)||undefined}))} style={input}/></label>
    <label style={{...small,display:'flex',gap:8,alignItems:'center'}}><input type="checkbox" checked={!!custom.ordered} onChange={e=>setCustom(v=>({...v,ordered:e.target.checked}))}/> Ordered digits, repeats allowed</label>
    {!valid&&<p style={{color:'#ffc7b4',fontSize:11}}>Choose 1–100 picks no larger than the pool; ordered digit pools must be at most 36. Bonus pools may be 1–100.</p>}
   </div>}
   {valid&&<>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
     <div style={{padding:10,background:'#0c2232',borderRadius:9}}><small style={small}>Valid full combinations</small><b style={{display:'block',fontSize:16,overflowWrap:'anywhere'}}>{num(outcomeSpace)}</b></div>
     <div style={{padding:10,background:'#0c2232',borderRadius:9}}><small style={small}>One-line top prize*</small><b style={{display:'block',fontSize:13}}>{oneIn(jackpotPerLine)}</b></div>
    </div>
    <label style={small}>Match threshold ({g.ordered?'positions':'main numbers'})
     <select value={hit} onChange={e=>{setHits(Number(e.target.value));setSim(null)}} style={input}>{Array.from({length:g.pick+1},(_,i)=>i).map(v=><option key={v} value={v}>{v} of {g.pick}</option>)}</select>
    </label>
    {g.bonusPool&&<label style={small}>Bonus ball requirement<select style={input} value={bonus} onChange={e=>{setBonus(e.target.value as 'yes'|'no'|'any');setSim(null)}}><option value="any">Bonus doesn't matter</option><option value="yes">Correct bonus required</option><option value="no">Incorrect bonus required</option></select></label>}
    <div style={{background:'#20425a',border:'1px solid #7694a9',borderRadius:10,padding:11,display:'grid',gap:5}}>
     <b style={{color:'#e8f6ff',fontSize:13}}>Exactly {hit}: {pct(exact)}</b>
     <span style={small}>At least {hit}: <b>{pct(cumulative)}</b> · {oneIn(cumulative)} on one draw, one ticket</span>
    </div>
    {mode==='distribution'&&<div style={{display:'grid',gap:7}}>
     <b style={{fontSize:12}}>Complete exact-match distribution</b>
     {dist.map(v=><div key={v.hits} style={{display:'grid',gridTemplateColumns:'55px minmax(0,1fr) 94px',gap:7,alignItems:'center',fontSize:11}}>
      <span>{v.hits} of {g.pick}</span>
      <div style={{height:8,borderRadius:5,background:'#0b1b29',overflow:'hidden'}}><div style={{height:'100%',width:(100*v.probability)+'%',background:'#a9cfee'}}/></div>
      <span style={{textAlign:'right'}}>{pct(v.probability)}</span>
     </div>)}
     <small style={small}>The probabilities across all possible exact match counts sum to 100%. Bonus filters are applied above, not to this main-number distribution.</small>
    </div>}
    {(mode==='multi'||mode==='custom')&&<div style={{display:'grid',gap:9}}>
     <label style={small}>Independent drawings<input style={input} type="number" min={1} max={10000} inputMode="numeric" value={drawings} onChange={e=>setDrawings(e.target.value)}/></label>
     <label style={small}>Different lines per draw<input style={input} type="number" min={1} max={1000000} inputMode="numeric" value={lines} onChange={e=>setLines(e.target.value)}/></label>
     <div style={{background:'#0d2436',borderRadius:9,padding:11,display:'grid',gap:7}}>
      <span style={{...small}}>For <b>one fixed ticket</b>, across {num(draws)} independent draws:</span>
      <b style={{fontSize:15}}>At least one match: {pct(atLeastOne(cumulative,draws))}</b>
      <span style={small}>No match: {pct(all)} · Expected qualifying draws: {num(expectedWins)}</span>
      <span style={small}>Exactly one qualifying draw: {pct(binomialExactly(draws,1,cumulative))}</span>
     </div>
     <div style={{background:'#0d2436',borderRadius:9,padding:11,display:'grid',gap:6}}>
      <b style={{fontSize:12}}>Top-prize coverage from different lines</b>
      <span style={small}>One drawing: {pct(coverage)} {isSpecial?'(upper bound)':''}</span>
      <span style={small}>Across {num(draws)} independent draws: {pct(atLeastOne(coverage,draws))} {isSpecial?'(upper bound)':''}</span>
      <small style={small}>{coverageLabel} Partial-match odds across multiple different tickets are intentionally not multiplied because their events can overlap.</small>
     </div>
    </div>}
    {mode==='simulation'&&<div style={{display:'grid',gap:9}}>
     <label style={small}>Independent random trials<input style={input} type="number" min={1000} max={100000} step={1000} inputMode="numeric" value={trials} onChange={e=>{setTrials(e.target.value);setSim(null)}}/></label>
     <button onClick={simulateNow} style={{background:'#a9cfee',border:0,borderRadius:9,color:'#0c2031',padding:12,fontWeight:750}}>Run Monte Carlo simulation</button>
     {sim&&<div style={{background:'#0b2434',borderRadius:10,padding:12,display:'grid',gap:6}}>
      <b>Simulated: {sim.successes} / {num(sim.trials)} ({pct(sim.rate)})</b>
      <span style={small}>Exact mathematical probability: {pct(cumulative)}</span>
      <span style={small}>Approximate 95% simulation interval: {pct(sim.interval[0])}–{pct(sim.interval[1])}</span>
      <span style={small}>Expected simulated successes: {num(sim.trials*cumulative)}</span>
      <small style={small}>If the expected count is below 5, simulations frequently report zero. Exact mathematics remains the authoritative result; simulation only demonstrates randomness.</small>
     </div>}
    </div>}
    <small style={small}>*Top prize is the unique full match including any bonus, except All or Nothing's two top outcomes. Custom lotteries assume a single full-match top outcome. The calculator does not estimate a positive betting edge, ticket-sales outcomes, or prize payouts.</small>
   </>}
  </>}
 </section>;
}
