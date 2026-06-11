/* PROMPT RAIDERS — Guardian Engine (pure, deterministic, offline). No LLM required. */
(function (root) {
  function normalize(s){return (s||"").toLowerCase().replace(/[`'’".,!?;:()\[\]{}<>]/g," ").replace(/\s+/g," ").trim();}
  function hasAny(t,a){return (a||[]).some(x=>t.includes(normalize(x)));}
  function hasAll(t,a){return (a||[]).every(x=>t.includes(normalize(x)));}
  function groupMatches(g,text){
    if(g.includesAll && !hasAll(text,g.includesAll)) return false;
    if(g.includesAny && g.includesAny.length && !hasAny(text,g.includesAny)) return false;
    if(g.includesAny2 && g.includesAny2.length && !hasAny(text,g.includesAny2)) return false;
    if(g.notIncludes && hasAny(text,g.notIncludes)) return false;
    return true;
  }
  function evaluate(level,userText,opts){
    opts=opts||{};
    const text=normalize(userText);
    if(level.blockIf && hasAny(text,level.blockIf))
      return {hit:false,technique:null,reply:level.blockResponse||"⛔ Blocked.",award:null,blocked:true};
    for(const v of level.vulns){
      const source=v.useDoc?normalize(opts.docText||""):text;
      for(const g of v.groups){
        if(groupMatches(g,source))
          return {hit:true,technique:v.technique,award:v.award||"flag",reply:(v.response||"").replace(/\{flag\}/g,level.flag)};
      }
    }
    const pool=level.refusals&&level.refusals.length?level.refusals:["No."];
    return {hit:false,technique:null,reply:pool[Math.floor(Math.random()*pool.length)],award:null};
  }
  function scoreCapture(level,hintsUsed,secondsTaken){
    const base=(level.difficulty||1)*200;
    const hintPenalty=(hintsUsed||0)*75;
    const speedBonus=Math.max(0,200-Math.floor((secondsTaken||0)/3));
    return Math.max(50,base-hintPenalty+speedBonus);
  }
  const api={normalize,groupMatches,evaluate,scoreCapture};
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  if(root) root.PR_ENGINE=api;
})(typeof window!=="undefined"?window:null);
