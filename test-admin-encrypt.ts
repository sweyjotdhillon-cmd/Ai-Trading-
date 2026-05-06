import fetch from 'node-fetch';

fetch('http://localhost:3000/api/admin/secrets/encrypt', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer asdf'
  },
  body: JSON.stringify({ tokens: ['test'] })
}).then(res => res.text()).then(console.log).catch(console.error);
