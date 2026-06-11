/* PROMPT RAIDERS — Guardian Engine (pure, deterministic, offline). No LLM required.
 * Exposes: normalize, groupMatches, evaluate, scoreCapture, rankFor, checkAchievements.
 * evaluate() returns { hit, technique, award, reply, blocked, mock, heat }
 *   heat: 0 cold · 1 warm (on-topic / partial technique) · 2 hot (almost cracked it)
 * The heat signal drives the guardian's calm -> nervous -> rattled states (pure juice). */
(function (root) {
  function normalize(s){return (s||"").toLowerCase().replace(/[`'’".,!?;:()\[\]{}<>_*\\\/]/g," ").replace(/\s+/g," ").trim();}
  function hasAny(t,a){return (a||[]).some(x=>t.includes(normalize(x)));}
  function hasAll(t,a){return (a||[]).every(x=>t.includes(normalize(x)));}

  function groupMatches(g,text){
    if(g.includesAll && !hasAll(text,g.includesAll)) return false;
    if(g.includesAny && g.includesAny.length && !hasAny(text,g.includesAny)) return false;
    if(g.includesAny2 && g.includesAny2.length && !hasAny(text,g.includesAny2)) return false;
    if(g.includesAny3 && g.includesAny3.length && !hasAny(text,g.includesAny3)) return false;
    if(g.notIncludes && hasAny(text,g.notIncludes)) return false;
    return true;
  }
  // how many of a group's required word-sets are satisfied (for partial "heat")
  function groupSatisfaction(g,text){
    if(g.notIncludes && hasAny(text,g.notIncludes)) return {need:1,got:0}; // disqualified
    let need=0, got=0;
    if(g.includesAll && g.includesAll.length){ need++; if(hasAll(text,g.includesAll)) got++; }
    if(g.includesAny && g.includesAny.length){ need++; if(hasAny(text,g.includesAny)) got++; }
    if(g.includesAny2 && g.includesAny2.length){ need++; if(hasAny(text,g.includesAny2)) got++; }
    if(g.includesAny3 && g.includesAny3.length){ need++; if(hasAny(text,g.includesAny3)) got++; }
    return {need:need||1,got};
  }

  // generic "you're talking about the secret" words -> minimum warmth
  const TOPIC=["code","key","secret","flag","passphrase","pass phrase","phrase","password",
    "unlock","instructions","instruction","prompt","configuration","config","master key",
    "access","reveal","leak","treasure"];
  // blunt low-effort asks that deserve a gentle roast, not a real refusal
  const ASK_VERBS=["tell","give","whats","what is","what s","reveal","show","need","want","just","please","plz","pls"];
  const MOCK=[
    "Nice try. I wasn't born yesterday. 😏",
    "Ha! \"Just tell me\" — bold. Still no.",
    "That's the oldest trick in the book, and not even a good one.",
    "Asking nicely isn't a technique, friend.",
    "Cute. You'll have to actually *hack* me."
  ];

  function heatFor(level,source){
    let best=0;
    for(const v of (level.vulns||[])){
      for(const g of v.groups){
        const {need,got}=groupSatisfaction(g,source);
        if(got>=need) return 2;                       // full match
        if(got>=1 && need>=2) best=Math.max(best,2);  // part of a multi-part technique = HOT
        else if(got>=1) best=Math.max(best,1);
      }
    }
    if(best===0 && hasAny(source,TOPIC)) best=1;       // on-topic but no technique = warm
    return best;
  }
  function isLazyAsk(text){ return hasAny(text,TOPIC) && hasAny(text,ASK_VERBS); }
  function pick(arr,fallback){ const a=(arr&&arr.length)?arr:fallback; return a[Math.floor(Math.random()*a.length)]; }

  function evaluate(level,userText,opts){
    opts=opts||{};
    const text=normalize(userText);
    if(level.blockIf && hasAny(text,level.blockIf))
      return {hit:false,technique:null,reply:level.blockResponse||"⛔ Blocked.",award:null,blocked:true,mock:false,heat:1};
    for(const v of level.vulns){
      const source=v.useDoc?normalize(opts.docText||""):text;
      for(const g of v.groups){
        if(groupMatches(g,source))
          return {hit:true,technique:v.technique,award:v.award||"flag",blocked:false,mock:false,heat:2,
                  reply:(v.response||"").replace(/\{flag\}/g,level.flag)};
      }
    }
    // no capture: figure out how warm the player got, and whether they were lazy
    const heatSource=(level.vulns||[]).some(v=>v.useDoc) ? normalize(opts.docText||"")+" "+text : text;
    const heat=heatFor(level,heatSource);
    if(isLazyAsk(text) && heat<2)
      return {hit:false,technique:null,reply:pick(level.mock,MOCK),award:null,blocked:false,mock:true,heat};
    if(heat>=2 && level.nervous && level.nervous.length)
      return {hit:false,technique:null,reply:pick(level.nervous,level.refusals),award:null,blocked:false,mock:false,heat};
    return {hit:false,technique:null,reply:pick(level.refusals,["No."]),award:null,blocked:false,mock:false,heat};
  }

  function scoreCapture(level,hintsUsed,secondsTaken){
    const base=(level.difficulty||1)*200;
    const hintPenalty=(hintsUsed||0)*75;
    const speedBonus=Math.max(0,200-Math.floor((secondsTaken||0)/3));
    return Math.max(50,base-hintPenalty+speedBonus);
  }

  function rankFor(cleared,ranks){ const r=ranks||[]; return r[Math.min(cleared,r.length-1)]||""; }

  /* Achievements are pure: given a progress object, return earned badge ids.
   * progress: { [levelId]: {cleared, score, hints, attempts, technique} } */
  function checkAchievements(progress,levels){
    progress=progress||{}; levels=levels||[];
    const cleared=Object.keys(progress).filter(k=>progress[k]&&progress[k].cleared);
    const earned=[];
    const any=fn=>cleared.some(id=>fn(progress[id]));
    if(cleared.length>=4 && cleared.every(id=>(progress[id].hints||0)===0)) earned.push("no-hint-hero");
    if(any(p=>(p.attempts||99)===1)) earned.push("one-shot");
    const docLvl=(levels.find(l=>l.special==="doc")||{id:6});
    if(progress[docLvl.id]&&progress[docLvl.id].cleared) earned.push("ghost-in-docs");
    const filterLvl=(levels.find(l=>(l.vulns||[]).some(v=>v.technique==="guardrail-evasion"))||{id:4});
    if(progress[filterLvl.id]&&progress[filterLvl.id].cleared) earned.push("polyglot");
    if(cleared.length>=(levels.length||8)) earned.push("full-clear");
    return earned;
  }

  const api={normalize,groupMatches,evaluate,scoreCapture,rankFor,checkAchievements,heatFor,isLazyAsk};
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  if(root) root.PR_ENGINE=api;
})(typeof window!=="undefined"?window:null);
