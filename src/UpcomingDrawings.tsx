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
 const start=new Date(Math.ceil(now.getTime()/60000)*60000);
 for(let minutes=0;minutes<8*24*60;minutes++){
  const t=new Date(start.getTime()+minutes*60000);
  const parts=Object.fromEntries(fmt.formatToParts(t).map(x=>[x.type,x.value]));
  if(g.days.includes(weekdays.indexOf(parts.weekday))&&g.times.includes(parts.hour+':'+parts.minute)){
   return {timestamp:t,date:t.toLocaleDateString('en-US',{timeZone:'America/Chicago',weekday:'short',month:'short',day:'numeric',year:'numeric'}),time:t.toLocaleTimeString('en-US',{timeZone:'America/Chicago',hour:'numeric',minute:'2-digit'})+' CT'};
  }
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
  <div className={styles.heading}><h1>Upcoming drawings</h1><p>Next drawing, base play price and jackpot or top prize for each game.</p></div>
  <div className={styles.grid}>{games.map(g=>{
   const next=nextDate(g,now);
   const pot=snapshot?.jackpots[g.name];
   const matches=!!pot&&!!next&&pot.date===new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).format(next.timestamp).replace(/(\d\d)\/(\d\d)\/(\d{4})/,'$3-$1-$2');
   const jackpot=g.top==='Rolling jackpot'?(pot&&matches&&!stale?pot.amount:'Check current jackpot'):g.top;
   return <button type="button" key={g.name} className={styles.card} onClick={()=>onGame(g.name)} aria-label={'Analyze '+g.name}>
    <div className={styles.cardHead}><span className={styles.logo}>{g.short}</span><b>{g.name}</b><ChevronRight size={17}/></div>
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
