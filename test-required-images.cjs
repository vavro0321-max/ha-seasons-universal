'use strict';
const fs=require('fs');
const path=require('path');
const REQUIRED=[
 'dist/assets/universal-landscape-spring.webp',
 'dist/assets/universal-landscape-summer.webp',
 'dist/assets/universal-landscape-autumn.webp',
 'dist/assets/universal-landscape-winter.webp',
 'dist/assets/universal-landscape-winter-dry.webp'
];
let invalid=false;
for(const f of REQUIRED){
  if(!fs.existsSync(f)){
    console.error('::error file='+f+'::MISSING REQUIRED V1.6 LANDSCAPE. Upload both WebP files from the V1.6 images ZIP.');
    invalid=true;continue;
  }
  const b=fs.readFileSync(f);
  const riff=b.length>=30&&b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP';
  if(!riff||b.length<45000){console.error('::error file='+f+'::Not a valid, non-empty WebP landscape');invalid=true;continue;}
  let width,height;
  const format=b.toString('ascii',12,16);
  if(format==='VP8 '&&b.subarray(23,26).equals(Buffer.from([0x9d,0x01,0x2a]))){
    width=b.readUInt16LE(26)&0x3fff;height=b.readUInt16LE(28)&0x3fff;
  }else if(format==='VP8X'){
    width=1+b[24]+(b[25]<<8)+(b[26]<<16);
    height=1+b[27]+(b[28]<<8)+(b[29]<<16);
  }else{
    console.error('::error file='+f+'::Unsupported/invalid WebP bitstream '+format);invalid=true;continue;
  }
  if(width!==1536||height!==864){
    console.error('::error file='+f+'::Expected 1536x864, got '+width+'x'+height);
    invalid=true;
  }else console.log('OK '+f+' '+width+'x'+height+' '+b.length+' bytes');
}
if(invalid){
 console.error('V1.6 JavaScript tests can pass even if image files are missing. The dashboard will show old fallbacks until all 5 seasonal images are uploaded.');
 process.exitCode=1;
}else console.log('PASS all 5 V1.6 photographic backgrounds present; visual appearance still needs human inspection.');
