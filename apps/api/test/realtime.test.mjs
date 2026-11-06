import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {openStore} from '../src/store.mjs';
import {attachRealtime} from '../src/realtime.mjs';
class FakeServer extends EventEmitter{
 constructor(){super();this.clients=new Set();FakeServer.instance=this;}
 handleUpgrade(_req,_socket,_head,done){const ws=new EventEmitter();ws.sent=[];ws.readyState=1;ws.bufferedAmount=0;ws.send=body=>ws.sent.push(JSON.parse(body));ws.close=code=>{ws.code=code;};ws.terminate=()=>{ws.terminated=true;};ws.ping=()=>{};this.clients.add(ws);done(ws);}
 close(){}
}
test('WebSocket origin checks, read-only messages and bounded invalidations',async t=>{
 t.mock.timers.enable({apis:['setInterval']});
 const db=openStore(':memory:'),server=new EventEmitter();
 const stop=await attachRealtime({server,db,allowedOrigins:['http://127.0.0.1:3000'],WebSocketServerClass:FakeServer});
 try{
 const rejected={destroy(){this.destroyed=true;},write(){}};
 server.emit('upgrade',{url:'/v1/events',headers:{origin:'https://evil.invalid'}},rejected,Buffer.alloc(0));assert.equal(rejected.destroyed,true);assert.equal(FakeServer.instance.clients.size,0);
 server.emit('upgrade',{url:'/v1/events',headers:{origin:'http://127.0.0.1:3000'}},{},Buffer.alloc(0));
 const ws=[...FakeServer.instance.clients][0];assert.deepEqual(ws.sent[0],{type:'state_changed',revision:0});
 db.prepare('INSERT INTO observer_cursor VALUES (?,?,?)').run('test','1','hash');t.mock.timers.tick(1000);
 assert.deepEqual(ws.sent[1],{type:'state_changed',revision:1});assert.equal(JSON.stringify(ws.sent).includes('hash'),false);
 ws.emit('message',Buffer.from('{"approve":true}'));assert.equal(ws.code,1008);
 ws.bufferedAmount=70000;db.prepare('UPDATE observer_cursor SET block=?').run('2');t.mock.timers.tick(1000);assert.equal(ws.terminated,true);
 }finally{stop();db.close();t.mock.timers.reset();}
});
