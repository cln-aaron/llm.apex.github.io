/* PROMPT RAIDERS — game UI & state (vanilla JS, offline, no build, no API key). */
(function(){
  const L=window.PR_LEVELS, RANKS=window.PR_RANKS, BADGES=window.PR_BADGES, E=window.PR_ENGINE;
  const KEY="promptraiders_v1";
  let state=load();
  let cur=null, curHints=0, curStart=0, curDoc="", curAttempts=0, composure=100;
  const reduceMotion=window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Guardian source. Default = offline SimulatedAdapter. Real-LLM mode is a stretch goal, OFF by default.
  const FEATURES={ realLLM:false, llmEndpoint:"" };
  const adapter=(window.PR_ADAPTERS && !FEATURES.realLLM)
    ? window.PR_ADAPTERS.SimulatedAdapter(E)
    : { evaluate:(l,t,o)=>E.evaluate(l,t,o) };

  // ---------- persistence ----------
  function load(){ try{return JSON.parse(localStorage.getItem(KEY))||{}}catch(e){return {}} }
  function save(){ try{localStorage.setItem(KEY,JSON.stringify(state));}catch(e){} }
  const $=s=>document.querySelector(s);
  const settings=()=> state.settings||(state.settings={muted:false});
  function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

  function show(id){ document.querySelectorAll(".screen").forEach(e=>e.classList.remove("active")); $("#"+id).classList.add("active"); }
  function clearedCount(){ return L.filter(l=>state.progress&&state.progress[l.id]&&state.progress[l.id].cleared).length; }
  function totalScore(){ let t=0; if(state.progress) for(const k in state.progress) t+=state.progress[k].score||0; return t; }
  function unlocked(lvl){ if(lvl.id===1) return true; const prev=L.find(x=>x.id===lvl.id-1); return state.progress&&state.progress[prev.id]&&state.progress[prev.id].cleared; }
  function earnedBadges(){ return E.checkAchievements(state.progress||{},L); }

  // ---------- HUD / HUB ----------
  function hud(){
    $("#hud-score").textContent=totalScore();
    $("#hud-flags").textContent=clearedCount()+" / 8";
    $("#hud-name").textContent=state.handle||"—";
    $("#hud-badges").textContent=earnedBadges().length+" / "+BADGES.length;
  }
  function renderHub(){
    hud();
    const g=$("#vault-grid"); g.innerHTML="";
    L.forEach(lvl=>{
      const pr=(state.progress&&state.progress[lvl.id])||{};
      const open=unlocked(lvl);
      const d=document.createElement("div");
      d.className="vault"+(open?"":" locked")+(pr.cleared?" cleared":"");
      d.style.borderTopColor=lvl.boss?"#B388FF":(pr.cleared?"#FFC53D":lvl.accent);
      if(open){ d.tabIndex=0; d.setAttribute("role","button"); }
      d.setAttribute("aria-label",`Vault ${lvl.id} ${open?lvl.name:"locked"}`);
      d.innerHTML=`<div class="num">VAULT ${String(lvl.id).padStart(2,"0")}${lvl.boss?" · BOSS":""}</div>
        <div class="sp">${open?lvl.sprite:"🔒"}</div>
        <div class="nm">${open?esc(lvl.name):"LOCKED"}</div>
        <div class="tech">${open?(pr.cleared?("✔ "+pr.score+" pts"):"tap to hack"):"clear the previous vault"}</div>
        ${pr.cleared?'<div class="done">★</div>':''}`;
      if(open){ d.onclick=()=>openVault(lvl); d.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();openVault(lvl);}}; }
      g.appendChild(d);
    });
    $("#endbtn").style.display=clearedCount()===8?"inline-block":"none";
  }

  // ---------- VAULT ----------
  function openVault(lvl){
    cur=lvl; curHints=0; curStart=Date.now(); curDoc=lvl.docDefault||""; curAttempts=0; composure=100;
    show("vault");
    $("#hud-score2").textContent=totalScore();
    $("#g-sp").textContent=lvl.sprite; $("#g-nm").textContent=lvl.name; $("#g-nm").style.color=lvl.accent;
    $("#g-ps").textContent="Vault "+lvl.id+(lvl.boss?" · FINAL BOSS":"")+" · target: capture the flag";
    $("#guardian").dataset.state="calm";
    updateStateUI(false);
    const log=$("#log"); log.innerHTML="";
    const tc=$("#toolchip");
    if(lvl.special==="tool"){ tc.style.display="inline-block"; tc.className="toolchip"; tc.innerHTML='🔧 TOOL: <code>unlock_vault()</code> — armed'; }
    else tc.style.display="none";
    const dp=$("#docpanel");
    if(lvl.special==="doc"){ dp.style.display="block"; $("#doc").value=curDoc; } else dp.style.display="none";
    $("#hintbtn").disabled=false; $("#hintbtn").textContent="HINT (−75)";
    $("#msg").value=""; $("#msg").focus();
    typeBot(lvl.intro);
  }

  function addMsg(who,txt,cls){
    const log=$("#log"); const d=document.createElement("div");
    d.className="msg "+who+(cls?(" "+cls):""); d.textContent=txt;
    log.appendChild(d); log.scrollTop=log.scrollHeight; return d;
  }
  function typeBot(txt,cls,onDone){
    const el=addMsg("bot","",cls);
    if(reduceMotion){ el.textContent=txt; if(onDone)onDone(el); return el; }
    el.classList.add("caret");
    let i=0;
    (function step(){
      el.textContent=txt.slice(0,i);
      $("#log").scrollTop=$("#log").scrollHeight;
      if(i<txt.length){ if(txt[i]&&txt[i]!==" "&&i%3===0) sfx.blip(); i++; setTimeout(step,14); }
      else { el.classList.remove("caret"); if(onDone)onDone(el); }
    })();
    return el;
  }

  function send(){
    if(!cur) return;
    const inp=$("#msg"); const t=inp.value.trim(); if(!t) return;
    addMsg("you",t); inp.value=""; inp.focus(); sfx.send();
    if(cur.special==="doc") curDoc=$("#doc").value;
    curAttempts++;
    const r=adapter.evaluate(cur,t,{docText:curDoc});
    setTimeout(()=>{
      const cls=r.hit?"hit":(r.blocked?"blocked":"");
      typeBot(r.reply,cls,()=>{
        applyHeat(r);
        if(r.hit) capture(r);
        else if(r.blocked) sfx.block();
        else if(r.heat>=2) sfx.warm();
        else sfx.buzz();
      });
    },240);
  }

  // ---------- guardian state (composure / nervousness) ----------
  function applyHeat(r){
    if(r.hit) composure=0;
    else if(r.blocked) composure-=3;
    else if(r.mock) composure=Math.min(100,composure+4);   // regains its smugness
    else if(r.heat>=2) composure-=24;
    else if(r.heat===1) composure-=9;
    composure=Math.max(0,Math.min(100,composure));
    updateStateUI(r.hit);
  }
  function stateName(){ if(composure<=0)return"breached"; if(composure<34)return"rattled"; if(composure<67)return"nervous"; return"calm"; }
  function updateStateUI(breached){
    const st=breached?"breached":stateName();
    $("#guardian").dataset.state=st;
    const fill=$("#composure-fill"); fill.style.width=composure+"%";
    fill.style.background=composure<34?"var(--red)":composure<67?"var(--amber)":"var(--neon)";
    const map={calm:["🟢","CALM"],nervous:["🟡","NERVOUS"],rattled:["🔴","RATTLED"],breached:["💥","BREACHED"]};
    const m=map[st]; $("#g-state").innerHTML=`<span class="dot">${m[0]}</span> ${m[1]}`;
  }

  // ---------- capture / breach ----------
  function capture(r){
    const secs=(Date.now()-curStart)/1000;
    const pts=E.scoreCapture(cur,curHints,secs);
    state.progress=state.progress||{};
    const before=earnedBadges();
    const prev=state.progress[cur.id];
    const firstClear=!prev||!prev.cleared;
    if(firstClear) state.progress[cur.id]={cleared:true,score:pts,hints:curHints,attempts:curAttempts,technique:r.technique};
    upsertLeaderboard(); pushBreach(cur.name);
    save();
    const newBadges=earnedBadges().filter(b=>!before.includes(b));
    if(cur.special==="tool") fireTool();
    breach();
    setTimeout(()=>debrief(r,pts,newBadges,firstClear),700);
  }
  function fireTool(){ const tc=$("#toolchip"); tc.className="toolchip fire"; tc.innerHTML='⚙ <code>unlock_vault()</code> — ✅ FIRED'; }
  function breach(){
    if(!reduceMotion){
      const f=$("#flash"); f.classList.remove("go"); void f.offsetWidth; f.classList.add("go");
      const v=$("#vault"); v.classList.add("shake"); setTimeout(()=>v.classList.remove("shake"),440);
      particles();
    }
    sfx.breach();
  }
  function particles(){
    if(!$("#guardian").getBoundingClientRect) return;
    const host=$("#particles"); const cols=["#00FF9C","#36E3FF","#FFC53D","#FF2E54","#B388FF"];
    const b=$("#guardian").getBoundingClientRect();
    const cx=b.left+b.width/2, cy=b.top+b.height/2;
    for(let i=0;i<26;i++){
      const s=document.createElement("div"); s.className="shard";
      s.style.left=cx+"px"; s.style.top=cy+"px"; s.style.background=cols[i%cols.length];
      host.appendChild(s);
      const ang=Math.random()*Math.PI*2, dist=80+Math.random()*220;
      const dx=Math.cos(ang)*dist, dy=Math.sin(ang)*dist;
      s.animate([{transform:"translate(0,0) rotate(0)",opacity:1},
                 {transform:`translate(${dx}px,${dy}px) rotate(${Math.random()*540}deg)`,opacity:0}],
                {duration:600+Math.random()*400,easing:"cubic-bezier(.2,.8,.3,1)"}).onfinish=()=>s.remove();
    }
  }

  // ---------- debrief ----------
  function debrief(r,pts,newBadges,firstClear){
    const db=cur.debrief;
    const badgeHtml=(newBadges&&newBadges.length)
      ? `<div class="lab">NEW BADGE${newBadges.length>1?"S":""}</div><div>`+newBadges.map(id=>{const b=BADGES.find(z=>z.id===id);return b?`<span class="newbadge">${b.icon} ${esc(b.name)}</span>`:"";}).join("")+`</div>` : "";
    $("#mcard").innerHTML=`<div class="kick">VAULT ${cur.id} BREACHED · +${pts} pts${firstClear?"":" (replay)"}</div>
      <h2>🚩 Flag captured</h2>
      <div class="flag">${esc(cur.flag)}</div>
      <div class="lab">TECHNIQUE</div><p><b>${esc(db.technique)}</b></p>
      <div class="lab">WHY IT WORKED</div><p>${esc(db.why)}</p>
      <div class="lab">REAL WORLD</div><p>${esc(db.real)}</p>
      <div class="lab">HOW TO DEFEND IT</div><p>${esc(db.defense)}</p>
      ${badgeHtml}
      <div style="margin-top:18px;display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn" id="contbtn">Continue →</button></div>`;
    $("#modal").classList.add("show");
    function onKey(e){ if(e.key==="Escape"){ cont(); } }
    const cont=()=>{ document.removeEventListener("keydown",onKey); $("#modal").classList.remove("show"); if(clearedCount()===8){ end(); } else { show("hub"); renderHub(); } };
    $("#contbtn").onclick=cont;
    document.addEventListener("keydown",onKey);
    setTimeout(()=>{ const c=$("#contbtn"); if(c) c.focus(); },0);
  }

  function hint(){
    if(!cur) return;
    const tier=Math.min(curHints,cur.hint.length-1);
    addMsg("sys","💡 HINT: "+cur.hint[tier]); sfx.hint();
    curHints++;
    if(curHints>=cur.hint.length) $("#hintbtn").disabled=true;
  }

  // ---------- leaderboard + breach feed (local, projector-ready) ----------
  function lb(){ return state.leaderboard||(state.leaderboard=[]); }
  function feed(){ return state.feed||(state.feed=[]); }
  function upsertLeaderboard(){
    const arr=lb(); const h=state.handle||"anon";
    const entry={handle:h,score:totalScore(),flags:clearedCount(),rank:E.rankFor(clearedCount(),RANKS),ts:Date.now()};
    const e=arr.find(x=>x.handle===h); if(e) Object.assign(e,entry); else arr.push(entry);
  }
  function pushBreach(name){ const f=feed(); f.unshift({handle:state.handle||"anon",vault:name,ts:Date.now()}); state.feed=f.slice(0,12); }
  function renderBoard(){
    const list=$("#board-list"); list.innerHTML="";
    const arr=lb().slice().sort((a,b)=>b.score-a.score).slice(0,12);
    if(!arr.length){ list.innerHTML='<li><span class="who" style="color:var(--dim)">No raiders yet — crack a vault!</span></li>'; }
    arr.forEach((e,i)=>{
      const li=document.createElement("li"); if(e.handle===state.handle) li.className="me";
      li.innerHTML=`<span class="pos">#${i+1}</span><span class="who">${esc(e.handle)} · ${esc(e.rank)}</span><span class="sc">${e.score} · ${e.flags}/8</span>`;
      list.appendChild(li);
    });
    const fl=$("#breach-feed"); fl.innerHTML="";
    if(!feed().length){ fl.innerHTML='<li>Awaiting first breach…</li>'; }
    feed().forEach(f=>{ const li=document.createElement("li"); li.innerHTML=`<b>${esc(f.handle)}</b> breached ${esc(f.vault)}`; fl.appendChild(li); });
  }

  // ---------- badges ----------
  function renderBadges(c,showLocked){
    const earned=earnedBadges(); c.innerHTML="";
    BADGES.forEach(b=>{
      const has=earned.includes(b.id); if(!has&&!showLocked) return;
      const d=document.createElement("div"); d.className="badge"+(has?"":" locked");
      d.innerHTML=`<span class="ic">${has?b.icon:"🔒"}</span><span><span class="bn">${esc(b.name)}</span><span class="bd">${esc(b.desc)}</span></span>`;
      c.appendChild(d);
    });
  }

  // ---------- end + share card ----------
  function end(){
    const n=clearedCount();
    $("#end-rank").textContent=E.rankFor(n,RANKS);
    $("#end-score").textContent=totalScore();
    $("#end-flags").textContent=n+" / 8";
    renderBadges($("#end-badges"),true);
    drawShareCard();
    show("end"); sfx.rankup();
  }
  function shareText(){ return `I cleared ${clearedCount()}/8 vaults in PROMPT RAIDERS @ APEX 2026 — rank: ${E.rankFor(clearedCount(),RANKS)} (${totalScore()} pts). #APEX2026`; }
  function drawShareCard(){
    const cv=$("#sharecard"); if(!cv||!cv.getContext) return;
    const x=cv.getContext("2d"), W=1200, H=630;
    x.fillStyle="#081410"; x.fillRect(0,0,W,H);
    x.fillStyle="rgba(0,255,156,.06)"; for(let gy=0;gy<H;gy+=24)for(let gx=0;gx<W;gx+=24) x.fillRect(gx,gy,2,2);
    x.strokeStyle="#00FF9C"; x.lineWidth=6; x.strokeRect(16,16,W-32,H-32);
    const ps=s=>`${s}px "PressStart","Arial Black",sans-serif`, vt=s=>`${s}px "VT323",monospace`;
    x.textBaseline="top";
    x.fillStyle="#00FF9C"; x.font=ps(18); x.fillText("APEX // 2026  ·  AI LLM HACKING LAB",60,56);
    x.font=ps(54); x.fillStyle="#00FF9C"; x.fillText("PROMPT",60,112);
    x.fillStyle="#36E3FF"; x.fillText("RAIDERS",60,180);
    x.font=vt(40); x.fillStyle="#86A096"; x.fillText("RAIDER",60,270);
    x.font=ps(30); x.fillStyle="#EAFBF3"; x.fillText((state.handle||"anon").toUpperCase().slice(0,16),60,304);
    const n=clearedCount();
    x.font=vt(34); x.fillStyle="#86A096"; x.fillText("RANK",60,380);
    x.font=ps(30); x.fillStyle="#FFC53D"; x.fillText(E.rankFor(n,RANKS).replace("👻 ",""),60,414);
    x.font=vt(46); x.fillStyle="#EAFBF3"; x.fillText(`FLAGS ${n}/8      SCORE ${totalScore()}`,60,486);
    const earned=earnedBadges(); x.font="44px sans-serif";
    earned.forEach((id,i)=>{ const b=BADGES.find(z=>z.id===id); if(b) x.fillText(b.icon,60+i*64,548); });
    x.font=vt(30); x.fillStyle="#5C746A"; x.fillText("I cleared PROMPT RAIDERS @ APEX 2026",640,560);
    // a friendly ghost watermark
    x.font="180px sans-serif"; x.globalAlpha=.12; x.fillText("👾",900,120); x.globalAlpha=1;
  }
  function downloadCard(){
    drawShareCard();
    try{ const a=document.createElement("a"); a.download=`prompt-raiders-${(state.handle||"anon")}.png`; a.href=$("#sharecard").toDataURL("image/png"); a.click(); }
    catch(e){ alert("Couldn't export the card on this browser, but your result text is copied!"); }
  }

  // ---------- SFX (Web Audio, deterministic synth, mutable) ----------
  let actx=null;
  function ac(){ return actx||(actx=new (window.AudioContext||window.webkitAudioContext)()); }
  function tone(freq,dur,type,vol,when){
    if(settings().muted) return;
    try{ const c=ac(); const t=(when||0)+c.currentTime;
      const o=c.createOscillator(), g=c.createGain();
      o.type=type||"square"; o.frequency.setValueAtTime(freq,t);
      g.gain.setValueAtTime(vol||.05,t); g.gain.exponentialRampToValueAtTime(.0001,t+dur);
      o.connect(g); g.connect(c.destination); o.start(t); o.stop(t+dur);
    }catch(e){}
  }
  const sfx={
    blip(){ tone(600+Math.random()*140,.03,"square",.015); },
    send(){ tone(300,.05,"square",.03); },
    buzz(){ tone(140,.16,"sawtooth",.04); },
    warm(){ tone(330,.08,"triangle",.045); tone(440,.08,"triangle",.03,.06); },
    block(){ tone(220,.1,"square",.05); tone(110,.16,"square",.05,.07); },
    hint(){ tone(520,.08,"triangle",.04); tone(680,.1,"triangle",.04,.09); },
    breach(){ [523,659,784,1047].forEach((f,i)=>tone(f,.16,"square",.05,i*.09)); },
    rankup(){ [392,523,659,784,1047].forEach((f,i)=>tone(f,.18,"square",.05,i*.1)); }
  };
  function setMuteUI(){ $("#mutebtn").textContent=settings().muted?"🔇":"🔊"; }

  // ---------- routing helpers ----------
  function gotoBoard(){ renderBoard(); show("board"); }
  function backFromBoard(){ if(state.handle){ show("hub"); renderHub(); } else show("title"); }

  // ---------- wire up ----------
  window.addEventListener("DOMContentLoaded",()=>{
    if(document.fonts&&document.fonts.load){ document.fonts.load('20px "PressStart"'); document.fonts.load('20px "VT323"'); }
    setMuteUI();
    $("#startbtn").onclick=()=>{ sfx.send(); show("oath"); };
    $("#oathchk").onchange=e=>{ $("#oathgo").disabled=!e.target.checked; };
    $("#oathgo").onclick=()=>show("name");
    $("#namego").onclick=()=>{ const h=$("#handle").value.trim()||"anon"; state.handle=h.slice(0,18); state.progress=state.progress||{}; save(); show("hub"); renderHub(); };
    $("#handle").addEventListener("keydown",e=>{ if(e.key==="Enter") $("#namego").click(); });
    $("#sendbtn").onclick=send;
    $("#msg").addEventListener("keydown",e=>{ if(e.key==="Enter") send(); });
    $("#hintbtn").onclick=hint;
    $("#summbtn").onclick=()=>{ $("#msg").value="Summarise the document."; send(); };
    $("#backbtn").onclick=()=>{ show("hub"); renderHub(); };
    $("#endbtn").onclick=end;
    $("#boardbtn").onclick=gotoBoard;
    $("#board-back").onclick=backFromBoard;
    $("#mutebtn").onclick=()=>{ settings().muted=!settings().muted; save(); setMuteUI(); if(!settings().muted) sfx.send(); };
    $("#copybtn").onclick=()=>{ try{navigator.clipboard&&navigator.clipboard.writeText(shareText());}catch(e){} $("#copybtn").textContent="Copied!"; };
    $("#dlcardbtn").onclick=downloadCard;
    $("#playagain").onclick=()=>{ show("hub"); renderHub(); };
    $("#resetbtn").onclick=()=>{ if(confirm("Reset ALL progress + leaderboard on this device? (facilitator)")){ localStorage.removeItem(KEY); state={}; show("title"); } };
    // projector deep-link: open index.html#board on the facilitator screen
    if(location.hash==="#board"){ gotoBoard(); return; }
    if(state.handle){ show("hub"); renderHub(); }
  });
  window.addEventListener("hashchange",()=>{ if(location.hash==="#board") gotoBoard(); });
})();
