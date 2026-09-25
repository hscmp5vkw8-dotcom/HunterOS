import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, newGear, validateWorkspace } from '../src/domain.ts';
import { readCloudBackup, restoreUnchanged } from '../src/cloud-data.ts';
import { foodBarcode } from '../src/identifier.ts';
const scan=()=>({id:'scan-1',code:'12345678',codeType:'ean8',firstScannedAt:'2026-09-25T01:00:00Z',lastScannedAt:'2026-09-25T01:00:00Z',scanCount:1,product:null});
test('0.1.2 workspaces upgrade without dropping local gear or favorites',()=>{
 const old={...fresh(),gear:[newGear('Keep this pack')],favorites:['old-product']};delete old.scannedProducts;
 const next=validateWorkspace(old);assert.equal(next.gear[0].name,'Keep this pack');assert.deepEqual(next.favorites,old.favorites);assert.deepEqual(next.scannedProducts,[]);
});
test('scan history round trips and invalid histories never silently truncate',()=>{
 const state={...fresh(),scannedProducts:[scan()]};assert.deepEqual(validateWorkspace(state),state);
 for(const value of [null,{},[...Array(10001)].map(scan)])assert.throws(()=>validateWorkspace({...fresh(),scannedProducts:value}));
 for(const patch of [{scanCount:1.5},{id:''},{code:' '},{firstScannedAt:'bad'},{lastScannedAt:'2020-01-01'}])assert.throws(()=>validateWorkspace({...state,scannedProducts:[{...scan(),...patch}]}));
 assert.throws(()=>validateWorkspace({...state,scannedProducts:[scan(),{...scan(),id:'scan-2'}]}));
});
test('invalid cloud response cannot replace a local workspace',()=>{
 assert.equal(readCloudBackup(null),null);
 for(const value of [{},undefined,{workspace:fresh(),updated_at:'bad'},{workspace:{},updated_at:'2026-09-25T01:00:00Z'}])assert.throws(()=>readCloudBackup(value));
 const backup={workspace:fresh(),updated_at:'2026-09-25T01:00:00Z'};assert.deepEqual(readCloudBackup(backup),backup);
});
test('restore protects edits made while a cloud request or confirmation is open',()=>{
 const local=fresh(), before=JSON.stringify(local), remote={...fresh(),gear:[newGear('Cloud pack')]};
 assert.equal(restoreUnchanged(local,before,remote).gear[0].name,'Cloud pack');
 local.gear.push(newGear('New local edit'));assert.throws(()=>restoreUnchanged(local,before,remote),/changed/);assert.equal(local.gear[0].name,'New local edit');
});
test('food lookup never transmits QR links or arbitrary mixed SKU contents',()=>{
 for(const value of ['12345678','012345678901','0123456789012','01234567890123'])assert.equal(foodBarcode(value),value);
 for(const value of ['SKU12345678','https://example.com/12345678','123456789','12345678901','1234-5678',''])assert.equal(foodBarcode(value),null);
});
