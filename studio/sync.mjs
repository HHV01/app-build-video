// Three-way merge: retain disjoint edits, refuse overwriting the same field.
export function mergeState(base, local, remote) {
  const conflicts=[];
  const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const clone=v=>v===undefined?undefined:structuredClone(v);
  function merge(b,l,r,p) {
    if(p==='revision')return r;
    if(equal(l,b))return clone(r);
    if(equal(r,b)||equal(l,r))return clone(l);
    if([b,l,r].every(v=>Array.isArray(v)&&v.every(x=>x&&typeof x==='object'&&typeof x.id==='string'))){
      const maps=[b,l,r].map(a=>new Map(a.map(x=>[x.id,x])));
      return [...new Set([...r,...l,...b].map(x=>x.id))].map(id=>merge(maps[0].get(id),maps[1].get(id),maps[2].get(id),`${p}[${id}]`)).filter(x=>x!==undefined);
    }
    if([b,l,r].every(v=>v&&typeof v==='object'&&!Array.isArray(v))){
      const out={};for(const k of new Set([...Object.keys(b),...Object.keys(l),...Object.keys(r)])){const v=merge(b[k],l[k],r[k],p?`${p}.${k}`:k);if(v!==undefined)out[k]=v;}return out;
    }
    conflicts.push(p);return clone(l);
  }
  return {state:merge(base,local,remote,''),conflicts};
}
