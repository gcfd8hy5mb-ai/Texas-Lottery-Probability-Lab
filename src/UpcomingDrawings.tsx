import React,{useEffect,useState} from 'react';
import {CalendarDays,Ticket,Trophy,ChevronRight,ExternalLink} from 'lucide-react';
import styles from './UpcomingDrawings.module.css';

type Jackpot={amount:string;date:string};
type Snapshot={checkedAt:string;jackpots:Record<string,Jackpot>};
type Game={name:string;price:string;top:string;sub?:string;days:number[];times:string[];short:string};
const games:Game[]=[
 {name:'Lotto Texas',short:'LOTTO',price:'$1.00',top:'Rolling jackpot',days:[1,3,6],times:['22:12']},
 {name:'Powerball',short:'POWERBALL',price:'$2.00',top:'Rolling jackpot',days:[1,3,6],times:['22:12']},
 {name:'Mega Millions',short:'MEGA',price:'$5.00',top:'Rolling jackpot',days:[2,5],times:['22:12']},
 {name:'Texas Two Step',short:'TWO STEP',price:'$1.00',top:'Rolling jackpot',days:[1,4],times:['22:12']},
 {name:'Cash Five',short:'CASH FIVE',price:'$1.00',top:'$25,000',days:[1,2,3,4,5,6],times:['22:12']},
 {name:'All or Nothing',short:'ALL / NOTHING',price:'$2.00',top:'$250,000',days:[1,2,3,4,5,6],times:['10:00','12:27','18:00','22:12'],sub:'4 draws each Mon–Sat'},
 {name:'Pick 3',short:'PICK 3',price:'Varies by play',top:'Varies by play type',days:[1,2,3,4,5,6],times:['10:00','12:27','18:00','22:12'],sub:'4 draws each Mon–Sat'},
 {name:'Daily 4',short:'DAILY 4',price:'Varies by play',top:'Varies by play type',days:[1,2,3,4,5,6],times:['10:00','12:27','18:00','22:12'],sub:'4 draws each Mon–Sat'},
];
// Inspect each upcoming minute in Central Time to avoid timezone/DST assumptions.
function nextDate(g:Game,now:Date){
 const fmt=new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',weekday:'short',month:'short',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
 const weekdays=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
 const minuteChoices=[0,12,27];
 const firstHour=Math.floor(now.getTime()/3600000)*3600000;
 for(let hour=0;hour<8*24;hour++){
  for(const minute of minuteChoices){
   const t=new Date(firstHour+hour*3600000+minute*60000);
   if(t<=now)continue;
   const parts=Object.fromEntries(fmt.formatToParts(t).map(x=>[x.type,x.value]));
   if(g.days.includes(weekdays.indexOf(parts.weekday))&&g.times.includes(parts.hour+':'+parts.minute)){
    return {timestamp:t,date:t.toLocaleDateString('en-US',{timeZone:'America/Chicago',weekday:'short',month:'short',day:'numeric',year:'numeric'}),time:t.toLocaleTimeString('en-US',{timeZone:'America/Chicago',hour:'numeric',minute:'2-digit'})+' CT'};
   }
  }
 }
 return null;
}
// Original abstract game symbols. No Texas Lottery or partner logo artwork is reproduced.
function GameSymbol({name}:{name:string}){
 const common={viewBox:'0 0 64 52',width:48,height:40,fill:'none',xmlns:'http://www.w3.org/2000/svg', 'aria-hidden':true as const};
 switch(name){
  case 'Lotto Texas':return <svg {...common}><path d="M32 4 38 18 54 20 42 31 45 47 32 39 19 47 22 31 10 20 26 18Z" fill="#F5B85D" stroke="#FFD994" strokeWidth="2"/><circle cx="32" cy="26" r="9" fill="#14334B"/><circle cx="32" cy="26" r="4" fill="#FFE6AC"/></svg>;
  case 'Powerball':return <svg {...common}><circle cx="29" cy="26" r="17" stroke="#9CCCEB" strokeWidth="3"/><path d="m12 37 10-19 11 12 18-18" stroke="#70D6FC" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="51" cy="12" r="7" fill="#F17F7A"/><path d="M29 5v5M29 42v5M7 26h5" stroke="#9CCCEB" strokeWidth="2"/></svg>;
  case 'Mega Millions':return <svg {...common}><path d="m9 37 17-28 12 13 16-9-10 28-21 3Z" fill="#AD83E8" stroke="#E4CCFF" strokeWidth="2"/><path d="m18 35 20-13 6 19-17-7" fill="#F9CA6F"/><circle cx="25" cy="16" r="3" fill="#9BE6EE"/></svg>;
  case 'Texas Two Step':return <svg {...common}><path d="M9 42V31h13V20h14V9h17" stroke="#F0B389" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/><circle cx="9" cy="29" r="4" fill="#90D8EA"/><circle cx="53" cy="9" r="5" fill="#D2E9F7"/></svg>;
  case 'Cash Five':return <svg {...common}><path d="M16 8h32v36H16z" rx="8" fill="#224F49"/><path d="M16 8h32v36H16z" stroke="#67D1B1" strokeWidth="2"/>{[14,23,32,41,50].map((x,i)=><circle key={i} cx={x} cy={i%2?34:19} r="4" fill="#D9F4A4"/>)}</svg>;
  case 'All or Nothing':return <svg {...common}><circle cx="31" cy="26" r="19" stroke="#F2D184" strokeWidth="3"/><path d="M31 7a19 19 0 0 1 0 38Z" fill="#F5CE78"/><path d="M20 26h22" stroke="#F4E4B8" strokeWidth="2"/></svg>;
  case 'Pick 3':return <svg {...common}><rect x="6" y="13" width="15" height="29" rx="5" fill="#83DAC4"/><rect x="24" y="7" width="15" height="35" rx="5" fill="#60BCB4"/><rect x="42" y="18" width="15" height="24" rx="5" fill="#A8EFDB"/><circle cx="31" cy="13" r="2" fill="#1A4B4B"/></svg>;
  case 'Daily 4':return <svg {...common}><rect x="6" y="5" width="22" height="19" rx="5" fill="#A98BE6"/><rect x="34" y="5" width="22" height="19" rx="5" fill="#D3B0F6"/><rect x="6" y="29" width="22" height="19" rx="5" fill="#D3B0F6"/><rect x="34" y="29" width="22" height="19" rx="5" fill="#A98BE6"/></svg>;
 }
 return null;
}

const official='https://www.texaslottery.com/export/sites/lottery/Games/index.html';
export default function UpcomingDrawings({onGame}:{onGame:(name:string)=>void}){
 const [now,setNow]=useState(()=>new Date()),[snapshot,setSnapshot]=useState<Snapshot|null>(null);
 useEffect(()=>{
  const tick=window.setInterval(()=>setNow(new Date()),60000);
  let active=true;
  fetch(import.meta.env.BASE_URL+'data/jackpot-snapshot.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(v=>{if(active&&v)setSnapshot(v)}).catch(()=>{});
  return()=>{active=false;window.clearInterval(tick);};
 },[]);
 const checkDate=snapshot?new Date(snapshot.checkedAt):null;
 const stale=!checkDate||now.getTime()-checkDate.getTime()>36*3600*1000;
 return <section className={styles.section}>
  <div className={styles.heading}><h1>Upcoming drawings</h1><p>Next drawing dates, ticket prices, and current jackpots for each game.</p></div>
  <div className={styles.grid}>{games.map(g=>{
   const next=nextDate(g,now);
   const pot=snapshot?.jackpots[g.name];
   const matches=!!pot&&!!next&&pot.date===new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).format(next.timestamp).replace(/(\d\d)\/(\d\d)\/(\d{4})/,'$3-$1-$2');
   const jackpot=g.top==='Rolling jackpot'?(pot&&matches&&!stale?pot.amount:'Check current jackpot'):g.top;
   return <button type="button" key={g.name} className={styles.card} onClick={()=>onGame(g.name)} aria-label={'Run all '+g.name+' tests in Auto Pick'}>
    <div className={styles.cardHead}><span className={styles.logo} aria-hidden="true"><GameSymbol name={g.name}/></span><b>{g.name}</b><ChevronRight size={17}/></div>
    <div className={styles.field}><CalendarDays size={15}/><span>Next draw</span><strong>{next?.date||'View schedule'}<small>{next?.time}</small></strong></div>
    <div className={styles.field}><Ticket size={15}/><span>Ticket</span><strong>{g.price}</strong></div>
    <div className={styles.field}><Trophy size={15}/><span>{g.top==='Rolling jackpot'?'Jackpot':'Top prize'}</span><strong>{jackpot}{g.top==='Rolling jackpot'&&pot&&matches&&!stale?<small>{g.name==='Texas Two Step'?'Advertised jackpot':'Estimated annuity'}</small>:null}</strong></div>
    {g.sub&&<small className={styles.session}>{g.sub}</small>}
   </button>;
  })}</div>
  <p className={styles.note}>All drawing times Central. Prices exclude optional add-ons and may vary by wager. Jackpot figures appear only when a recent official snapshot matches the upcoming draw. {checkDate?'Jackpot data retrieved '+checkDate.toLocaleString('en-US',{timeZone:'America/Chicago',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})+' CT.':'Jackpot data unavailable.'}</p>
  <a className={styles.source} href={official} target="_blank" rel="noreferrer">Texas Lottery official results <ExternalLink size={13}/></a>
 </section>;
}
