import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root=new URL('../',import.meta.url);
const read=name=>JSON.parse(readFileSync(new URL(`data/${name}`,root),'utf8'));
const products=read('catalog.json');
const original=read('catalog-source.json');
const additions=read('catalog-additions.json');
const photos=read('photo-overrides.json');
const links=read('catalog-link-overrides.json');
const linkAudit=read('catalog-link-audit.json');
const audit=read('catalog-source-audit.json');

test('catalog expansion preserves every existing configuration and photo reference',()=>{
  assert.equal(original.length,131);
  // Git may check out CRLF on Windows; only line-ending conversion is ignored.
  const source=readFileSync(new URL('data/catalog-source.json',root),'utf8').replace(/\r\n/g,'\n');
  assert.equal(createHash('sha256').update(source).digest('hex'),'db0289500cabf3ab36847efaec64046b285ea96373b1080f73494d4cd879cf42');
  for(const p of original){
    const generated=products.find(row=>row.id===p.id);
    assert.ok(generated,p.id);
    assert.equal(generated.name,p.name);
    assert.equal(generated.sourceURL,new URL(p.sourceURL).href);
    assert.equal(generated.priceUSD,p.priceUSD??null);
    assert.equal(generated.weightGrams,photos[p.id]?.weightGrams??p.weightGrams??null);
    assert.equal(generated.photo?.url,(photos[p.id]?.photo||links[p.id]?.photo)?.url);
    for(const tag of p.tags)assert.ok(generated.tags.includes(tag),`${p.id}: ${tag}`);
  }
});

test('new products have unique direct manufacturer links and audited real images',()=>{
  assert.equal(additions.length,40);
  assert.equal(products.length,original.length+additions.length);
  assert.equal(new Set(products.map(p=>p.id)).size,products.length);
  assert.equal(new Set(additions.map(p=>p.sourceURL)).size,additions.length);
  for(const p of additions){
    const source=new URL(p.sourceURL);
    assert.equal(source.protocol,'https:');
    assert.match(source.pathname,/^\/products\/[^/]+$/);
    assert.equal(p.purchaseURL,p.sourceURL);
    assert.equal(p.photo.sourceURL,p.sourceURL);
    assert.equal(p.photo.rights,'reference-preview');
    assert.equal(new URL(p.photo.url).protocol,'https:');
    const check=audit.products.find(row=>row.url===p.sourceURL);
    assert.ok(check,`Missing audit for ${p.id}`);
    assert.equal(check.error,undefined);
    assert.equal(check.imageURL,p.photo.url);
    assert.match(check.imageMime,/^image\//);
    assert.ok(check.imageBytes>1000);
  }
});

test('unverified variant specifications stay unknown instead of becoming zero or verified',()=>{
  for(const p of additions){
    assert.equal(p.weightGrams,null);
    assert.equal(p.priceUSD,null);
    assert.equal(p.weightCheckedAt,'');
    assert.equal(p.priceCheckedAt,'');
    assert.equal(p.reviewStatus,'legacy-reference');
    assert.match(p.variant,/Choose/);
  }
});

test('catalog covers all requested activities and both powersports and 4x4 discovery',()=>{
  for(const tag of ['hiking','backpacking','hunting','camping','off-road','atv','utv','4x4']){
    assert.ok(additions.some(p=>p.tags.includes(tag)),tag);
  }
  for(const category of ['Recovery & towing','Tools & tires','Vehicle storage','Riding protection']){
    assert.ok(additions.some(p=>p.category===category),category);
  }
  assert.ok(products.filter(p=>p.photo).length>=129);
  for(const p of additions.filter(p=>p.tags.includes('off-road'))){
    assert.match(p.note,/not fitment certification/);
  }
});

test('legacy homepage repairs retain original identity while linking audited product pages',()=>{
  assert.equal(Object.keys(links).length,42);
  assert.equal(Object.values(links).filter(p=>p.photo).length,26);
  for(const [id,link] of Object.entries(links)){
    const p=products.find(row=>row.id===id);
    assert.ok(p,id);
    assert.equal(p.purchaseURL,link.purchaseURL);
    assert.notEqual(new URL(p.purchaseURL).pathname,'/');
    const audits=linkAudit.products.filter(row=>row.id===id&&!row.error);
    assert.ok(audits.some(row=>row.resolvedURL===link.purchaseURL),`Missing successful audit for ${id}`);
    if(link.photo){
      const check=audits.find(row=>row.imageURL===link.photo.url);
      assert.ok(check,`Missing verified photo for ${id}`);
      assert.match(check.imageMime,/^image\//);
      assert.ok(check.imageBytes>1000);
    }
  }
});

test('install-time catalog regeneration retains additions and is deterministic',()=>{
  const before=readFileSync(new URL('data/catalog.json',root),'utf8');
  execFileSync(process.execPath,[fileURLToPath(new URL('scripts/import-catalog.mjs',root))],{stdio:'pipe'});
  assert.equal(readFileSync(new URL('data/catalog.json',root),'utf8'),before);
});
