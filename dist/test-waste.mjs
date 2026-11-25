import assert from 'node:assert/strict';
import {wasteReadings} from './waste-engine.mjs';

const now=new Date('2026-11-25T12:00:00Z');
const hass=states=>({states,config:{time_zone:'Europe/Bratislava'}});
const sensor=state=>({state,attributes:{}});
const run=(municipal,sorted,config={})=>wasteReadings(hass({
  'sensor.najblizsi_komunalny_odpad':sensor(municipal),
  'sensor.najblizsi_triedeny_zber':sensor(sorted)
}),config,now);

const today=run('2026-11-25','2026-11-26');
assert.equal(today.municipal.status,'today');
assert.match(today.municipal.value,/Dnes · 25\. novembra/);
assert.equal(today.sorted.status,'tomorrow');
assert.match(today.sorted.value,/Zajtra · 26\. novembra/);

const coming=run('2026-12-04','04.12.2026');
assert.equal(coming.municipal.value,'4. decembra');
assert.equal(coming.sorted.value,'4. decembra');
assert.equal(coming.sorted.status,'future');

const natural=run('Dnes','Zajtra');
assert.equal(natural.municipal.value,'Dnes');
assert.equal(natural.sorted.value,'Zajtra');

const free=run('O 3 dni','Pozajtra');
assert.equal(free.municipal.value,'O 3 dni');
assert.equal(free.sorted.value,'Pozajtra');

const unknown=run('unavailable','unknown');
assert.equal(unknown.municipal.status,'missing');
assert.equal(unknown.sorted.value,'—');

const past=run('2026-11-24','2026-11-23');
assert.equal(past.municipal.status,'past');

const rollover=run('01.01','02.01');
assert.equal(rollover.municipal.value,'1. januára');
assert.equal(rollover.municipal.status,'future');

const fallback=wasteReadings(hass({'sensor.najblizsi_komunalni_odpad':sensor('2026-11-25')}),{},now);
assert.equal(fallback.municipal.status,'today');
assert.equal(fallback.sorted.status,'missing');

const custom=wasteReadings(hass({'sensor.custom_municipal':sensor('28.11.2026')}),{waste_municipal_entity:'sensor.custom_municipal'},now);
assert.equal(custom.municipal.value,'28. novembra');

const attribute=wasteReadings(hass({'sensor.najblizsi_triedeny_zber':{state:'unavailable',attributes:{next_date:'2026-12-02'}}}),{},now);
assert.equal(attribute.sorted.value,'2. decembra');

const bad=run('2026-02-30','2026-13-02');
assert.equal(bad.municipal.value,'2026-02-30');
assert.equal(bad.sorted.value,'2026-13-02');

console.log('Waste collection: 12 test scenarios passed');
