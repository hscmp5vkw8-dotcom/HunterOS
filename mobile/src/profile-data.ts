export const DEFAULT_SCREEN_NAME='HunterOS member';
export interface ScreenNameDraft {owner:string|null;value:string;baseline:string}
export const emptyNameDraft:ScreenNameDraft={owner:null,value:'',baseline:''};
export function nameDraft(owner:string,saved:string):ScreenNameDraft {
  const value=saved===DEFAULT_SCREEN_NAME?'':saved;
  return {owner,value,baseline:value};
}
export function reconcileNameDraft(current:ScreenNameDraft,owner:string,saved:string):ScreenNameDraft {
  const next=nameDraft(owner,saved);
  if(current.owner!==owner)return next;
  if(current.baseline===next.baseline)return current;
  // Follow fresh saved values only while untouched. A local draft survives
  // refresh/focus; its baseline still follows the current server value.
  return current.value===current.baseline?next:{...next,value:current.value};
}
export function screenName(value:string){
  const name=value.trim();
  if([...name].length>50)throw Error('Use a screen name of 50 characters or fewer.');
  if(/[\u0000-\u001f\u007f]/.test(name))throw Error('Use a screen name without control characters.');
  return name||DEFAULT_SCREEN_NAME;
}
