import fs from 'node:fs/promises';
const games=[
 {name:'Powerball',folder:'Powerball',file:'powerball.csv',from:'2015-10-07',max:69,bonusMax:26,min:1400,out:'powerball.json'},
 {name:'Mega Millions',folder:'Mega_Millions',file:'megamillions.csv',from:'2025-04-08',max:70,bonusMax:24,min:100,out:'mega-millions.json'}
];
for(const g of games){
 const url='https://www.texaslottery.com/export/sites/lottery/Games/'+g.folder+'/Winning_Numbers/'+g.file;
 const res=await fetch(url,{headers:{'User-Agent':'Texas-Lottery-Probability-Lab/1.0 (public historical research)'}});
 if(!res.ok)throw Error(g.name+' archive HTTP '+res.status);
 const content=(await res.text()).replace(/^\uFEFF/,'');
 const draws=[];let bad=0;
 for(const line of content.split(/\r?\n/)){
  if(!line.trim())continue;
  const c=line.split(',').map(v=>v.trim().replace(/^"|"$/g,''));
  if(c.length<10)continue;
  const [month,day,year]=c.slice(1,4).map(Number);
  const when=new Date(Date.UTC(year,month-1,day));
  if(!Number.isInteger(year)||year<2000||year>2100||when.getUTCMonth()!==month-1||when.getUTCDate()!==day)continue;
  const date=when.toISOString().slice(0,10);if(date<g.from)continue;
  const nums=c.slice(4,9).map(Number),bonus=Number(c[9]);
  if(nums.length!==5||nums.some(x=>!Number.isInteger(x)||x<1||x>g.max)||new Set(nums).size!==5||!Number.isInteger(bonus)||bonus<1||bonus>g.bonusMax){bad++;continue;}
  draws.push({date,nums:nums.sort((a,b)=>a-b),bonus});
 }
 draws.sort((a,b)=>a.date.localeCompare(b.date));
 if(bad||draws.length<g.min||new Set(draws.map(d=>d.date)).size!==draws.length)throw Error(g.name+' archive failed validation: '+draws.length+' accepted / '+bad+' invalid');
 const output={game:g.name,source:url,ruleStart:g.from,max:g.max,bonusMax:g.bonusMax,first:draws[0].date,last:draws.at(-1).date,count:draws.length,draws};
 await fs.mkdir('public/data',{recursive:true});await fs.writeFile('public/data/'+g.out,JSON.stringify(output));
 console.log('Verified '+g.name+' official draws: '+draws.length+', '+output.first+' through '+output.last);
}
