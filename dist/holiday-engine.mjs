/** HA Seasons AI V1.3 — Slovak holiday visual themes (no API/network required). */
const HOLIDAY_TYPES = {
  christmas:{type:'christmas',label:'Vianočné obdobie',emoji:'✨'},
  advent:{type:'advent',label:'Advent',emoji:'🕯️'},
  newyear:{type:'newyear',label:'Nový rok',emoji:'✨'},
  epiphany:{type:'christmas',label:'Traja králi',emoji:'⭐'},
  easter:{type:'easter',label:'Veľká noc',emoji:'🌸'},
  spring:{type:'spring',label:'Sviatok jari',emoji:'🌼'},
  remembrance:{type:'remembrance',label:'Sviatok všetkých svätých',emoji:'🕯️'},
  national:{type:'national',label:'Pamätný deň',emoji:'🇸🇰'},
  nicholas:{type:'christmas',label:'Mikuláš',emoji:'⭐'},
  valentine:{type:'spring',label:'Valentín',emoji:'💛'},
  womensday:{type:'spring',label:'Medzinárodný deň žien',emoji:'🌷'},
  mother:{type:'spring',label:'Deň matiek',emoji:'🌷'},
  child:{type:'spring',label:'Deň detí',emoji:'🌼'}
};
function dateParts(now=new Date(),timeZone='Europe/Bratislava'){
  try{
    const parts=new Intl.DateTimeFormat('en-GB',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
    const item=Object.fromEntries(parts.filter(x=>['year','month','day'].includes(x.type)).map(x=>[x.type,Number(x.value)]));
    return {year:item.year,month:item.month,day:item.day};
  }catch{return {year:now.getFullYear(),month:now.getMonth()+1,day:now.getDate()};}
}
function easterSunday(year){
  // Meeus/Jones/Butcher Gregorian algorithm; returns UTC date without timezone ambiguity.
  const a=year%19,b=Math.floor(year/100),c=year%100,d=Math.floor(b/4),e=b%4,
        f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,
        i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k+700)%7,
        m=Math.floor((a+11*h+22*l)/451),n=h+l-7*m+114,
        month=Math.floor(n/31),day=n%31+1;
  return new Date(Date.UTC(year,month-1,day));
}
function utcDay(p){return Math.floor(Date.UTC(p.year,p.month-1,p.day)/86400000);}
function daysFrom(p,date){return utcDay(p)-Math.floor(date.getTime()/86400000);}
function adventCandles(p){
  // Four Sundays preceding Christmas Day: candle lights only after each Sunday.
  const christmasEve=Date.UTC(p.year,11,24);
  const weekday=new Date(christmasEve).getUTCDay();
  const fourthSunday=christmasEve-weekday*86400000;
  const firstSunday=fourthSunday-21*86400000;
  return Math.max(0,Math.min(4,Math.floor((utcDay(p)*86400000-firstSunday)/(7*86400000))+1));
}
function entry(id,overrideLabel=null){const e=HOLIDAY_TYPES[id];return {...e,id,label:overrideLabel||e.label};}
function observedHoliday(now=new Date(),timeZone='Europe/Bratislava'){
  const p=dateParts(now,timeZone),{month:m,day:d,year:y}=p;
  // Strict priority: named holidays before broad Christmas/Advent season.
  if(m===1&&d===1)return entry('newyear');
  if(m===1&&d===6)return entry('epiphany');
  if(m===12&&d===31)return entry('newyear','Silvester');
  if(m===12&&d===24)return entry('christmas','Štedrý deň');
  if(m===12&&d===25)return entry('christmas','Prvý sviatok vianočný');
  if(m===12&&d===26)return entry('christmas','Druhý sviatok vianočný');
  if(m===12&&d>=16&&d<=23)return entry('advent','Vianočný advent');
  if((m===12&&d>=27)||(m===1&&d<=5))return entry('christmas');
  if(m===12&&d===6)return entry('nicholas');
  // Advent starts on its first Sunday, not on December 16.
  // Christmas illumination remains a separate dusk-only layer.
  if((m===11||(m===12&&d<=23))&&adventCandles(p)>0)return entry('advent','Advent');
  const easter=easterSunday(y),delta=daysFrom(p,easter);
  if(delta>=-7&&delta<=1){
    const label=delta===-7?'Kvetná nedeľa':delta===-2?'Veľký piatok':delta===-1?'Biela sobota':delta===0?'Veľkonočná nedeľa':delta===1?'Veľkonočný pondelok':'Veľkonočný týždeň';
    return entry('easter',label);
  }
  if(m===2&&d===14)return entry('valentine');
  if(m===3&&d===8)return entry('womensday');
  if(m===5&&d===1)return entry('spring','Sviatok práce a jari');
  if(m===5&&d===8)return entry('national','Deň víťazstva nad fašizmom');
  // Second Sunday in May.
  if(m===5&&new Date(Date.UTC(y,4,d)).getUTCDay()===0&&d>=8&&d<=14)return entry('mother');
  if(m===6&&d===1)return entry('child');
  if(m===7&&d===5)return entry('national','Cyril a Metod');
  if(m===8&&d===29)return entry('national','Výročie SNP');
  if(m===9&&d===1)return entry('national','Deň Ústavy SR');
  if(m===9&&d===15)return entry('national','Sedembolestná Panna Mária');
  if(m===11&&d===1)return entry('remembrance');
  if(m===11&&d===17)return entry('national','Deň boja za slobodu a demokraciu');
  return {id:'none',type:'none',emoji:'',label:''};
}
export function holidayForDate(now=new Date(),timeZone='Europe/Bratislava',config={}){
  if(config.holidays_enabled===false)return {id:'none',type:'none',emoji:'',label:'',candles:0};
  const forced=String(config.preview_holiday||'auto');
  let date=now;
  if(/^\d{4}-\d{2}-\d{2}$/.test(String(config.preview_date||''))){
    const [y,m,d]=config.preview_date.split('-').map(Number);
    const candidate=new Date(Date.UTC(y,m-1,d,12));
    if(candidate.getUTCFullYear()===y&&candidate.getUTCMonth()===m-1&&candidate.getUTCDate()===d)date=candidate;
  }
  const entryData=(forced==='none')?{id:'none',type:'none',emoji:'',label:''}:HOLIDAY_TYPES[forced]?entry(forced):observedHoliday(date,timeZone);
  const p=dateParts(date,timeZone);
  const candles=['advent','christmas'].includes(entryData.type)?adventCandles(p):0;
  return {...entryData,candles};
}
export {easterSunday,observedHoliday,adventCandles,dateParts};
