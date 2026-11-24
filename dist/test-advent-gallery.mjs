import assert from 'node:assert/strict';
import {holidayForDate} from './holiday-engine.mjs';
const day=s=>new Date(s+'T12:00:00Z');
for(const [date,expected] of [['2026-11-28',0],['2026-11-29',1],['2026-12-05',1],['2026-12-06',2],['2026-12-13',3],['2026-12-20',4],['2026-12-24',4]]){
  assert.equal(holidayForDate(day(date)).candles,expected,date);
}
assert.equal(holidayForDate(day('2026-12-20'),undefined,{holidays_enabled:false}).candles,0);
console.log('PASS: photographic Advent photo selector 0–4 on real dates');
