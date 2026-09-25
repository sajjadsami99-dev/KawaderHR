const express=require('express');const session=require('express-session');const fs=require('fs');const path=require('path');
const app=express();const PORT=Number(process.env.PORT||3000),HOST='127.0.0.1',DATA=path.join(__dirname,'data.json');
app.use(express.json({limit:'20mb'}));app.use(express.urlencoded({extended:true}));app.use(session({secret:'naseem-alkaram-local-2026',resave:false,saveUninitialized:false,cookie:{httpOnly:true,maxAge:12*60*60*1000}}));
function fresh(){return {settings:{company:'شركة نسيم الكرم للتجارة العامة المحدودة',developer:'سجاد سامي',version:'5.0.0',workStart:'08:00',workEnd:'18:00',grace:15,monthDays:30,dailyHours:10,weeklyDays:7},employees:[{id:1,name:'سجاد سامي',job:'محاسب',department:'',phone:'',salary:0,currency:'IQD',payType:'monthly',hireDate:'',notes:'',active:true},{id:2,name:'علي ميماتي',job:'سائق',department:'',phone:'',salary:0,currency:'IQD',payType:'monthly',hireDate:'',notes:'',active:true},{id:3,name:'علي رائد',job:'سائق',department:'',phone:'',salary:0,currency:'IQD',payType:'monthly',hireDate:'',notes:'',active:true},{id:4,name:'علي بدرية',job:'تحميل',department:'',phone:'',salary:0,currency:'IQD',payType:'monthly',hireDate:'',notes:'',active:true},{id:5,name:'كريم',job:'كهربائي',department:'معمل',phone:'',salary:0,currency:'IQD',payType:'monthly',hireDate:'',notes:'',active:true},{id:6,name:'محمد كريم',job:'عامل',department:'معمل',phone:'',salary:0,currency:'IQD',payType:'monthly',hireDate:'',notes:'',active:true},{id:7,name:'حسين محمل',job:'سائق',department:'معمل',phone:'',salary:0,currency:'IQD',payType:'monthly',hireDate:'',notes:'',active:true},{id:8,name:'ايمن',job:'عامل',department:'معمل',phone:'',salary:0,currency:'IQD',payType:'monthly',hireDate:'',notes:'',active:true},{id:9,name:'توير',job:'عامل',department:'معمل',phone:'',salary:0,currency:'IQD',payType:'monthly',hireDate:'',notes:'',active:true},{id:10,name:'قدوري/عباس',job:'عامل',department:'معمل',phone:'',salary:0,currency:'IQD',payType:'monthly',hireDate:'',notes:'',active:true}],attendance:[],adjustments:[],loans:[],payroll:[],leaves:[],holidays:[],departments:[{id:1,name:'الإدارة',manager:'',note:''},{id:2,name:'الحسابات',manager:'',note:''},{id:3,name:'المعمل',manager:'',note:''},{id:4,name:'النقل والسائقين',manager:'',note:''},{id:5,name:'التحميل',manager:'',note:''},{id:6,name:'الكهرباء والصيانة',manager:'',note:''}],candidates:[],onboarding:[],documents:[],performance:[],training:[],assets:[],requests:[],certificates:[],terminations:[],audit:[],users:[{id:1,username:'admin',password:'123456',name:'المدير',role:'admin',active:true}]};}
function load(){if(!fs.existsSync(DATA)){let d=fresh();fs.writeFileSync(DATA,JSON.stringify(d,null,2));return d}try{let d=JSON.parse(fs.readFileSync(DATA,'utf8'));let f=fresh();for(const k of Object.keys(f))if(d[k]===undefined)d[k]=f[k];return d}catch(e){return fresh()}}
let db=load();
// Migration for salary currency/pay frequency and payroll rules
db.settings=Object.assign({monthDays:30,dailyHours:10,weeklyDays:7,workStart:'08:00',workEnd:'18:00',grace:15}, db.settings||{});
for(const e of db.employees){ if(!e.currency)e.currency='IQD'; if(!e.payType)e.payType='monthly'; }
for(const l of (db.loans||[])){ if(!l.currency){ const e=db.employees.find(e=>Number(e.id)===Number(l.employeeId)); l.currency=e?.currency||'IQD'; } }
for(const a of (db.adjustments||[])){ if(a.reason===undefined)a.reason=''; if(a.category===undefined)a.category=''; if(a.reference===undefined)a.reference=''; if(a.date===undefined)a.date=''; }
const BACKUP_DIR=path.join(__dirname,'backups');
const MAX_AUTO_BACKUPS=300;
function automaticBackup(){
  try{
    fs.mkdirSync(BACKUP_DIR,{recursive:true});
    const stamp=new Date().toISOString().replace(/[:.]/g,'-');
    const file=path.join(BACKUP_DIR,`auto-${stamp}.json`);
    fs.writeFileSync(file,JSON.stringify(db,null,2),'utf8');
    const files=fs.readdirSync(BACKUP_DIR).filter(f=>f.startsWith('auto-')&&f.endsWith('.json')).sort();
    while(files.length>MAX_AUTO_BACKUPS){
      const old=files.shift();
      try{fs.unlinkSync(path.join(BACKUP_DIR,old))}catch{}
    }
  }catch(e){console.error('Automatic backup failed:',e.message)}
}
function save(){
  const tmp=DATA+'.tmp';
  fs.writeFileSync(tmp,JSON.stringify(db,null,2),'utf8');
  fs.renameSync(tmp,DATA);
  automaticBackup();
}function nextId(a){return a.length?Math.max(...a.map(x=>Number(x.id)||0))+1:1}const emp=id=>db.employees.find(e=>Number(e.id)===Number(id));
function auth(req,res,next){if(!req.session.user)return res.status(401).json({error:'غير مسجل الدخول'});next()}function audit(req,action,detail=''){db.audit.unshift({id:nextId(db.audit),at:new Date().toISOString(),user:req.session.user?.username||'',action,detail});db.audit=db.audit.slice(0,1000)}
app.post('/api/login',(req,res)=>{let u=db.users.find(x=>x.username===String(req.body.username||'')&&x.password===String(req.body.password||'')&&x.active!==false);if(u){req.session.user={id:u.id,username:u.username,name:u.name,role:u.role};audit(req,'تسجيل دخول',u.username);save();return res.json({ok:true,user:req.session.user})}res.status(401).json({error:'اسم المستخدم أو كلمة المرور غير صحيحة'})});
app.post('/api/logout',(req,res)=>req.session.destroy(()=>res.json({ok:true})));app.get('/api/me',(req,res)=>res.json({user:req.session.user||null}));

app.get('/api/alerts',auth,(req,res)=>{
  const now=new Date(); const limit=new Date(now); limit.setDate(limit.getDate()+30);
  const iso=d=>new Date(d+'T23:59:59');
  const alerts=[];
  (db.documents||[]).forEach(x=>{ if(x.expiryDate){const d=iso(x.expiryDate); if(!isNaN(d)&&d<=limit){const days=Math.ceil((d-now)/86400000); alerts.push({type:'document',level:days<0?'danger':days<=7?'warning':'info',title:'مستند يحتاج متابعة',detail:(emp(x.employeeId)?.name||'موظف')+' — '+(x.type||'مستند')+' — '+(days<0?'منتهي':('متبقي '+days+' يوم'))});}}});
  (db.requests||[]).filter(x=>String(x.status||'').toLowerCase()==='pending').forEach(x=>alerts.push({type:'request',level:'warning',title:'طلب بانتظار الموافقة',detail:(emp(x.employeeId)?.name||'موظف')+' — '+(x.type||'طلب')}));
  (db.leaves||[]).filter(x=>String(x.status||'').toLowerCase()==='pending').forEach(x=>alerts.push({type:'leave',level:'warning',title:'إجازة بانتظار الموافقة',detail:(emp(x.employeeId)?.name||'موظف')+' — من '+(x.from||'')+' إلى '+(x.to||'')}));
  (db.terminations||[]).filter(x=>{const e=emp(x.employeeId);return e&&e.active===false}).forEach(x=>alerts.push({type:'archive',level:'info',title:'موظف مؤرشف',detail:(emp(x.employeeId)?.name||'موظف')+' — إنهاء خدمة '+(x.lastDay||'')}));
  res.json(alerts.slice(0,100));
});
app.get('/api/backups',auth,(req,res)=>{try{fs.mkdirSync(BACKUP_DIR,{recursive:true});const list=fs.readdirSync(BACKUP_DIR).filter(f=>f.endsWith('.json')).map(f=>{const st=fs.statSync(path.join(BACKUP_DIR,f));return {name:f,size:st.size,modified:st.mtime.toISOString(),type:f.startsWith('auto-')?'تلقائي':'يدوي'}}).sort((a,b)=>b.modified.localeCompare(a.modified));res.json(list)}catch(e){res.status(500).json({error:e.message})}});
app.post('/api/backups/manual',auth,(req,res)=>{try{fs.mkdirSync(BACKUP_DIR,{recursive:true});const stamp=new Date().toISOString().replace(/[:.]/g,'-');const file=path.join(BACKUP_DIR,`manual-${stamp}.json`);fs.writeFileSync(file,JSON.stringify(db,null,2),'utf8');audit(req,'إنشاء نسخة احتياطية يدوية',path.basename(file));save();res.json({ok:true,name:path.basename(file)})}catch(e){res.status(500).json({error:e.message})}});
app.get('/api/backups/download/:name',auth,(req,res)=>{const name=path.basename(req.params.name);if(!/^(auto|manual)-[A-Za-z0-9T_-]+\.json$/.test(name))return res.status(400).json({error:'اسم النسخة غير صالح'});const file=path.join(BACKUP_DIR,name);if(!fs.existsSync(file))return res.status(404).json({error:'النسخة غير موجودة'});res.download(file,name)});
app.get('/api/dashboard',auth,(req,res)=>{const m=req.query.month||new Date().toISOString().slice(0,7);const at=db.attendance.filter(x=>x.day.startsWith(m));const p=calcPayroll(m);res.json({employees:db.employees.length,active:db.employees.filter(e=>e.active).length,present:new Set(at.filter(x=>x.status==='present').map(x=>x.employeeId+'-'+x.day)).size,absent:at.filter(x=>x.status==='absent').length,late:at.filter(x=>Number(x.lateMinutes)>0).length,totalPayrollIQD:p.filter(x=>x.currency==='IQD').reduce((s,x)=>s+Number(x.netSalary||0),0),totalPayrollUSD:p.filter(x=>x.currency==='USD').reduce((s,x)=>s+Number(x.netSalary||0),0),loansIQD:db.loans.filter(x=>x.status==='active'&&(x.currency||'IQD')==='IQD').reduce((s,x)=>s+Math.max(0,x.total-(x.paidCount||0)*x.installment),0),loansUSD:db.loans.filter(x=>x.status==='active'&&x.currency==='USD').reduce((s,x)=>s+Math.max(0,x.total-(x.paidCount||0)*x.installment),0),month:m})});
app.get('/api/settings',auth,(req,res)=>res.json(db.settings));app.put('/api/settings',auth,(req,res)=>{db.settings={...db.settings,...req.body,developer:'سجاد سامي'};audit(req,'تعديل الإعدادات');save();res.json(db.settings)});app.post('/api/logo',auth,(req,res)=>{try{const d=String((req.body||{}).data||'');const m=d.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);if(!m)return res.status(400).json({error:'صيغة الشعار غير مدعومة'});const ext=m[1]==='jpg'||m[1]==='jpeg'?'jpg':m[1];const buf=Buffer.from(m[2],'base64');if(buf.length>5*1024*1024)return res.status(400).json({error:'حجم الشعار كبير جداً'});fs.writeFileSync(path.join(__dirname,'public','logo.'+ext),buf);if(ext!=='png')fs.copyFileSync(path.join(__dirname,'public','logo.'+ext),path.join(__dirname,'public','logo.png'));audit(req,'تغيير شعار الشركة');res.json({ok:true});}catch(e){res.status(500).json({error:'تعذر حفظ الشعار'})}});app.post('/api/developer-photo',auth,(req,res)=>res.status(403).json({error:'صورة المطور ثابتة ولا يمكن تعديلها'}));
app.get('/api/employees',auth,(req,res)=>res.json(db.employees));app.post('/api/employees',auth,(req,res)=>{let x=req.body||{},currency=['IQD','USD'].includes(x.currency)?x.currency:'IQD',payType=['monthly','weekly','daily'].includes(x.payType)?x.payType:'monthly',e={id:nextId(db.employees),name:String(x.name||'').trim(),job:x.job||'',department:x.department||'',phone:x.phone||'',salary:Number(x.salary)||0,currency,payType,hireDate:x.hireDate||'',notes:x.notes||'',active:x.active!==false};if(!e.name)return res.status(400).json({error:'اسم الموظف مطلوب'});if(e.salary<0)return res.status(400).json({error:'الراتب لا يمكن أن يكون سالباً'});db.employees.push(e);audit(req,'إضافة موظف',e.name);save();res.json(e)});
app.put('/api/employees/:id',auth,(req,res)=>{let e=emp(req.params.id);if(!e)return res.status(404).json({error:'الموظف غير موجود'});let currency=['IQD','USD'].includes(req.body.currency)?req.body.currency:(e.currency||'IQD'),payType=['monthly','weekly','daily'].includes(req.body.payType)?req.body.payType:(e.payType||'monthly');Object.assign(e,{name:req.body.name||e.name,job:req.body.job??e.job,department:req.body.department??e.department,phone:req.body.phone??e.phone,salary:Number(req.body.salary)>=0?Number(req.body.salary):e.salary,currency,payType,hireDate:req.body.hireDate??e.hireDate,notes:req.body.notes??e.notes,active:req.body.active!==undefined?!!req.body.active:e.active});audit(req,'تعديل موظف',e.name);save();res.json(e)});
app.delete('/api/employees/:id',auth,(req,res)=>{let id=Number(req.params.id),e=emp(id);if(!e)return res.status(404).json({error:'الموظف غير موجود'});db.employees=db.employees.filter(x=>Number(x.id)!==id);for(const k of ['attendance','adjustments','loans','payroll','leaves'])db[k]=db[k].filter(x=>Number(x.employeeId)!==id);audit(req,'حذف موظف',e.name);save();res.json({ok:true})});
app.get('/api/attendance',auth,(req,res)=>{let m=req.query.month||new Date().toISOString().slice(0,7);res.json(db.attendance.filter(x=>x.day.startsWith(m)).map(x=>({...x,name:emp(x.employeeId)?.name||'—'})).sort((a,b)=>b.day.localeCompare(a.day)))});
app.post('/api/attendance',auth,(req,res)=>{let x=req.body||{},day=x.day;if(!day||!emp(x.employeeId))return res.status(400).json({error:'بيانات الحضور غير مكتملة'});let a=db.attendance.find(z=>z.employeeId==x.employeeId&&z.day===day);if(!a){a={id:nextId(db.attendance),employeeId:Number(x.employeeId),day};db.attendance.push(a)}let late=Number(x.lateMinutes)||0,ot=Number(x.overtimeMinutes)||0;const start=db.settings.workStart||'08:00',end=db.settings.workEnd||'17:00';if(x.checkIn&&x.status==='present'){let [sh,sm]=start.split(':').map(Number),[ih,im]=x.checkIn.split(':').map(Number);late=Math.max(0,(ih*60+im)-(sh*60+sm)-(Number(db.settings.grace)||0));}if(x.checkOut&&x.status==='present'){let [eh,em]=end.split(':').map(Number),[oh,om]=x.checkOut.split(':').map(Number);ot=Math.max(0,(oh*60+om)-(eh*60+em));}Object.assign(a,{status:x.status||'present',checkIn:x.checkIn||'',checkOut:x.checkOut||'',lateMinutes:late,overtimeMinutes:ot,note:x.note||''});audit(req,'تسجيل حضور',emp(x.employeeId).name+' '+day);save();res.json(a)});
app.delete('/api/attendance/:id',auth,(req,res)=>{db.attendance=db.attendance.filter(x=>Number(x.id)!==Number(req.params.id));audit(req,'حذف سجل حضور');save();res.json({ok:true})});
app.get('/api/adjustments',auth,(req,res)=>{let m=req.query.month||new Date().toISOString().slice(0,7);res.json(db.adjustments.filter(x=>x.month===m).map(x=>({...x,name:emp(x.employeeId)?.name||'—'})).reverse())});app.post('/api/adjustments',auth,(req,res)=>{let x=req.body||{},amount=Number(x.amount);if(!x.employeeId||!x.month||!x.type||!Number.isFinite(amount)||amount<0)return res.status(400).json({error:'بيانات الحركة غير مكتملة أو المبلغ غير صحيح'});if(x.type==='deduction'&&!String(x.reason||'').trim())return res.status(400).json({error:'سبب الخصم مطلوب'});let a={id:nextId(db.adjustments),employeeId:Number(x.employeeId),month:x.month,type:x.type,amount,note:String(x.note||''),reason:String(x.reason||''),category:String(x.category||''),reference:String(x.reference||''),date:String(x.date||new Date().toISOString().slice(0,10))};db.adjustments.push(a);audit(req,'إضافة حركة مالية',emp(a.employeeId)?.name||'');save();res.json(a)});app.delete('/api/adjustments/:id',auth,(req,res)=>{db.adjustments=db.adjustments.filter(x=>Number(x.id)!==Number(req.params.id));audit(req,'حذف حركة مالية');save();res.json({ok:true})});
app.get('/api/loans',auth,(req,res)=>res.json(db.loans.map(x=>({...x,name:emp(x.employeeId)?.name||'—',remaining:Math.max(0,Number(x.total)-(Number(x.paidCount)||0)*Number(x.installment))})).reverse()));app.post('/api/loans',auth,(req,res)=>{let x=req.body||{},l={id:nextId(db.loans),employeeId:Number(x.employeeId),total:Number(x.total)||0,installment:Number(x.installment)||0,installmentsCount:Number(x.installmentsCount)||0,paidCount:0,status:'active',createdAt:new Date().toISOString(),note:x.note||''};if(!l.employeeId||!l.total||!l.installment)return res.status(400).json({error:'بيانات السلفة غير مكتملة'});db.loans.push(l);audit(req,'إضافة سلفة',emp(l.employeeId)?.name||'');save();res.json(l)});app.delete('/api/loans/:id',auth,(req,res)=>{db.loans=db.loans.filter(x=>Number(x.id)!==Number(req.params.id));audit(req,'حذف سلفة');save();res.json({ok:true})});
app.get('/api/leaves',auth,(req,res)=>{let m=req.query.month||'';res.json(db.leaves.filter(x=>!m||x.from.startsWith(m)||x.to.startsWith(m)).map(x=>({...x,name:emp(x.employeeId)?.name||'—'})).reverse())});app.post('/api/leaves',auth,(req,res)=>{let x=req.body||{},l={id:nextId(db.leaves),employeeId:Number(x.employeeId),type:x.type||'اعتيادية',from:x.from,to:x.to,note:x.note||'',status:x.status||'approved'};if(!l.employeeId||!l.from||!l.to)return res.status(400).json({error:'بيانات الإجازة ناقصة'});db.leaves.push(l);audit(req,'إضافة إجازة',emp(l.employeeId)?.name||'');save();res.json(l)});app.delete('/api/leaves/:id',auth,(req,res)=>{db.leaves=db.leaves.filter(x=>Number(x.id)!==Number(req.params.id));audit(req,'حذف إجازة');save();res.json({ok:true})});
app.get('/api/holidays',auth,(req,res)=>res.json(db.holidays));app.post('/api/holidays',auth,(req,res)=>{let x=req.body||{},h={id:nextId(db.holidays),date:x.date,name:x.name||''};if(!h.date)return res.status(400).json({error:'التاريخ مطلوب'});db.holidays.push(h);audit(req,'إضافة عطلة',h.name);save();res.json(h)});app.delete('/api/holidays/:id',auth,(req,res)=>{db.holidays=db.holidays.filter(x=>Number(x.id)!==Number(req.params.id));audit(req,'حذف عطلة');save();res.json({ok:true})});
// ===== HR 3.0 modules =====
function collectionRoutes(name,label,required=[]){
  app.get('/api/'+name,auth,(req,res)=>res.json(db[name]||[]));
  app.post('/api/'+name,auth,(req,res)=>{let x=req.body||{};for(const k of required)if(!String(x[k]??'').trim())return res.status(400).json({error:'البيانات المطلوبة ناقصة'});let item={id:nextId(db[name]),...x,createdAt:new Date().toISOString()};db[name].push(item);audit(req,'إضافة '+label,item.name||item.title||item.type||'');save();res.json(item)});
  app.put('/api/'+name+'/:id',auth,(req,res)=>{let item=db[name].find(x=>Number(x.id)===Number(req.params.id));if(!item)return res.status(404).json({error:'السجل غير موجود'});Object.assign(item,req.body||{});audit(req,'تعديل '+label,item.name||item.title||item.type||'');save();res.json(item)});
  app.delete('/api/'+name+'/:id',auth,(req,res)=>{let old=db[name].find(x=>Number(x.id)===Number(req.params.id));db[name]=db[name].filter(x=>Number(x.id)!==Number(req.params.id));audit(req,'حذف '+label,old?.name||old?.title||'');save();res.json({ok:true})});
}
app.get('/api/departments',auth,(req,res)=>res.json(db.departments));
app.post('/api/departments',auth,(req,res)=>{let x=req.body||{};if(!String(x.name||'').trim())return res.status(400).json({error:'اسم القسم مطلوب'});let d={id:nextId(db.departments),name:String(x.name).trim(),manager:x.manager||'',note:x.note||''};db.departments.push(d);audit(req,'إضافة قسم',d.name);save();res.json(d)});
app.put('/api/departments/:id',auth,(req,res)=>{let d=db.departments.find(x=>Number(x.id)===Number(req.params.id));if(!d)return res.status(404).json({error:'القسم غير موجود'});Object.assign(d,{name:req.body.name??d.name,manager:req.body.manager??d.manager,note:req.body.note??d.note});audit(req,'تعديل قسم',d.name);save();res.json(d)});
app.delete('/api/departments/:id',auth,(req,res)=>{let id=Number(req.params.id),d=db.departments.find(x=>Number(x.id)===id);if(!d)return res.status(404).json({error:'القسم غير موجود'});if(db.employees.some(e=>e.active&&e.department===d.name))return res.status(400).json({error:'لا يمكن حذف قسم مرتبط بموظفين فعالين'});db.departments=db.departments.filter(x=>Number(x.id)!==id);audit(req,'حذف قسم',d.name);save();res.json({ok:true})});
collectionRoutes('candidates','مرشح', ['name']);
collectionRoutes('onboarding','مباشرة', ['employeeId']);
collectionRoutes('documents','مستند', ['employeeId','type']);
collectionRoutes('performance','تقييم أداء', ['employeeId','period']);
collectionRoutes('training','دورة تدريبية', ['title']);
collectionRoutes('assets','عهدة', ['employeeId','name']);
collectionRoutes('requests','طلب موظف', ['employeeId','type']);
collectionRoutes('certificates','كتاب/شهادة', ['employeeId','type']);
app.get('/api/terminations',auth,(req,res)=>res.json(db.terminations.map(t=>({...t,name:emp(t.employeeId)?.name||'—'}))));
app.post('/api/terminations',auth,(req,res)=>{let x=req.body||{};if(!x.employeeId||!x.lastDay||!x.reason)return res.status(400).json({error:'بيانات إنهاء الخدمة ناقصة'});let e=emp(x.employeeId);if(!e)return res.status(404).json({error:'الموظف غير موجود'});let t={id:nextId(db.terminations),employeeId:Number(x.employeeId),lastDay:x.lastDay,reason:x.reason,note:x.note||'',createdAt:new Date().toISOString()};db.terminations.push(t);e.active=false;e.terminationDate=x.lastDay;e.terminationReason=x.reason;audit(req,'إنهاء خدمة',e.name);save();res.json(t)});
app.delete('/api/terminations/:id',auth,(req,res)=>{let t=db.terminations.find(x=>Number(x.id)===Number(req.params.id));if(!t)return res.status(404).json({error:'السجل غير موجود'});db.terminations=db.terminations.filter(x=>Number(x.id)!==Number(req.params.id));audit(req,'حذف سجل إنهاء خدمة');save();res.json({ok:true})});
app.get('/api/orgchart',auth,(req,res)=>{res.json((db.departments||[]).map(d=>({department:d,employees:db.employees.filter(e=>e.department===d.name)})))});
function daysInMonth(month){const [y,m]=String(month).split('-').map(Number);return new Date(y,m,0).getDate()||30;}
function overlapDays(from,to,month){if(!from||!to)return 0;const [y,m]=String(month).split('-').map(Number);const a=new Date(Math.max(new Date(from+'T00:00:00').getTime(),new Date(`${month}-01T00:00:00`).getTime()));const b=new Date(Math.min(new Date(to+'T00:00:00').getTime(),new Date(y,m,0,23,59,59).getTime()));if(b<a)return 0;return Math.floor((b-a)/86400000)+1;}
function leaveDateSet(employeeId,month,predicate){const [y,m]=String(month).split('-').map(Number);const last=daysInMonth(month);const set=new Set();for(let day=1;day<=last;day++){const d=`${month}-${String(day).padStart(2,'0')}`;const ok=(db.leaves||[]).some(l=>Number(l.employeeId)===Number(employeeId)&&predicate(l)&&String(l.from||'')<=d&&String(l.to||'')>=d);if(ok)set.add(d);}return set;}
function roundMoney(n,currency){const scale=currency==='USD'?100:1;return Math.round((Number(n)||0)*scale)/scale;}
function roundRate(n){return Math.round((Number(n)||0)*1000000)/1000000;}
function calcPayroll(month){
  const cfg={monthDays:Number(db.settings.monthDays)||30,dailyHours:Number(db.settings.dailyHours)||10,weeklyDays:Number(db.settings.weeklyDays)||7};
  const monthDays=cfg.monthDays;
  return db.employees.filter(e=>e.active).map(e=>{
    const currency=e.currency||'IQD', payType=e.payType||'monthly';
    const arr=db.adjustments.filter(a=>a.employeeId===e.id&&a.month===month);
    const sum=t=>arr.filter(a=>a.type===t).reduce((s,a)=>s+Number(a.amount||0),0);
    const ats=db.attendance.filter(a=>a.employeeId===e.id&&a.day.startsWith(month));
    const presentSet=new Set(ats.filter(a=>a.status==='present').map(a=>a.day));
    const absentSet=new Set(ats.filter(a=>a.status==='absent').map(a=>a.day));
    const presentDays=presentSet.size;
    const absentDays=absentSet.size;
    const late=ats.reduce((s,a)=>s+Number(a.lateMinutes||0),0);
    const overtime=ats.reduce((s,a)=>s+Number(a.overtimeMinutes||0),0);
    const paidLeaveSet=leaveDateSet(e.id,month,l=>l.status!=='rejected'&&l.status!=='مرفوض'&&l.type!=='بدون راتب'&&l.type!=='غير مدفوعة');
    const unpaidLeaveSet=leaveDateSet(e.id,month,l=>(l.status==='approved'||l.status==='مقبول'||!l.status)&&(l.type==='بدون راتب'||l.type==='غير مدفوعة'));
    const paidWorkSet=new Set([...presentSet,...paidLeaveSet]);
    unpaidLeaveSet.forEach(d=>paidWorkSet.delete(d));
    const unpaidSet=new Set([...absentSet,...unpaidLeaveSet]);
    const paidLeaveDays=paidLeaveSet.size;
    const unpaidLeaveDays=unpaidLeaveSet.size;
    const totalSalary=Number(e.salary)||0;
    const dailyRate=payType==='daily'?totalSalary:(payType==='weekly'?totalSalary/cfg.weeklyDays:totalSalary/monthDays);
    const hourlyRate=dailyRate/cfg.dailyHours;
    const minuteRate=hourlyRate/60;
    let paidDays,unpaidDays,baseEarned,method;
    if(payType==='monthly'){
      // Monthly employees receive the agreed monthly salary; only recorded unpaid absence/leave reduces it.
      unpaidDays=Math.min(monthDays,unpaidSet.size);
      paidDays=Math.max(0,monthDays-unpaidDays);
      baseEarned=paidDays*dailyRate;
      method=`الشهري: ${paidDays} يوم مدفوع × أجر اليوم (${monthDays} يوم أساس)`;
    }else if(payType==='weekly'){
      unpaidDays=unpaidLeaveDays;
      paidDays=Math.min(monthDays,paidWorkSet.size);
      baseEarned=paidDays*dailyRate;
      method=`الأسبوعي: ${paidDays} يوم مستحق × أجر اليوم (أجر الأسبوع ÷ ${cfg.weeklyDays})`;
    }else{
      unpaidDays=unpaidLeaveDays;
      paidDays=Math.min(monthDays,paidWorkSet.size);
      baseEarned=paidDays*dailyRate;
      method=`اليومي: ${paidDays} يوم مستحق × أجر اليوم`;
    }
    const lateDeduction=late*minuteRate;
    const overtimeBonus=overtime*minuteRate;
    const bonuses=sum('bonus')+overtimeBonus;
    const allowances=sum('allowance');
    const deductions=sum('deduction')+lateDeduction;
    const advances=sum('advance');
    const loan=db.loans.filter(l=>l.employeeId===e.id&&l.status==='active').sort((a,b)=>b.id-a.id)[0];
    const inst=loan?Math.min(Number(loan.installment||0),Math.max(0,Number(loan.total||0)-(Number(loan.paidCount)||0)*Number(loan.installment||0))):0;
    const net=baseEarned+bonuses+allowances-deductions-advances-inst;
    return {employeeId:e.id,name:e.name,salary:roundMoney(totalSalary,currency),currency,payType,dailyRate:roundRate(dailyRate),hourlyRate:roundRate(hourlyRate),minuteRate:roundRate(minuteRate),presentDays,paidLeaveDays,absentDays,unpaidLeaveDays,unpaidDays,paidDays,lateMinutes:late,overtimeMinutes:overtime,lateDeduction:roundMoney(lateDeduction,currency),overtimeBonus:roundMoney(overtimeBonus,currency),earnedSalary:roundMoney(baseEarned,currency),bonuses:roundMoney(bonuses,currency),allowances:roundMoney(allowances,currency),deductions:roundMoney(deductions,currency),advances:roundMoney(advances,currency),loanInstallment:roundMoney(inst,currency),netSalary:roundMoney(net,currency),calculationMethod:method,dailyHours:cfg.dailyHours,monthDays,closed:!!db.payroll.find(p=>p.employeeId===e.id&&p.month===month)};
  });
}

app.get('/api/payroll',auth,(req,res)=>res.json(calcPayroll(req.query.month||new Date().toISOString().slice(0,7))));app.post('/api/payroll/close',auth,(req,res)=>{let month=req.body.month,rows=calcPayroll(month);rows.forEach(r=>{let p=db.payroll.find(x=>x.employeeId===r.employeeId&&x.month===month);if(!p){p={id:nextId(db.payroll),employeeId:r.employeeId,month};db.payroll.push(p)}Object.assign(p,{baseSalary:r.salary,currency:r.currency,payType:r.payType,dailyRate:r.dailyRate,hourlyRate:r.hourlyRate,minuteRate:r.minuteRate,paidDays:r.paidDays,absentDays:r.absentDays,unpaidDays:r.unpaidDays,lateMinutes:r.lateMinutes,overtimeMinutes:r.overtimeMinutes,bonuses:r.bonuses,allowances:r.allowances,deductions:r.deductions,advances:r.advances,loanInstallment:r.loanInstallment,earnedSalary:r.earnedSalary,lateDeduction:r.lateDeduction,overtimeBonus:r.overtimeBonus,netSalary:r.netSalary,calculationMethod:r.calculationMethod,closed:true,closedAt:new Date().toISOString()});if(r.loanInstallment>0){let l=db.loans.filter(x=>x.employeeId===r.employeeId&&x.status==='active').sort((a,b)=>b.id-a.id)[0];if(l){l.paidCount++;if(l.paidCount>=l.installmentsCount)l.status='completed'}}});audit(req,'إغلاق راتب شهر',month);save();res.json({ok:true})});
app.get('/api/audit',auth,(req,res)=>res.json(db.audit.slice(0,300)));
app.put('/api/account',auth,(req,res)=>{let u=db.users.find(x=>Number(x.id)===Number(req.session.user.id));if(!u)return res.status(404).json({error:'المستخدم الحالي غير موجود'});let username=String(req.body.username||'').trim(),password=String(req.body.password||'');if(!username)return res.status(400).json({error:'اسم المستخدم مطلوب'});if(password.length<4)return res.status(400).json({error:'كلمة المرور يجب أن تكون 4 أحرف/أرقام على الأقل'});if(db.users.some(x=>x.id!==u.id&&x.username===username))return res.status(400).json({error:'اسم المستخدم مستخدم من حساب آخر'});u.username=username;u.password=password;u.name=String(req.body.name||u.name||username);req.session.user={id:u.id,username:u.username,name:u.name,role:u.role};audit(req,'تغيير بيانات الدخول',username);save();res.json({ok:true,user:req.session.user})});
app.get('/api/users',auth,(req,res)=>res.json(db.users.map(({password,...u})=>u)));app.post('/api/users',auth,(req,res)=>{let x=req.body||{};if(!x.username||!x.password)return res.status(400).json({error:'اسم المستخدم وكلمة المرور مطلوبان'});if(db.users.some(u=>u.username===x.username))return res.status(400).json({error:'اسم المستخدم موجود'});let u={id:nextId(db.users),username:x.username,password:x.password,name:x.name||x.username,role:x.role||'accountant',active:true};db.users.push(u);audit(req,'إضافة مستخدم',u.username);save();res.json({...u,password:undefined})});app.delete('/api/users/:id',auth,(req,res)=>{let id=Number(req.params.id);if(id===req.session.user.id)return res.status(400).json({error:'لا يمكن حذف المستخدم الحالي'});db.users=db.users.filter(x=>Number(x.id)!==id);audit(req,'حذف مستخدم');save();res.json({ok:true})});
app.get('/api/backup',auth,(req,res)=>res.json(db));app.post('/api/restore',auth,(req,res)=>{if(!req.body||!Array.isArray(req.body.employees))return res.status(400).json({error:'ملف النسخة غير صالح'});db=req.body;for(const k of ['settings','leaves','holidays','audit','users'])if(db[k]===undefined)db[k]=fresh()[k];audit(req,'استعادة نسخة احتياطية');save();res.json({ok:true})});
app.use(express.static(path.join(__dirname,'public')));app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));app.listen(PORT,HOST,()=>console.log(`Kawader HR running on http://${HOST}:${PORT}`));
