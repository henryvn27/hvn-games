/* Daily goals and local tournaments share explicit, single-attempt game results. */
(function(){
  'use strict';
  const KEY='game-shelf-competitions-v1',DAY=86400000,OFFSET=10*3600000;
  let nonce=0;
  const uid=()=>globalThis.crypto?.randomUUID?.()||`${Date.now().toString(36)}-${++nonce}-${Math.random().toString(36).slice(2)}`;
  const copy=v=>JSON.parse(JSON.stringify(v));
  const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
  const integer=(v,min=0,max=1000000)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const dayKey=(now=Date.now())=>new Date(now+OFFSET).toISOString().slice(0,10);
  const validDay=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;
  const hash=s=>{let n=2166136261;for(const c of String(s))n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;};
  function random(seed){let n=seed>>>0;return ()=>{n+=0x6D2B79F5;let t=n;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
  const GAMES={
    snake:{name:'Garden Snake',icon:'🐍',seconds:90,rules:'Wrap · Normal speed · 1 apple',rule:'wrap-125-1',score:'5 points per apple. 20 apples = 100 points.'},
    dodger:{name:'Space Dodger',icon:'🚀',seconds:90,rules:'Standard Mars survival',rule:'mars',score:'1 point per 25 score. 2,500 score = 100 points.'},
    flappy:{name:'Sky Flyer',icon:'✈️',seconds:90,rules:'Standard flight from level 1',rule:'sky',score:'5 points per gate. 20 gates = 100 points.'},
    memory:{name:'Memory Match',icon:'🃏',seconds:90,rules:'8 pairs · same layout for every player',rule:'eight-pairs',score:'5 points per pair. Finish for 20 bonus points, plus up to 40 for fewer moves (−2 per move beyond 8).'},
    golf:{name:'Mini Golf',icon:'⛳',seconds:180,rules:'First 3 holes · par 8 · 10 strokes per hole',rule:'golf-three',score:'20 points per sunk hole. Sink all 3 for up to 40 bonus points (−4 per stroke over par 8).'}
  };
  const POOLS=[
    [
      {id:'garden-ten',game:'snake',title:'A basket of apples',description:'Collect 10 apples in one round. Classic or Wrap, Normal speed, 1 apple.',kind:'snake',target:10},
      {id:'quick-tap',game:'reaction',title:'Right on cue',description:'React after the green signal in 350 ms or less.',kind:'reaction',target:1},
      {id:'first-putt',game:'golf',title:'Find the cup',description:'Sink one Mini Golf hole. The three-hole Cup course counts too.',kind:'hole',target:1},
      {id:'four-pairs',game:'memory',title:'Pair by pair',description:'Find 4 pairs in a single Memory Match game.',kind:'pairs',target:4}
    ],
    [
      {id:'ten-gates',game:'flappy',title:'Through the clouds',description:'Clear 10 gates in one Sky Flyer flight.',kind:'score',target:10},
      {id:'mars-thousand',game:'dodger',title:'Hold the line',description:'Reach 1,000 score in one Space Dodger mission.',kind:'score',target:1000},
      {id:'garden-fifteen',game:'snake',title:'Growing ambition',description:'Collect 15 apples in one round. Classic or Wrap, Normal speed, 1 apple.',kind:'snake',target:15}
    ],
    [
      {id:'vault-four',game:'word',title:'Crack the daily code',description:'Solve a 5-letter Word Vault in 4 guesses or fewer.',kind:'word',target:1},
      {id:'memory-twenty',game:'memory',title:'Remember the whole deck',description:'Find all 8 pairs in 20 moves or fewer.',kind:'memory',target:1},
      {id:'golf-thirty',game:'golf',title:'An afternoon on the green',description:'Sink all 6 holes within 30 strokes. Pickups and the shorter Cup course do not count.',kind:'golf',target:1}
    ]
  ];
  function dailySet(day=dayKey()){
    if(!validDay(day))return [];
    const seed=hash('daily-v1:'+day),used=new Set();
    const pools=POOLS.map(p=>p.slice());if(day>='2026-09-10'){pools[0].push({id:'camp-fifty',game:'clicker',title:'A helping hand',description:'Gather coins 50 times in one camp visit today.',kind:'taps',target:50});pools[2].push({id:'trail-flag',game:'platform',title:'Take the scenic route',description:'Finish any Mini Platformer level. Replays count.',kind:'platform',target:1});}
    return pools.map((pool,i)=>{const offset=(seed+i*7)%pool.length;let chosen;for(let k=0;k<pool.length;k++){const item=pool[(offset+k)%pool.length];if(!used.has(item.game)){chosen=item;break;}}used.add(chosen.game);return {...chosen,category:['Quick win','Skill test','The finish line'][i]};});
  }
  const fresh=()=>({version:1,days:{},cup:null,soloBest:0});
  let saved=fresh(),storageOK=true,launching=null;
  function metrics(game,data){
    if(!object(data))return null;
    const fields={snake:{score:400},dodger:{score:1000000},flappy:{score:1000000},memory:{pairs:8,moves:1000000},golf:{total:60,holed:6,holes:6},word:{guesses:6},reaction:{ms:60000},clicker:{taps:1000000},platform:{level:12,stars:3}}[game];
    if(!fields)return null;
    const result={};for(const [key,max] of Object.entries(fields))if(Object.hasOwn(data,key)){if(!integer(data[key],0,max))return null;result[key]=data[key];}
    if(!Object.keys(result).length)return null;
    if(game==='memory'&&result.pairs!==undefined&&result.moves!==undefined&&result.moves<result.pairs)return null;
    if(game==='golf'&&((result.holes!==undefined&&![3,6].includes(result.holes))||(result.holed!==undefined&&result.total!==undefined&&result.total<result.holed)||(result.holes!==undefined&&result.holed>result.holes)))return null;
    result.complete=data.complete===true;
    if(game==='memory')result.complete=result.complete&&result.pairs===8&&result.moves>=8;
    if(game==='golf')result.complete=result.complete&&result.holed===result.holes&&result.total>=result.holed;
    if(game==='platform')result.complete=result.complete&&result.level>=1;
    if(game==='word')result.complete=result.complete&&result.guesses>=1;
    return result;
  }
  function cupMetrics(game,data){const m=metrics(game,data);if(!m)return null;if(game==='golf'&&(m.holes!==3||!integer(m.total,0,30)||!integer(m.holed,0,3)))return null;if(game==='memory'&&(!integer(m.pairs,0,8)||!integer(m.moves)))return null;return m;}
  function points(game,data){
    const m=metrics(game,data);if(!m)return 0;let score=0;
    if(game==='snake'||game==='flappy')score=(m.score||0)*5;
    if(game==='dodger')score=(m.score||0)/25;
    if(game==='memory')score=(m.pairs||0)*5+(m.complete?20+Math.max(0,40-2*(m.moves-8)):0);
    if(game==='golf'&&m.holes===3)score=(m.holed||0)*20+(m.complete?Math.max(0,40-4*Math.max(0,m.total-8)):0);
    return Math.max(0,Math.min(100,Math.floor(score)));
  }
  function normalize(raw){
    const next=fresh();if(!object(raw)||raw.version!==1)return next;
    if(object(raw.days))for(const [day,values] of Object.entries(raw.days).slice(-10000)){
      if(!validDay(day)||day>dayKey()||!object(values))continue;
      next.days[day]={};for(const goal of dailySet(day))if(integer(values[goal.id],0,goal.target))next.days[day][goal.id]=values[goal.id];
    }
    if(integer(raw.soloBest,0,300))next.soloBest=raw.soloBest;
    const c=raw.cup;
    if(object(c)&&typeof c.id==='string'&&c.id.length<=100&&integer(c.seed,0,4294967295)&&Array.isArray(c.players)&&c.players.length>=1&&c.players.length<=4&&c.players.every(n=>typeof n==='string'&&n.trim().length>0&&n.length<=24)&&Array.isArray(c.games)&&c.games.length===3&&new Set(c.games).size===3&&c.games.every(g=>Object.hasOwn(GAMES,g))&&Array.isArray(c.results)&&c.results.length<=c.players.length*3){
      const results=[];
      for(let slot=0;slot<c.results.length;slot++){
        const r=c.results[slot],game=c.games[Math.floor(slot/c.players.length)];
        if(!object(r)||r.id!==`${c.id}:${slot}`||r.game!==game||r.player!==slot%c.players.length||!cupMetrics(game,r.metrics)||!integer(r.elapsed,0,GAMES[game].seconds*1000))break;
        results.push({id:r.id,game,player:r.player,metrics:cupMetrics(game,r.metrics),points:points(game,r.metrics),elapsed:r.elapsed});
      }
      next.cup={id:c.id,seed:c.seed,players:c.players.map(n=>n.trim()),games:[...c.games],results};
    }
    return next;
  }
  function read(){let value;try{value=localStorage.getItem(KEY);storageOK=true;}catch{storageOK=false;return null;}if(!value)return null;try{return normalize(JSON.parse(value));}catch{return fresh();}}
  saved=read()||fresh();
  function mergeDays(other){for(const [day,values] of Object.entries(other.days)){const current=saved.days[day]||(saved.days[day]={});for(const [id,value] of Object.entries(values))current[id]=Math.max(current[id]||0,value);}saved.soloBest=Math.max(saved.soloBest,other.soloBest);}
  function save(){const other=read();if(other)mergeDays(other);try{localStorage.setItem(KEY,JSON.stringify(saved));storageOK=true;}catch{storageOK=false;}}
  function syncDays(){const other=read();if(!other)return;saved.cup=other.cup;mergeDays(other);}
  const completeDays=()=>Object.keys(saved.days).filter(day=>dailySet(day).every(g=>(saved.days[day][g.id]||0)>=g.target)).sort();
  const syncRewards=()=>window.Shelf?.record('daily_sets',{count:completeDays().length});
  syncRewards();
  function measure(goal,run,m,done){
    if(goal.game!==run.game)return 0;
    if(goal.kind==='snake')return ['classic-125-1','wrap-125-1'].includes(run.rule)?m.score||0:0;
    if(goal.kind==='score')return m.score||0;
    if(goal.kind==='taps')return run.rule==='camp'?m.taps||0:0;
    if(goal.kind==='pairs')return m.pairs||0;
    if(goal.kind==='reaction')return m.ms>0&&m.ms<=350?1:0;
    if(goal.kind==='hole')return m.holed>0?1:0;
    if(!done||!m.complete)return 0;
    if(goal.kind==='platform')return run.rule==='trail'&&m.level>=1?1:0;
    if(goal.kind==='word')return run.rule==='word-5'&&m.guesses<=4?1:0;
    if(goal.kind==='memory')return m.moves<=20?1:0;
    if(goal.kind==='golf')return run.rule==='golf-six'&&m.holed===6&&m.total<=30?1:0;
    return 0;
  }
  function updateDaily(run,m,done){
    syncDays();const before=JSON.stringify(saved.days[run.day]||{}),progress=saved.days[run.day]||{};
    for(const goal of dailySet(run.day)){const value=Math.min(goal.target,measure(goal,run,m,done));if(value>0)progress[goal.id]=Math.max(progress[goal.id]||0,value);}
    if(JSON.stringify(progress)!==before){saved.days[run.day]=progress;save();syncRewards();}
  }
  const storageNote=()=>storageOK?'Saved on this browser.':'Storage unavailable: progress lasts for this visit only.';
  function dailyCards(day){const progress=saved.days[day]||{};return dailySet(day).map(g=>{const n=progress[g.id]||0,done=n>=g.target;return `<article class="daily-card ${done?'is-complete':''}"><div class="event-card-top"><span class="eyebrow">${g.category}</span><span>${done?'✓ Complete':`${n} / ${g.target}`}</span></div><span class="daily-icon" aria-hidden="true">${GAMES[g.game]?.icon||{reaction:'⚡',word:'🔤',clicker:'🪙',platform:'🚩'}[g.game]}</span><h2>${g.title}</h2><p>${g.description}</p><progress max="${g.target}" value="${n}" aria-label="${g.title}: ${n} of ${g.target}"></progress><button class="action" data-daily-play="${g.game}">${done?'Play again':'Play challenge'} →</button></article>`;}).join('');}
  function dailyRender(){
    syncDays();syncRewards();const day=dayKey(),badges=completeDays(),done=dailySet(day).filter(g=>(saved.days[day]?.[g.id]||0)>=g.target).length;
    shell('Daily Challenges','Three fresh goals. One little reason to play today.',`<section class="events-page"><div class="event-banner daily-banner"><div><span class="eyebrow">${day} · BRISBANE TIME</span><h2>${done===3?'Today’s badge is yours.':'Make today a triple.'}</h2><p>${done} of 3 complete · <span id="daily-countdown"></span></p></div><span class="event-emblem" aria-hidden="true">${done===3?'🏅':'☀️'}</span></div><div class="daily-grid">${dailyCards(day)}</div><p class="event-save-note">${storageNote()} Resets at midnight Brisbane time. A round crossing midnight counts towards the day it started.</p><section class="event-panel"><span class="eyebrow">YOUR DAILY COLLECTION</span><h2>${badges.length} daily badge${badges.length===1?'':'s'} earned</h2><p>Complete all three goals to earn a dated badge. Any days count; there is no streak to lose.</p><div class="daily-milestones">${[[3,'Daybreak theme'],[7,'Mint ribbon snake'],[14,'Twilight golf ball']].map(([n,label])=>`<div class="${badges.length>=n?'reached':''}"><b>${badges.length>=n?'✓':Math.min(badges.length,n)+' / '+n}</b><span>${label}<small>${n} daily sets</small></span></div>`).join('')}</div><button class="event-link" onclick="Shelf.render()">Choose your cosmetics →</button>${badges.length?`<p>Most recent badges</p><div class="daily-badges" aria-label="Recent earned daily badges">${badges.slice(-14).reverse().map(d=>`<span title="All three challenges completed on ${d}">🏅 ${d}</span>`).join('')}</div>`:''}</section></section>`);
    document.querySelector('.game-wrap').classList.add('events-wrap');
    document.querySelectorAll('[data-daily-play]').forEach(b=>b.onclick=()=>window.play(b.dataset.dailyPlay));
    const clock=()=>{if(dayKey()!==day)return dailyRender();const remaining=DAY-((Date.now()+OFFSET)%DAY),seconds=Math.ceil(remaining/1000);document.querySelector('#daily-countdown').textContent=`new goals in ${Math.floor(seconds/3600)}h ${Math.floor(seconds%3600/60)}m ${seconds%60}s`;};
    clock();const timer=setInterval(clock,1000);clean=()=>clearInterval(timer);
  }
  function chooseGames(seed){const list=Object.keys(GAMES),rng=random(seed);for(let i=list.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[list[i],list[j]]=[list[j],list[i]];}return list.slice(0,3);}
  const totalFor=(cup,player)=>cup.results.filter(r=>r.player===player).reduce((n,r)=>n+r.points,0);
  const medal=score=>score>=240?'Gold':score>=165?'Silver':score>=90?'Bronze':'Finisher';
  function standings(c){const rows=c.players.map((name,player)=>({name,player,total:totalFor(c,player)})).sort((a,b)=>b.total-a.total);return `<div class="cup-table-wrap"><table class="cup-table"><caption>${c.results.length===c.players.length*3?'Final results':'Cup standings'}</caption><thead><tr><th>Player</th>${c.games.map(g=>`<th>${GAMES[g].icon}<span>${GAMES[g].name}</span></th>`).join('')}<th>Total</th></tr></thead><tbody>${rows.map(r=>`<tr><th>${escape(r.name)}</th>${c.games.map(g=>{const result=c.results.find(x=>x.player===r.player&&x.game===g);return `<td>${result?`${result.points}<small>${resultText(g,result.metrics)}</small>`:'—'}</td>`;}).join('')}<td><b>${r.total}</b><small>/ 300</small></td></tr>`).join('')}</tbody></table></div>`;}
  function resultText(game,m){if(game==='memory')return `${m.pairs||0} pairs · ${m.moves||0} moves`;if(game==='golf')return `${m.holed||0}/3 sunk · ${m.total||0} strokes`;return `${m.score||0} ${game==='snake'?'apples':game==='flappy'?'gates':'score'}`;}
  function createCup(names){
    if(!Array.isArray(names)||names.length<1||names.length>4)return false;
    const players=names.map((n,i)=>typeof n==='string'?n.trim().slice(0,24)||`Player ${i+1}`:`Player ${i+1}`);
    const seed=globalThis.crypto?.getRandomValues?crypto.getRandomValues(new Uint32Array(1))[0]:Math.floor(Math.random()*4294967296);saved.cup={id:uid(),seed,players,games:chooseGames(seed),results:[]};save();return true;
  }
  function cupRender(){
    const remote=read();if(remote){saved.cup=remote.cup;saved.soloBest=Math.max(saved.soloBest,remote.soloBest);}
    const c=saved.cup;
    if(!c){
      shell('Arcade Cup','Three games. One attempt each. Every point counts.',`<section class="events-page"><div class="event-banner cup-banner"><div><span class="eyebrow">THE THREE-GAME TOURNAMENT</span><h2>Bring your best.<br>Or bring a friend.</h2><p>Play solo or pass the device between 2–4 players.</p></div><span class="event-emblem" aria-hidden="true">🏆</span></div><form class="event-panel cup-setup" id="cup-setup"><label for="cup-mode">Players<select id="cup-mode"><option value="1">Solo</option><option value="2">2 players</option><option value="3">3 players</option><option value="4">4 players</option></select></label><div id="cup-names"></div><p>Three different games are drawn from Snake, Space Dodger, Sky Flyer, Memory Match, and Mini Golf. You’ll see the rules before starting.</p><button class="action" type="submit">Draw my Cup →</button></form><div class="event-panel"><h2>A fair little competition</h2><p>Everyone gets the same games, layouts, time limits, and scoring. Each game is worth up to 100 points. A tied total means a shared place.</p><p>Gold: 240+ · Silver: 165+ · Bronze: 90+ · Finisher: below 90</p><p>Completed rounds save. Leaving or refreshing during a round lets you retry that unscored round. Ending a Cup early awards no medal.</p>${saved.soloBest?`<p><b>Solo best: ${saved.soloBest} / 300</b></p>`:''}</div><p class="event-save-note">${storageNote()}</p></section>`);
      const select=document.querySelector('#cup-mode'),names=document.querySelector('#cup-names');
      const update=()=>{const previous=[...names.querySelectorAll('input')].map(n=>n.value);names.innerHTML=Array.from({length:+select.value},(_,i)=>`<label>Player ${i+1}<input name="player" maxlength="24" value="${escape(previous[i]||(+select.value===1?'You':`Player ${i+1}`))}" autocomplete="off"></label>`).join('');};select.onchange=update;update();
      document.querySelector('#cup-setup').onsubmit=e=>{e.preventDefault();createCup([...names.querySelectorAll('input')].map(n=>n.value));cupRender();};
    }else{
      const finished=c.results.length===c.players.length*3,slot=c.results.length,round=Math.floor(slot/c.players.length),player=slot%c.players.length,high=Math.max(...c.players.map((_,i)=>totalFor(c,i))),leaders=c.players.filter((_,i)=>totalFor(c,i)===high);
      shell('Arcade Cup',finished?'Three games down. Your moment on the podium.':'One device, one attempt at a time.',`<section class="events-page"><div class="event-banner cup-banner"><div><span class="eyebrow">${finished?'CUP COMPLETE':`ROUND ${round+1} OF 3`}</span><h2>${finished?(c.players.length===1?`${medal(high)} finish!`:leaders.length>1?'A shared victory!':`${escape(leaders[0])} takes the Cup!`):`${escape(c.players[player])}, you’re up.`}</h2><p>${finished?(c.players.length>1?leaders.map(escape).join(' &amp; ')+' · ':'')+high+' / 300 points':`${GAMES[c.games[round]].name} · ${GAMES[c.games[round]].seconds} seconds of play`}</p></div><span class="event-emblem" aria-hidden="true">${finished?'🏅':'🏆'}</span></div>${finished?`<div class="cup-medals">${c.players.map((name,i)=>`<span>🏅 ${escape(name)} · ${medal(totalFor(c,i))}</span>`).join('')}</div>`:`<section class="event-panel cup-handoff"><span class="eyebrow">${c.players.length>1?'PASS THE DEVICE · THEN START WHEN READY':'READY WHEN YOU ARE'}</span><h2>${GAMES[c.games[round]].icon} ${GAMES[c.games[round]].name}</h2><p>${GAMES[c.games[round]].rules}</p><p>${GAMES[c.games[round]].score}</p>${c.games[round]==='memory'&&c.players.length>1?'<p>Other players: look away during this attempt, so the shared card layout stays a surprise.</p>':''}<button class="action" id="cup-play">Start ${escape(c.players[player])}’s round →</button><p class="event-save-note">The timer starts when you begin playing. Pauses and handoffs do not use your time.</p></section>`}${standings(c)}<details class="event-panel cup-rules"><summary>Your three games & scoring</summary>${c.games.map(g=>`<h3>${GAMES[g].icon} ${GAMES[g].name}</h3><p>${GAMES[g].rules} · ${GAMES[g].seconds}s</p><p>${GAMES[g].score}</p>`).join('')}<p>Gold: 240+ · Silver: 165+ · Bronze: 90+ · Finisher: below 90</p></details>${finished?'<button class="action" id="cup-new">Set up a new Cup →</button>':'<details class="cup-end"><summary>End this Cup early</summary><p>Completed rounds in this Cup will be cleared. No completion medal will be awarded.</p><button id="cup-end">End Cup without medal</button></details>'}<p class="event-save-note">${storageNote()}</p></section>`);
      if(finished)document.querySelector('#cup-new').onclick=()=>{saved.cup=null;save();cupRender();};
      else{document.querySelector('#cup-play').onclick=launchCup;document.querySelector('#cup-end').onclick=()=>{saved.cup=null;save();cupRender();};}
    }
    document.querySelector('.game-wrap').classList.add('events-wrap');
  }
  function launchCup(){
    const c=saved.cup;if(!c||c.results.length>=c.players.length*3)return false;
    const slot=c.results.length,game=c.games[Math.floor(slot/c.players.length)];
    launching={id:c.id,slot,game,seed:hash(`${c.seed}:${game}`),player:c.players[slot%c.players.length],round:Math.floor(slot/c.players.length)+1};
    try{window.play(game);}finally{launching=null;}return true;
  }
  function submitCup(context,m,elapsed){
    if(!cupMetrics(context.game,m))return false;
    const remote=read();if(remote){saved.cup=remote.cup;saved.soloBest=Math.max(saved.soloBest,remote.soloBest);}
    const c=saved.cup;if(!c||c.id!==context.id||c.results.length!==context.slot||c.games[Math.floor(context.slot/c.players.length)]!==context.game)return false;
    c.results.push({id:`${c.id}:${context.slot}`,game:context.game,player:context.slot%c.players.length,metrics:m,points:points(context.game,m),elapsed:Math.min(GAMES[context.game].seconds*1000,Math.round(elapsed))});
    if(c.players.length===1&&c.results.length===3)saved.soloBest=Math.max(saved.soloBest,totalFor(c,0));save();return true;
  }
  function session(game){
    const context=launching&&launching.game===game?copy(launching):null;
    let rng=context?random(context.seed):()=>Math.random(),attempt=null,disposed=false,ended=false,running=false,elapsed=0,last=0,timer=null,onTimeout=()=>{};
    const banner=()=>document.querySelector('#cup-session');
    function refresh(){if(!context||!banner())return;const left=Math.max(0,Math.ceil((GAMES[game].seconds*1000-elapsed)/1000));banner().querySelector('[data-cup-clock]').textContent=ended?'Round saved':`${Math.floor(left/60)}:${String(left%60).padStart(2,'0')} ${running?'left':attempt?'· paused':'· ready'}`;}
    const api={
      cup:!!context,rule:context?GAMES[game].rule:null,
      random:()=>rng(),
      start(rule,originDay){if(disposed||ended)return null;if(!attempt)attempt={id:uid(),game,rule:context?GAMES[game].rule:rule,day:validDay(originDay)&&originDay<=dayKey()?originDay:dayKey()};if(!running){running=true;last=performance.now();}refresh();return copy(attempt);},
      reset(){if(context&&attempt)return false;attempt=null;ended=false;running=false;elapsed=0;rng=context?random(context.seed):()=>Math.random();return true;},
      pause(){if(running){elapsed+=Math.max(0,performance.now()-last);running=false;}refresh();},
      resume(){if(attempt&&!ended&&!disposed){running=true;last=performance.now();refresh();}},
      progress(data){if(!attempt||ended||disposed)return false;const m=metrics(game,data);if(!m)return false;updateDaily(attempt,m,false);return true;},
      finish(data){if(!attempt||ended||disposed)return false;const m=metrics(game,data);if(!m)return false;api.pause();ended=true;updateDaily(attempt,m,true);if(context){const accepted=submitCup(context,m,elapsed);if(banner()){banner().querySelector('[data-cup-result]').hidden=false;banner().querySelector('[data-cup-result]').textContent=accepted?`${points(game,m)} / 100 points · See standings →`:'See saved Cup →';}refresh();}return true;},
      get done(){return ended;},
      mount(timeout){if(!context)return;onTimeout=timeout;const host=document.createElement('aside');host.id='cup-session';host.className='cup-session';host.innerHTML=`<div><b>🏆 ${escape(context.player)} · Round ${context.round}/3</b><span>${GAMES[game].rules}</span></div><strong data-cup-clock></strong><button class="action" data-cup-result hidden></button><button class="event-link" data-cup-return>Back to Cup</button>`;document.querySelector('.game-wrap').prepend(host);host.querySelector('[data-cup-result]').onclick=()=>cupRender();host.querySelector('[data-cup-return]').onclick=()=>cupRender();
        document.querySelectorAll('#restart-game,#golf-restart,[data-cup-restart]').forEach(b=>b.hidden=true);document.querySelectorAll('.arcade-settings select').forEach(s=>s.disabled=true);refresh();
        timer=setInterval(()=>{if(disposed||ended||!running)return;const now=performance.now();elapsed+=Math.max(0,now-last);last=now;refresh();if(elapsed>=GAMES[game].seconds*1000){running=false;onTimeout();}},100);
      },
      dispose(){disposed=true;running=false;clearInterval(timer);}
    };
    return api;
  }
  function homeSummary(){const day=dayKey(),n=dailySet(day).filter(g=>(saved.days[day]?.[g.id]||0)>=g.target).length;return `<section class="event-home-grid"><button onclick="DailyChallenges.render()"><span>☀️ DAILY CHALLENGES</span><strong>${n===3?'Today’s badge: earned':`${n} / 3 goals complete`}</strong><small>New goals every day →</small></button><button onclick="ArcadeCup.render()"><span>🏆 ARCADE CUP</span><strong>${saved.cup&&saved.cup.results.length<saved.cup.players.length*3?'Continue your Cup':'Three games. One Cup.'}</strong><small>Solo or pass-and-play →</small></button></section>`;}
  window.DailyChallenges=Object.freeze({render:dailyRender,dayKey,set:day=>copy(dailySet(day)),getState:()=>copy({days:saved.days,badges:completeDays()}),homeSummary});
  window.ArcadeCup=Object.freeze({render:()=>cupRender(),create:createCup,launch:launchCup,points,medal,getState:()=>copy(saved.cup),games:Object.freeze(copy(GAMES))});
  window.GameRuns=Object.freeze({session,storageKey:KEY});
})();
