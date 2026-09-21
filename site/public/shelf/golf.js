/* Pocket Greens — fixed-step mini golf, with no network or storage requirement. */
function golf(){
  const runSession=GameRuns.session('golf');
  shell('Mini Golf',runSession.cup?'Pocket Greens · a three-hole Cup sprint.':'Pocket Greens · six little holes, one lovely afternoon.',`
    <section class="panel golf-panel" aria-label="Pocket Greens mini golf">
      <div class="golf-brand"><span>POCKET GREENS</span><span>EST. TODAY · ${runSession.cup?3:6} HOLES</span></div>
      <div class="golf-heading"><div><span class="kicker" id="golf-hole-label"></span><h2 id="golf-hole-name"></h2></div><div class="golf-par">PAR <b id="golf-par"></b></div></div>
      <p class="golf-tip" id="golf-tip"></p>
      <div class="golf-stats"><span>STROKES <b id="golf-strokes">0</b></span><span>ROUND <b id="golf-total">0</b></span><span>BEST <b id="golf-best">—</b></span></div>
      <div class="golf-stage">
        <canvas id="golf-course" width="640" height="430" tabindex="0" aria-label="Mini golf course. Left and right arrows aim; up and down arrows change power. Space or Enter putts. P pauses." aria-describedby="golf-tip golf-help"></canvas>
        <div class="golf-overlay" id="golf-overlay"><span class="kicker" id="golf-overlay-kicker">WELCOME TO THE CLUB</span><h3 id="golf-overlay-title">Small course.<br>Big putting energy.</h3><p id="golf-overlay-note">Drag back from the ball, then release to putt.<br>Or use the aim and power controls below.</p><button class="action" id="golf-continue">Tee off →</button></div>
      </div>
      <p class="golf-message" id="golf-message" role="status" aria-live="polite"></p>
      <div class="golf-shot-controls">
        <label for="golf-aim">AIM <output id="golf-aim-value">0°</output><input id="golf-aim" type="range" min="-180" max="180" value="0" step="1" aria-label="Aim angle in degrees"></label>
        <label for="golf-power">POWER <output id="golf-power-value">50%</output><input id="golf-power" type="range" min="10" max="100" value="50" step="1" aria-label="Shot power"></label>
        <button class="action" id="golf-putt">Putt ⛳</button>
      </div>
      <div class="golf-actions"><button id="golf-pause">Pause</button><button id="golf-restart">Restart round</button></div>
      <details class="golf-help" id="golf-help"><summary>How to play & course guide</summary><p>Drag backwards from the ball to aim and set power, then let go. A short drag makes a gentle putt. The dotted arrow shows your first direction; walls can bounce the ball.</p><p>Keyboard: ← / → aim, ↑ / ↓ adjust power, Space or Enter putts, P pauses. Hold Shift for fine adjustments. You can also use the two sliders and Putt button. Angles: 0° is right, −90° is up.</p><p>Sand slows the ball. Water returns it to its previous lie and adds one penalty stroke. A fast ball can roll across the cup: approach gently. At 10 strokes the ball is picked up. Pickups count as 10 and earn no hole achievement.</p><p>Finish all six holes without a pickup for a medal: gold at par or better, silver up to six over par, bronze above that. Your lowest fully holed round is saved on this browser.</p></details>
      <div class="golf-scorecard"><table aria-label="Round scorecard"><caption>Your afternoon, hole by hole</caption><thead><tr><th scope="col">Hole</th>${Array.from({length:runSession.cup?3:6},(_,i)=>`<th scope="col">${i+1}</th>`).join('')}<th scope="col">Total</th></tr></thead><tbody><tr id="golf-par-row"><th scope="row">Par</th></tr><tr id="golf-score-row"><th scope="row">You</th></tr></tbody></table></div>
    </section>`);
  const $=s=>document.querySelector(s),canvas=$('#golf-course'),ctx=canvas.getContext('2d');
  const courses=[
    {name:'The Welcome Mat',par:2,start:[100,215],cup:[520,215],tip:'A straight green to find your touch. Try a strong first putt, then a gentle finish.',walls:[],sand:[],water:[]},
    {name:'Around the Bend',par:3,start:[105,330],cup:[520,100],tip:'The garden wall leaves a generous gap at the top. Aim for the opening.',walls:[{x:285,y:160,w:30,h:246}],sand:[],water:[]},
    {name:'Sandy Shortcut',par:3,start:[100,215],cup:[540,215],tip:'A sandy shortcut through the middle, or smooth grass around the edges.',walls:[],sand:[{x:245,y:130,w:160,h:170}],water:[]},
    {name:'Water’s Edge',par:3,start:[95,320],cup:[535,100],tip:'Skirt the pond on either side. A splash costs one extra stroke.',walls:[],sand:[],water:[{x:245,y:125,w:150,h:180}]},
    {name:'The Garden Gates',par:4,start:[95,320],cup:[545,105],tip:'Two gates, two openings. Head up through the first, then down through the second.',walls:[{x:230,y:150,w:26,h:256},{x:402,y:30,w:26,h:240}],sand:[{x:280,y:295,w:92,h:62}],water:[]},
    {name:'The Clubhouse',par:4,start:[90,325],cup:[545,105],tip:'A final dogleg: pass below the hedge, avoid the pond, then putt for home.',walls:[{x:245,y:30,w:28,h:218}],sand:[{x:425,y:275,w:115,h:65}],water:[{x:320,y:110,w:95,h:100}]}
  ];
  if(runSession.cup)courses.splice(3);
  const totalPar=courses.reduce((n,h)=>n+h.par,0),radius=7,bounds={left:24,right:616,top:30,bottom:406};
  let holeIndex=0,ball,lie,strokes=0,scores=[],holed=[],state='ready',resumeState='aiming',angle=0,power=50,drag=null,raf,last=0,accumulator=0,disposed=false;
  let best=null;
  try{const stored=runSession.cup?0:Number(localStorage.getItem('pocket-greens-best'));if(Number.isInteger(stored)&&stored>=6&&stored<=60)best=stored;}catch{}
  const course=()=>courses[holeIndex],clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const total=()=>scores.reduce((a,b)=>a+b,0)+(scores[holeIndex]===undefined?strokes:0);
  const palette=()=>window.Shelf?.palette('golf')||{main:'#fff8de',accent:'#dd723e'};
  const record=(event,data)=>window.Shelf?.record(event,data);
  function message(text){$('#golf-message').textContent=text;}
  function overlay(kicker,title,note,button){$('#golf-overlay').hidden=false;$('#golf-overlay-kicker').textContent=kicker;$('#golf-overlay-title').textContent=title;$('#golf-overlay-note').textContent=note;$('#golf-continue').textContent=button;}
  function hud(){
    $('#golf-hole-label').textContent=`HOLE ${String(holeIndex+1).padStart(2,'0')} / ${String(courses.length).padStart(2,'0')}`;
    $('#golf-hole-name').textContent=course().name;$('#golf-par').textContent=course().par;$('#golf-tip').textContent=course().tip;
    $('#golf-strokes').textContent=strokes;$('#golf-total').textContent=total();$('#golf-best').textContent=best===null?'—':best;
    $('#golf-aim').value=angle;$('#golf-power').value=power;$('#golf-aim-value').textContent=`${Math.round(angle)}°`;$('#golf-power-value').textContent=`${Math.round(power)}%`;
    const canShoot=state==='aiming';['#golf-aim','#golf-power','#golf-putt'].forEach(s=>$(s).disabled=!canShoot);
    $('#golf-pause').disabled=!['aiming','rolling','paused'].includes(state);$('#golf-pause').textContent=state==='paused'?'Resume':'Pause';
    $('#golf-par-row').innerHTML=`<th scope="row">Par</th>${courses.map(h=>`<td>${h.par}</td>`).join('')}<td>${totalPar}</td>`;
    $('#golf-score-row').innerHTML=`<th scope="row">You</th>${courses.map((h,i)=>`<td ${i===holeIndex?'aria-current="step" class="current"':''}>${scores[i]===undefined?(i===holeIndex?strokes:'—'):scores[i]}${holed[i]===false?'<span title="Picked up" aria-label="picked up">*</span>':''}</td>`).join('')}<td>${total()}</td>`;
  }
  function loadHole(){
    const h=course();ball={x:h.start[0],y:h.start[1],vx:0,vy:0};lie={x:ball.x,y:ball.y};strokes=0;drag=null;
    angle=Math.round(Math.atan2(h.cup[1]-ball.y,h.cup[0]-ball.x)*180/Math.PI);power=50;accumulator=0;last=0;
    hud();draw();
  }
  function reset(start=false){runSession.reset();holeIndex=0;scores=[];holed=[];state=start?'aiming':'ready';loadHole();message('Drag back from the ball, or use the sliders and Putt button.');
    if(start){$('#golf-overlay').hidden=true;runSession.start(runSession.cup?'golf-three':'golf-six');}
    else overlay('WELCOME TO THE CLUB','Small course. Big putting energy.','Drag back from the ball, then release to putt. Or use the aim and power controls below.','Tee off →');
  }
  function advance(){
    if(state==='paused')return pause();
    if(state==='ready'){runSession.start(runSession.cup?'golf-three':'golf-six');state='aiming';$('#golf-overlay').hidden=true;hud();}
    else if(state==='hole'){runSession.resume();holeIndex++;state='aiming';loadHole();$('#golf-overlay').hidden=true;message(course().tip);}
    else if(state==='round'){if(runSession.cup)return ArcadeCup.render();reset(true);}
    canvas.focus({preventScroll:true});
  }
  function finish(sunk){
    if(state!=='rolling')return;
    ball.vx=ball.vy=0;drag=null;scores[holeIndex]=strokes;holed[holeIndex]=sunk;
    if(sunk)record('golf_hole',{strokes,par:course().par});
    runSession.progress({total:total(),holed:holed.filter(Boolean).length,holes:courses.length});
    const delta=strokes-course().par,label=!sunk?'Ball picked up':strokes===1?'Hole in one!':delta<=-2?'Eagle!':delta===-1?'Birdie!':delta===0?'Right on par.':`Hole complete · ${strokes} strokes`;
    if(holeIndex<courses.length-1){state='hole';runSession.pause();overlay(`HOLE ${holeIndex+1} COMPLETE`,label,sunk?`${strokes} ${strokes===1?'stroke':'strokes'} · Par ${course().par}. Take a breath, then on to the next green.`:'The 10-stroke limit keeps the round moving. This hole counts as 10.','Next hole →');message(sunk?label:'10-stroke limit reached. Picked up; no hole achievement awarded.');}
    else{
      state='round';const result=total(),sinks=holed.filter(Boolean).length,medal=sinks<6?'Course complete':result<=totalPar?'Gold medal!':result<=totalPar+6?'Silver medal!':'Bronze medal!';
      let newBest=false;if(!runSession.cup&&sinks===6&&(best===null||result<best)){best=result;newBest=true;try{localStorage.setItem('pocket-greens-best',String(best));}catch{}}
      if(!runSession.cup)record('golf_round',{total:result,par:totalPar,holed:sinks});
      runSession.finish({total:result,holed:sinks,holes:courses.length,complete:sinks===courses.length});
      const relation=result===totalPar?'even par':`${Math.abs(result-totalPar)} ${result<totalPar?'under':'over'} par`;
      overlay('THE CLUBHOUSE',runSession.cup?'Cup course complete!':medal,runSession.cup?`${result} strokes · ${sinks}/3 holes sunk. Your Cup points are saved.`:`${result} strokes · ${relation}. ${sinks===6?(newBest?'A new personal best!':'All six holes in the cup.'):`${sinks}/6 holes in the cup. Hole every ball to earn a medal and save a best.`}`,runSession.cup?'See Cup standings →':'Play another round →');message(`${runSession.cup?'Cup course complete.':medal} ${result} strokes across ${courses.length} holes.`);
    }
    hud();draw();
  }
  function shoot(){
    if(state!=='aiming')return;
    runSession.start(runSession.cup?'golf-three':'golf-six');strokes++;lie={x:ball.x,y:ball.y};const speed=power*5.2,a=angle*Math.PI/180;ball.vx=Math.cos(a)*speed;ball.vy=Math.sin(a)*speed;
    state='rolling';drag=null;last=0;accumulator=0;message('Ball rolling…');hud();
  }
  function settle(){
    ball.vx=ball.vy=0;
    if(strokes>=10)return finish(false);
    state='aiming';angle=Math.round(Math.atan2(course().cup[1]-ball.y,course().cup[0]-ball.x)*180/Math.PI);message('Your lie. Aim, choose your power, and putt.');hud();
  }
  function collideWall(w){
    const qx=clamp(ball.x,w.x,w.x+w.w),qy=clamp(ball.y,w.y,w.y+w.h),dx=ball.x-qx,dy=ball.y-qy,d=Math.hypot(dx,dy);
    if(d>=radius)return;
    let nx,ny,push;
    if(d>0){nx=dx/d;ny=dy/d;push=radius-d;}
    else{
      const edges=[{v:ball.x-w.x,nx:-1,ny:0},{v:w.x+w.w-ball.x,nx:1,ny:0},{v:ball.y-w.y,nx:0,ny:-1},{v:w.y+w.h-ball.y,nx:0,ny:1}].sort((a,b)=>a.v-b.v);
      ({nx,ny}=edges[0]);push=radius+edges[0].v;
    }
    ball.x+=nx*push;ball.y+=ny*push;const dot=ball.vx*nx+ball.vy*ny;if(dot<0){ball.vx-=1.72*dot*nx;ball.vy-=1.72*dot*ny;}
  }
  function inside(rect){return ball.x>rect.x&&ball.x<rect.x+rect.w&&ball.y>rect.y&&ball.y<rect.y+rect.h;}
  function update(dt){
    if(state!=='rolling')return;
    const h=course();ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;
    if(ball.x<bounds.left+radius){ball.x=bounds.left+radius;ball.vx=Math.abs(ball.vx)*.72;}
    if(ball.x>bounds.right-radius){ball.x=bounds.right-radius;ball.vx=-Math.abs(ball.vx)*.72;}
    if(ball.y<bounds.top+radius){ball.y=bounds.top+radius;ball.vy=Math.abs(ball.vy)*.72;}
    if(ball.y>bounds.bottom-radius){ball.y=bounds.bottom-radius;ball.vy=-Math.abs(ball.vy)*.72;}
    h.walls.forEach(collideWall);
    if(h.water.some(inside)){strokes=Math.min(10,strokes+1);ball.x=lie.x;ball.y=lie.y;settle();if(state==='aiming')message('Splash! One penalty stroke. The ball returns to its previous lie.');return;}
    const dragFactor=Math.exp(-(h.sand.some(inside)?4.6:1.05)*dt);ball.vx*=dragFactor;ball.vy*=dragFactor;
    const speed=Math.hypot(ball.vx,ball.vy),distance=Math.hypot(ball.x-h.cup[0],ball.y-h.cup[1]);
    if(distance<11&&speed<165){ball.x=h.cup[0];ball.y=h.cup[1];finish(true);return;}
    if(speed<8)settle();
  }
  function roundedRect(color,r,radius=12){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(r.x,r.y,r.w,r.h,radius);ctx.fill();}
  function draw(){
    const h=course();ctx.clearRect(0,0,640,430);ctx.fillStyle='#234f43';ctx.fillRect(0,0,640,430);
    roundedRect('#75985e',{x:18,y:24,w:604,h:388},19);roundedRect('#a5c67c',{x:24,y:30,w:592,h:376},14);
    ctx.save();ctx.beginPath();ctx.roundRect(24,30,592,376,14);ctx.clip();
    for(let i=0;i<12;i++){ctx.fillStyle=i%2?'#aecf85':'#a5c67c';ctx.fillRect(24+i*52,30,52,376);}
    for(const s of h.sand){roundedRect('#e7ca84',s,18);ctx.fillStyle='#bb9657';for(let y=s.y+13;y<s.y+s.h-10;y+=20)for(let x=s.x+13;x<s.x+s.w-10;x+=25){ctx.fillRect(x,y,2,2);ctx.fillRect(x+7,y+4,2,2);}}
    for(const w of h.water){roundedRect('#417f91',w,18);roundedRect('#69aebe',{x:w.x+5,y:w.y+5,w:w.w-10,h:w.h-10},14);ctx.strokeStyle='#a5d0d0';ctx.lineWidth=2;for(let y=w.y+20;y<w.y+w.h-10;y+=24){ctx.beginPath();ctx.moveTo(w.x+18,y);ctx.lineTo(w.x+w.w-18,y);ctx.stroke();}}
    for(const w of h.walls){roundedRect('#416348',{x:w.x+3,y:w.y+4,w:w.w,h:w.h},5);roundedRect('#305e45',w,5);ctx.fillStyle='#5c8552';ctx.fillRect(w.x+5,w.y+5,Math.max(4,w.w-10),w.h-10);}
    ctx.restore();
    // Tee marker and a flag stay visible even when the ball is at the cup.
    ctx.strokeStyle='#eff0b9';ctx.lineWidth=2;ctx.setLineDash([4,4]);ctx.beginPath();ctx.arc(h.start[0],h.start[1],15,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle='#679360';ctx.beginPath();ctx.ellipse(h.cup[0]+2,h.cup[1]+3,16,11,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#163f37';ctx.beginPath();ctx.arc(h.cup[0],h.cup[1],11,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#fff3cd';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(h.cup[0]+4,h.cup[1]-3);ctx.lineTo(h.cup[0]+4,h.cup[1]-49);ctx.stroke();
    ctx.fillStyle='#d8794b';ctx.beginPath();ctx.moveTo(h.cup[0]+5,h.cup[1]-50);ctx.lineTo(h.cup[0]+35,h.cup[1]-40);ctx.lineTo(h.cup[0]+5,h.cup[1]-30);ctx.closePath();ctx.fill();
    ctx.fillStyle='#fff5d9';ctx.font='bold 11px sans-serif';ctx.fillText(String(holeIndex+1),h.cup[0]+12,h.cup[1]-37);
    if(state==='aiming'){
      const a=angle*Math.PI/180,length=30+power*.85,end={x:ball.x+Math.cos(a)*length,y:ball.y+Math.sin(a)*length};
      ctx.strokeStyle='#234f43';ctx.lineWidth=3;ctx.setLineDash([5,6]);ctx.beginPath();ctx.moveTo(ball.x,ball.y);ctx.lineTo(end.x,end.y);ctx.stroke();ctx.setLineDash([]);
      ctx.beginPath();ctx.moveTo(end.x-10*Math.cos(a-.5),end.y-10*Math.sin(a-.5));ctx.lineTo(end.x,end.y);ctx.lineTo(end.x-10*Math.cos(a+.5),end.y-10*Math.sin(a+.5));ctx.stroke();
      if(drag){ctx.strokeStyle='#fff8df';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(ball.x,ball.y);ctx.lineTo(drag.x,drag.y);ctx.stroke();}
    }
    if(!(state==='hole'||state==='round')||!holed[holeIndex]){
      const color=palette();ctx.fillStyle='#456e4f66';ctx.beginPath();ctx.ellipse(ball.x+2,ball.y+5,9,6,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=color.main;ctx.strokeStyle='#234f43';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(ball.x,ball.y,radius,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.fillStyle=color.accent;ctx.beginPath();ctx.arc(ball.x-1,ball.y-1,2.3,0,Math.PI*2);ctx.fill();
    }
    ctx.fillStyle='#dfe8c5';ctx.font='10px monospace';ctx.fillText('POCKET GREENS / '+String(holeIndex+1).padStart(2,'0'),28,17);ctx.textAlign='right';ctx.fillText('PAR '+h.par,612,17);ctx.textAlign='left';
  }
  function loop(now){
    if(disposed)return;
    if(last&&state==='rolling'){accumulator+=Math.min((now-last)/1000,.05);while(accumulator>=1/120){update(1/120);accumulator-=1/120;}}
    else accumulator=0;
    last=now;draw();raf=requestAnimationFrame(loop);
  }
  function pause(){
    drag=null;
    if(state==='aiming'||state==='rolling'){runSession.pause();resumeState=state;state='paused';overlay('AT YOUR OWN PACE','A little putting pause.','Your ball and score are right where you left them.','Resume round →');message('Paused.');}
    else if(state==='paused'){state=resumeState;runSession.resume();last=0;accumulator=0;$('#golf-overlay').hidden=true;message(state==='rolling'?'Ball rolling…':'Ready for your next putt.');}
    hud();draw();
  }
  function point(e){const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)*640/r.width,y:(e.clientY-r.top)*430/r.height};}
  canvas.onpointerdown=e=>{
    if(state!=='aiming'||e.button!==0||drag)return;const p=point(e);if(Math.hypot(p.x-ball.x,p.y-ball.y)>38)return;
    e.preventDefault();canvas.focus({preventScroll:true});drag={id:e.pointerId,x:p.x,y:p.y,distance:0};canvas.setPointerCapture(e.pointerId);
  };
  canvas.onpointermove=e=>{
    if(!drag||drag.id!==e.pointerId||state!=='aiming')return;const p=point(e),dx=ball.x-p.x,dy=ball.y-p.y;drag={...drag,...p,distance:Math.hypot(dx,dy)};
    if(drag.distance>3){angle=Math.atan2(dy,dx)*180/Math.PI;power=clamp(drag.distance/1.3,10,100);hud();}draw();
  };
  canvas.onpointerup=e=>{if(!drag||drag.id!==e.pointerId)return;const distance=drag.distance;drag=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);if(distance>5)shoot();};
  canvas.onpointercancel=canvas.onlostpointercapture=()=>{drag=null;};
  const keyboard=e=>{
    if(e.ctrlKey||e.metaKey||e.altKey||e.target.closest('input,select,textarea,button,summary'))return;
    const k=e.key.toLowerCase();if(!['arrowleft','arrowright','arrowup','arrowdown',' ','enter','p','escape'].includes(k))return;
    e.preventDefault();if(k==='p'||k==='escape'){if(!e.repeat)pause();return;}if(state!=='aiming')return;
    if(k===' '||k==='enter'){if(!e.repeat)shoot();return;}
    const step=e.shiftKey?1:5;if(k==='arrowleft')angle-=step;if(k==='arrowright')angle+=step;if(k==='arrowup')power+=step;if(k==='arrowdown')power-=step;
    angle=((angle+540)%360)-180;power=clamp(power,10,100);drag=null;hud();draw();
  };
  const blur=()=>{if(state==='aiming'||state==='rolling')pause();},visibility=()=>{if(document.hidden)blur();};
  $('#golf-aim').oninput=e=>{angle=Number(e.target.value);drag=null;hud();draw();};$('#golf-power').oninput=e=>{power=Number(e.target.value);drag=null;hud();draw();};
  $('#golf-putt').onclick=()=>{shoot();canvas.focus({preventScroll:true});};$('#golf-pause').onclick=()=>{pause();canvas.focus({preventScroll:true});};$('#golf-restart').onclick=()=>{reset(true);canvas.focus({preventScroll:true});};$('#golf-continue').onclick=advance;
  addEventListener('keydown',keyboard);addEventListener('blur',blur);document.addEventListener('visibilitychange',visibility);
  clean=()=>{runSession.dispose();disposed=true;cancelAnimationFrame(raf);drag=null;removeEventListener('keydown',keyboard);removeEventListener('blur',blur);document.removeEventListener('visibilitychange',visibility);};
  runSession.mount(()=>{ball.vx=ball.vy=0;drag=null;state='round';runSession.finish({total:total(),holed:holed.filter(Boolean).length,holes:courses.length,complete:false});overlay('CUP TIME','Time for the clubhouse.',`${holed.filter(Boolean).length}/3 holes sunk. Your Cup points are saved.`,'See Cup standings →');hud();draw();});
  if(runSession.cup){document.querySelector('.golf-stats span:last-child').hidden=true;document.querySelector('.golf-help').innerHTML='<summary>How to play & Cup rules</summary><p>Drag backwards from the ball to putt, or use the aim and power sliders. Arrow keys adjust your shot; Space putts. P pauses. Sand slows the ball; water adds a penalty. The 10-stroke limit applies to each hole.</p><p>Play the first three holes in three minutes of active play. Sunk holes earn points; pickups do not. Your full-course personal best stays separate.</p>'; }
  reset();raf=requestAnimationFrame(loop);
}
