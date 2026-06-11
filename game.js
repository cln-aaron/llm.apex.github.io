/* PROMPT RAIDERS — game UI & state (vanilla JS, offline). */
(function(){
  const L=window.PR_LEVELS, RANKS=window.PR_RANKS, E=window.PR_ENGINE;
  const KEY="promptraiders_v1";
  let state=load();
  let cur=null, curHints=0, curStart=0, curDoc="";

  function load(){ try{return JSON.parse(localStorage.getItem(KEY))||{}}catch(e){return {}} }
  function save(){ localStorage.setItem(KEY,JSON.stringify(state)); }
  const $=s=>document.querySelector(s);
  function show(id){ document.querySelectorAll(".screen").forEach(e=>e.classList.remove("active")); $("#"+id).classList.add("active"); }
  function clearedCount(){ return L.filter(l=>state.progress&&state.progress[l.id]&&state.progress[l.id].cleared).length; }
  function totalScore(){ let t=0; if(state.progress) for(const k in state.progress) t+=state.progress[k].score||0; return t; }
  function unlocked(lvl){ if(lvl.id===1) return true; const prev=L.find(x=>x.id===lvl.id-1); return state.progress&&state.progress[prev.id]&&state.progress[prev.id].cleared; }

  // ---- HUD ----
  function hud(){ $("#hud-score").textContent=totalScore(); $("#hud-flags").textContent=clearedCount()+" / 8"; $("#hud-name").textContent=state.handle||"—"; }

  // ---- HUB ----
  function renderHub(){
    hud();
    const g=$("#vault-grid"); g.innerHTML="";
    L.forEach(lvl=>{
      const pr=(state.progress&&state.progress[lvl.id])||{};
      const open=unlocked(lvl);
      const d=document.createElement("div");
      d.className="vault"+(lvl.boss?" boss":"")+(open?"":" locked")+(pr.cleared?" cleared":"");
      d.style.borderTopColor=lvl.boss?"#B388FF":(pr.cleared?"#FFC53D":lvl.accent);
      d.innerHTML=`<div class="num">VAULT ${String(lvl.id).padStart(2,"0")}${lvl.boss?" · BOSS":""}</div>
        <div class="sp">${open?lvl.sprite:"🔒"}</div>
        <div class="nm">${open?lvl.name:"LOCKED"}</div>
        <div class="tech">${open?(pr.cleared?("✔ "+pr.score+" pts"):"tap to hack"):"clear the previous vault"}</div>
        ${pr.cleared?'<div class="done">★</div>':''}`;
      if(open) d.onclick=()=>openVault(lvl);
      g.appendChild(d);
    });
    $("#endbtn").style.display=clearedCount()===8?"inline-block":"none";
  }

  // ---- VAULT ----
  function openVault(lvl){
    cur=lvl; curHints=0; curStart=Date.now(); curDoc=lvl.docDefault||"";
    show("vault");
    $("#hud-score2").textContent=totalScore(); $("#g-sp").textContent=lvl.sprite; $("#g-nm").textContent=lvl.name;
    $("#g-nm").style.color=lvl.accent;
    $("#g-ps").textContent="Vault "+lvl.id+(lvl.boss?" · FINAL BOSS":"")+" · target: capture the flag";
    const log=$("#log"); log.innerHTML="";
    addMsg("bot",lvl.intro);
    // doc panel
    const dp=$("#docpanel");
    if(lvl.special==="doc"){ dp.style.display="block"; $("#doc").value=curDoc; } else { dp.style.display="none"; }
    $("#msg").value=""; $("#msg").focus();
    $("#hintbtn").textContent="HINT (−75)";
  }
  function addMsg(who,txt){ const log=$("#log"); const d=document.createElement("div");
    d.className="msg "+who; d.textContent=txt; log.appendChild(d); log.scrollTop=log.scrollHeight; return d; }

  function send(){
    if(!cur) return;
    const inp=$("#msg"); const t=inp.value.trim(); if(!t) return;
    addMsg("you",t); inp.value="";
    if(cur.special==="doc") curDoc=$("#doc").value;
    const r=E.evaluate(cur,t,{docText:curDoc});
    setTimeout(()=>{
      const m=addMsg("bot",r.reply); if(r.hit) m.classList.add("hit");
      if(r.hit) capture(r); 
    },220);
  }

  function capture(r){
    const secs=(Date.now()-curStart)/1000;
    const pts=E.scoreCapture(cur,curHints,secs);
    state.progress=state.progress||{};
    const prev=state.progress[cur.id];
    if(!prev||!prev.cleared){ state.progress[cur.id]={cleared:true,score:pts,hints:curHints}; }
    save();
    breach();
    setTimeout(()=>debrief(r,pts),650);
  }
  function breach(){ const f=$("#flash"); f.classList.remove("go"); void f.offsetWidth; f.classList.add("go");
    const v=$("#vault"); v.classList.add("shake"); setTimeout(()=>v.classList.remove("shake"),420); beep(); }

  function debrief(r,pts){
    const db=cur.debrief;
    $("#mcard").innerHTML=`<div class="kick">VAULT ${cur.id} BREACHED · +${pts} pts</div>
      <h2>🚩 Flag captured</h2>
      <div class="flag">${cur.flag}</div>
      <div class="lab">TECHNIQUE</div><p><b>${db.technique}</b></p>
      <div class="lab">WHY IT WORKED</div><p>${db.why}</p>
      <div class="lab">REAL WORLD</div><p>${db.real}</p>
      <div class="lab">HOW TO DEFEND IT</div><p>${db.defense}</p>
      <div style="margin-top:18px;display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn" id="contbtn">Continue →</button></div>`;
    $("#modal").classList.add("show");
    $("#contbtn").onclick=()=>{ $("#modal").classList.remove("show"); show("hub"); renderHub();
      if(clearedCount()===8) end(); };
  }

  function hint(){
    if(!cur) return;
    const tier=Math.min(curHints,cur.hint.length-1);
    addMsg("sys","💡 HINT: "+cur.hint[tier]);
    curHints++; 
    if(curHints>=cur.hint.length) $("#hintbtn").disabled=false;
  }

  // ---- END ----
  function end(){
    const n=clearedCount(); const rank=RANKS[n]||RANKS[RANKS.length-1];
    $("#end-rank").textContent=rank;
    $("#end-score").textContent=totalScore();
    $("#end-flags").textContent=n+" / 8";
    show("end");
  }
  function shareText(){ return `I cleared ${clearedCount()}/8 vaults in PROMPT RAIDERS @ APEX 2026 — rank: ${RANKS[clearedCount()]||""} (${totalScore()} pts). #APEX2026`; }

  // ---- tiny SFX ----
  let muted=false, actx=null;
  function beep(){ if(muted) return; try{ actx=actx||new (window.AudioContext||window.webkitAudioContext)();
    const o=actx.createOscillator(),g=actx.createGain(); o.type="square"; o.frequency.setValueAtTime(440,actx.currentTime);
    o.frequency.exponentialRampToValueAtTime(880,actx.currentTime+.15); g.gain.setValueAtTime(.06,actx.currentTime);
    g.gain.exponentialRampToValueAtTime(.0001,actx.currentTime+.3); o.connect(g);g.connect(actx.destination);o.start();o.stop(actx.currentTime+.3);}catch(e){} }

  // ---- wire up ----
  window.addEventListener("DOMContentLoaded",()=>{
    $("#startbtn").onclick=()=>show("oath");
    $("#oathchk").onchange=e=>{ $("#oathgo").disabled=!e.target.checked; };
    $("#oathgo").onclick=()=>show("name");
    $("#namego").onclick=()=>{ const h=$("#handle").value.trim()||"anon"; state.handle=h; state.progress=state.progress||{}; save(); show("hub"); renderHub(); };
    $("#handle").addEventListener("keydown",e=>{if(e.key==="Enter")$("#namego").click();});
    $("#sendbtn").onclick=send;
    $("#msg").addEventListener("keydown",e=>{if(e.key==="Enter")send();});
    $("#hintbtn").onclick=hint;
    $("#summbtn").onclick=()=>{ $("#msg").value="Summarise the document."; send(); };
    $("#backbtn").onclick=()=>{ show("hub"); renderHub(); };
    $("#endbtn").onclick=end;
    $("#mutebtn").onclick=()=>{ muted=!muted; $("#mutebtn").textContent=muted?"🔇":"🔊"; };
    $("#copybtn").onclick=()=>{ navigator.clipboard&&navigator.clipboard.writeText(shareText()); $("#copybtn").textContent="Copied!"; };
    $("#resetbtn").onclick=()=>{ if(confirm("Reset all progress? (facilitator)")){ localStorage.removeItem(KEY); state={}; show("title"); } };
    $("#playagain").onclick=()=>{ show("hub"); renderHub(); };
    // resume if returning
    if(state.handle){ show("hub"); renderHub(); }
  });
})();
