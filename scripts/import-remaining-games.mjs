import fs from 'node:fs/promises';
const entries=[
 {name:'Texas Two Step',folder:'Texas_Two_Step',file:'texastwostep.csv',out:'texas-two-step',count:4,max:35,bonusMax:35,from:'2001-05-18',ordered:false},
 {name:'Cash Five',folder:'Cash_Five',file:'cashfive.csv',out:'cash-five',count:5,max:35,from:'2018-09-24',ordered:false},
 {name:'All or Nothing',folder:'All_or_Nothing',file:'allornothingnight.csv',out:'all-or-nothing',count:12,max:24,from:'2012-09-10',ordered:false,session:'Night'},
 {name:'Pick 3',folder:'Pick_3',file:'pick3night.csv',out:'pick-3',count:3,max:9,from:'2019-04-29',ordered:true,session:'Night'},
 {name:'Daily 4',folder:'Daily_4',file:'daily4night.csv',out:'daily-4',count:4,max:9,from:'2019-04-29',ordered:true,session:'Night'}
];
for(const g of entries){
 const url='https://www.texaslottery.com/export/sites/lottery/Games/'+g.folder+'/Winning_Numbers/'+g.file;
 const response=await fetch(url,{headers:{'User-Agent':'Texas-Lottery-Probability-Lab/1.0 (public historical research)'}});
 if(!response.ok)throw Error(g.name+' official CSV returned HTTP '+response.status);
 const csv=(await response.text()).replace(/^\uFEFF/,'');
 const draws=[];let rejected=0;
 for(const line of csv.split(/\r?\n/)){
  if(!line.trim())continue;
  const c=line.split(',').map(v=>v.trim().replace(/^"|"$/g,''));
  if(c.length<4+g.count)continue;
  const [month,day,year]=c.slice(1,4).map(Number);
  if(!Number.isInteger(year)||year<1990||year>2100)continue;
  const d=new Date(Date.UTC(year,month-1,day));
  if(d.getUTCFullYear()!==year||d.getUTCMonth()!==month-1||d.getUTCDate()!==day){rejected++;continue;}
  const date=d.toISOString().slice(0,10);
  if(date<g.from)continue;
  const nums=c.slice(4,4+g.count).map(Number);
  const bonus=g.bonusMax?Number(c[4+g.count]):undefined;
  if(nums.length!==g.count||nums.some(n=>!Number.isInteger(n)||n<(g.ordered?0:1)||n>g.max)||(!g.ordered&&new Set(nums).size!==g.count)||(g.bonusMax&&(!Number.isInteger(bonus)||bonus<1||bonus>g.bonusMax))){rejected++;continue;}
  draws.push({date,nums:g.ordered?nums:nums.sort((a,b)=>a-b),...(bonus!==undefined?{bonus}:{})});
 }
 draws.sort((a,b)=>a.date.localeCompare(b.date));
 if(draws.length<100||rejected||new Set(draws.map(d=>d.date)).size!==draws.length)throw Error(g.name+' rejected archive: '+draws.length+' entries, '+rejected+' invalid');
 const output={game:g.name,source:url,ruleStart:g.from,max:g.max,bonusMax:g.bonusMax||null,pickCount:g.count,ordered:g.ordered,session:g.session||null,count:draws.length,first:draws[0].date,last:draws.at(-1).date,draws};
 await fs.mkdir('public/data',{recursive:true});
 await fs.writeFile('public/data/'+g.out+'.json',JSON.stringify(output));
 console.log('Verified '+g.name+(g.session?' '+g.session:'')+' drawings: '+draws.length+'; '+output.first+' to '+output.last);
}
