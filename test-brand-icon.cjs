'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const icon='dist/assets/app-icon.webp';
const data=fs.readFileSync(icon);
assert(data.length>=1500&&data.length<=50000,'Optimized icon should be small, readable and complete');
assert.equal(data.toString('ascii',0,4),'RIFF','WebP RIFF header');
assert.equal(data.toString('ascii',8,12),'WEBP','Valid WebP image');
const source=fs.readFileSync('dist/ha-seasons-universal.js','utf8');
assert(source.includes("const VERSION='1.12.6'"),'Icon release is versioned');
assert(source.includes('class="brand-icon"'), 'Editor contains the approved icon');
assert(source.includes('app-icon.webp?v=${VERSION}'), 'Icon URL follows HACS asset path and cache version');
for(const page of ['dist/TEST.html','dist/ADVENT-TEST.html']){
  assert(fs.readFileSync(page,'utf8').includes('href="./assets/app-icon.webp"'),
    'Demo page favicon must use same app icon: '+page);
}
assert(fs.readFileSync('README.md','utf8').includes('dist/assets/app-icon.webp'),
  'Repository page must display branded icon');
console.log('PASS: approved WebP icon is real, optimized and referenced in editor, README and both demos');
