import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_SCREEN_NAME,emptyNameDraft,nameDraft,reconcileNameDraft,screenName} from '../src/profile-data.ts';

test('untouched screen name follows refreshed saved values, including the neutral optional name',()=>{
  assert.deepEqual(reconcileNameDraft(nameDraft('alice','Old name'),'alice','New name'),nameDraft('alice','New name'));
  assert.deepEqual(reconcileNameDraft(nameDraft('alice','Old name'),'alice',DEFAULT_SCREEN_NAME),nameDraft('alice',DEFAULT_SCREEN_NAME));
  const unchanged=nameDraft('alice','Saved');assert.equal(reconcileNameDraft(unchanged,'alice','Saved'),unchanged);
});
test('an intentional unsaved screen name survives refresh and returns to following after save',()=>{
  const draft={...nameDraft('alice','Old name'),value:'My draft'};
  const refreshed=reconcileNameDraft(draft,'alice','Changed in Friends');
  assert.deepEqual(refreshed,{owner:'alice',value:'My draft',baseline:'Changed in Friends'});
  assert.deepEqual(reconcileNameDraft(nameDraft('alice','My draft'),'alice','Later edit'),nameDraft('alice','Later edit'));
});
test('screen name drafts never carry between accounts',()=>{
  assert.deepEqual(reconcileNameDraft({...nameDraft('alice','Saved'),value:'Private draft'},'bob','Bob'),nameDraft('bob','Bob'));
  assert.deepEqual(reconcileNameDraft(emptyNameDraft,'alice','Saved'),nameDraft('alice','Saved'));
});

test('optional screen names preserve the existing generic name and reject invalid edits',()=>{
  assert.equal(screenName('  '),DEFAULT_SCREEN_NAME);
  assert.equal(screenName('  Trail Jacob  '),'Trail Jacob');
  assert.throws(()=>screenName('x'.repeat(51)),/50 characters/);
  assert.throws(()=>screenName('Jacob\nAdmin'),/control characters/);
});
