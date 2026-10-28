import React,{useMemo,useState} from 'react';

type Tier={main:number;bonus?:boolean;amount?:number;kind?:'cash'|'variable'|'ticket'|'jackpot';name?:string};
type Profile={count:number;pool:number;bonusPool?:number;price?:number;tiers:Tier[];source:string;notes:string;multiplier?:boolean;priceVariable?:boolean};
const base='https://www.texaslottery.com/export/sites/lottery/Games/';
const profiles:Record<string,Profile>={
 'Lotto Texas':{count:6,pool:54,price:1,source:base+'Lotto_Texas/index.html',notes:'Base game only (no Extra). Match 4 and 5 awards are pari-mutuel, and jackpot depends on the drawing.',tiers:[{main:6,kind:'jackpot',name:'6 main: jackpot'},{main:5,kind:'variable',name:'5 main: variable'},{main:4,kind:'variable',name:'4 main: variable'},{main:3,amount:3,kind:'cash',name:'3 main'}]},
 'Powerball':{count:5,pool:69,bonusPool:26,price:2,source:'https://www.powerball.com/powerball-prize-chart',notes:'Base $2 play, no Power Play. Fixed lower prizes apply to Texas. Jackpot is variable and excluded from expected cash return.',tiers:[{main:5,bonus:true,kind:'jackpot',name:'5 + Powerball'},{main:5,bonus:false,amount:1000000},{main:4,bonus:true,amount:50000},{main:4,bonus:false,amount:100},{main:3,bonus:true,amount:100},{main:3,bonus:false,amount:7},{main:2,bonus:true,amount:7},{main:1,bonus:true,amount:4},{main:0,bonus:true,amount:4}]},
 'Mega Millions':{count:5,pool:70,bonusPool:24,price:5,multiplier:true,source:base+'Mega_Millions/index.html',notes:'Since April 8, 2025, the $5 play includes a 2×, 3×, 4×, 5×, or 10× multiplier. Average multiplier = 3× across the official 32 multiplier positions; actual winnings vary. The jackpot is excluded from expected return.',tiers:[{main:5,bonus:true,kind:'jackpot',name:'5 + Mega Ball'},{main:5,bonus:false,amount:1000000},{main:4,bonus:true,amount:10000},{main:4,bonus:false,amount:500},{main:3,bonus:true,amount:200},{main:3,bonus:false,amount:10},{main:2,bonus:true,amount:10},{main:1,bonus:true,amount:7},{main:0,bonus:true,amount:5}]},
 'Texas Two Step':{count:4,pool:35,bonusPool:35,price:1,source:base+'Texas_Two_Step/index.html',notes:'The jackpot and several prizes are variable by drawing. Only the known guaranteed fixed cash awards count toward the lower-bound cash-return estimate.',tiers:[{main:4,bonus:true,kind:'jackpot',name:'4 + bonus'},{main:4,bonus:false,kind:'variable',name:'4 without bonus'},{main:3,bonus:true,kind:'variable',name:'3 + bonus'},{main:3,bonus:false,kind:'variable',name:'3 without bonus'},{main:2,bonus:true,amount:18},{main:1,bonus:true,amount:7},{main:0,bonus:true,amount:5}]},
 'Cash Five':{count:5,pool:35,price:1,source:base+'Cash_Five/index.html',notes:'Match 2 wins a free Cash Five Quick Pick, not cash. The $25,000 top tier can be reduced when more than three winning tickets share the prize.',tiers:[{main:5,amount:25000,name:'5 main (up to $25,000)'},{main:4,amount:350},{main:3,amount:15},{main:2,kind:'ticket',name:'2 main: free Quick Pick'}]},
 'All or Nothing':{count:12,pool:24,price:2,source:base+'All_or_Nothing/index.html',notes:'Both matching all 12 and matching none pay $250,000. All 10 fixed prize tiers are shown.',tiers:[{main:12,amount:250000},{main:11,amount:500},{main:10,amount:50},{main:9,amount:10},{main:8,amount:2},{main:4,amount:2},{main:3,amount:10},{main:2,amount:50},{main:1,amount:500},{main:0,amount:250000}]},
 'Pick 3':{count:3,pool:10,priceVariable:true,source:base+'Pick_3/index.html',notes:'Paid winnings depend on Straight, Box, Straight/Box, Fireball and wager size. Select a specific wager type before calculating paid-prize returns.',tiers:[]},
 'Daily 4':{count:4,pool:10,priceVariable:true,source:base+'Daily_4/index.html',notes:'Paid winnings depend on Straight, Box, Straight/Box, Fireball and wager size. Select a specific wager type before calculating paid-prize returns.',tiers:[]}
};
function choose(n:number,k:number){if(k<0||k>n)return 0;let x=1;for(let i=1;i<=k;i++)x*= (n-i+1)/i;return x;}
function chance(p:Profile,t:Tier){
 const main=p.priceVariable?Math.pow(.1,t.main)*Math.pow(.9,p.count-t.main)*choose(p.count,t.main):choose(p.count,t.main)*choose(p.pool-p.count,p.count-t.main)/choose(p.pool,p.count);
 if(p.bonusPool)return main*(t.bonus?1/p.bonusPool:1-1/p.bonusPool);
 return main;
}
const pct=(p:number)=>p>0&&p<.000001?(p*100).toExponential(2)+'%':(p*100).toFixed(p<.001?5:2)+'%';
const fmt=(n:number)=>'$'+n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const odd=(p:number)=>p?'1 in '+Math.round(1/p).toLocaleString('en-US'):'—';
export default function PrizeTierLab({game,lines,draws}:{game:string;lines:number;draws:number}){
 const p=profiles[game];
 const [showAll,setShowAll]=useState(false);
 const summary=useMemo(()=>{
  if(!p||!p.tiers.length)return null;
  const rows=p.tiers.map(t=>({...t,p:chance(p,t)}));
  const paid=rows.reduce((sum,t)=>sum+t.p,0);
  const cash=rows.reduce((sum,t)=>sum+t.p*(t.amount||0)*(p.multiplier?3:1),0);
  const unknown=rows.filter(t=>t.kind==='variable'||t.kind==='jackpot');
  return {rows,paid,cash,unknown};
 },[game,p]);
 if(!p)return null;
 return <section style={{background:'#152a3e',border:'1px solid #587991',borderRadius:13,padding:13,display:'grid',gap:11}}>
  <div><div style={{fontSize:10,fontWeight:800,letterSpacing:1.5,color:'#a6d7f5'}}>PUBLISHED PRIZE TIERS</div><h3 style={{fontSize:18,margin:'5px 0'}}>What would a match actually pay?</h3><p style={{fontSize:12,color:'#b8d0e0',lineHeight:1.5,margin:0}}>Game-specific prize chart, theoretical prize frequency, and estimated payout for your selected number of plays.</p></div>
  {!summary?<div style={{background:'#102338',borderRadius:9,padding:11,fontSize:12,color:'#d1deea',lineHeight:1.55}}>
   <b>Wager-dependent game.</b> {p.notes} This version deliberately does not invent a cash prize from digit matches alone.
  </div>:<>
   <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:9}}>
    <div style={{background:'#102337',borderRadius:9,padding:10}}><small style={{color:'#b2cfe0'}}>One-line paid-prize odds</small><b style={{display:'block',marginTop:5,fontSize:16}}>{odd(summary.paid)}</b><small style={{color:'#b0cadc'}}>{pct(summary.paid)} per draw</small></div>
    <div style={{background:'#102337',borderRadius:9,padding:10}}><small style={{color:'#b2cfe0'}}>Expected known cash payouts</small><b style={{display:'block',marginTop:5,fontSize:16}}>{fmt(summary.cash*lines*draws)}</b><small style={{color:'#b0cadc'}}>Across {(lines*draws).toLocaleString()} line-results</small></div>
   </div>
   <div style={{display:'grid',gap:5,border:'1px solid #425e75',padding:10,borderRadius:9}}>
    <b style={{fontSize:12,color:'#cde4f3'}}>Prize frequency is not profit</b>
    <div style={{fontSize:12,color:'#c4d9e7'}}>Base cost: <b>{p.price!==undefined?fmt(lines*draws*p.price):'Wager-dependent'}</b></div>
    <div style={{fontSize:12,color:'#c4d9e7'}}>Expected fixed cash payout per base play: <b>{fmt(summary.cash)}</b></div>
    {summary.unknown.length>0?<small style={{color:'#b5cce0',lineHeight:1.6}}>This is a <b>partial expected return</b>, not total expected winnings: {summary.unknown.map(t=>t.name||t.main+' matches').join(', ')} have unknown drawing-dependent payouts. Jackpot, taxes and optional add-ons are excluded.</small>:<small style={{color:'#b5cce0',lineHeight:1.6}}>{game==='Cash Five'?'The free Quick Pick is noncash and excluded from cash expected return. The $25,000 award may decrease for more than 3 winners.':'For Mega Millions, nonjackpot amounts use the official 3× average multiplier; the actual multiplier on each play varies. '}{game==='All or Nothing'?'All ten standard prize tiers are fixed. ':''}This is a long-run mathematical average, never a guaranteed return. Taxes and purchase costs are separate.</small>}
   </div>
   <button onClick={()=>setShowAll(v=>!v)} style={{background:'#243d53',border:'1px solid #6c8fa7',borderRadius:9,padding:11,color:'#e2f0fa',fontWeight:650,fontSize:12}}>{showAll?'Hide':'View'} prize-by-prize odds ({summary.rows.length} tiers)</button>
   {showAll&&<div style={{display:'grid',gap:5}}>
    {summary.rows.map((t,i)=><div key={i} style={{display:'grid',gridTemplateColumns:'1fr auto',gap:6,padding:'8px 2px',borderTop:'1px solid #39536b'}}>
      <div style={{fontSize:12}}><b>{t.name||t.main+' main'+(p.bonusPool?(t.bonus?' + bonus':' · no bonus'):'')}</b><small style={{display:'block',color:'#a9c8df',marginTop:3}}>{pct(t.p)} · {odd(t.p)}</small></div>
      <b style={{fontSize:12,color:'#cce7f7',textAlign:'right'}}>{t.kind==='jackpot'?'Variable jackpot':t.kind==='variable'?'Variable':t.kind==='ticket'?'Free ticket':t.amount!==undefined?(p.multiplier?fmt(t.amount*2)+'–'+fmt(t.amount*10):fmt(t.amount)):'—'}</b>
    </div>)}
   </div>}
  </>}
  <small style={{fontSize:10,color:'#a7c0d2',lineHeight:1.55}}>{p.notes} Prizes and game rules can change. Odds assume independent fair drawings, and multiple winning ticket results need not be independent.</small>
  <a href={p.source} target="_blank" rel="noreferrer" style={{fontSize:12,color:'#add7ef',textDecoration:'underline'}}>Verify official game prize chart ↗</a>
 </section>;
}
