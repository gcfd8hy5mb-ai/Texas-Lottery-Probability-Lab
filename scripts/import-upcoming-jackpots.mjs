import fs from 'node:fs/promises';
const url='https://www.texaslottery.com/export/sites/lottery/Games/index.html';
const names=['Powerball','Mega Millions','Lotto Texas','Texas Two Step'];
function dateISO(value){const [m,d,y]=value.split('/').map(Number);return [y,String(m).padStart(2,'0'),String(d).padStart(2,'0')].join('-');}
try{
 const response=await fetch(url,{headers:{'User-Agent':'TexasLotteryProbabilityLab/1.0 (public jackpot information)'} ,signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw Error('HTTP '+response.status);
 const html=await response.text();
 const clean=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/\s+/g,' ');
 const pattern=/Current\s+(?:Est\.?\s*Annuitized|Advertised)\s+Jackpot\s+for\s+(\d{1,2}\/\d{1,2}\/\d{4})\s*:\s*\$\s*([\d,.]+)\s*(Million|Billion)?/gi;
 const found=[...clean.matchAll(pattern)].slice(0,4);
 if(found.length!==4)throw Error('Expected four official jackpot records; found '+found.length);
 const jackpots={};
 for(let i=0;i<4;i++){
  const value=found[i][2]+' '+(found[i][3]||'').trim();
  jackpots[names[i]]={date:dateISO(found[i][1]),amount:'$'+value.trim()};
 }
 const snapshot={checkedAt:new Date().toISOString(),source:url,jackpots};
 await fs.mkdir('public/data',{recursive:true});
 await fs.writeFile('public/data/jackpot-snapshot.json',JSON.stringify(snapshot,null,2)+'\n');
 console.log('Imported official upcoming jackpots:',JSON.stringify(jackpots));
}catch(error){
 console.warn('Official jackpot import unavailable; hide dynamic jackpot values:',String(error));
 await fs.mkdir('public/data',{recursive:true});
 await fs.writeFile('public/data/jackpot-snapshot.json',JSON.stringify({checkedAt:'',source:url,jackpots:{}},null,2)+'\n');
}
