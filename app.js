const DEF=()=>({start:'',students:[],days:{},cfg:{p:10,e:5,a:0,b1:1,b2:2,b3:3}});
let S=DEF(), pw=sessionStorage.getItem('pw')||'', cur=1, timer;
const $=id=>document.getElementById(id);
const admin=()=>!!pw;
const esc=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const day=n=>S.days[n]||(S.days[n]={stop:'',rec:{}});
const rec=(n,id)=>day(n).rec[id]||(day(n).rec[id]={s:'',b:0,n:''});
const todayNo=()=>{if(!S.start)return 0;const d=Math.floor((new Date()-new Date(S.start))/864e5)+1;return d>=1&&d<=30?d:0};
const BEH=['لم يُقيَّم','مقبول','جيد','ممتاز'];
const status=t=>$('status').textContent=t;

function store(){
  if(!admin())return;
  clearTimeout(timer);status('… جارٍ الحفظ');
  timer=setTimeout(async()=>{
    try{
      const r=await fetch('/api/data',{method:'POST',headers:{'Content-Type':'application/json','x-admin-password':pw},body:JSON.stringify(S)});
      if(r.status===401){logout();return}
      status(r.ok?'✔ تم الحفظ':'⚠ فشل الحفظ');
    }catch{status('⚠ فشل الحفظ')}
  },500);
}
const save=()=>{store();render()};

async function load(){
  try{
    const d=await (await fetch('/api/data')).json();
    if(d)S={...DEF(),...d,cfg:{...DEF().cfg,...d.cfg}};
  }catch{status('⚠ تعذر الاتصال بالخادم')}
  render();
}
async function verify(){
  if(!pw)return;
  const r=await fetch('/api/data?check=1',{headers:{'x-admin-password':pw}});
  if(!r.ok){pw='';sessionStorage.removeItem('pw')}
}
function render(){
  const a=admin(),dis=a?'':'disabled',t=todayNo(),c=S.cfg;
  document.body.classList.toggle('admin',a);
  $('loginBtn').style.display=a?'none':'';
  $('start').value=S.start;
  [['cp','p'],['ce','e'],['ca','a'],['c1','b1'],['c2','b2'],['c3','b3']].forEach(([i,k])=>{if(document.activeElement!==$(i))$(i).value=c[k]});
  $('hint').textContent=`النقاط: حاضر ${c.p} • معتذر ${c.e} • غائب ${c.a} — السلوك: ممتاز +${c.b3} • جيد +${c.b2} • مقبول +${c.b1}`;
  $('days').innerHTML=Array.from({length:30},(_,i)=>{const n=i+1,d=S.days[n];
    const done=d&&Object.values(d.rec).some(r=>r.s);
    return `<button class="${n===cur?'active ':''}${done?'done ':''}${n===t?'today':''}" onclick="go(${n})">${n}</button>`}).join('');
  $('dayTitle').textContent=`اليوم ${cur} من رمضان`;
  $('juz').textContent=`الجزء ${cur}`;
  $('stop').disabled=!a;
  if(document.activeElement!==$('stop'))$('stop').value=day(cur).stop;
  $('list').innerHTML=S.students.length?S.students.map(s=>{const r=rec(cur,s.id);
    return `<div class="stu"><div class="top"><span>${esc(s.name)}</span><span class="adm"><button class="ren" onclick="renStu('${s.id}')">✏</button><button class="del" onclick="delStu('${s.id}')">🗑</button></span></div>
    <div class="st">${[['p','حاضر'],['e','معتذر'],['a','غائب']].map(([k,l])=>`<button class="${k}${r.s===k?' on':''}" onclick="setS('${s.id}','${k}')">${l}</button>`).join('')}</div>
    <div class="row"><select ${dis} onchange="setB('${s.id}',this.value)">${BEH.map((b,i)=>`<option value="${i}"${r.b==i?' selected':''}>${i?'السلوك: '+b:'السلوك: '+b}</option>`).join('')}</select>
    <input ${dis} placeholder="ملاحظة..." value="${esc(r.n)}" oninput="setN('${s.id}',this.value)"></div></div>`}).join('')
    :'<div class="empty">لم تُضف أسماء بعد ✨</div>';
  const k={p:0,e:0,a:0};S.students.forEach(s=>{const r=rec(cur,s.id);if(r.s)k[r.s]++});
  $('summary').innerHTML=`<span>✅ ${k.p}</span><span>🟡 ${k.e}</span><span>❌ ${k.a}</span>`;
  const bp=[0,c.b1,c.b2,c.b3];
  const rows=S.students.map(s=>{let p=0,e=0,a=0,pts=0;
    for(let n=1;n<=30;n++){const r=S.days[n]&&S.days[n].rec[s.id];if(!r||!r.s)continue;
      if(r.s==='p'){p++;pts+=+c.p}else if(r.s==='e'){e++;pts+=+c.e}else{a++;pts+=+c.a}
      pts+=+bp[r.b||0]}
    const tot=p+e+a;return{name:s.name,p,e,a,pts,pct:tot?Math.round(p/tot*100):0}}).sort((x,y)=>y.pts-x.pts);
  $('rank').innerHTML=rows.length?rows.map((r,i)=>`<div class="r"><div class="n">${['🥇','🥈','🥉'][i]||i+1}</div>
    <div class="nm">${esc(r.name)}<small>حضور ${r.p} • اعتذار ${r.e} • غياب ${r.a} — نسبة الحضور ${r.pct}%</small><div class="bar"><i style="width:${r.pct}%"></i></div></div>
    <div class="pt">${r.pts}</div></div>`).join(''):'<div class="empty">لا توجد بيانات بعد</div>';
}
const go=n=>{cur=n;render()};
const setS=(id,k)=>{if(!admin())return;const r=rec(cur,id);r.s=r.s===k?'':k;save()};
const setB=(id,v)=>{if(!admin())return;rec(cur,id).b=+v;save()};
const setN=(id,v)=>{if(!admin())return;rec(cur,id).n=v;store()};
const delStu=id=>{if(admin()&&confirm('حذف الطالب وكل سجلاته؟')){S.students=S.students.filter(s=>s.id!==id);save()}};
const renStu=id=>{const s=S.students.find(x=>x.id===id),v=prompt('الاسم الجديد:',s.name);if(v&&v.trim()){s.name=v.trim();save()}};
function add(){const v=$('newName').value.trim();if(!v||!admin())return;
  S.students.push({id:'s'+Date.now(),name:v});$('newName').value='';save()}
$('addBtn').onclick=add;
$('newName').onkeydown=e=>{if(e.key==='Enter')add()};
$('stop').oninput=e=>{day(cur).stop=e.target.value;store()};
$('start').onchange=e=>{S.start=e.target.value;const t=todayNo();if(t)cur=t;save()};
[['cp','p'],['ce','e'],['ca','a'],['c1','b1'],['c2','b2'],['c3','b3']].forEach(([i,k])=>{$(i).oninput=e=>{S.cfg[k]=+e.target.value||0;save()}});
$('exp').onclick=()=>{const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([JSON.stringify(S,null,1)],{type:'application/json'}));
  a.download='quran-ramadan-backup.json';a.click()};
$('imp').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();
  r.onload=()=>{try{S={...DEF(),...JSON.parse(r.result)};save()}catch{alert('ملف غير صالح')}};r.readAsText(f)};
$('reset').onclick=()=>{if(confirm('سيتم حذف كل البيانات نهائياً. هل أنت متأكد؟')&&confirm('تأكيد أخير: حذف كل شيء؟')){S=DEF();save()}};
function logout(){pw='';sessionStorage.removeItem('pw');status('');render()}
$('logout').onclick=logout;
$('loginBtn').onclick=()=>{$('pw').value='';$('lgErr').textContent='';$('lg').showModal();$('pw').focus()};
$('lgCancel').onclick=()=>$('lg').close();
async function doLogin(){
  const v=$('pw').value;if(!v)return;
  const r=await fetch('/api/data?check=1',{headers:{'x-admin-password':v}});
  if(r.ok){pw=v;sessionStorage.setItem('pw',v);$('lg').close();render()}
  else $('lgErr').textContent='كلمة السر غير صحيحة';
}
$('lgOk').onclick=doLogin;
$('pw').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();doLogin()}};
(async()=>{await verify();await load();if(todayNo()){cur=todayNo();render()}
  setInterval(()=>{if(!admin())load()},60000)})();
