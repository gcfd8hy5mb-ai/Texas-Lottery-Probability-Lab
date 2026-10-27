import fs from 'node:fs/promises';
const url='https://www.texaslottery.com/export/sites/lottery/Games/Lotto_Texas/Winning_Numbers/lottotexas.csv';
const res=await fetch(url,{headers:{'User-Agent':'Texas-Lottery-Probability-Lab/1.0 (public historical research)'}});
if(!res.ok)throw new Error('Official Texas Lottery archive unavailable: HTTP '+res.status);
const csv=(await res.text()).replace(/^\uFEFF/,'');
const draws=[];let rejected=0;
for(const line of csv.split(/\r?\n/)){
 if(!line.trim())continue;
 const cells=line.split(',').map(s=>s.trim().replace(/^"|"$/g,''));
 if(cells.length<10)continue;
 const month=Number(cells[1]),day=Number(cells[2]),year=Number(cells[3]);
 const date=new Date(Date.UTC(year,month-1,day));
 if(year<2006||year===2006&&(month<4||month===4&&day<26))continue;
 if(!Number.isInteger(year)||year>2100||date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day){rejected++;continue;}
 const nums=cells.slice(4,10).map(Number);
 if(nums.length!==6||nums.some(n=>!Number.isInteger(n)||n<1||n>54)||new Set(nums).size!==6){rejected++;continue;}
 draws.push({date:date.toISOString().slice(0,10),nums:nums.sort((a,b)=>a-b)});
}
draws.sort((a,b)=>a.date.localeCompare(b.date));
if(draws.length<2000||rejected>0||new Set(draws.map(d=>d.date)).size!==draws.length)throw Error('Archive integrity check failed: '+draws.length+' valid draws, '+rejected+' invalid rows');
const result={source:url,format:'Lotto Texas six numbers from 1–54, April 26 2006 onward',first:draws[0].date,last:draws.at(-1).date,count:draws.length,draws};
await fs.mkdir('public/data',{recursive:true});
await fs.writeFile('public/data/lotto-texas.json',JSON.stringify(result));
console.log('Verified Lotto Texas official draws: '+draws.length+', '+result.first+' through '+result.last);
