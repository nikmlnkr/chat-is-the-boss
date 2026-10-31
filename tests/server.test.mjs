import test from 'node:test';import assert from 'node:assert/strict';
const base=process.env.TEST_URL||'http://localhost:4328';
test('serves game and safe configuration status',async()=>{let r=await fetch(base);assert.equal(r.status,200);assert.match(await r.text(),/Chat is the boss/);r=await fetch(base+'/api/status');let s=await r.json();assert.equal(typeof s.connected,'boolean');assert.equal('token'in s,false);assert.equal('secret'in s,false)});
test('rejects cross origin access and invalid OAuth state',async()=>{assert.equal((await fetch(base+'/api/status',{headers:{Origin:'https://evil.example'}})).status,403);assert.equal((await fetch(base+'/auth/callback?state=invalid&code=fake')).status,400)});
test('does not expose secrets or filesystem',async()=>{for(const path of ['/.env','/server.mjs','/../HACKATHON_CONTEXT.md'])assert.equal((await fetch(base+path)).status,404);assert.equal((await fetch(base,{method:'POST'})).status,405)});

test('public game accepts external navigation but API stays same-origin',async()=>{assert.equal((await fetch(base,{headers:{'Sec-Fetch-Site':'cross-site'}})).status,200);assert.equal((await fetch(base+'/api/status',{headers:{'Sec-Fetch-Site':'cross-site'}})).status,403)});
