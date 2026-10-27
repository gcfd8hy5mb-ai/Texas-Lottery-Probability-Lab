import React,{useEffect,useMemo,useState} from 'react';
import HistoricalEstimate from './HistoricalEstimate';
type Draw={date:string;nums:number[];bonus:number};
type Archive={game:string;source:string;ruleStart:string;max:number;bonusMax:number;count:number;first:string;last:string;draws:Draw[]};
const files:Record<string,string>={'Powerball':'powerball.json','Mega Millions':'mega-millions.json'};
type Mode='frequency'|'cold'|'overdue'|'random';
const ranges=[['30','Last 30'],['100','Last 100'],['year','1 year'],['5years','5 years'],['all','All compatible history']];
function seedPick(max:number,count:number,seed:number){const a=Array.from({length:max},(_,i)=>i+1);let s=seed>>>0;for(let j=a.length-1;j>0;j--){s=(Math.imul(s,1664525)+1013904223)>>>0;const k=s%(j+1);[a[k],a[j]]=[a[j],a[k]];}return a.slice(0,count);}
function predict(draws:Draw[],max:number,mode:Mode,seed:number){if(mode==='random')return seedPick(max,5,seed);const freq=new Array(max+1).fill(0),age=new Array(max+1).fill(draws.length);draws.forEach((d,i)=>d.nums.forEach(n=>{freq[n]++;age[n]=draws.length-1-i}));return Array.from({length:max},(_,i)=>i+1).sort((a,b)=>mode==='frequency'?freq[b]-freq[a]||a-b:mode==='cold'?freq[a]-freq[b]||a-b:age[b]-age[a]||a-b).slice(0,5);}
function test(ds:Draw[],max:number,mode:Mode){let hits=0;const warm=Math.min(30,Math.max(4,Math.floor(ds.length/4)));for(let i=warm;i<ds.length;i++){const pred=predict(ds.slice(0,i),max,mode,i+45618);hits+=pred.filter(n=>ds[i].nums.includes(n)).length;}return {hits,trials:Math.max(0,ds.length-warm)};}
export default function DrawHistoryLab({game}:{game:string}){
 const [archives,setArchives]=useState<Record<string,Archive>>({});const [errors,setErrors]=useState<Record<string,string>>({});
 const [range,setRange]=useState('100');const [experiment,setExperiment]=useState(false);const [expanded,setExpanded]=useState(false);
 useEffect(()=>{let alive=true;const file=files[game];if(!file||archives[game]||errors[game])return;
 fetch(import.meta.env.BASE_URL+'data/'+file,{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()}).then((d:Archive)=>{if(!Array.isArray(d.draws)||d.draws.length<100||d.game!==game)throw Error('Archive validation failed');if(alive)setArchives(old=>({...old,[game]:d}));}).catch(e=>{if(alive)setErrors(old=>({...old,[game]:String(e.message||e)}));});return()=>{alive=false};},[game,archives,errors]);
 const data=archives[game];
 const draws=useMemo(()=>{if(!data)return [];if(range==='30'||range==='100')return data.draws.slice(-Number(range));if(range==='year'||range==='5years'){const date=new Date(data.last+'T00:00:00Z');date.setUTCFullYear(date.getUTCFullYear()-(range==='year'?1:5));return data.draws.filter(d=>d.date>=date.toISOString().slice(0,10));}return data.draws;},[data,range]);
 const frequent=useMemo(()=>{if(!data)return [];const scores=new Array(data.max+1).fill(0);for(const d of draws)for(const n of d.nums)scores[n]++;return Array.from({length:data.max},(_,i)=>({n:i+1,hits:scores[i+1]})).sort((a,b)=>b.hits-a.hits||a.n-b.n).slice(0,5);},[data,draws]);
 const results=useMemo(()=>data&&expanded?(['frequency','cold','overdue','random'] as Mode[]).map(mode=>({mode,...test(draws,data.max,mode)})):[],[data,draws,expanded]);
 const recommendation=useMemo(()=>{if(!data)return null;const recent=data.draws.slice(-100);const counts=new Array(data.max+1).fill(0),bonusCounts=new Array(data.bonusMax+1).fill(0);for(const d of recent){for(const n of d.nums)counts[n]++;bonusCounts[d.bonus]++;}const main=Array.from({length:data.max},(_,i)=>i+1).sort((a,b)=>counts[b]-counts[a]||a-b).slice(0,5).sort((a,b)=>a-b);const bonus=Array.from({length:data.bonusMax},(_,i)=>i+1).sort((a,b)=>bonusCounts[b]-bonusCounts[a]||a-b)[0];return {main,bonus,n:recent.length};},[data]);
 return <section style={{background:'#192b3d',border:'1px solid #34485a',borderRadius:15,padding:17,display:'grid',gap:12}}>
 <div style={{fontSize:10,color:'#a9cfee',letterSpacing:2}}>OFFICIAL DRAW HISTORY</div><strong style={{fontSize:18}}>{game} Lab</strong>
 {errors[game]?<p role="alert" style={{color:'#ffd1c5'}}>The official historical dataset could not load ({errors[game]}). No substitute numbers are shown.</p>:!data?<p>Loading verified official archive…</p>:<>
 <p style={{fontSize:12,color:'#bed0df',lineHeight:1.5,margin:0}}>{data.count.toLocaleString()} verified drawings · {data.first} to {data.last}. Only the current number format (from {data.ruleStart}) is compared.</p>
 <HistoricalEstimate draws={data.draws} max={data.max} bonusMax={data.bonusMax} pickCount={5} game={game} rangeStart={data.draws.length-draws.length} trainingWindow={range==="30"?30:100}/>
 <label style={{display:'grid',gap:5,fontSize:12,color:'#a9cfee'}}>Historical range<select aria-label="Historical range" value={range} onChange={e=>{setRange(e.target.value);setExpanded(false)}} style={{padding:12,borderRadius:9,background:'#112033',color:'#f2f7fb',border:'1px solid #50647a',fontSize:15}}>{ranges.map(([v,t])=><option key={v} value={v}>{t}</option>)}</select></label>
 <small style={{color:'#b3c9d9'}}>{draws.length.toLocaleString()} drawings in selected range</small>
 <div style={{display:'flex',gap:7,flexWrap:'wrap'}}>{frequent.map(v=><div key={v.n} style={{border:'1px solid #506980',borderRadius:9,padding:10,minWidth:45,textAlign:'center'}}><b>{v.n}</b><div style={{fontSize:10,color:'#a9cfee'}}>{v.hits}×</div></div>)}</div>
 <label style={{display:'flex',alignItems:'center',gap:10,fontSize:12,color:'#d7e5ef'}}><input type="checkbox" checked={experiment} onChange={e=>setExperiment(e.target.checked)}/> Experimental Mode (speculative strategies)</label>
 <button onClick={()=>setExpanded(x=>!x)} style={{border:0,background:'#a9cfee',color:'#102033',borderRadius:9,padding:12,fontWeight:700}}>{expanded?'Hide comparisons':'Compare strategies'}</button>
 {expanded&&<><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>{results.filter(v=>experiment||v.mode==='frequency'||v.mode==='random').map(v=><div key={v.mode} style={{border:'1px solid #4a6076',borderRadius:9,padding:12}}><small style={{color:'#b8c9d9'}}>{({frequency:'Hot frequency',cold:'Cold frequency',overdue:'Longest absent',random:'Random baseline'} as Record<Mode,string>)[v.mode]}</small><strong style={{display:'block',fontSize:24}}>{v.hits}</strong><small>{v.trials} holdout drawings</small></div>)}</div><p style={{fontSize:11,color:'#b6cada',lineHeight:1.6,margin:0}}>Walk-forward backtest uses only past observations for each test. Bonus balls excluded. Hot, cold, and overdue strategies are speculative; no evidence that they beat fair independent lottery odds. Historical match totals do not measure profitability.</p></>}
 <a href={data.source} target="_blank" rel="noreferrer" style={{fontSize:12,color:'#b5d8f4'}}>Official Texas Lottery download ↗</a>
 </>}</section>;

}
