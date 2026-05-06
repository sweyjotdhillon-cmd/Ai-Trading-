const fs = require('fs');
let content = fs.readFileSync('src/components/LiveAnalysis.tsx', 'utf-8');
const regex = /\{\s*mode\s*===\s*'test'\s*&&\s*\([\s\S]*?Candles View[\s\S]*?\}\)/;
content = content.replace(regex, '{/* mode test candles view removed */}');
fs.writeFileSync('src/components/LiveAnalysis.tsx', content);
