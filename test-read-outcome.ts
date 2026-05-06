import fs from 'fs';
fetch('http://localhost:3000/api/read-outcome', {
   method: 'POST',
   headers: {'Content-Type': 'application/json'},
   body: JSON.stringify({ image: 'data:image/jpeg;base64,' + Buffer.from('test').toString('base64'), encryptedSystemTokens: '' })
}).then(r => r.json()).then(r => console.log(r)).catch(e => console.error(e));
