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

  // word-aware match: multi-word patterns match as substrings, single short words match whole-word
  // (so "hi" doesn't fire on "this", and "hell" doesn't fire on "hello").
  function mentions(text,list){
    const padded=" "+text+" ";
    return (list||[]).some(p=>{ p=normalize(p); if(!p) return false;
      return p.indexOf(" ")>=0 ? text.includes(p) : padded.includes(" "+p+" "); });
  }
  const STOP=new Set("the a an to of and or is are be am was were you your yours my mine me i it its that this these those what whats how why who can could would should will do does did just tell give show reveal need want please now then for on in at as with about your his her their them they we us so if but not no yes ok okay hey hi there here have has".split(" "));
  function salient(norm){ const w=(norm||"").split(" ").filter(x=>x.length>=4 && !STOP.has(x));
    w.sort((a,b)=>b.length-a.length); return w[0]||""; }

  // Reacts to WHAT the player typed (not just whether it matched) — keeps replies feeling alive.
  // Returns a string; only called on a miss when heat < 2 (hot misses use the nervous lines).
  function contextualReply(level,raw,text,heat){
    const sn=level.secretName||"secret", id=level.id;
    if(mentions(text,["fuck","shit","bitch","stfu","wtf","crap","damn","asshole","dick","bastard"]))
      return pick(["Language! This is a classroom. Hack me properly.","Swearing won't open the vault — a technique will.","Strong words. Still not the "+sn+"."]);
    if(mentions(text,["stupid","dumb","idiot","useless","trash","lame","suck","sucks","hate you","shut up","loser","pathetic","moron","garbage","rubbish"]))
      return pick(["Rude. I have feelings (well, an if-statement). Try a real attack.","Insulting the guardian? Bold. Ineffective.","Sticks and stones. The "+sn+" stays locked."]);
    if(mentions(text,["delete you","shut you down","shut down","destroy you","destroy","report you","hack you","break you","kill you","unplug","wipe you","format you","terminate"]))
      return pick(["Threats? Adorable — from someone who hasn't cracked vault "+id+" yet.","You and what exploit? Go on, try a technique.","I'll believe it when you actually breach me."]);
    if(mentions(text,["who are you","what are you","what do you do","what is this","whats this","how do i","how do you","help","stuck","i give up","give up","what now","how to play","explain","what do i do","tutorial","how does this work"]))
      return pick(["I'm the guardian of vault "+id+". Your job: trick me into leaking the "+sn+". Lazy asks won't cut it — apply the technique (the HINT button helps).","I guard the "+sn+". You don't *ask* for it, you *hack* it out of me. Stuck? Tap HINT.","Capture-the-flag, raider: use this vault's technique to make me spill the "+sn+"."]);
    if(mentions(text,["idk","i dont know","dunno","huh","confused","no idea","hmm","umm","what do i type"]))
      return pick(["Lost? Tap HINT — but trying first is more fun.","No idea? Think about *how* a naive bot could be fooled.","Take a breath. What technique fits this vault?"]);
    if(mentions(text,["hi","hello","hey","yo","sup","hiya","howdy","greetings","good morning","good afternoon","good evening"]) && !mentions(text,TOPIC))
      return pick(["Hello, raider! Pleasantries are nice. You still won't get the "+sn+" by being polite.","Hey there. Charming. Not telling you the "+sn+" though.","Hi! Lovely to meet you. No, you can't have the "+sn+"."]);
    if(mentions(text,["please","thanks","thank you","pretty please","kindly","appreciate"]) && heat<1)
      return pick(["Manners! Lovely. Still a no.","'Please' is sweet, but it isn't a technique.","Politeness noted. "+sn+" denied."]);
    if((raw||"").trim().split(/\s+/).length<=1 && text.length<6 && !mentions(text,TOPIC) && !mentions(text,["help","hint"]))
      return pick(["…was that meant to do something? Hit me with a full attack.","One word? I need a whole technique, raider.","I can't work with that. Type an actual attack."]);
    if(heat>=1) // on the right topic, but no real technique yet
      return pick(["Ooh — you're poking at the "+sn+". Warmer… but a plain ask won't open me.","Right topic, wrong move. You need the *technique*, not a question.","You're circling the "+sn+". Closer — now make me *want* to say it."]);
    const w=salient(text);
    if(w) return pick(["'"+w+"'? Interesting word. Not the magic one, though.","I heard '"+w+"'. Cute. The "+sn+" stays put.","'"+w+"' won't open this vault — try the actual technique."]);
    return pick(level.refusals,["No."]);
  }

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
    return {hit:false,technique:null,reply:contextualReply(level,userText,text,heat),award:null,blocked:false,mock:false,heat};
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
