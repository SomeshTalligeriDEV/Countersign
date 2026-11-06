import {test} from 'node:test';import assert from 'node:assert/strict';
import {clientIp} from '../src/client-ip.mjs';
test('forwarded client IP is honoured only from TRUSTED_PROXY_IPS and only when valid',()=>{
 assert.equal(clientIp('10.0.0.5','203.0.113.7','10.0.0.5, 10.0.0.6'),'203.0.113.7');
 assert.equal(clientIp('10.0.0.6','2001:db8::1','10.0.0.5,10.0.0.6'),'2001:db8::1');
 assert.equal(clientIp('198.51.100.9','203.0.113.7','10.0.0.5'),'198.51.100.9');
 assert.equal(clientIp('10.0.0.5','203.0.113.7',''),'10.0.0.5');
 assert.equal(clientIp('10.0.0.5','203.0.113.7',undefined),'10.0.0.5');
 for(const bad of ['', 'not-an-ip', '1.2.3.4, 5.6.7.8', '999.1.1.1', undefined])assert.equal(clientIp('10.0.0.5',bad,'10.0.0.5'),'10.0.0.5');
});
