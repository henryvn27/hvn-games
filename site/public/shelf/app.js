const app=document.querySelector('#app');let clean=()=>{},carIndex=0,carTimer=null;
const games=[['golf','⛳','Mini Golf','Six holes. Find your perfect line.'],['snake','🐍','Garden Snake','Four ways to eat, grow, and go.'],['dodger','🚀','Space Dodger','Defend Mars. Survive the fleet.'],['memory','🃏','Memory Match','Find every pair.'],['reaction','⚡','Reaction Test','How quick are you?'],['word','🔤','Word Vault','Six attempts. Crack the code.'],['clicker','🪙','Clicker Adventure','Build a camp. Explore three worlds.'],['flappy','🐦','Sky Flyer','A pixel-plane sunset run.'],['platform','🕹️','Mini Platformer','Twelve levels. Three worlds. Every star.'],['tic','❌','Tic-Tac-Toe','Take on the computer.'],['checkers','♟','Checkers','Three bot difficulties.'],['trade','🏘️','City Trader','Buy streets, beat the bots.']];
function cards(filter='all'){return games.filter(g=>filter==='all'||(filter==='board'?['checkers','trade'].includes(g[0]):!['checkers','trade'].includes(g[0]))).map(g=>`<article class="card"><div class="art">${g[1]}</div><h3>${g[2]}</h3><p>${g[3]}</p><button onclick="play('${g[0]}')">Play now →</button></article>`).join('')}
function carousel(){return `<section class="carousel" aria-roledescription="carousel" aria-label="Browse all games"><div class="section-title"><div><span class="eyebrow">Spin the shelf</span><h2>Browse them all</h2></div><div class="car-controls"><button class="car-btn" id="carPrev" aria-label="Previous game">←</button><button class="car-btn" id="carNext" aria-label="Next game">→</button></div></div><div class="car-viewport"><div class="car-track" id="carTrack">${games.map(g=>`<article class="card car-slide"><div class="art">${g[1]}</div><h3>${g[2]}</h3><p>${g[3]}</p><button onclick="play('${g[0]}')">Play now →</button></article>`).join('')}</div></div><div class="car-dots" id="carDots">${games.map((_,i)=>`<button data-i="${i}" class="${i===0?'active':''}" aria-label="Go to slide ${i+1}"></button>`).join('')}</div></section>`}
function initCarousel(){let track=document.querySelector('#carTrack'),dots=[...document.querySelectorAll('#carDots button')],box=document.querySelector('.carousel'),gap=parseFloat(getComputedStyle(track).columnGap)||15;carIndex=0;let step=()=>track.children[0].getBoundingClientRect().width+gap;let go=i=>{carIndex=(i+games.length)%games.length;track.style.transform=`translateX(-${carIndex*step()}px)`;dots.forEach((d,j)=>d.classList.toggle('active',j===carIndex))};let next=()=>go(carIndex+1);let start=()=>carTimer=setInterval(next,3500);let restart=()=>{clearInterval(carTimer);start()};document.querySelector('#carNext').onclick=()=>{next();restart()};document.querySelector('#carPrev').onclick=()=>{go(carIndex-1);restart()};dots.forEach(d=>d.onclick=()=>{go(+d.dataset.i);restart()});box.onmouseenter=()=>clearInterval(carTimer);box.onmouseleave=start;box.ontouchstart=()=>clearInterval(carTimer);box.ontouchend=start;let onResize=()=>go(carIndex);addEventListener('resize',onResize);start();clean=()=>{clearInterval(carTimer);removeEventListener('resize',onResize)}}
function home(){clean();app.innerHTML=`<section class="hero"><div><span class="eyebrow">A little collection of browser games</span><h1>Pick a game.<br><em>Make a moment.</em></h1><p>Twelve games for a quick break. Chase high scores, collect trophies, and make the shelf your own.</p></div><aside class="feature"><span class="kicker">New on the shelf</span><b>Mini Golf ⛳</b><p>Six little greens. Banks, bunkers, and a perfect putt waiting to happen.</p><button onclick="play('golf')">Play Mini Golf →</button></aside></section>${DailyChallenges.homeSummary()}${Shelf.summary()}${carousel()}<div class="section-title"><div><span class="eyebrow">The full shelf</span><h2>Choose your challenge</h2></div></div><section class="grid">${cards()}</section>`;initCarousel()}
function list(view){clean();clean=()=>{};let t=view==='board'?'Board games':'Arcade games';app.innerHTML=`<div class="game-head"><button class="back" onclick="home()">←</button><h1>${t}</h1></div><section class="grid">${cards(view)}</section>`}
function shell(title,sub,body){clean();clean=()=>{};app.innerHTML=`<div class="game-head"><div><span class="eyebrow">HVN side room</span><h1>${title}</h1></div></div><div class="game-wrap"><p>${sub}</p>${body}</div>`}
window.play=id=>{const game={golf,snake,dodger,memory,reaction,word,clicker,flappy,platform,tic,checkers,trade}[id];if(typeof game!=='function')return;game();Shelf.record('game_play',{id});};window.home=home;document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>b.dataset.view==='home'?home():b.dataset.view==='rewards'?Shelf.render():b.dataset.view==='daily'?DailyChallenges.render():b.dataset.view==='cup'?ArcadeCup.render():list(b.dataset.view));
// Scores are optional: games still work when browser storage is unavailable.
function arcadeBest(key, score=0){
  try { const best=Math.max(Number(localStorage.getItem(key))||0,score); localStorage.setItem(key,best); return best; }
  catch { return score; }
}
function snake(){
  shell('Garden Snake','W A S D to steer · collect apples, find your rhythm.',`
    <div class="panel arcade-panel snake-panel">
      <div class="arcade-banner"><span>THE GARDEN CLUB</span><span>01 / SNAKE</span></div>
      <div class="arcade-settings">
        <label>Game mode<select id="snake-mode"><option value="classic">Classic</option><option value="wrap">Wrap</option><option value="maze">Maze</option><option value="feast">Feast</option></select></label>
        <label>Speed<select id="snake-speed"><option value="180">Chill</option><option value="125" selected>Normal</option><option value="85">Fast</option></select></label>
        <label>Apples<select id="snake-food"><option>1</option><option>3</option><option>5</option></select></label>
      </div>
      <p class="mode-note" id="mode-note"></p>
      <div class="arcade-stats"><span>APPLES <b id="score">00</b></span><span>BEST <b id="best">00</b></span><span id="snake-state">READY</span></div>
      <div class="arcade-stage"><canvas class="canvas" width="480" height="480" aria-label="Snake game board"></canvas>
        <div class="arcade-overlay" id="game-overlay"><span class="kicker">FRESH AIR. FRESH HIGH SCORE.</span><h2 id="overlay-title">A little room<br>to grow.</h2><p id="overlay-note">Pick your rules, then head into the garden.</p><button class="action" id="start-game">Start growing →</button></div>
      </div>
      <div class="controls"><button data-direction="w" aria-label="Move up">W ↑</button><button data-direction="a" aria-label="Move left">A ←</button><button data-direction="s" aria-label="Move down">S ↓</button><button data-direction="d" aria-label="Move right">D →</button><button id="pause-game" disabled>Pause</button><button id="restart-game">Restart</button></div>
      <p class="arcade-footnote">WASD or arrow keys · P to pause · settings start a fresh round</p>
    </div>`);
  const $=s=>document.querySelector(s), c=$('canvas'),x=c.getContext('2d');
  const runSession=GameRuns.session('snake');
  const mode=$('#snake-mode'),speed=$('#snake-speed'),count=$('#snake-food');
  const descriptions={classic:'The original recipe. Avoid the edges and your own tail.',wrap:'No borders. Leave one edge and emerge on the opposite side.',maze:'Take the scenic route. Garden hedges block your path.',feast:'An all-you-can-eat garden: eight apples on the board.'};
  let body,dir,queue,foods,walls,score,state='ready',timer=null;
  const equal=(a,b)=>a[0]===b[0]&&a[1]===b[1];
  const bestKey=()=>`garden-snake-${mode.value}-${speed.value}-${mode.value==='feast'?8:count.value}`;
  function fillFood(){
    const free=[];
    for(let y=0;y<20;y++)for(let x=0;x<20;x++){
      const p=[x,y]; if(!body.some(b=>equal(b,p))&&!walls.some(b=>equal(b,p))&&!foods.some(b=>equal(b,p)))free.push(p);
    }
    const target=mode.value==='feast'?8:Number(count.value);
    while(foods.length<target&&free.length)foods.push(free.splice(Math.floor(runSession.random()*free.length),1)[0]);
    return foods.length>0;
  }
  function hud(){ $('#score').textContent=String(score).padStart(2,'0'); $('#best').textContent=String(arcadeBest(bestKey(),score)).padStart(2,'0'); $('#snake-state').textContent=state.toUpperCase(); $('#pause-game').disabled=state==='ready'||state==='over'; $('#pause-game').textContent=state==='paused'?'Resume':'Pause'; }
  function overlay(title,note,button){$('#game-overlay').hidden=false;$('#overlay-title').textContent=title;$('#overlay-note').textContent=note;$('#start-game').textContent=button;}
  function draw(){
    for(let row=0;row<20;row++)for(let col=0;col<20;col++){x.fillStyle=(row+col)%2?'#c8dea2':'#d1e5af';x.fillRect(col*24,row*24,24,24);}
    walls.forEach(([a,b])=>{x.fillStyle='#426345';x.fillRect(a*24+1,b*24+1,22,22);x.fillStyle='#658653';x.fillRect(a*24+4,b*24+3,13,5);});
    foods.forEach(([a,b])=>{const px=a*24,py=b*24;x.fillStyle='#a53f39';x.beginPath();x.arc(px+12,py+14,8,0,Math.PI*2);x.fill();x.fillStyle='#ef6950';x.beginPath();x.arc(px+10,py+12,6,0,Math.PI*2);x.fill();x.fillStyle='#416148';x.fillRect(px+11,py+2,3,6);x.fillRect(px+14,py+3,5,3);x.fillStyle='#ffd8a1';x.fillRect(px+7,py+9,3,3);});
    const skin=Shelf.palette('snake');
    body.slice().reverse().forEach(([a,b],index)=>{x.fillStyle=index===body.length-1?skin.accent:skin.main;x.beginPath();x.roundRect(a*24+1,b*24+1,22,22,7);x.fill();});
    const [a,b]=body[0],dx=dir[0],dy=dir[1];
    for(const side of [-1,1]){const ex=a*24+12+dx*5+dy*side*5,ey=b*24+12+dy*5+dx*side*5;x.fillStyle='#fff9db';x.fillRect(ex-3,ey-3,6,6);x.fillStyle='#153b36';x.fillRect(ex-1+dx,ey-1+dy,3,3);}
  }
  function reset(start=false){
    runSession.reset();clearInterval(timer);body=[[8,10],[7,10],[6,10]];dir=[1,0];queue=[];foods=[];walls=[];score=0;state='ready';
    if(mode.value==='maze')for(const row of [5,14])for(let col=4;col<16;col++)if(col!==9&&col!==10)walls.push([col,row]);
    count.disabled=runSession.cup||mode.value==='feast';$('#mode-note').textContent=descriptions[mode.value];fillFood();hud();draw();overlay('A little room to grow.','Pick your rules, then head into the garden.','Start growing →');if(start)run();
  }
  function finish(won=false){if(state==='over')return;state='over';clearInterval(timer);hud();overlay(won?'Garden complete!':'That’s a wrap.',`${score} apples collected. ${won?'You filled the garden!':'A fresh round is one click away.'}`,runSession.cup?'See Cup standings →':'Play again →');runSession.finish({score,complete:won});}
  function tick(){
    if(state!=='running')return;
    if(queue.length)dir=queue.shift();
    let head=[body[0][0]+dir[0],body[0][1]+dir[1]];
    if(mode.value==='wrap')head=head.map(n=>(n+20)%20);
    const foodIndex=foods.findIndex(f=>equal(f,head)),growing=foodIndex>=0;
    // The tail moves away on non-eating turns and is safe to enter.
    if(head.some(n=>n<0||n>=20)||walls.some(w=>equal(w,head))||(growing?body:body.slice(0,-1)).some(b=>equal(b,head)))return finish();
    body.unshift(head);if(growing){foods.splice(foodIndex,1);score++;Shelf.record('snake_score',{score});runSession.progress({score});}else body.pop();
    const hasFood=fillFood();draw();hud();if(!hasFood)finish(true);
  }
  function run(){if(state==='over')return runSession.cup?ArcadeCup.render():reset(true);runSession.start(`${mode.value}-${speed.value}-${count.value}`);state='running';$('#game-overlay').hidden=true;hud();clearInterval(timer);timer=setInterval(tick,Number(speed.value));}
  function pause(){if(state==='running'){state='paused';runSession.pause();clearInterval(timer);hud();overlay('Take a breather.','Your garden will be right here.','Keep growing →');}else if(state==='paused')run();}
  function steer(key){
    const direction={w:[0,-1],a:[-1,0],s:[0,1],d:[1,0],ArrowUp:[0,-1],ArrowLeft:[-1,0],ArrowDown:[0,1],ArrowRight:[1,0]}[key];
    if(!direction||state==='over'||state==='paused')return;
    const last=queue.length?queue[queue.length-1]:dir;
    if(queue.length<2&&!equal(direction,last)&&!(direction[0]===-last[0]&&direction[1]===-last[1]))queue.push(direction);
    if(state==='ready')run();
  }
  const keydown=e=>{if(e.target.closest('select,input,textarea,button')||e.ctrlKey||e.metaKey||e.altKey)return;const key=e.key.length===1?e.key.toLowerCase():e.key;if(['w','a','s','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','p'].includes(key)){e.preventDefault();if(e.repeat)return;if(key==='p')pause();else steer(key);}};
  const blur=()=>{if(state==='running')pause();};const visibility=()=>{if(document.hidden)blur();};
  addEventListener('keydown',keydown);addEventListener('blur',blur);document.addEventListener('visibilitychange',visibility);
  document.querySelectorAll('[data-direction]').forEach(b=>b.onclick=()=>{steer(b.dataset.direction);b.blur();});
  $('#start-game').onclick=()=>{$('#start-game').blur();run();};$('#pause-game').onclick=()=>{pause();$('#pause-game').blur();};$('#restart-game').onclick=()=>{reset(true);$('#restart-game').blur();};
  [mode,speed,count].forEach(el=>el.onchange=()=>{reset();el.blur();});
  if(runSession.cup){mode.value='wrap';speed.value='125';count.value='1';}runSession.mount(()=>finish());
  clean=()=>{runSession.dispose();clearInterval(timer);removeEventListener('keydown',keydown);removeEventListener('blur',blur);document.removeEventListener('visibilitychange',visibility);};reset();
}
function dodger(){
  shell('Space Dodger','Mars perimeter · hold the line against an incoming fleet.',`
    <div class="panel arcade-panel shooter-panel">
      <div class="arcade-banner"><span>MARS / ORBITAL DEFENCE</span><span>STARFIGHTER SURVIVAL</span></div>
      <div class="arcade-stats"><span>SCORE <b id="score">0000</b></span><span>BEST <b id="best">0000</b></span><span id="shooter-state">READY</span></div>
      <div class="shooter-status"><span id="wave-label">WAVE 01</span><span id="hull-label">HULL ●●●</span><span id="weapon-label">SINGLE SHOT</span></div>
      <div class="arcade-stage"><canvas class="canvas" width="640" height="480" aria-label="Starfighter survival above Mars. Move with WASD or arrow keys; weapons fire automatically."></canvas>
        <div class="arcade-overlay" id="game-overlay"><span class="kicker">LAST SHIP ON THE RED FRONTIER</span><h2 id="overlay-title">Defend the<br>red planet.</h2><p id="overlay-note">Move with WASD. Weapons fire automatically.<br>Collect upgrades. Face a boss every five waves.</p><button class="action" id="start-game">Launch fighter →</button></div>
      </div>
      <p class="shooter-message" id="mission-note" aria-live="polite">Flight clearance granted. Ready when you are.</p>
      <div class="controls"><button data-steer="w" aria-label="Move up">W ↑</button><button data-steer="a" aria-label="Move left">A ←</button><button data-steer="s" aria-label="Move down">S ↓</button><button data-steer="d" aria-label="Move right">D →</button><button id="pause-game" disabled>Pause</button><button id="restart-game">Restart</button></div>
      <p class="arcade-footnote">WASD / arrows · auto-fire · P to pause<br>Touch: drag the ship or hold direction buttons · U upgrade / + repair</p>
    </div>`);
  const $=s=>document.querySelector(s),c=$('canvas'),x=c.getContext('2d');x.imageSmoothingEnabled=false;
  const runSession=GameRuns.session('dodger');
  const keys=new Set(),pointers=new Map();let drag=null,raf,last=0,state='ready',ship,enemies,shots,hostile,pickups,particles,boss;
  let wave,score,kills,spawned,spawnTimer,fireTimer,elapsed,breakTimer,noticeTimer;
  const rect=(color,a,b,w,h)=>{x.fillStyle=color;x.fillRect(Math.round(a),Math.round(b),w,h);};
  const hit=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y)<a.r+b.r;
  const quota=()=>6+Math.min(wave*2,20);
  function message(text){$('#mission-note').textContent=text;noticeTimer=3;}
  function hud(){
    runSession.progress({score});
    $('#score').textContent=String(score).padStart(4,'0');$('#best').textContent=String(arcadeBest('space-dodger-mars',score)).padStart(4,'0');
    $('#shooter-state').textContent=state.toUpperCase();$('#wave-label').textContent=`WAVE ${String(wave).padStart(2,'0')}${wave%5===0?' / BOSS':''}`;
    $('#hull-label').textContent=`HULL ${'●'.repeat(ship.hp)}${'○'.repeat(3-ship.hp)}`;$('#weapon-label').textContent=['SINGLE SHOT','TWIN SHOT','TRIPLE SHOT'][ship.weapon-1];
    $('#pause-game').disabled=state==='ready'||state==='over';$('#pause-game').textContent=state==='paused'?'Resume':'Pause';
  }
  function overlay(title,note,button){$('#game-overlay').hidden=false;$('#overlay-title').textContent=title;$('#overlay-note').textContent=note;$('#start-game').textContent=button;}
  function burst(px,py,color){for(let i=0;i<14;i++){const angle=i*Math.PI/7,speed=30+Math.random()*90;particles.push({x:px,y:py,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:.5+Math.random()*.3,color});}}
  function drop(px,py,type){pickups.push({x:px,y:py,r:15,type});}
  function startWave(){
    spawned=0;spawnTimer=.8;breakTimer=0;boss=null;
    if(wave%5===0){const hp=40+wave*4;boss={x:320,y:-65,r:49,hp,max:hp,fire:1.6,time:0};message(`WARNING / Wave ${wave}: dreadnought inbound.`);}
    else message(`Wave ${wave} / Incoming fighters and asteroid debris.`);
    hud();
  }
  function reset(start=false){
    runSession.reset();ship={x:320,y:400,r:12,hp:3,weapon:1,inv:0};enemies=[];shots=[];hostile=[];pickups=[];particles=[];boss=null;
    wave=1;score=0;kills=0;spawned=0;spawnTimer=.8;fireTimer=0;elapsed=0;breakTimer=0;noticeTimer=0;keys.clear();pointers.clear();drag=null;state='ready';hud();draw();
    message('Flight clearance granted. Ready when you are.');overlay('Defend the red planet.','Move with WASD. Auto-fire is on. Collect upgrades. Boss every five waves.','Launch fighter →');if(start)run();
  }
  function run(){if(state==='over')return runSession.cup?ArcadeCup.render():reset(true);runSession.start('mars');if(state==='ready')startWave();state='running';last=0;$('#game-overlay').hidden=true;hud();}
  function pause(){keys.clear();pointers.clear();drag=null;if(state==='running'){state='paused';runSession.pause();hud();overlay('Orbit on hold.','Take a breather, pilot.','Resume mission →');}else if(state==='paused')run();}
  function damage(){
    if(ship.inv>0||state!=='running')return;
    ship.hp--;ship.inv=1.5;burst(ship.x,ship.y,'#ffbb82');hud();
    if(ship.hp===0){state='over';keys.clear();pointers.clear();drag=null;hud();overlay('Signal lost.',`Score ${score} · Wave ${wave}. Mars needs another pilot.`,runSession.cup?'See Cup standings →':'Launch again →');runSession.finish({score});}
    else message('Hull hit / temporary shield active.');
  }
  function fire(){
    const offsets=ship.weapon===1?[0]:ship.weapon===2?[-8,8]:[-12,0,12];
    offsets.forEach(offset=>shots.push({x:ship.x+offset,y:ship.y-20,r:4,vx:ship.weapon===3?offset*4:0}));
  }
  function aim(source,speed,spread=0){const angle=Math.atan2(ship.y-source.y,ship.x-source.x)+spread;hostile.push({x:source.x,y:source.y+14,r:5,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed});}
  function update(dt){
    if(state!=='running')return;
    elapsed+=dt;noticeTimer=Math.max(0,noticeTimer-dt);ship.inv=Math.max(0,ship.inv-dt);
    let dx=0,dy=0;const held=k=>keys.has(k)||[...pointers.values()].includes(k);
    dx=(held('d')?1:0)-(held('a')?1:0);dy=(held('s')?1:0)-(held('w')?1:0);
    if(drag){dx=drag.x-ship.x;dy=drag.y-ship.y;const distance=Math.hypot(dx,dy);if(distance){const step=Math.min(distance,260*dt);ship.x+=dx/distance*step;ship.y+=dy/distance*step;}}
    else {const magnitude=Math.hypot(dx,dy)||1;ship.x+=dx/magnitude*260*dt;ship.y+=dy/magnitude*260*dt;}
    ship.x=Math.max(20,Math.min(620,ship.x));ship.y=Math.max(28,Math.min(452,ship.y));
    fireTimer-=dt;if(fireTimer<=0){fire();fireTimer=.19;}
    if(breakTimer>0){breakTimer-=dt;if(breakTimer<=0){wave++;startWave();}}
    else if(wave%5!==0&&spawned<quota()){
      spawnTimer-=dt;if(spawnTimer<=0){const rock=spawned%3===2;enemies.push({x:35+runSession.random()*570,y:-28,r:rock?21:17,hp:rock?3:2,kind:rock?'rock':'fighter',vy:55+Math.min(wave*7,100),fire:1+runSession.random(),phase:runSession.random()*6});spawned++;spawnTimer=Math.max(.4,1.1-wave*.04);}
    }
    enemies.forEach(e=>{e.y+=e.vy*dt;e.x=Math.max(e.r,Math.min(640-e.r,e.x+Math.sin(elapsed*2+e.phase)*20*dt));e.fire-=dt;if(e.kind==='fighter'&&e.y>10&&e.y<340&&e.fire<=0){aim(e,130+Math.min(wave*5,65));e.fire=2;}});
    if(boss){boss.time+=dt;boss.y=Math.min(88,boss.y+55*dt);boss.x=320+Math.sin(boss.time*.65)*195;boss.fire-=dt;if(boss.y>35&&boss.fire<=0){[-.36,-.18,0,.18,.36].forEach(a=>aim(boss,155+Math.min(wave*3,60),a));boss.fire=Math.max(.7,1.6-wave*.035);}}
    shots.forEach(b=>{b.y-=460*dt;b.x+=b.vx*dt;if(boss&&hit(b,boss)){b.dead=true;boss.hp--;burst(b.x,b.y,'#8bf0e2');}else {const target=enemies.find(e=>e.hp>0&&hit(b,e));if(target){b.dead=true;target.hp--;burst(b.x,b.y,'#f6c784');}}});
    enemies.filter(e=>e.hp<=0).forEach(e=>{score+=e.kind==='rock'?40:100;kills++;burst(e.x,e.y,'#ff9e69');if(kills%5===0)drop(e.x,e.y,'upgrade');else if(kills%9===0)drop(e.x,e.y,'repair');hud();});
    enemies=enemies.filter(e=>e.hp>0&&e.y<515);
    if(boss&&boss.hp<=0){Shelf.record('shooter_boss',{});score+=1000+wave*100;burst(boss.x,boss.y,'#ffaf78');burst(boss.x-35,boss.y,'#8bf0e2');drop(boss.x,boss.y,'repair');boss=null;hostile=[];hud();}
    hostile.forEach(b=>{b.x+=b.vx*dt;b.y+=b.vy*dt;if(hit(b,ship)){b.dead=true;damage();}});
    enemies.forEach(e=>{if(hit(e,ship))damage();});if(boss&&hit(boss,ship))damage();
    if(state==='over')return;
    pickups.forEach(p=>{p.y+=65*dt;if(hit(p,ship)){p.dead=true;if(p.type==='upgrade'){if(ship.weapon<3)ship.weapon++;else score+=150;message(ship.weapon===3?'Triple shot online / maximum firepower.':'Twin shot online.');}else{ship.hp=Math.min(3,ship.hp+1);message('Repair cell collected / hull restored.');}hud();}});
    shots=shots.filter(b=>!b.dead&&b.y>-25&&b.x>-10&&b.x<650);hostile=hostile.filter(b=>!b.dead&&b.y<500&&b.y>-30&&b.x>-30&&b.x<670);pickups=pickups.filter(p=>!p.dead&&p.y<510);
    particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;});particles=particles.filter(p=>p.life>0).slice(-250);
    if(state==='running'&&!breakTimer&&!boss&&((wave%5===0)||(spawned>=quota()&&enemies.length===0))){breakTimer=3;hostile=[];drop(ship.x,Math.max(30,ship.y-85),'upgrade');message(`Wave ${wave} clear / upgrade incoming. Next wave in 3 seconds.`);}
  }
  function draw(){
    rect('#0b1427',0,0,640,480);
    for(let i=0;i<7;i++)rect(['#10192e','#141b31','#191e34','#202036','#292237','#33263a','#3e2b3d'][i],0,150+i*48,640,49);
    for(let i=0;i<90;i++){const depth=i%3+1,px=(i*137+29)%640,py=(i*79+elapsed*depth*7)%480;rect(i%4?'#637b99':'#c3d6d9',px,py,depth===3?2:1,depth===3?2:1);}
    // Mars' curved limb, atmosphere and stepped canyon bands, drawn in pixels.
    x.save();x.beginPath();x.arc(560,565,315,0,Math.PI*2);x.clip();rect('#d28565',190,240,450,240);
    for(let row=0;row<58;row++){const py=250+row*4;rect(['#9f584e','#aa6251','#b96e57','#ad5e50','#925049'][Math.floor(row/5)%5],180,py,460,4);}
    for(let i=0;i<16;i++){const px=290+(i*97)%350,py=305+(i*43)%170;rect('#7b4246',px,py,36+i%3*12,8);rect('#894948',px-10,py+8,40,8);rect('#c0795c',px+5,py-4,32,4);}
    x.restore();x.strokeStyle='#d99271';x.lineWidth=4;x.beginPath();x.arc(560,565,317,Math.PI,Math.PI*2);x.stroke();x.strokeStyle='#633c52';x.lineWidth=5;x.beginPath();x.arc(560,565,323,Math.PI,Math.PI*2);x.stroke();
    // A distant orbital station against the planet.
    rect('#586274',69,132,68,3);rect('#354b65',73,119,19,27);rect('#354b65',115,119,19,27);rect('#a2a5a3',100,125,7,16);
    shots.forEach(b=>{rect('#75e4de',b.x-2,b.y-9,4,15);rect('#e1ffe7',b.x-1,b.y-9,2,9);});
    enemies.forEach(e=>{if(e.kind==='rock'){
      rect('#4b3543',e.x-17,e.y-19,30,38);rect('#8d655e',e.x-22,e.y-11,43,23);rect('#bb8670',e.x-13,e.y-16,22,8);rect('#61444b',e.x-10,e.y+1,12,10);rect('#63444a',e.x+11,e.y-5,8,9);
    }else{rect('#623447',e.x-18,e.y-12,36,22);rect('#e17f76',e.x-18,e.y-10,8,24);rect('#e17f76',e.x+10,e.y-10,8,24);rect('#bd5c6c',e.x-7,e.y-16,14,32);rect('#f6c17f',e.x-4,e.y+1,8,9);rect('#392d48',e.x-4,e.y-12,8,8);}});
    if(boss){const b=boss;rect('#392b45',b.x-55,b.y-24,110,46);rect('#925268',b.x-50,b.y-18,100,32);rect('#c67b7a',b.x-49,b.y-18,19,46);rect('#c67b7a',b.x+30,b.y-18,19,46);rect('#674059',b.x-25,b.y-34,50,61);rect('#eeaf83',b.x-16,b.y-10,32,12);rect('#80d9d0',b.x-8,b.y-8,16,8);rect('#162337',180,16,280,8);rect('#e79284',180,16,280*Math.max(0,b.hp/b.max),8);x.fillStyle='#f6ceac';x.font='10px monospace';x.textAlign='center';x.fillText('DREADNOUGHT',320,38);}
    hostile.forEach(b=>{rect('#fa946c',b.x-4,b.y-4,8,8);rect('#ffe2a4',b.x-2,b.y-2,4,4);});
    pickups.forEach(p=>{rect(p.type==='upgrade'?'#80e0d6':'#c4eaa4',p.x-12,p.y-12,24,24);rect('#15283a',p.x-9,p.y-9,18,18);x.fillStyle=p.type==='upgrade'?'#80e0d6':'#c4eaa4';x.font='bold 16px monospace';x.textAlign='center';x.fillText(p.type==='upgrade'?'U':'+',p.x,p.y+5);});
    if(ship.hp>0&&!(ship.inv>0&&Math.floor(elapsed*12)%2)){
      const a=ship.x,b=ship.y,skin=Shelf.palette('ship');rect('#f39568',a-5,b+18,10,10+Math.floor(elapsed*16)%3*3);rect('#ffe0a0',a-2,b+18,4,9);
      rect('#3d7790',a-21,b+3,42,13);rect(skin.accent,a-17,b,8,14);rect(skin.accent,a+9,b,8,14);rect(skin.main,a-7,b-17,14,38);rect('#6fbac5',a-4,b-9,8,13);rect('#233b57',a-3,b-7,6,9);rect('#eaa77c',a-3,b-22,6,7);
    }
    particles.forEach(p=>rect(p.color,p.x,p.y,3,3));
    for(let row=0;row<480;row+=4)rect('rgba(5,10,23,.10)',0,row,640,1);
  }
  function loop(now){const dt=last?Math.min((now-last)/1000,.035):0;last=now;if(state==='running'){update(dt);draw();}raf=requestAnimationFrame(loop);}
  const normalize=k=>({ArrowUp:'w',ArrowLeft:'a',ArrowDown:'s',ArrowRight:'d'}[k]||k.toLowerCase());
  const keydown=e=>{if(e.target.closest('button,select,input,textarea')||e.ctrlKey||e.metaKey||e.altKey)return;const k=normalize(e.key);if(!['w','a','s','d','p'].includes(k))return;e.preventDefault();if(k==='p'){if(!e.repeat)pause();}else{if(state==='ready')run();if(state==='running')keys.add(k);}};
  const keyup=e=>keys.delete(normalize(e.key));const blur=()=>{keys.clear();pointers.clear();drag=null;if(state==='running')pause();};const visibility=()=>{if(document.hidden)blur();};
  addEventListener('keydown',keydown);addEventListener('keyup',keyup);addEventListener('blur',blur);document.addEventListener('visibilitychange',visibility);
  document.querySelectorAll('[data-steer]').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);if(state==='ready')run();if(state==='running')pointers.set(e.pointerId,b.dataset.steer);};b.onpointerup=b.onpointercancel=b.onlostpointercapture=e=>pointers.delete(e.pointerId);});
  function point(e){const box=c.getBoundingClientRect();return {x:(e.clientX-box.left)*640/box.width,y:(e.clientY-box.top)*480/box.height,id:e.pointerId};}
  c.onpointerdown=e=>{e.preventDefault();if(state==='running'){c.setPointerCapture(e.pointerId);drag=point(e);}};c.onpointermove=e=>{if(drag&&drag.id===e.pointerId)drag=point(e);};c.onpointerup=c.onpointercancel=c.onlostpointercapture=e=>{if(drag&&drag.id===e.pointerId)drag=null;};
  $('#start-game').onclick=()=>{$('#start-game').blur();run();};$('#pause-game').onclick=()=>{pause();$('#pause-game').blur();};$('#restart-game').onclick=()=>{reset(true);$('#restart-game').blur();};
  clean=()=>{runSession.dispose();cancelAnimationFrame(raf);removeEventListener('keydown',keydown);removeEventListener('keyup',keyup);removeEventListener('blur',blur);document.removeEventListener('visibilitychange',visibility);};
  runSession.mount(()=>{state='over';keys.clear();pointers.clear();drag=null;hud();overlay('Cup time!',`Score ${score}. Your round is saved.`,'See Cup standings →');runSession.finish({score});});
  reset();raf=requestAnimationFrame(loop);
}
function memory(){
  const runSession=GameRuns.session('memory');
  const icons=['🌙','🌙','🍒','🍒','🪐','🪐','🎲','🎲','🌵','🌵','🎯','🎯','🦋','🦋','🎸','🎸'];
  for(let i=icons.length-1;i>0;i--){const j=Math.floor(runSession.random()*(i+1));[icons[i],icons[j]]=[icons[j],icons[i]];}
  let open=[],moves=0,pairs=0,pending=null,over=false,paused=false;
  shell('Memory Match','Find the eight pairs in as few moves as you can.',`<div class="panel"><div class="stats">MOVES <b id="score">0</b></div><div class="memory-stage"><div class="memory">${icons.map((_,i)=>`<button data-i="${i}" aria-label="Hidden card ${i+1}">?</button>`).join('')}</div><div class="memory-cover" hidden><h2>Take a breather.</h2><button class="action" id="memory-resume">Resume game</button></div></div><p id="memory-note" role="status">Find your first pair.</p><div class="controls">${runSession.cup?'<button id="memory-pause">Pause</button>':''}<button data-cup-restart onclick="memory()">New game</button></div></div>`);
  const buttons=[...document.querySelectorAll('.memory button')],note=document.querySelector('#memory-note');
  buttons.forEach((b,i)=>b.onclick=()=>{
    if(paused||over||b.classList.contains('open')||b.classList.contains('done')||open.length===2)return;
    runSession.start('eight-pairs');b.textContent=icons[i];b.setAttribute('aria-label',`Card ${i+1}: ${icons[i]}`);b.classList.add('open');open.push(i);
    if(open.length!==2)return;
    moves++;document.querySelector('#score').textContent=moves;
    const [a,z]=open;
    if(icons[a]===icons[z]){
      [a,z].forEach(q=>{buttons[q].classList.replace('open','done');buttons[q].disabled=true;});open=[];pairs++;
      note.textContent=pairs===8?`You won in ${moves} moves!`:`${pairs} of 8 pairs found.`;
      runSession.progress({pairs,moves});
      if(pairs===8){over=true;Shelf.record('memory_win',{moves});runSession.finish({pairs,moves,complete:true});if(runSession.cup)document.querySelector('#memory-pause').disabled=true;}
    }else{
      note.textContent='Not a match. Try to remember those cards.';
      pending=setTimeout(()=>{[a,z].forEach(q=>{buttons[q].textContent='?';buttons[q].classList.remove('open');buttons[q].setAttribute('aria-label',`Hidden card ${q+1}`);});open=[];},650);
    }
  });
  const pause=()=>{if(over)return;paused=!paused;document.querySelector('.memory').style.visibility=paused?'hidden':'';document.querySelector('.memory-cover').hidden=!paused;if(paused)runSession.pause();else runSession.resume();if(runSession.cup)document.querySelector('#memory-pause').textContent=paused?'Resume':'Pause';};
  const blur=()=>{if(runSession.cup&&!paused&&!over)pause();},visibility=()=>{if(document.hidden)blur();};
  document.querySelector('#memory-resume').onclick=pause;
  if(runSession.cup){document.querySelector('#memory-pause').onclick=pause;addEventListener('blur',blur);document.addEventListener('visibilitychange',visibility);}
  runSession.mount(()=>{over=true;clearTimeout(pending);buttons.forEach(b=>b.disabled=true);note.textContent=`Cup time! ${pairs} pairs found in ${moves} moves.`;document.querySelector('#memory-pause').disabled=true;runSession.finish({pairs,moves,complete:false});});
  clean=()=>{runSession.dispose();clearTimeout(pending);removeEventListener('blur',blur);document.removeEventListener('visibilitychange',visibility);};
}

function reaction(){
  let state='ready',start=0,pending=null;
  shell('Reaction Test','Wait for green, then tap as fast as you can.',`<div class="panel"><button class="reaction" id="react">Click to start</button><div class="controls"><button onclick="reaction()">Reset</button></div></div>`);
  const e=document.querySelector('#react'),runSession=GameRuns.session('reaction');
  e.onclick=()=>{
    if(state==='ready'){
      runSession.reset();runSession.start('signal');state='wait';e.textContent='Wait for green…';e.style.background='#ff5d8f';
      pending=setTimeout(()=>{state='go';start=performance.now();e.textContent='CLICK!';e.style.background='#67e2b1';},1800+Math.random()*2500);
    }else if(state==='wait'){
      clearTimeout(pending);state='ready';e.textContent='Too early — try again.';e.style.background='#e5e8ed';
    }else if(state==='go'){
      const ms=Math.round(performance.now()-start);state='ready';e.textContent=`${ms} ms — click to go again`;e.style.background='#e5e8ed';
      if(ms>0){Shelf.record('reaction_result',{ms});runSession.finish({ms});}
    }
  };
  const blur=()=>{if(state!=='ready'){clearTimeout(pending);state='ready';e.textContent='Round paused — click to try again.';e.style.background='#e5e8ed';}};
  const visibility=()=>{if(document.hidden)blur();};
  addEventListener('blur',blur);document.addEventListener('visibilitychange',visibility);
  clean=()=>{runSession.dispose();clearTimeout(pending);removeEventListener('blur',blur);document.removeEventListener('visibilitychange',visibility);};
}
// Reserve exact matches first, then spend each remaining answer letter once.
function gradeVault(guess,answer){
  const result=Array(answer.length).fill('absent'),remaining={};
  [...answer].forEach((letter,i)=>{if(guess[i]===letter)result[i]='correct';else remaining[letter]=(remaining[letter]||0)+1;});
  [...guess].forEach((letter,i)=>{if(result[i]!=='correct'&&remaining[letter]>0){result[i]='present';remaining[letter]--;}});
  return result;
}
function word(){
  const answers={
    4:'ARCH BARN BEAM BELL BIRD BLUE BOAT BOLT BOOK BOOT BOWL BRIM CAFE CALM CAMP CAVE CLAY COAL COAT CODE COIN COLD COVE CREW CUBE DAWN DECK DEER DESK DICE DOME DOOR DRUM DUNE DUSK ECHO FERN FILM FIRE FISH FLAG FOAM FROG GATE GEAR GLOW GOLD HARP HAZE HILL HOME IRIS JADE JAZZ JUMP KITE KIWI LAKE LAMP LEAF LIME LION LOOM LUCK LUNA MARS MINT MOON MOSS NEST NOVA OPAL ORCA OVEN PALM PATH PEAR PINE PLUM POND POOL QUIZ RAIN REEF RICE RING ROAD ROCK ROOF ROSE RUBY SAIL SALT SAND SEED SHIP SILK SNOW SOAP SOUL STAR STEM SURF SWAN TENT TIDE TILE TIME TONE TREE TUNE TWIN VASE VINE WAVE WIND WING WOLF WOOD YARN ZERO ZINC',
    5:'ALBUM APPLE BEACH BERRY BLADE BLOOM BOARD BRAVE BREAD BRICK BRUSH CABIN CABLE CANDY CHAIR CHARM CHESS CHIME CLIFF CLOCK CLOUD CORAL CRANE CREAM CROWN DANCE DELTA DREAM DRIFT EAGLE EARTH EMBER FABLE FIELD FLAME FLARE FLOAT FLOOR FLUTE FOCUS FROST FRUIT GHOST GIANT GLASS GLOBE GRACE GRAIN GRAPE GRASS GREEN GROVE GUARD HAVEN HEART HONEY HORSE HOTEL HOUSE IVORY JELLY JEWEL JUICE KNIFE LEMON LIGHT LILAC LUNAR MAGIC MANGO MAPLE METAL MIGHT MOOSE MOSSY MOUNT MOUSE MUSIC NIGHT OCEAN OLIVE ORBIT OTTER PAINT PAPER PEACH PEARL PIANO PILOT PIXEL PLANE PLANT PLATE PLAZA PLUME POINT POLAR PRISM PULSE QUEEN QUIET QUILL RADIO RAVEN RIVER ROBIN ROBOT ROUND ROYAL SANDY SCALE SCARF SCENE SCOUT SEVEN SHADE SHAPE SHARK SHELL SHINE SHORE SKATE SKILL SLATE SMILE SMOKE SOLAR SOLID SPACE SPARK SPEAR SPICE SPOON SPRAY STACK STAGE STAIR STAMP STEAM STEEL STONE STORM STORY SUGAR SUNNY SWIFT TABLE TIGER TORCH TOWER TRACK TRAIL TRAIN TREAT TULIP TWIST VAULT VIVID VOICE WATER WHALE WHEAT WHEEL WHISK WHITE WORLD YACHT YOUNG ZEBRA',
    6:'ANCHOR ANIMAL ARCADE AUTUMN AVENUE BAMBOO BANANA BANNER BASKET BEACON BEAUTY BEETLE BOTTLE BREEZE BRIDGE BRIGHT BRONZE BUBBLE BUTTON CACTUS CAMERA CANDLE CANYON CASTLE CHERRY CIRCLE CLOUDY COBALT COFFEE COMETS COPPER COSMIC COTTON CRATER DANCER DESERT DRAGON DREAMS ECHOES EMPIRE ENERGY ENGINE FABRIC FALCON FEATHER FINGER FLIGHT FLOWER FOREST FOSSIL FROZEN GALAXY GARDEN GENTLE GLIDER GOLDEN GUITAR HAMMER HARBOR HELMET HIDDEN ISLAND JACKET JIGSAW JUNGLE KETTLE KITTEN LADDER LAUNCH LEGEND LETTER LITTLE LOCKER MAGNET MARBLE MARKET MEADOW MELODY MEMORY METEOR MIRROR MONKEY MOTHER MUSEUM NARROW NATURE NEBULA NICKEL NOODLE ORANGE ORCHID ORIGIN OYSTER PALACE PEBBLE PENCIL PEPPER PLANET POCKET PORTAL POTATO PUZZLE QUARTZ RABBIT RACING RADISH RANGER RECORD RIBBON ROCKET SADDLE SAFARI SAILOR SATURN SCREEN SECRET SHADOW SHIELD SIGNAL SILVER SKETCH SMOOTH SOCKET SPHERE SPIDER SPIRAL SPRING SQUARE STREAM STREET STRIPE STRONG SUMMER SUNSET SYMBOL TEMPLE TENNIS THRONE TIMBER TOMATO TRAVEL TUNNEL TURTLE VALLEY VELVET VIOLET VISION VOYAGE WALNUT WINDOW WINTER WIZARD WONDER YELLOW ZIPPER'
  };
  Object.keys(answers).forEach(n=>answers[n]=answers[n].split(' ').filter(w=>w.length===+n));
  const allowed=new Set(typeof vaultDictionary==='undefined'?[]:vaultDictionary);Object.values(answers).flat().forEach(w=>allowed.add(w));
  const profiles={};let size=5,draft='',busy=false,timer=null,flash=-1,notice='',storageOK=true;
  function fresh(previous){const pool=answers[size].filter(w=>w!==previous);return {answer:pool[Math.floor(Math.random()*pool.length)],guesses:[],status:'playing'};}
  function profile(n){
    if(profiles[n])return profiles[n];
    let data;try{data=JSON.parse(localStorage.getItem(`word-vault-${n}`));}catch{storageOK=false;}
    const validStats=data&&['wins','played','streak','best'].every(k=>Number.isSafeInteger(data[k])&&data[k]>=0);
    if(!validStats)data={wins:0,played:0,streak:0,best:0};
    const round=data.round;
    if(!round||!answers[n].includes(round.answer)||!Array.isArray(round.guesses)||round.guesses.length>6||!round.guesses.every(g=>typeof g==='string'&&g.length===n&&allowed.has(g))||new Set(round.guesses).size!==round.guesses.length){data.round=fresh();}
    else data.round.status=round.guesses.includes(round.answer)?'won':round.guesses.length===6?'lost':'playing';
    profiles[n]=data;return data;
  }
  function save(){try{localStorage.setItem(`word-vault-${size}`,JSON.stringify(profile(size)));}catch{storageOK=false;}}
  shell('Word Vault','One hidden word. Six attempts. Crack the code.',`
    <div class="panel vault-panel"><div class="vault-topline"><span>LEXICON SYSTEMS / TERMINAL 04</span><span class="vault-led">● ONLINE</span></div>
      <div class="vault-heading"><div><span class="kicker">SIX TRIES. ONE WAY IN.</span><h2>Access by instinct.<br>Unlock with logic.</h2></div><label class="vault-size">CODE LENGTH<select id="vault-size"><option value="4">4 letters</option><option value="5" selected>5 letters</option><option value="6">6 letters</option></select></label></div>
      <div class="vault-stats"><span>WINS <b id="vault-wins">0</b></span><span>STREAK <b id="vault-streak">0</b></span><span>BEST <b id="vault-best">0</b></span></div>
      <div class="vault-readout"><span id="vault-attempt"></span><span id="vault-state"></span></div>
      <div id="vault-board" class="vault-board" role="group" aria-label="Six attempts to find the hidden word"></div>
      <p class="vault-notice" id="vault-notice" role="status" aria-live="polite"></p>
      <div class="vault-keyboard" id="vault-keyboard" aria-label="On-screen keyboard"></div>
      <div class="vault-legend"><span><i class="correct">✓</i> Right place</span><span><i class="present">↔</i> Move letter</span><span><i class="absent">×</i> No match left</span></div>
      <div class="vault-bottom"><button id="vault-new">New vault →</button><span id="vault-save-note">Type or tap · Enter to submit · ⌫ to delete</span></div>
      <details class="vault-help"><summary>How to crack the vault</summary><p>Enter a real word of the selected length. You have six attempts. Green letters are in the right place; amber letters belong elsewhere; grey letters have no remaining match. Each repeated letter needs its own match in the answer.</p><p>Each word length has its own saved puzzle and streak. Switching lengths keeps your progress. Starting a new vault after submitting a guess counts an unfinished puzzle as a loss and ends your streak.</p></details>
    </div>`);
  const runSession=GameRuns.session('word');
  const $=s=>document.querySelector(s),marks={correct:'✓',present:'↔',absent:'×'},labels={correct:'correct position',present:'different position',absent:'no remaining match'};
  function render(){
    const data=profile(size),round=data.round,keyboard={};
    const results=round.guesses.map(g=>gradeVault(g,round.answer));
    round.guesses.forEach((g,row)=>[...g].forEach((l,i)=>{const rank={absent:1,present:2,correct:3},result=results[row][i];if(!keyboard[l]||rank[result]>rank[keyboard[l]])keyboard[l]=result;}));
    $('#vault-board').style.setProperty('--letters',size);
    $('#vault-board').innerHTML=Array.from({length:6},(_,row)=>{
      const guess=round.guesses[row]||((row===round.guesses.length&&round.status==='playing')?draft:'');
      return `<div class="vault-row" role="group" aria-label="Attempt ${row+1}">${Array.from({length:size},(_,col)=>{const letter=guess[col]||'',result=results[row]?.[col]||'',reveal=flash===row;return `<div class="vault-tile ${result} ${letter?'filled':''} ${reveal?'reveal':''}" style="--delay:${col*100}ms" aria-label="${letter||'Empty'}${result?', '+labels[result]:''}"><span>${letter}</span>${result?`<small aria-hidden="true">${marks[result]}</small>`:''}</div>`;}).join('')}</div>`;
    }).join('');
    $('#vault-keyboard').innerHTML=['QWERTYUIOP','ASDFGHJKL','↵ZXCVBNM⌫'].map(row=>`<div class="vault-keyrow">${[...row].map(k=>`<button data-key="${k}" class="${keyboard[k]||''} ${'↵⌫'.includes(k)?'wide':''}" aria-label="${k==='↵'?'Submit guess':k==='⌫'?'Delete letter':k+(keyboard[k]?', '+labels[keyboard[k]]:'')}" ${busy||round.status!=='playing'?'disabled':''}>${k}</button>`).join('')}</div>`).join('');
    $('#vault-wins').textContent=data.wins;$('#vault-streak').textContent=data.streak;$('#vault-best').textContent=data.best;
    $('#vault-attempt').textContent=`ATTEMPT ${Math.min(round.guesses.length+1,6)} / 6`;
    $('#vault-state').textContent=busy?'DECODING…':round.status==='won'?'ACCESS GRANTED':round.status==='lost'?'ACCESS DENIED':`${size}-LETTER CIPHER`;
    $('#vault-notice').textContent=busy?'Checking your code…':notice||(round.status==='won'?`Vault unlocked: ${round.answer}. Solved in ${round.guesses.length} / 6.`:round.status==='lost'?`The code was ${round.answer}. A fresh vault awaits.`:round.guesses.length?'Use the clues to refine your next guess.':'Enter a word to start decoding.');
    $('#vault-new').disabled=busy;$('#vault-size').disabled=busy;
    $('#vault-new').textContent=round.status==='playing'&&round.guesses.length?'New vault (ends streak)':'New vault →';
    if(!storageOK)$('#vault-save-note').textContent='Storage unavailable · progress lasts for this visit';
  }
  function submit(){
    const data=profile(size),round=data.round;
    if(draft.length!==size){notice=`Enter ${size} letters before submitting.`;return render();}
    if(!allowed.has(draft)){notice='Word not recognised. Try another English word.';return render();}
    if(round.guesses.includes(draft)){notice='You already tried that code. Try a different word.';return render();}
    if(!round.challengeDay)round.challengeDay=runSession.start(`word-${size}`)?.day;else runSession.start(`word-${size}`,round.challengeDay);
    round.guesses.push(draft);flash=round.guesses.length-1;
    if(draft===round.answer){round.status='won';Shelf.record('word_win',{guesses:round.guesses.length});runSession.finish({guesses:round.guesses.length,complete:true});data.wins++;data.played++;data.streak++;data.best=Math.max(data.best,data.streak);}
    else if(round.guesses.length===6){round.status='lost';data.played++;data.streak=0;}
    draft='';notice='';busy=true;save();render();
    timer=setTimeout(()=>{busy=false;flash=-1;render();},size*100+300);
  }
  function input(key){
    if(busy||profile(size).round.status!=='playing')return;
    if(key==='Enter'||key==='↵')return submit();
    if(key==='Backspace'||key==='⌫')draft=draft.slice(0,-1);
    else if(/^[A-Z]$/.test(key)&&draft.length<size)draft+=key;
    else return;
    notice='';render();
  }
  const keydown=e=>{if(e.ctrlKey||e.metaKey||e.altKey||e.target.closest('select,input,textarea,summary'))return;if(e.target.closest('button')&&(e.key==='Enter'||e.key===' '))return;const k=e.key.length===1?e.key.toUpperCase():e.key;if(/^[A-Z]$/.test(k)||['Enter','Backspace'].includes(k)){e.preventDefault();if(!e.repeat||k==='Backspace')input(k);}};
  addEventListener('keydown',keydown);
  $('#vault-keyboard').onclick=e=>{const b=e.target.closest('[data-key]');if(b&&!b.disabled)input(b.dataset.key);};
  $('#vault-size').onchange=e=>{runSession.reset();size=+e.target.value;draft='';notice='';flash=-1;save();render();e.target.blur();};
  $('#vault-new').onclick=e=>{runSession.reset();const data=profile(size);if(data.round.status==='playing'&&data.round.guesses.length){data.played++;data.streak=0;}data.round=fresh(data.round.answer);draft='';notice='';flash=-1;save();render();e.target.blur();};
  clean=()=>{runSession.dispose();clearTimeout(timer);removeEventListener('keydown',keydown);};save();render();
}
function checkers(){
  let b=Array(64).fill(0),sel=null,turn='red',level='medium',playMode='computer',note='Your turn',over=false,mustCapture=null,pending=null;
  for(let i=0;i<24;i++)if((i+Math.floor(i/8))%2)b[i]='black';
  for(let i=40;i<64;i++)if((i+Math.floor(i/8))%2)b[i]='red';

  let moves=i=>{
    let p=b[i];if(!p)return[];
    let r=i>>3,c=i%8,dirs=(p==='red')?[-1]:(p==='black')?[1]:[-1,1],a=[];
    for(let dr of dirs)for(let dc of[-1,1]){
      let n=(r+dr)*8+c+dc,j=(r+2*dr)*8+c+2*dc;
      if(n>=0&&n<64&&Math.abs(n%8-c)===1&&!b[n])a.push({from:i,to:n});
      if(j>=0&&j<64&&Math.abs(j%8-c)===2&&b[n]&&b[n][0]!==p[0]&&!b[j])a.push({from:i,to:j,cap:n});
    }
    return a;
  };
  let allMoves=color=>b.flatMap((p,i)=>p&&p[0]===color?moves(i):[]);
  let legalMovesFor=i=>{
    if(over||(playMode==='computer'&&turn!=='red'))return[];
    if(mustCapture!==null)return i===mustCapture?moves(i).filter(m=>m.cap):[];
    let caps=allMoves(turn==='red'?'r':'b').filter(m=>m.cap),opts=moves(i);
    return caps.length?opts.filter(m=>m.cap):opts;
  };
  let apply=m=>{
    let piece=b[m.from];
    b[m.to]=piece;b[m.from]=0;
    if(m.cap)b[m.cap]=0;
    let row=m.to>>3;
    if(piece==='red'&&row===0)b[m.to]='redK';
    else if(piece==='black'&&row===7)b[m.to]='blackK';
  };

  let render=()=>{
    let targets=(!over&&sel!==null)?legalMovesFor(sel).map(m=>m.to):[];
    shell('Checkers','Capture every opposing piece. Pick how tactical the computer should be.',`<div class="difficulty">${['easy','medium','hard'].map(x=>`<button class="choice ${x===level?'active':''}" data-lvl="${x}" ${turn==='black'&&!over?'disabled':''}>${x}</button>`).join('')}</div><div class="stats">${note}</div><div class="checkers">${b.map((p,i)=>`<button class="square ${(i+(i>>3))%2?'dark':''}${i===sel?' selected':''}${targets.includes(i)?' move':''}" data-i="${i}">${p?`<span class="piece ${p[0]==='r'?'red':''}${p.endsWith('K')?' king':''}"></span>`:''}</button>`).join('')}</div><div class="controls"><button onclick="checkers()">New game</button></div>`);
    document.querySelector('.game-wrap>p').textContent=playMode==='computer'?'Capture every opposing piece. Pick how tactical the computer should be.':'Take turns on the same board. Red moves first.';
    const modeRow=document.createElement('div');modeRow.className='difficulty';modeRow.innerHTML=`<button class="choice ${playMode==='computer'?'active':''}" data-checkers-mode="computer">computer</button><button class="choice ${playMode==='local'?'active':''}" data-checkers-mode="local">2 players</button>`;document.querySelector('.difficulty').before(modeRow);
    document.querySelectorAll('[data-lvl]').forEach(x=>x.onclick=()=>{if(playMode==='computer'&&turn==='black'&&!over)return;level=x.dataset.lvl;render()});
    document.querySelectorAll('[data-checkers-mode]').forEach(x=>x.onclick=()=>{playMode=x.dataset.checkersMode;b=Array(64).fill(0);for(let i=0;i<24;i++)if((i+Math.floor(i/8))%2)b[i]='black';for(let i=40;i<64;i++)if((i+Math.floor(i/8))%2)b[i]='red';sel=null;turn='red';over=false;mustCapture=null;note='Your turn';render()});
    document.querySelectorAll('.square').forEach(x=>x.onclick=()=>click(+x.dataset.i));
    clean=()=>clearTimeout(pending);
  };

  let advanceToBot=()=>{
    if(allMoves('b').length===0){note='You win! The bot has no moves left.';over=true;Shelf.record('checkers_win',{});return render()}
    turn='black';note='Bot is thinking…';render();
    pending=setTimeout(()=>botStep(null),300);
  };
  let afterBot=()=>{
    if(allMoves('r').length===0){note='Bot wins! You have no moves left.';over=true;return render()}
    turn='red';note='Your turn';render();
  };
  let finishHumanTurn=()=>{
    if(playMode==='computer')return advanceToBot();
    let next=turn==='red'?'black':'red';
    if(allMoves(next==='red'?'r':'b').length===0){note=turn==='red'?'Red wins!':'Black wins!';over=true;return render()}
    turn=next;note=turn==='red'?'Red’s turn':'Black’s turn';render();
  };
  let botStep=forcedFrom=>{
    let opts;
    if(forcedFrom!=null)opts=moves(forcedFrom).filter(m=>m.cap);
    else{let caps=allMoves('b').filter(m=>m.cap);opts=caps.length?caps:allMoves('b')}
    if(!opts.length)return afterBot();
    if(level==='hard'&&forcedFrom==null){
      const moveScore=m=>{const before=b;b=b.slice();apply(m);const score=(m.cap?20:0)+(b[m.to]?.endsWith('K')?8:0)-allMoves('r').filter(x=>x.cap).length*12;b=before;return score};
      opts=[...opts].sort((x,y)=>moveScore(y)-moveScore(x));
    }
    let pick=forcedFrom!=null?opts[Math.floor(Math.random()*opts.length)]:opts[Math.floor(Math.random()*Math.min(opts.length,level==='easy'?opts.length:level==='medium'?3:1))];
    apply(pick);
    note=pick.cap?'Bot captured your piece!':'Bot moved.';
    render();
    if(pick.cap){
      let follow=moves(pick.to).filter(x=>x.cap);
      if(follow.length){note='Bot captured your piece and jumps again…';render();pending=setTimeout(()=>botStep(pick.to),450);return}
    }
    afterBot();
  };

  let click=i=>{
    if(over||(playMode==='computer'&&turn!=='red'))return;
    let p=b[i];
    if(mustCapture!==null){
      if(i===mustCapture||(p&&p[0]===(turn==='red'?'r':'b')))return;
      let m=legalMovesFor(mustCapture).find(x=>x.to===i);
      if(!m)return;
      apply(m);
      if(m.cap){
        let follow=moves(m.to).filter(x=>x.cap);
        if(follow.length){sel=m.to;mustCapture=m.to;note='Capture again with the same piece.';return render()}
      }
      sel=null;mustCapture=null;
      return finishHumanTurn();
    }
    if(p&&p[0]===(turn==='red'?'r':'b')){
      if(legalMovesFor(i).length===0){
        note=allMoves(turn==='red'?'r':'b').some(m=>m.cap)?'A capture is available — choose a piece that can capture.':'That piece has no legal moves.';
        sel=null;return render();
      }
      sel=i;note='Choose a highlighted square to move to.';return render();
    }
    if(sel===null)return;
    let m=legalMovesFor(sel).find(x=>x.to===i);
    if(!m){sel=null;note='Your turn';return render()}
    apply(m);
    if(m.cap){
      let follow=moves(m.to).filter(x=>x.cap);
      if(follow.length){sel=m.to;mustCapture=m.to;note='Capture again with the same piece.';return render()}
    }
    sel=null;
    finishHumanTurn();
  };

  render();
}
function trade(){
  const GROUP_COLORS={A:'var(--pink)',B:'var(--yellow)',C:'var(--blue)',D:'var(--mint)',E:'var(--violet)'};
  const TEMPLATE=[
    {name:'Founders Square',type:'start'},
    {name:'Cedar Row',type:'property',group:'A',price:60},
    {name:'Harbor Row',type:'property',group:'A',price:60},
    {name:'City Hall Fee',type:'tax',amount:50},
    {name:'Fortune',type:'event'},
    {name:'Maple Avenue',type:'property',group:'B',price:100},
    {name:'Birch Avenue',type:'property',group:'B',price:100},
    {name:'Elm Street',type:'property',group:'B',price:120},
    {name:'Rest Stop',type:'rest'},
    {name:'Cliffside',type:'property',group:'C',price:140},
    {name:'Fortune',type:'event'},
    {name:'Bayview',type:'property',group:'C',price:140},
    {name:'Market Square',type:'property',group:'C',price:160},
    {name:'City Hall Fee',type:'tax',amount:75},
    {name:'Riverside',type:'property',group:'D',price:180},
    {name:'Fortune',type:'event'},
    {name:'Riverside Park',type:'property',group:'D',price:180},
    {name:'Old Town',type:'property',group:'D',price:200},
    {name:'Grand Terminal',type:'property',group:'E',price:220},
    {name:'Uptown Heights',type:'property',group:'E',price:240}
  ];
  const HOUSE_LIMIT=4,START_CASH=1000,PASS_BONUS=150;
  const EVENTS=[{delta:120,text:'Tourism boom — extra visitors spend big.'},{delta:-60,text:'Unexpected repair bill.'},{delta:80,text:'City grant received.'},{delta:-40,text:'Parking fine issued.'},{delta:150,text:'Investor windfall!'},{delta:-90,text:'Storm damage cleanup.'}];
  const AVATARS=['🧑','🧑‍🎨','🤖','🐙'];
  const cap=s=>s[0].toUpperCase()+s.slice(1);

  let stage='setup',humanCount=1,botCount=2,difficulty='normal';
  let board=[],players=[],current=0,turnPhase='idle',log=[],pendingTimer=null,lastRoll=null;

  const rentOf=t=>t.rentBase*(t.houses+1);
  const houseCost=t=>Math.round(t.price*0.6);
  const addLog=m=>{log.unshift(m);if(log.length>40)log.length=40};
  const schedule=(fn,ms)=>{pendingTimer=setTimeout(fn,ms)};
  const owner=t=>t.owner!=null?players.find(x=>x.id===t.owner):null;

  function newBoard(){return TEMPLATE.map(t=>({...t,rentBase:t.price?Math.round(t.price*0.15):0,owner:null,houses:0}))}

  function startGame(){
    board=newBoard();
    players=Array.from({length:humanCount},(_,i)=>({id:i,name:humanCount===1?'You':`Player ${i+1}`,human:true,cash:START_CASH,pos:0,avatar:AVATARS[i]}));
    for(let i=0;i<botCount;i++)players.push({id:humanCount+i,name:'Bot '+(i+1),human:false,cash:START_CASH,pos:0,avatar:AVATARS[humanCount+i]});
    current=0;turnPhase='idle';log=[];lastRoll=null;
    addLog(`New game: ${humanCount} local player${humanCount>1?'s':''} and ${botCount} bot${botCount===1?'':'s'} (${difficulty} difficulty).`);
    stage='playing';
    render();
  }

  function shouldBuyProperty(p,tile){
    let afford=p.cash-tile.price;
    if(difficulty==='easy')return tile.price<=140?Math.random()<0.7:Math.random()<0.15;
    if(difficulty==='hard')return afford>=200;
    return afford>=150&&tile.price<=p.cash*0.6;
  }
  function shouldBuyHouse(p,tile){
    let cost=houseCost(tile);
    if(difficulty==='easy')return p.cash-cost>=100&&Math.random()<0.1;
    if(difficulty==='hard')return p.cash-cost>=250;
    return p.cash-cost>=150&&Math.random()<0.6;
  }

  function resolveTile(p){
    let tile=board[p.pos];
    if(tile.type==='tax'){let pay=Math.min(p.cash,tile.amount);p.cash-=pay;addLog(`${p.name} paid a $${pay} city hall fee at ${tile.name}.`)}
    else if(tile.type==='event'){let e=EVENTS[Math.floor(Math.random()*EVENTS.length)];p.cash=Math.max(0,p.cash+e.delta);addLog(`${p.name} hit Fortune: ${e.text} (${e.delta>0?'+':''}$${e.delta})`)}
    else if(tile.type==='property'){
      if(tile.owner==null)addLog(`${p.name} landed on ${tile.name} — unowned, $${tile.price}.`);
      else if(tile.owner===p.id)addLog(`${p.name} landed on their own property, ${tile.name}.`);
      else{let o=owner(tile),rent=rentOf(tile),pay=Math.min(p.cash,rent);p.cash-=pay;o.cash+=pay;addLog(`${p.name} paid $${pay} rent to ${o.name} for ${tile.name}.`)}
    }else if(tile.type==='start')addLog(`${p.name} is resting at ${tile.name}.`);
    else addLog(`${p.name} stopped to rest.`);
  }

  function doRoll(){
    let p=players[current],d=1+Math.floor(Math.random()*6),total=p.pos+d;
    lastRoll=d;
    if(total>=board.length){p.cash+=PASS_BONUS;addLog(`${p.name} passed ${board[0].name} and collected $${PASS_BONUS}.`)}
    p.pos=total%board.length;
    addLog(`${p.name} rolled a ${d} and moved to ${board[p.pos].name}.`);
    resolveTile(p);
    turnPhase='moved';
  }

  function rollDice(){if(stage==='playing'&&turnPhase==='idle'&&players[current].human){doRoll();render()}}
  function buyProperty(){
    if(stage!=='playing'||turnPhase!=='moved')return;
    let p=players[current],tile=board[p.pos];
    if(!p.human||tile.type!=='property'||tile.owner!=null||p.cash<tile.price)return;
    p.cash-=tile.price;tile.owner=p.id;Shelf.record('trade_properties',{count:board.filter(t=>t.type==='property'&&t.owner===p.id).length});
    addLog(`${p.name} bought ${tile.name} for $${tile.price}.`);
    render();
  }
  function buyHouse(){
    if(stage!=='playing'||turnPhase!=='moved')return;
    let p=players[current],tile=board[p.pos],cost=houseCost(tile);
    if(!p.human||tile.type!=='property'||tile.owner!==p.id||tile.houses>=HOUSE_LIMIT||p.cash<cost)return;
    p.cash-=cost;tile.houses++;
    addLog(`${p.name} built a house on ${tile.name} — rent is now $${rentOf(tile)}.`);
    render();
  }
  function endTurn(){if(stage==='playing'&&turnPhase==='moved'&&players[current].human)advanceTurn()}
  function advanceTurn(){
    current=(current+1)%players.length;
    turnPhase='idle';lastRoll=null;
    render();
    if(!players[current].human)schedule(botTurn,700);
  }
  function botTurn(){
    if(stage!=='playing'||players[current].human)return;
    doRoll();render();
    schedule(botAct,900);
  }
  function botAct(){
    let p=players[current],tile=board[p.pos];
    if(tile.type==='property'&&tile.owner==null&&p.cash>=tile.price&&shouldBuyProperty(p,tile)){
      p.cash-=tile.price;tile.owner=p.id;
      addLog(`${p.name} bought ${tile.name} for $${tile.price}.`);
      render();
    }else if(tile.type==='property'&&tile.owner===p.id&&tile.houses<HOUSE_LIMIT&&p.cash>=houseCost(tile)&&shouldBuyHouse(p,tile)){
      let cost=houseCost(tile);p.cash-=cost;tile.houses++;
      addLog(`${p.name} built a house on ${tile.name} — rent is now $${rentOf(tile)}.`);
      render();
    }
    schedule(advanceTurn,700);
  }

  const tilePlayers=i=>players.filter(p=>p.pos===i);

  function renderSetup(){
    shell('City Trader','Set up your game, then roll to build a property empire.',`
      <div class="trade-setup">
        <div class="setup-row"><span class="setup-label">Computer opponents</span><div class="difficulty">${[1,2,3].map(n=>`<button class="choice ${n===botCount?'active':''}" data-bots="${n}" aria-label="${n} bot${n>1?'s':''}">${n}</button>`).join('')}</div></div>
        <div class="setup-row"><span class="setup-label">Bot difficulty</span><div class="difficulty">${['easy','normal','hard'].map(x=>`<button class="choice ${x===difficulty?'active':''}" data-diff="${x}" aria-label="Difficulty ${x}">${cap(x)}</button>`).join('')}</div></div>
        <p class="setup-note">You'll play as <b>You</b> against ${botCount} computer opponent${botCount>1?'s':''} set to <b>${difficulty}</b> difficulty.</p>
        <div class="controls"><button class="action" id="startTradeBtn">Start game</button></div>
      </div>`);
    const peopleRow=document.createElement('div');peopleRow.className='setup-row';peopleRow.innerHTML=`<span class="setup-label">People at this computer</span><div class="difficulty"><button class="choice ${humanCount===1?'active':''}" data-people="1">1</button><button class="choice ${humanCount===2?'active':''}" data-people="2">2</button></div>`;document.querySelector('.setup-row').before(peopleRow);
    const zero=document.createElement('button');zero.className=`choice ${botCount===0?'active':''}`;zero.dataset.bots='0';zero.textContent='0';zero.setAttribute('aria-label','No computer opponents');document.querySelector('[data-bots]').before(zero);
    document.querySelector('.setup-note').innerHTML=`${humanCount} local player${humanCount>1?'s':''} and ${botCount} computer opponent${botCount===1?'':'s'} set to <b>${difficulty}</b> difficulty.`;
    document.querySelectorAll('[data-people]').forEach(b=>b.onclick=()=>{humanCount=+b.dataset.people;botCount=Math.min(botCount,4-humanCount);renderSetup()});
    document.querySelectorAll('[data-bots]').forEach(b=>b.onclick=()=>{botCount=+b.dataset.bots;renderSetup()});
    document.querySelectorAll('[data-diff]').forEach(b=>b.onclick=()=>{difficulty=b.dataset.diff;renderSetup()});
    document.querySelector('#startTradeBtn').onclick=startGame;
  }

  function renderGame(){
    let p=players[current],tile=board[p.pos];
    let canBuyProp=p.human&&turnPhase==='moved'&&tile.type==='property'&&tile.owner==null&&p.cash>=tile.price;
    let canBuyHouse=p.human&&turnPhase==='moved'&&tile.type==='property'&&tile.owner===p.id&&tile.houses<HOUSE_LIMIT&&p.cash>=houseCost(tile);
    let canRoll=p.human&&turnPhase==='idle';
    let canEnd=p.human&&turnPhase==='moved';
    shell('City Trader',`${humanCount} local player${humanCount>1?'s':''} · ${botCount} bot${botCount===1?'':'s'} · ${cap(difficulty)}`,`
      <div class="trade-shell">
        <div class="turn-banner" role="status">${p.human?'Your turn':`${p.name}'s turn (thinking…)`} — standing on <b>${tile.name}</b>${turnPhase==='moved'&&lastRoll?` (rolled a ${lastRoll})`:''}</div>
        <div class="trade-layout">
          <div class="trade-board" role="list" aria-label="City board">${board.map((t,i)=>`
            <div class="tile ${t.type}${i===p.pos?' current-tile':''}${t.owner!=null?' owned':''}" role="listitem">
              ${t.group?`<span class="tile-stripe" style="background:${GROUP_COLORS[t.group]}"></span>`:''}
              <span class="tile-name">${t.name}</span>
              <span class="tile-meta">${t.type==='property'?(t.owner!=null?`${owner(t).name}${t.houses?' · '+t.houses+' 🏠':''}`:'$'+t.price):t.type==='tax'?'Fee $'+t.amount:t.type==='event'?'Event':t.type==='start'?'Start & collect':'Rest'}</span>
              <span class="tile-tokens">${tilePlayers(i).map(pp=>`<span class="token" title="${pp.name}">${pp.avatar}</span>`).join('')}</span>
            </div>`).join('')}</div>
          <aside class="trade-side">
            <div class="side-panel players-panel">
              <h3>Players</h3>
              <ul class="player-list">${players.map((pl,i)=>`<li class="${i===current?'active-player':''}"><span class="p-avatar">${pl.avatar}</span><span class="p-name">${pl.name}</span><span class="p-cash">$${pl.cash}</span></li>`).join('')}</ul>
            </div>
            <div class="side-panel property-panel">
              <h3>Current property</h3>
              ${tile.type==='property'?`
                <p class="prop-name">${tile.name}</p>
                <dl class="prop-facts">
                  <div><dt>Price</dt><dd>$${tile.price}</dd></div>
                  <div><dt>Owner</dt><dd>${tile.owner!=null?owner(tile).name:'Unowned'}</dd></div>
                  <div><dt>Base rent</dt><dd>$${tile.rentBase}</dd></div>
                  <div><dt>Houses</dt><dd>${tile.houses} / ${HOUSE_LIMIT}</dd></div>
                  <div><dt>Current rent</dt><dd>${tile.owner!=null?'$'+rentOf(tile):'—'}</dd></div>
                </dl>`:`<p>${tile.name} has no purchasable property.</p>`}
            </div>
            <div class="side-panel trade-actions">
              <h3>Actions</h3>
              <div class="controls">
                <button class="action" id="rollBtn" ${canRoll?'':'disabled'}>Roll dice</button>
                <button id="buyPropBtn" ${canBuyProp?'':'disabled'}>Buy property${tile.type==='property'&&tile.owner==null?' ($'+tile.price+')':''}</button>
                <button id="buyHouseBtn" ${canBuyHouse?'':'disabled'}>Buy house${tile.type==='property'?' ($'+houseCost(tile)+')':''}</button>
                <button id="endTurnBtn" ${canEnd?'':'disabled'}>End turn</button>
              </div>
              ${!p.human?'<p class="bot-note">Waiting for the bot to play…</p>':''}
            </div>
            <div class="side-panel log-panel">
              <h3>Activity log</h3>
              <ul class="log-list" aria-live="polite">${log.map(l=>`<li>${l}</li>`).join('')}</ul>
            </div>
          </aside>
        </div>
        <div class="side-panel props-table-wrap">
          <h3>All properties</h3>
          <table class="props-table">
            <caption class="sr-only">Every property's price, owner, base rent, houses, and current rent</caption>
            <thead><tr><th>Name</th><th>Price</th><th>Owner</th><th>Base rent</th><th>Houses</th><th>Current rent</th></tr></thead>
            <tbody>${board.filter(t=>t.type==='property').map(t=>`<tr><td>${t.name}</td><td>$${t.price}</td><td>${t.owner!=null?owner(t).name:'—'}</td><td>$${t.rentBase}</td><td>${t.houses}</td><td>${t.owner!=null?'$'+rentOf(t):'—'}</td></tr>`).join('')}</tbody>
          </table>
        </div>
        <div class="controls"><button onclick="trade()">New game</button></div>
      </div>`);
    document.querySelector('#rollBtn').onclick=rollDice;
    document.querySelector('#buyPropBtn').onclick=buyProperty;
    document.querySelector('#buyHouseBtn').onclick=buyHouse;
    document.querySelector('#endTurnBtn').onclick=endTurn;
  }

  function render(){
    stage==='setup'?renderSetup():renderGame();
    clean=()=>clearTimeout(pendingTimer);
  }
  render();
}
function clicker(){expeditionCamp();}
function flappy(){
  shell('Sky Flyer','A sunset, a little prop plane, and a sky full of close calls.',`
    <div class="panel arcade-panel flyer-panel"><div class="arcade-banner"><span>SKY PATROL / 1986</span><span>02 / FLYER</span></div>
      <div class="arcade-stats"><span>GATES <b id="score">00</b></span><span>BEST <b id="best">00</b></span><span id="flight-state">READY</span></div>
      <div class="flight-level"><span id="flight-level" aria-live="polite"></span><span id="flight-progress"></span></div>
      <div class="arcade-stage"><canvas class="canvas" width="640" height="400" aria-label="Retro flying game"></canvas>
        <div class="arcade-overlay" id="game-overlay"><span class="kicker">ONE PLANE. OPEN SKIES.</span><h2 id="overlay-title">Chase the<br>horizon.</h2><p id="overlay-note">Tap W to climb. Hold S to dive.<br>Keep tapping to stay airborne. New level every 10 gates.</p><button class="action" id="start-game">Take off →</button></div>
      </div>
      <div class="controls"><button data-flight="w">W ↑ Climb</button><button data-flight="s">S ↓ Dive</button><button id="pause-game" disabled>Pause</button><button id="restart-game">Restart</button></div>
      <p class="arcade-footnote">Tap W to climb / hold S to dive · P to pause · clear a gate to score</p>
    </div>`);
  const $=s=>document.querySelector(s),c=$('canvas'),x=c.getContext('2d');x.imageSmoothingEnabled=false;
  const runSession=GameRuns.session('flappy');
  const keys=new Set(),touch=new Set();let y=200,v=0,pipes=[],score=0,state='ready',frame=0,last=0,elapsed=0,spawn=0,raf;
  const skies=[
    {name:'Sunset Run',sky:['#292544','#493458','#754466','#ab5b70','#db817a','#f3af88'],sun:'#fbd7a0',far:'#665171',near:'#393955',cloud:'#dc96a1',tower:'#3f6171',light:'#729195',cap:'#e6b76f',effect:'clouds'},
    {name:'Midnight Drift',sky:['#10172f','#192544','#25385b','#374c70','#526583','#71849a'],sun:'#d5e8eb',far:'#344766',near:'#23344f',cloud:'#60769a',tower:'#40517b',light:'#819bc0',cap:'#bfcfed',effect:'stars'},
    {name:'Neon Storm',sky:['#211836','#322142','#43304e','#4b455f','#4c6370','#638986'],sun:'#a3ecd2',far:'#405264',near:'#293f50',cloud:'#7e859f',tower:'#476961',light:'#83c2a7',cap:'#f0d481',effect:'rain'},
    {name:'Polar Flight',sky:['#17334f','#285775','#3d7a91','#65a0ac','#91c0c3','#c1ded2'],sun:'#edf5d4',far:'#6295a9',near:'#36667e',cloud:'#c6e0e2',tower:'#4b778b',light:'#b3e0de',cap:'#eaf1c9',effect:'snow'},
    {name:'Ember Valley',sky:['#302033','#512839','#773c42','#a95343','#d4774b','#ecab64'],sun:'#ffe3a0',far:'#89514f',near:'#513844',cloud:'#c7816b',tower:'#78544d',light:'#c18b69',cap:'#ffce79',effect:'embers'}
  ];
  const level=()=>Math.floor(score/10)+1;
  // Approach playable limits while making each successive level harder.
  const difficulty=n=>({gap:76+56*Math.pow(.82,n-1),speed:155+100*(1-Math.pow(.85,n-1))});
  function theme(){
    const n=level(),base=skies[(n-1)%skies.length],cycle=Math.floor((n-1)/skies.length);
    if(!cycle)return base;
    // Later circuits keep the weather cycle but introduce fresh colour palettes.
    const tint=(offset,light)=>`hsl(${(cycle*47+(n-1)%5*62+offset)%360} 35% ${light}%)`;
    return {...base,sky:base.sky.map((_,i)=>tint(0,14+i*9)),far:tint(12,32),near:tint(20,22),cloud:tint(0,65),tower:tint(25,35),light:tint(25,65),cap:tint(160,75),sun:tint(150,80)};
  }
  const rect=(color,a,b,w,h)=>{x.fillStyle=color;x.fillRect(Math.round(a),Math.round(b),w,h);};
  function hud(){$('#flight-level').textContent=`LEVEL ${String(level()).padStart(2,'0')} / ${theme().name}`;$('#flight-progress').textContent=`${10-score%10} gates to level ${level()+1}`;$('#score').textContent=String(score).padStart(2,'0');$('#best').textContent=String(arcadeBest('sky-flyer-retro',score)).padStart(2,'0');$('#flight-state').textContent=state.toUpperCase();$('#pause-game').disabled=state==='ready'||state==='over';$('#pause-game').textContent=state==='paused'?'Resume':'Pause';}
  function overlay(title,note,button){$('#game-overlay').hidden=false;$('#overlay-title').textContent=title;$('#overlay-note').textContent=note;$('#start-game').textContent=button;}
  function draw(){
    const palette=theme();
    palette.sky.forEach((color,i)=>rect(color,0,i*65,640,66));
    for(let i=0;i<8;i++)rect(palette.sun,430-i*3,62+i*8,88+i*6,6);
    for(let layer=0;layer<2;layer++)for(let i=0;i<9;i++){
      const px=((i*100-elapsed*(layer?22:9))%900+900)%900-130,base=layer?344:300;
      rect(layer?palette.near:palette.far,px,base-35,100,110);rect(layer?palette.near:palette.far,px+20,base-65,60,32);rect(layer?palette.near:palette.far,px+36,base-82,28,20);
    }
    for(let i=0;i<5;i++){const px=((i*172-elapsed*14)%860+860)%860-100;rect(palette.cloud,px,98+(i%3)*48,70,8);rect(palette.cloud,px+14,90+(i%3)*48,32,8);}
    // Weather stays behind the gates and plane so silhouettes remain clear.
    if(palette.effect==='stars')for(let i=0;i<35;i++){
      const px=(i*97+17)%640,py=(i*43+11)%255;
      rect(i%3===Math.floor(elapsed)%3?'#e5eef2':'#899abb',px,py,2,2);
    }
    if(palette.effect==='rain')for(let i=0;i<45;i++){
      const px=((i*67-elapsed*120)%680+680)%680,py=(i*41+elapsed*250)%388;
      rect('#8aafbb',px,py,2,10);
    }
    if(palette.effect==='snow')for(let i=0;i<35;i++){
      const px=((i*83+Math.sin(elapsed+i)*14-elapsed*20)%640+640)%640,py=(i*47+elapsed*35)%388;
      rect('#e0efea',px,py,i%3===0?4:2,2);
    }
    if(palette.effect==='embers')for(let i=0;i<30;i++){
      const px=((i*79-elapsed*30)%640+640)%640,py=((i*57-elapsed*45)%388+388)%388;
      rect(i%2?'#ffc985':'#eaa177',px,py,2,i%3===0?5:2);
    }
    pipes.forEach(p=>{
      for(const [top,height] of [[0,p.g],[p.g+p.gap,400-p.g-p.gap]]){
        rect('#202a3f',p.x,top,46,height);rect(palette.tower,p.x+5,top,34,height);rect(palette.light,p.x+6,top,5,height);rect('#2e475b',p.x+29,top,9,height);
        const cap=top===0?height-14:top;rect('#182638',p.x-4,cap,54,14);rect(palette.cap,p.x,cap+3,46,7);
        for(let i=0;i<4;i++)rect('#7c654f',p.x+i*12,cap+3,5,7);
      }
    });
    rect('#202a3f',0,388,640,12);for(let i=0;i<25;i++)rect('#567375',i*28-(elapsed*75)%28,388,16,3);
    // Original pixel-art prop plane; cosmetics never change the collision box.
    const skin=Shelf.palette('plane');
    rect('#fff0c2',111,y-3,8,4);rect(skin.accent,106,y-8,9,15);rect(skin.main,114,y-5,31,12);rect('#fff0bd',118,y-7,20,5);rect('#9f4b55',119,y+7,13,3);
    rect('#25394f',126,y-11,12,5);rect('#a4d7d0',128,y-10,8,4);rect(skin.accent,121,y+2,9,11);rect('#ffdc98',130,y+2,13,4);
    rect('#e4e1c4',147,y-(frame%12<6?11:5),3,frame%12<6?22:10);rect('#302c47',144,y-2,5,5);
    for(let row=0;row<400;row+=4)rect('rgba(20,20,40,.08)',0,row,640,1);
  }
  function reset(start=false){runSession.reset();y=200;v=0;pipes=[];score=0;elapsed=0;spawn=0;frame=0;keys.clear();touch.clear();state='ready';hud();draw();overlay('Chase the horizon.','Tap W to climb. Hold S to dive. Keep tapping to stay airborne. New level every 10 gates.','Take off →');if(start)run();}
  function run(){if(state==='over')return runSession.cup?ArcadeCup.render():reset(true);runSession.start('sky');state='running';last=0;$('#game-overlay').hidden=true;hud();}
  function pause(){keys.clear();touch.clear();if(state==='running'){state='paused';runSession.pause();hud();overlay('Holding pattern.','Take a break. The sunset can wait.','Resume flight →');}else if(state==='paused')run();}
  function crash(){if(state==='over')return;state='over';keys.clear();touch.clear();hud();overlay('Flight complete.',`${score} gates cleared. Ready for another run?`,runSession.cup?'See Cup standings →':'Fly again →');runSession.finish({score});}
  function update(dt){
    elapsed+=dt;frame++;const down=keys.has('s')||touch.has('s');
    // Gravity always acts; a fresh W press supplies one upward impulse.
    v=Math.min(420,v+(down?1100:700)*dt);y+=v*dt;
    const speed=difficulty(level()).speed;spawn-=dt;
    if(spawn<=0){
      // Queue each gate with its own level's gap; existing gates never resize.
      const gateLevel=Math.floor((score+pipes.filter(p=>!p.passed).length)/10)+1;
      const gap=difficulty(gateLevel).gap;
      pipes.push({x:660,g:55+runSession.random()*145,gap,passed:false});spawn=1.9;
    }
    pipes.forEach(p=>p.x-=speed*dt);
    if(y-11<0||y+13>388||pipes.some(p=>p.x-4<150&&p.x+50>106&&(y-11<p.g||y+13>p.g+p.gap)))return crash();
    pipes.forEach(p=>{if(!p.passed&&p.x+50<106){p.passed=true;score++;Shelf.record('flyer_score',{score});runSession.progress({score});hud();}});pipes=pipes.filter(p=>p.x>-60);
  }
  function loop(now){const dt=last?Math.min((now-last)/1000,.035):0;last=now;if(state==='running'){update(dt);draw();}raf=requestAnimationFrame(loop);}
  const keydown=e=>{if(e.target.closest('button,select,input,textarea')||e.ctrlKey||e.metaKey||e.altKey)return;const k=e.key.toLowerCase();if(!['w','s','p'].includes(k))return;e.preventDefault();if(k==='p'){if(!e.repeat)pause();return;}if(e.repeat)return;if(state==='ready')run();if(state==='running'){if(k==='w'&&!keys.has(k))v=-260;keys.add(k);}};
  const keyup=e=>keys.delete(e.key.toLowerCase());const blur=()=>{keys.clear();touch.clear();if(state==='running')pause();};const visibility=()=>{if(document.hidden)blur();};
  addEventListener('keydown',keydown);addEventListener('keyup',keyup);addEventListener('blur',blur);document.addEventListener('visibilitychange',visibility);
  document.querySelectorAll('[data-flight]').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);if(state==='ready')run();if(state==='running'){if(b.dataset.flight==='w')v=-260;touch.add(b.dataset.flight);}};b.onpointerup=b.onpointercancel=b.onlostpointercapture=()=>touch.delete(b.dataset.flight);});
  $('#start-game').onclick=()=>{$('#start-game').blur();run();};$('#restart-game').onclick=()=>{reset(true);$('#restart-game').blur();};$('#pause-game').onclick=()=>{pause();$('#pause-game').blur();};
  runSession.mount(()=>crash());
  clean=()=>{runSession.dispose();cancelAnimationFrame(raf);removeEventListener('keydown',keydown);removeEventListener('keyup',keyup);removeEventListener('blur',blur);document.removeEventListener('visibilitychange',visibility);};reset();raf=requestAnimationFrame(loop);
}
function tic(){
  const lines=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  let board=Array(9).fill(''),mode='computer',turn='X',note='Your turn',pending=null;
  const result=()=>{const line=lines.find(([a,b,c])=>board[a]&&board[a]===board[b]&&board[a]===board[c]);return line?board[line[0]]:board.every(Boolean)?'draw':null;};
  const value=()=>{const r=result();return r==='O'?10:r==='X'?-10:r==='draw'?0:null;};
  const search=(max,depth=0)=>{const v=value();if(v!==null)return v+(v>0?-depth:v<0?depth:0);const open=board.map((m,i)=>m?null:i).filter(i=>i!==null);const scores=open.map(i=>{board[i]=max?'O':'X';const s=search(!max,depth+1);board[i]='';return s;});return max?Math.max(...scores):Math.min(...scores);};
  const botMove=()=>{const open=board.map((m,i)=>m?null:i).filter(i=>i!==null);let best=-Infinity,choice=open[0];open.forEach(i=>{board[i]='O';const s=search(false);board[i]='';if(s>best){best=s;choice=i;}});return choice;};
  const finish=r=>{if(r==='X'){note=mode==='computer'?'You win!':'Player 1 wins!';Shelf.record('tic_win',{});}else if(r==='O')note=mode==='computer'?'The computer wins.':'Player 2 wins!';else note='Draw.';};
  const move=i=>{if(board[i]||result()||(mode==='computer'&&turn==='O'))return;board[i]=turn;const r=result();if(r){finish(r);return render();}if(mode==='computer'){turn='O';note='Computer thinking';render();pending=setTimeout(computerTurn,260);return;}turn=turn==='X'?'O':'X';note='Next player';render();};
  const computerTurn=()=>{const i=botMove();if(i!==undefined)board[i]='O';turn='X';const r=result();if(r)finish(r);else note='Your turn';render();};
  const render=()=>{shell('Tic-Tac-Toe','The computer plays perfect moves. Or pass the same board to a second person.',`<div class="panel"><div class="difficulty"><button class="choice ${mode==='computer'?'active':''}" data-tic-mode="computer">computer</button><button class="choice ${mode==='local'?'active':''}" data-tic-mode="local">2 players</button></div><div class="stats" role="status">${note}</div><div class="memory tic-board" style="grid-template-columns:repeat(3,1fr);max-width:300px">${board.map((mark,i)=>`<button data-t="${i}" aria-label="Square ${i+1}" style="height:92px" ${mark||result()||(mode==='computer'&&turn==='O')?'disabled':''}>${mark}</button>`).join('')}</div><div class="controls"><button onclick="tic()">New game</button></div></div>`);document.querySelectorAll('[data-tic-mode]').forEach(button=>button.onclick=()=>{mode=button.dataset.ticMode;board=Array(9).fill('');turn='X';note='Your turn';render();});document.querySelectorAll('[data-t]').forEach(button=>button.onclick=()=>move(+button.dataset.t));clean=()=>clearTimeout(pending);};
  render();
}
function platform(){trailPlatformer();}

const embeddedGame=new URLSearchParams(location.search).get('game');
if(embeddedGame)play(embeddedGame);
