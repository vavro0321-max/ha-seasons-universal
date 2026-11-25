/* HA Seasons AI — dates of municipal and sorted waste collection.
 * No external API: reads Home Assistant sensor states and attributes.
 */
const KNOWN_MUNICIPAL = ['sensor.najblizsi_komunalny_odpad', 'sensor.najblizsi_komunalni_odpad'];
const KNOWN_SORTED = ['sensor.najblizsi_triedeny_zber', 'sensor.najblizsi_triedeni_zber'];
const MONTHS = ['januára','februára','marca','apríla','mája','júna','júla','augusta','septembra','októbra','novembra','decembra'];
const VALID = value => value !== null && value !== undefined &&
  !['','unknown','unavailable','none','null','—'].includes(String(value).trim().toLowerCase());

function calendarParts(now, timezone) {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone || 'Europe/Bratislava', year:'numeric',month:'2-digit',day:'2-digit'
    }).formatToParts(now);
    const get = type => Number(parts.find(part => part.type===type)?.value);
    return {year:get('year'), month:get('month'), day:get('day')};
  } catch {
    return {year:now.getFullYear(),month:now.getMonth()+1,day:now.getDate()};
  }
}
function calendarDay(year,month,day) {
  const date = new Date(Date.UTC(year,month-1,day));
  return date.getUTCFullYear()===year && date.getUTCMonth()===month-1 && date.getUTCDate()===day
    ? date : null;
}
function dateFromText(raw, now, timeZone) {
  const value = String(raw||'').trim();
  const iso = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:$|[T\s])/);
  if(iso) return calendarDay(+iso[1],+iso[2],+iso[3]);
  const sk = value.match(/^(\d{1,2})\s*[.\/-]\s*(\d{1,2})(?:\s*[.\/-]\s*(\d{4}))?\s*[.]?$/);
  if(!sk) return null;
  const today=calendarParts(now,timeZone);
  const y=sk[3] ? +sk[3] : today.year;
  let date=calendarDay(y,+sk[2],+sk[1]);
  if(date && !sk[3] && date < calendarDay(today.year,today.month,today.day)) {
    date=calendarDay(today.year+1,+sk[2],+sk[1]);
  }
  return date;
}
function dateStatus(date, now, timeZone) {
  const today=calendarParts(now,timeZone);
  const current=calendarDay(today.year,today.month,today.day);
  const days=Math.round((date-current)/86400000);
  const pretty=`${date.getUTCDate()}. ${MONTHS[date.getUTCMonth()]}`;
  if(days===0)return {value:`Dnes · ${pretty}`,status:'today'};
  if(days===1)return {value:`Zajtra · ${pretty}`,status:'tomorrow'};
  if(days<0)return {value:`Minulý termín · ${pretty}`,status:'past'};
  return {value:pretty,status:'future'};
}
function fromEntity(entity, now, timeZone) {
  if(!entity)return {value:'—',status:'missing'};
  const attrs=entity.attributes||{};
  const raw=[entity.state,attrs.next_date,attrs.next_pickup,attrs.collection_date,attrs.pickup_date,attrs.date]
    .find(VALID);
  if(!VALID(raw))return {value:'—',status:'missing'};
  const text=String(raw).trim();
  const parsed=dateFromText(text,now,timeZone);
  if(parsed)return dateStatus(parsed,now,timeZone);
  const lower=text.toLocaleLowerCase('sk');
  if(lower==='dnes')return {value:'Dnes',status:'today'};
  if(lower==='zajtra')return {value:'Zajtra',status:'tomorrow'};
  if(lower==='pozajtra')return {value:'Pozajtra',status:'future'};
  // Other text states (e.g. "O 3 dni") are rendered exactly as provided.
  return {value:text,status:'future'};
}
function pickEntity(hass, configured, candidates) {
  const ids=[configured,...candidates].filter(Boolean);
  for(const id of ids)if(hass?.states?.[id])return hass.states[id];
  return null;
}
export function wasteReadings(hass, config={}, now=new Date()) {
  const timeZone=hass?.config?.time_zone||'Europe/Bratislava';
  const municipal=pickEntity(hass,config.waste_municipal_entity||config.entities?.waste_municipal,KNOWN_MUNICIPAL);
  const sorted=pickEntity(hass,config.waste_recycling_entity||config.entities?.waste_recycling,KNOWN_SORTED);
  return {
    municipal:fromEntity(municipal,now,timeZone),
    sorted:fromEntity(sorted,now,timeZone)
  };
}
