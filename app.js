const DEF=()=>({start:'',city:'Cairo',country:'Egypt',archive:[],students:[],days:{},cfg:{w:10,p:10,h:7,e:5,a:0,b1:1,b2:2,b3:3}});
let S=DEF(), pw=localStorage.getItem('pw')||'', cur=1, timer;
const $=id=>document.getElementById(id);
const admin=()=>!!pw;
const esc=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const day=n=>S.days[n]||(S.days[n]={stop:'',rec:{}});
const rec=(n,id)=>day(n).rec[id]||(day(n).rec[id]={s:'',b:0,n:''});
const todayNo=()=>{if(!S.start)return 0;const d=Math.floor((new Date()-new Date(S.start))/864e5)+1;return d>=1&&d<=30?d:0};
const BEH=['لم يُقيَّم','مقبول','جيد','ممتاز'];
const status=t=>$('status').textContent=t;

function merge(d){return{...DEF(),...d,cfg:{...DEF().cfg,...d.cfg}}}
function store(){
  if(!admin())return;
  localStorage.setItem('ram-cache',JSON.stringify(S));localStorage.setItem('ram-dirty','1');
  clearTimeout(timer);status('… جارٍ الحفظ');
  timer=setTimeout(push,500);
}
async function push(){
  try{
    const r=await fetch('/api/data',{method:'POST',headers:{'Content-Type':'application/json','x-admin-password':pw},body:JSON.stringify(S)});
    if(r.status===401){logout();return}
    if(r.ok){localStorage.removeItem('ram-dirty');status('✔ تم الحفظ')}else status('⚠ فشل الحفظ — محفوظ على الجهاز');
  }catch{status('📴 محفوظ على الجهاز وسيُرفع عند عودة الاتصال')}
}
const save=()=>{store();render()};
async function load(){
  const cache=localStorage.getItem('ram-cache');
  if(admin()&&localStorage.getItem('ram-dirty')&&cache){S=merge(JSON.parse(cache));render();push();return}
  try{
    const r=await fetch('/api/data');if(!r.ok)throw 0;
    const d=await r.json();
    if(d){S=merge(d);localStorage.setItem('ram-cache',JSON.stringify(S))}
    status('');
  }catch{if(cache)S=merge(JSON.parse(cache));status('📴 وضع عدم الاتصال')}
  render();
}
async function verify(){
  if(!pw)return;
  try{const r=await fetch('/api/data?check=1',{headers:{'x-admin-password':pw}});
    if(r.status===401){pw='';localStorage.removeItem('pw')}}catch{}
}
function render(){
  const a=admin(),dis=a?'':'disabled',t=todayNo(),c=S.cfg;
  document.body.classList.toggle('admin',a);
  $('loginBtn').style.display=a?'none':'';
  $('start').value=S.start;
  [['cp','p'],['cw','w'],['ch','h'],['ce','e'],['ca','a'],['c1','b1'],['c2','b2'],['c3','b3']].forEach(([i,k])=>{if(document.activeElement!==$(i))$(i).value=c[k]});
  $('hint').textContent=`النقاط: حاضر ${c.p} • نصف الدورة ${c.h} • معتذر ${c.e} • غائب ${c.a} — السلوك: ممتاز +${c.b3} • جيد +${c.b2} • مقبول +${c.b1} — أسبوع بلا غياب +${c.w}`;
  $('days').innerHTML=Array.from({length:30},(_,i)=>{const n=i+1,d=S.days[n];
    const done=d&&Object.values(d.rec).some(r=>r.s);
    return `<button class="${n===cur?'active ':''}${done?'done ':''}${n===t?'today':''}" onclick="go(${n})">${n}</button>`}).join('');
  const dn=Object.values(S.days).filter(d=>d.sura||(d.stop&&d.stop.trim())).length;
  $('prog').innerHTML=`<div class="bar"><i style="width:${Math.round(dn/30*100)}%"></i></div><small>📖 سُجّل موضع التوقف في ${dn} من 30 يوماً</small>`;
  $('dayTitle').textContent=`اليوم ${cur} من رمضان`;
  $('juz').textContent=`الجزء ${cur}`;
  renderStop();
  $('list').innerHTML=S.students.length?S.students.map(s=>{const r=rec(cur,s.id);
    return `<div class="stu"><div class="top"><span class="nmb" onclick="openLog('${s.id}')">${esc(s.name)}${abOf(s.id)>=2?' ⚠️':''}</span><span class="adm"><button class="ren" onclick="renStu('${s.id}')">✏</button><button class="del" onclick="delStu('${s.id}')">🗑</button></span></div>
    <div class="st">${[['p','حاضر'],['h','نصف الدورة'],['e','معتذر'],['a','غائب']].map(([k,l])=>`<button class="${k}${r.s===k?' on':''}" onclick="setS('${s.id}','${k}')">${l}</button>`).join('')}</div>
    <div class="row"><select ${dis} onchange="setB('${s.id}',this.value)">${BEH.map((b,i)=>`<option value="${i}"${r.b==i?' selected':''}>${i?'السلوك: '+b:'السلوك: '+b}</option>`).join('')}</select>
    <input class="adm" ${dis} placeholder="ملاحظة..." value="${esc(r.n)}" oninput="setN('${s.id}',this.value)"></div></div>`}).join('')
    :'<div class="empty">لم تُضف أسماء بعد ✨</div>';
  const k={p:0,h:0,e:0,a:0};S.students.forEach(s=>{const r=rec(cur,s.id);if(r.s)k[r.s]++});
  $('summary').innerHTML=`<span>✅ ${k.p}</span><span>🔷 ${k.h}</span><span>🟡 ${k.e}</span><span>❌ ${k.a}</span>`;
  const rows=calc();$('rank').innerHTML=rankHTML(rows);renderExtra(rows);
}
const go=n=>{cur=n;render()};
const setS=(id,k)=>{if(!admin())return;const r=rec(cur,id);r.s=r.s===k?'':k;if(r.s)sfx(r.s);save()};
const setB=(id,v)=>{if(!admin())return;rec(cur,id).b=+v;save()};
const setN=(id,v)=>{if(!admin())return;rec(cur,id).n=v;store()};
const delStu=id=>{if(admin()&&confirm('حذف الطالب وكل سجلاته؟')){S.students=S.students.filter(s=>s.id!==id);save()}};
const renStu=id=>{const s=S.students.find(x=>x.id===id),v=prompt('الاسم الجديد:',s.name);if(v&&v.trim()){s.name=v.trim();save()}};
function add(){const v=$('newName').value.trim();if(!v||!admin())return;
  S.students.push({id:'s'+Date.now(),name:v});$('newName').value='';save()}
$('addBtn').onclick=add;
$('newName').onkeydown=e=>{if(e.key==='Enter')add()};
$('start').onchange=e=>{S.start=e.target.value;const t=todayNo();if(t)cur=t;save()};
[['cp','p'],['cw','w'],['ch','h'],['ce','e'],['ca','a'],['c1','b1'],['c2','b2'],['c3','b3']].forEach(([i,k])=>{$(i).oninput=e=>{S.cfg[k]=+e.target.value||0;save()}});
$('exp').onclick=()=>{const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([JSON.stringify(S,null,1)],{type:'application/json'}));
  a.download='quran-ramadan-backup.json';a.click()};
$('imp').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();
  r.onload=()=>{try{S={...DEF(),...JSON.parse(r.result)};save()}catch{alert('ملف غير صالح')}};r.readAsText(f)};
$('reset').onclick=()=>{if(confirm('سيتم حذف كل البيانات نهائياً. هل أنت متأكد؟')&&confirm('تأكيد أخير: حذف كل شيء؟')){S=DEF();save()}};
function logout(){pw='';localStorage.removeItem('pw');status('');render()}
$('logout').onclick=logout;
$('loginBtn').onclick=()=>{$('pw').value='';$('lgErr').textContent='';$('lg').showModal();$('pw').focus()};
$('lgCancel').onclick=()=>$('lg').close();
async function doLogin(){
  const v=$('pw').value;if(!v)return;
  try{
  const r=await fetch('/api/data?check=1',{headers:{'x-admin-password':v}});
  if(r.ok){pw=v;localStorage.setItem('pw',v);$('lg').close();render()}
  else $('lgErr').textContent='كلمة السر غير صحيحة';
  }catch{$('lgErr').textContent='يلزم اتصال بالإنترنت لأول دخول'}
}
$('lgOk').onclick=doLogin;
$('pw').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();doLogin()}};
(async()=>{await verify();await load();if(todayNo()){cur=todayNo();render()}
  setInterval(()=>{if(!admin())load()},60000)})();

$('allP').onclick=()=>{if(!admin())return;S.students.forEach(s=>{const r=rec(cur,s.id);if(!r.s)r.s='p'});save()};
function report(){
  const g={p:[],h:[],e:[],a:[]};S.students.forEach(s=>{const r=rec(cur,s.id);if(r.s)g[r.s].push(s.name)});
  const L=[`🌙 ختمة رمضان — اليوم ${cur} (الجزء ${cur})`];
  if(stopText(cur))L.push('📖 توقفنا عند: '+stopText(cur));
  L.push('',`✅ الحاضرون (${g.p.length}): ${g.p.join('، ')||'-'}`,`🔷 حضروا نصف الدورة (${g.h.length}): ${g.h.join('، ')||'-'}`,`🟡 المعتذرون (${g.e.length}): ${g.e.join('، ')||'-'}`,`❌ الغائبون (${g.a.length}): ${g.a.join('، ')||'-'}`);
  return L.join('\n');
}
$('wa').onclick=()=>window.open('https://wa.me/?text='+encodeURIComponent(report()),'_blank');
addEventListener('online',()=>{if(admin()&&localStorage.getItem('ram-dirty'))push();else load()});
let dp;addEventListener('beforeinstallprompt',e=>{e.preventDefault();dp=e;$('installBtn').style.display=''});
$('installBtn').onclick=async()=>{if(!dp)return;dp.prompt();await dp.userChoice;dp=null;$('installBtn').style.display='none'};
if('serviceWorker' in navigator)addEventListener('load',()=>navigator.serviceWorker.register('sw.js'));

/* ===== الأجواء الصوتية ===== */
let AC,master,amb=null;
function ctx(){if(!AC){AC=new(window.AudioContext||window.webkitAudioContext)();master=AC.createGain();master.gain.value=+$('vol').value;master.connect(AC.destination)}
  if(AC.state==='suspended')AC.resume();return AC}
function tone(f,t,d,v,dest){const c=AC,o=c.createOscillator(),g=c.createGain();o.frequency.value=f;
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+d);
  o.connect(g);g.connect(dest||master);o.start(t);o.stop(t+d+.1)}
function startAmb(){
  const c=ctx();amb={nodes:[],g:c.createGain()};amb.g.gain.value=0;amb.g.connect(master);
  amb.g.gain.linearRampToValueAtTime(.5,c.currentTime+3);
  [73.42,110,146.83,220].forEach((f,i)=>{const o=c.createOscillator(),g=c.createGain(),l=c.createOscillator(),lg=c.createGain();
    o.frequency.value=f;o.detune.value=i*3;g.gain.value=.12/(i+1);l.frequency.value=.05+i*.03;lg.gain.value=g.gain.value*.6;
    l.connect(lg);lg.connect(g.gain);o.connect(g);g.connect(amb.g);o.start();l.start();amb.nodes.push(o,l)});
  const dl=c.createDelay(2);dl.delayTime.value=.55;const fb=c.createGain();fb.gain.value=.45;dl.connect(fb);fb.connect(dl);dl.connect(amb.g);
  const P=[293.66,329.63,369.99,440,493.88,587.33,659.25];
  const chime=()=>{if(!amb)return;const f=P[Math.random()*P.length|0];
    tone(f,c.currentTime,3.5,.07,amb.g);tone(f,c.currentTime,3.5,.05,dl);amb.t=setTimeout(chime,3500+Math.random()*5500)};
  chime();
}
function stopAmb(){if(!amb)return;const x=amb;amb=null;clearTimeout(x.t);
  x.g.gain.setTargetAtTime(0,AC.currentTime,.6);setTimeout(()=>x.nodes.forEach(o=>{try{o.stop()}catch{}}),3000)}
function cannon(){
  const c=ctx(),t=c.currentTime,n=c.createBuffer(1,c.sampleRate*2.5,c.sampleRate),d=n.getChannelData(0);
  for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,3);
  const s=c.createBufferSource();s.buffer=n;const f=c.createBiquadFilter();f.type='lowpass';
  f.frequency.setValueAtTime(900,t);f.frequency.exponentialRampToValueAtTime(80,t+1.8);
  const g=c.createGain();g.gain.value=1.1;s.connect(f);f.connect(g);g.connect(master);s.start(t);
  const o=c.createOscillator(),og=c.createGain();o.frequency.setValueAtTime(110,t);o.frequency.exponentialRampToValueAtTime(30,t+.8);
  og.gain.setValueAtTime(1,t);og.gain.exponentialRampToValueAtTime(.001,t+1.2);o.connect(og);og.connect(master);o.start(t);o.stop(t+1.3);
  const dl=c.createDelay(1.5);dl.delayTime.value=.7;const fb=c.createGain();fb.gain.value=.35;
  g.connect(dl);dl.connect(fb);fb.connect(dl);dl.connect(master);setTimeout(()=>{try{dl.disconnect()}catch{}},7000);
}
function sfx(k){
  if(!$('sfxOn').checked)return;const c=ctx(),t=c.currentTime;
  if(k==='p'){tone(659.25,t,.9,.12);tone(880,t+.12,1.1,.1)}
  else if(k==='e'||k==='h')tone(523.25,t,1,.1);else tone(196,t,1,.1);
}
const files={};
function playFile(k,btn){
  Object.keys(files).forEach(x=>{if(x!==k){files[x].pause();$(x==='adhan'?'adhBtn':'duaBtn').classList.remove('on')}});
  if(!files[k]){const a=new Audio('audio/'+k+'.mp3');a.onerror=()=>{$('sndMsg').textContent='ملف الصوت غير موجود: audio/'+k+'.mp3';btn.classList.remove('on')};
    a.onended=()=>btn.classList.remove('on');files[k]=a}
  const a=files[k];a.volume=+$('vol').value;
  if(a.paused){$('sndMsg').textContent='';a.play().catch(()=>{});btn.classList.add('on')}else{a.pause();btn.classList.remove('on')}
}
$('sndBtn').onclick=()=>{$('sndPanel').hidden=!$('sndPanel').hidden};
$('ambBtn').onclick=e=>{if(amb){stopAmb();e.target.classList.remove('on')}else{startAmb();e.target.classList.add('on')}};
$('canBtn').onclick=cannon;
$('adhBtn').onclick=e=>playFile('adhan',e.target);
$('duaBtn').onclick=e=>playFile('dua',e.target);
$('vol').oninput=e=>{if(master)master.gain.value=+e.target.value;Object.values(files).forEach(a=>a.volume=+e.target.value)};
$('sfxOn').checked=localStorage.getItem('sfx')==='1';
$('sfxOn').onchange=e=>localStorage.setItem('sfx',e.target.checked?'1':'0');
$('iftar').value=localStorage.getItem('iftar')||'';
$('iftar').onchange=e=>localStorage.setItem('iftar',e.target.value);
setInterval(()=>{const t=localStorage.getItem('iftar');if(!t)return;
  const n=new Date(),k=n.toDateString();
  if(n.toTimeString().slice(0,5)===t&&localStorage.getItem('iftarDone')!==k){localStorage.setItem('iftarDone',k);cannon()}},15000);

/* ===== اختيار موضع التوقف بالأزرار ===== */
const SU=('الفاتحة:7:1,البقرة:286:2,آل عمران:200:50,النساء:176:77,المائدة:120:106,الأنعام:165:128,الأعراف:206:151,الأنفال:75:177,التوبة:129:187,يونس:109:208,هود:123:221,يوسف:111:235,الرعد:43:249,إبراهيم:52:255,الحجر:99:262,النحل:128:267,الإسراء:111:282,الكهف:110:293,مريم:98:305,طه:135:312,الأنبياء:112:322,الحج:78:332,المؤمنون:118:342,النور:64:350,الفرقان:77:359,الشعراء:227:367,النمل:93:377,القصص:88:385,العنكبوت:69:396,الروم:60:404,لقمان:34:411,السجدة:30:415,الأحزاب:73:418,سبأ:54:428,فاطر:45:434,يس:83:440,الصافات:182:446,ص:88:453,الزمر:75:458,غافر:85:467,فصلت:54:477,الشورى:53:483,الزخرف:89:489,الدخان:59:496,الجاثية:37:499,الأحقاف:35:502,محمد:38:507,الفتح:29:511,الحجرات:18:515,ق:45:518,الذاريات:60:520,الطور:49:523,النجم:62:526,القمر:55:528,الرحمن:78:531,الواقعة:96:534,الحديد:29:537,المجادلة:22:542,الحشر:24:545,الممتحنة:13:549,الصف:14:551,الجمعة:11:553,المنافقون:11:554,التغابن:18:556,الطلاق:12:558,التحريم:12:560,الملك:30:562,القلم:52:564,الحاقة:52:566,المعارج:44:568,نوح:28:570,الجن:28:572,المزمل:20:574,المدثر:56:575,القيامة:40:577,الإنسان:31:578,المرسلات:50:580,النبأ:40:582,النازعات:46:583,عبس:42:585,التكوير:29:586,الانفطار:19:587,المطففين:36:587,الانشقاق:25:589,البروج:22:590,الطارق:17:591,الأعلى:19:591,الغاشية:26:592,الفجر:30:593,البلد:20:594,الشمس:15:595,الليل:21:595,الضحى:11:596,الشرح:8:596,التين:8:597,العلق:19:597,القدر:5:598,البينة:8:598,الزلزلة:8:599,العاديات:11:599,القارعة:11:600,التكاثر:8:600,العصر:3:601,الهمزة:9:601,الفيل:5:602,قريش:4:602,الماعون:7:602,الكوثر:3:603,الكافرون:6:603,النصر:3:603,المسد:5:603,الإخلاص:4:604,الفلق:5:604,الناس:6:604').split(',').map(x=>{const[n,c,p]=x.split(':');return[n,+c,+p]});
const juzStart=n=>n<=1?1:20*(n-1)+2;
function stopText(n){const d=day(n);
  if(d.sura)return `سورة ${SU[d.sura-1][0]} • الآية ${d.aya||1} • صفحة ${d.pg||SU[d.sura-1][2]}`;
  return d.stop||''}
function renderStop(){
  const d=day(cur),sel=$('sura');
  if(!sel.options.length)sel.innerHTML='<option value="0">— اختر السورة —</option>'+SU.map((s,i)=>`<option value="${i+1}">${i+1}. ${s[0]}</option>`).join('');
  sel.value=d.sura||0;
  $('aya').value=d.aya||'';$('aya').max=d.sura?SU[d.sura-1][1]:'';
  $('ayaMax').textContent=d.sura?`(من ${SU[d.sura-1][1]})`:'';
  $('pg').value=d.pg||'';$('pgR').value=d.pg||juzStart(cur);
  $('stopTxt').textContent=stopText(cur)||'لم يُحدَّد موضع التوقف بعد';
  let p='';for(let m=cur-1;m>=1;m--)if(S.days[m]&&(S.days[m].sura||S.days[m].stop)){p=stopText(m);break}
  $('stopFrom').textContent=p?`▶ بدأنا اليوم من: ${p}`:`📍 الجزء ${cur} يبدأ من صفحة ${juzStart(cur)}`;
}
const upd=f=>{if(!admin())return;f(day(cur));save()};
const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));
const setSura=(d,i)=>{d.sura=i;if(i){d.aya=1;d.pg=SU[i-1][2]}else{d.aya=0;d.pg=0}};
$('sura').onchange=e=>upd(d=>setSura(d,+e.target.value));
$('suP').onclick=()=>upd(d=>setSura(d,clamp((d.sura||1)-1,1,114)));
$('suN').onclick=()=>upd(d=>setSura(d,clamp((d.sura||0)+1,1,114)));
const ayStep=x=>upd(d=>{if(!d.sura)return;d.aya=clamp((d.aya||1)+x,1,SU[d.sura-1][1])});
$('ay-10').onclick=()=>ayStep(-10);$('ay-1').onclick=()=>ayStep(-1);$('ay1').onclick=()=>ayStep(1);$('ay10').onclick=()=>ayStep(10);
$('aya').onchange=e=>upd(d=>{if(d.sura)d.aya=clamp(+e.target.value||1,1,SU[d.sura-1][1])});
const pgStep=x=>upd(d=>{d.pg=clamp((d.pg||juzStart(cur))+x,1,604)});
$('pg-1').onclick=()=>pgStep(-1);$('pg1').onclick=()=>pgStep(1);
$('pg').onchange=e=>upd(d=>{d.pg=clamp(+e.target.value||1,1,604)});
$('pgR').oninput=e=>upd(d=>{d.pg=+e.target.value});
$('jStart').onclick=()=>upd(d=>{d.pg=juzStart(cur)});
$('jEnd').onclick=()=>upd(d=>{d.pg=cur>=30?604:juzStart(cur+1)-1});

/* ===== الحسابات والتصنيف ===== */
const dayRecorded=(st,n)=>st.days[n]&&Object.values(st.days[n].rec).some(r=>r.s);
function calc(st=S){
  const c=st.cfg,bp=[0,c.b1,c.b2,c.b3],rd=[];
  for(let n=1;n<=30;n++)if(dayRecorded(st,n))rd.push(n);
  return st.students.map(s=>{
    let p=0,h=0,e=0,a=0,pts=0,bs=0,bn=0,run=0,best=0,abs=0,wk=0;const wks=[];
    rd.forEach(n=>{const r=st.days[n].rec[s.id];if(!r||!r.s)return;
      if(r.s==='p'){p++;pts+=+c.p}else if(r.s==='h'){h++;pts+=+c.h}else if(r.s==='e'){e++;pts+=+c.e}else{a++;pts+=+c.a}
      pts+=+bp[r.b||0];if(r.b){bs+=r.b;bn++}
      run=r.s==='p'?run+1:0;best=Math.max(best,run);abs=r.s==='a'?abs+1:0});
    for(let w=0;w<5;w++){const ds=rd.filter(n=>n>w*7&&n<=w*7+7),len=Math.min(7,30-w*7);
      const ok=ds.length>=Math.min(5,len)&&ds.every(n=>{const r=st.days[n].rec[s.id];return r&&['p','h','e'].includes(r.s)});
      wks.push(ok);if(ok){wk++;pts+=+c.w||0}}
    const tot=p+h+e+a;
    return{id:s.id,name:s.name,p,h,e,a,pts,pct:tot?Math.round((p+h/2)/tot*100):0,run,best,abs,bn,bavg:bn?bs/bn:0,wk,wks};
  }).sort((x,y)=>y.pts-x.pts);
}
const abOf=id=>{const r=calc().find(x=>x.id===id);return r?r.abs:0};
const tags=r=>(r.abs>=2?`<span class="tag warn">⚠️ غاب ${r.abs} متتالية</span>`:'')+(r.pct===100&&r.p>=3?'<span class="tag">🏅 ملتزم</span>':'')+(r.bn>=3&&r.bavg>=2.5?'<span class="tag">⭐ سلوك مميز</span>':'')+(r.run>=3?`<span class="tag">🔥 ${r.run}</span>`:'')+(r.wk?`<span class="tag">🎯 ${r.wk}</span>`:'');
const rankHTML=(rows,lnk=true)=>rows.length?rows.map((r,i)=>`<div class="r"><div class="n">${['🥇','🥈','🥉'][i]||i+1}</div><div class="nm"><b${lnk?` class="nmb" onclick="openLog('${r.id}')"`:''}>${esc(r.name)}</b>${tags(r)}<small>حضور ${r.p} • نصف الدورة ${r.h} • اعتذار ${r.e} • غياب ${r.a} — ${r.pct}%</small><div class="bar"><i style="width:${r.pct}%"></i></div></div><div class="pt">${r.pts}</div></div>`).join(''):'<div class="empty">لا توجد بيانات بعد</div>';

/* ===== التبويبات ===== */
let curTab='day',lastPK='',AW=[];const PS=new URLSearchParams(location.search).get('s');
function tab(t){curTab=t;document.querySelectorAll('.tabsec').forEach(s=>s.classList.toggle('on',s.dataset.t===t));
  document.querySelectorAll('nav.tabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===t));scrollTo({top:0,behavior:'smooth'})}
document.querySelectorAll('nav.tabs button').forEach(b=>b.onclick=()=>tab(b.dataset.t));
tab('day');

/* ===== التواريخ والصلوات ===== */
const HJ=new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura',{day:'numeric',month:'long',year:'numeric'});
const GR=new Intl.DateTimeFormat('ar-EG',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
const dateOf=n=>{if(!S.start)return null;const d=new Date(S.start+'T12:00:00');d.setDate(d.getDate()+n-1);return d};
const dateLine=n=>{const d=dateOf(n);return d?`${GR.format(d)} • ${HJ.format(d)}`:''};
async function prayers(){
  const d=dateOf(cur)||new Date(),iso=d.toISOString().slice(0,10),key=`pt-${S.city}-${S.country}-${iso}`;
  let t=JSON.parse(localStorage.getItem(key)||'null');
  if(!t){try{const dd=`${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`;
    const r=await fetch(`https://api.aladhan.com/v1/timingsByCity/${dd}?city=${encodeURIComponent(S.city)}&country=${encodeURIComponent(S.country)}&method=5`);
    t=(await r.json()).data.timings;localStorage.setItem(key,JSON.stringify(t))}catch{}}
  $('prayer').innerHTML=t?[['الفجر','Fajr'],['الظهر','Dhuhr'],['العصر','Asr'],['المغرب','Maghrib'],['العشاء','Isha']].map(([n,k])=>`<div><small>${n}</small><b>${t[k].slice(0,5)}</b></div>`).join('')+(admin()?`<button onclick="setIftar('${t.Maghrib.slice(0,5)}')">⏰ المدفع على المغرب</button>`:''):'';
}
function setIftar(v){localStorage.setItem('iftar',v);$('iftar').value=v;status('✔ سينطلق المدفع عند '+v)}

/* ===== المنحنى والجوائز والتنبيهات ===== */
function chart(){
  const N=S.students.length,pts=[];
  for(let n=1;n<=30;n++){if(!dayRecorded(S,n)||!N)continue;let v=0;
    S.students.forEach(s=>{const r=S.days[n].rec[s.id];if(r&&r.s==='p')v++;else if(r&&r.s==='h')v+=.5});pts.push([n,Math.round(v/N*100)])}
  if(!pts.length)return'<div class="empty">سجّل الحضور لتظهر المنحنى</div>';
  const W=600,H=230,x=n=>34+(n-1)*(W-50)/29,y=v=>H-30-v*(H-60)/100;
  const d=pts.map(([n,v],i)=>(i?'L':'M')+x(n)+' '+y(v)).join(' ');
  const area=d+` L${x(pts[pts.length-1][0])} ${y(0)} L${x(pts[0][0])} ${y(0)}Z`;
  const low=pts.reduce((m,q)=>q[1]<m[1]?q:m);
  return `<svg class="ch" viewBox="0 0 ${W} ${H}">${[0,50,100].map(v=>`<line x1="30" x2="${W-10}" y1="${y(v)}" y2="${y(v)}" stroke="#e3bf5b" stroke-opacity=".2"/><text x="4" y="${y(v)+4}">${v}%</text>`).join('')}
  <path d="${area}" fill="#e3bf5b" fill-opacity=".15"/><path d="${d}" fill="none" stroke="#e3bf5b" stroke-width="3" stroke-linejoin="round"/>
  ${pts.map(([n,v])=>`<circle cx="${x(n)}" cy="${y(v)}" r="4" fill="#e3bf5b"/>`).join('')}
  ${[1,5,10,15,20,25,30].map(n=>`<text x="${x(n)-4}" y="${H-8}">${n}</text>`).join('')}</svg>
  <p class="hint">📉 أضعف يوم حضوراً: اليوم ${low[0]} (${low[1]}%)</p>`;
}
function renderAwards(rows){
  const tot=r=>r.p+r.h+r.e+r.a,best=(f,flt)=>rows.filter(flt).sort((u,v)=>f(v)-f(u)||v.pts-u.pts)[0];
  AW=[['🥇','المركز الأول',rows[0]],['🥈','المركز الثاني',rows[1]],['🥉','المركز الثالث',rows[2]],
    ['🏅','الأكثر التزاماً',best(r=>r.pct,r=>tot(r)>0)],['⭐','الأفضل سلوكاً',best(r=>r.bavg,r=>r.bn>=3)],
    ['🔥','المثابر',best(r=>r.best,r=>r.best>=3)],['🎯','بطل الأسابيع',best(r=>r.wk,r=>r.wk>0)]].filter(x=>x[2]);
  $('awards').innerHTML=AW.length?AW.map(([ic,t,r],i)=>`<div class="aw"><span class="ai">${ic}</span><div><b>${t}</b><div>${esc(r.name)}</div></div><button onclick="cert(${i})">🎓 شهادة</button></div>`).join(''):'<div class="empty">ستظهر الجوائز بعد تسجيل الحضور</div>';
}
function renderExtra(rows){
  if(!admin()&&curTab==='admin')tab('day');
  $('dayDate').textContent=dateLine(cur)||'📅 حدّد أول يوم في رمضان من لوحة الإدارة لتظهر التواريخ';
  renderAwards(rows);$('chart').innerHTML=chart();
  $('weeks').innerHTML=[0,1,2,3,4].map(w=>{const ws=rows.filter(r=>r.wks[w]);
    return `<div class="wk"><b>الأسبوع ${w+1}</b> <small>(الأيام ${w*7+1}–${Math.min(w*7+7,30)})</small><div>${ws.length?ws.map(r=>`<span class="tag">🎯 ${esc(r.name)}</span>`).join(''):'<small>—</small>'}</div></div>`}).join('');
  const al=rows.filter(r=>r.abs>=2);
  $('alerts').innerHTML=al.length?'<b>⚠️ تنبيه غياب متكرر</b>'+al.map(r=>`<div>${esc(r.name)} — غاب ${r.abs} أيام متتالية</div>`).join('')+'<small>تواصل معهم قبل أن ينقطعوا 🤍</small>':'';
  $('alerts').hidden=!al.length;
  $('arch').innerHTML=S.archive.length?S.archive.map((x,i)=>`<div class="r"><div class="nm"><b>${esc(x.name)}</b><small>${esc(x.date)} • ${x.students.length} طالب</small></div><button onclick="arcView(${i})">عرض</button><button class="del" onclick="arcDel(${i})">🗑</button></div>`).join(''):'<div class="empty">لا يوجد أرشيف بعد</div>';
  [['city',S.city],['country',S.country]].forEach(([i,v])=>{if(document.activeElement!==$(i))$(i).value=v});
  const pk=[cur,S.start,S.city,S.country,admin()].join('|');if(pk!==lastPK){lastPK=pk;prayers()}
  if(PS){document.body.classList.add('pv');$('pv').innerHTML=logHTML(PS,false)}
}

/* ===== سجل الطالب والشهادات والطباعة ===== */
const ST={p:'✓',h:'½',e:'عذر',a:'✗'},FONT='<link href="https://fonts.googleapis.com/css2?family=Amiri:wght@700&family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">';
function logHTML(id,notes){
  const s=S.students.find(x=>x.id===id);if(!s)return'<div class="empty">الطالب غير موجود</div>';
  const rows=calc(),i=rows.findIndex(x=>x.id===id),r=rows[i];
  const cells=Array.from({length:30},(_,k)=>{const n=k+1,x=S.days[n]&&S.days[n].rec[id],c=x&&x.s||'';
    return `<div class="lc ${c}"><b>${n}</b><span>${ST[c]||'·'}</span><i>${x&&x.b?'★'.repeat(x.b):''}</i></div>`}).join('');
  const nt=notes?Object.keys(S.days).filter(n=>S.days[n].rec[id]&&S.days[n].rec[id].n).map(n=>`<li>يوم ${n}: ${esc(S.days[n].rec[id].n)}</li>`).join(''):'';
  return `<h3>🌙 ${esc(s.name)}</h3><div class="lstats"><span>الترتيب <b>${i+1}</b> من ${rows.length}</span><span>النقاط <b>${r.pts}</b></span><span>الحضور <b>${r.pct}%</b></span><span>✓ ${r.p}</span><span>½ ${r.h}</span><span>عذر ${r.e}</span><span>✗ ${r.a}</span></div><div class="lgrid">${cells}</div><p class="hint">✓ حاضر • ½ نصف الدورة • عذر: معتذر • ✗ غائب • ★ السلوك</p>${nt?`<ul class="adm lnotes">${nt}</ul>`:''}`;
}
function openLog(id){$('logBody').innerHTML=logHTML(id,true);$('logDlg').dataset.id=id;$('logDlg').showModal()}
function popup(html){const w=window.open('','_blank');if(!w){alert('اسمح بالنوافذ المنبثقة لهذا الموقع');return}w.document.write(html);w.document.close();setTimeout(()=>w.print(),900)}
$('lgClose').onclick=()=>$('logDlg').close();
$('lgPrint').onclick=()=>popup(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>سجل الطالب</title>${FONT}<link rel="stylesheet" href="${location.origin}/style.css"></head><body class="plog">${logHTML($('logDlg').dataset.id,false)}<p style="text-align:center;opacity:.6">ختمة رمضان • ${GR.format(new Date())}</p></body></html>`);
$('lgLink').onclick=async()=>{const u=location.origin+location.pathname+'?s='+$('logDlg').dataset.id;
  try{await navigator.clipboard.writeText(u);status('✔ نُسخ رابط الأهل')}catch{prompt('انسخ الرابط:',u)}};
function cert(i){const[ic,t,r]=AW[i],now=new Date();
  popup(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>شهادة تقدير</title>${FONT}<style>@page{size:A4 landscape;margin:0}*{box-sizing:border-box}body{margin:0;font-family:Cairo,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}.c{width:297mm;height:208mm;padding:12mm;background:#062a24}.i{height:100%;border:2px solid #e3bf5b;outline:1px solid #e3bf5b;outline-offset:-8px;background:#fffaf0;border-radius:6px;text-align:center;padding:10mm 20mm;color:#2a2a2a;display:flex;flex-direction:column;justify-content:space-between}h1{font:700 54px Amiri,serif;color:#0d3a32;margin:0}.m{font-size:46px;color:#b8902f}.n{font:700 60px Amiri,serif;color:#b8902f;border-bottom:2px solid #e3bf5b;display:inline-block;padding:0 30px;margin:8px auto}.t{font-size:25px;margin:6px 0}.f{display:flex;justify-content:space-between;font-size:17px}</style></head><body><div class="c"><div class="i"><div><div class="m">☪</div><h1>شهادة تقدير</h1></div><div><p class="t">تتشرف حلقة القرآن الكريم بمنح الطالب</p><div class="n">${esc(r.name)}</div><p class="t">جائزة ${ic} «${t}»</p><p class="t" style="font-size:19px;opacity:.8">لحصوله على ${r.pts} نقطة ونسبة حضور ${r.pct}%</p><p class="t" style="font:700 24px Amiri,serif;margin-top:12px">﴿ وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا ﴾</p></div><div class="f"><span>${GR.format(now)} • ${HJ.format(now)}</span><span>المشرف: ____________</span></div></div></div></body></html>`)}

/* ===== الإعدادات والأرشيف ===== */
$('city').onchange=e=>{S.city=e.target.value.trim()||'Cairo';save()};
$('country').onchange=e=>{S.country=e.target.value.trim()||'Egypt';save()};
$('newCircle').onclick=()=>{if(!admin())return;
  const nm=prompt('اسم هذه الحلقة في الأرشيف:','رمضان '+new Date().getFullYear());if(nm===null)return;
  const keep=confirm('هل تريد إبقاء أسماء الطلاب في الحلقة الجديدة؟\nموافق = نعم • إلغاء = البدء بقائمة فارغة');
  const old={name:nm||'حلقة',date:new Date().toLocaleDateString('ar-EG'),start:S.start,cfg:S.cfg,students:S.students,days:S.days};
  S={...DEF(),archive:[...S.archive,old],cfg:S.cfg,city:S.city,country:S.country,students:keep?S.students.map(s=>({id:s.id,name:s.name})):[]};
  cur=1;save()};
const arcView=i=>{const x=S.archive[i];$('arcBody').innerHTML=`<h3>🗂 ${esc(x.name)}</h3>`+rankHTML(calc(x),false);$('arcDlg').showModal()};
const arcDel=i=>{if(admin()&&confirm('حذف هذه الحلقة من الأرشيف نهائياً؟')){S.archive.splice(i,1);save()}};
