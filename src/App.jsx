import { useState, useRef } from 'react';

const WEATHERS = [
  { emoji: '☀️', label: '맑음',       color: '#E8A838' },
  { emoji: '🌤️', label: '맑았다 흐림', color: '#C9B878' },
  { emoji: '☁️', label: '흐림',       color: '#9AA5B0' },
  { emoji: '🌧️', label: '비',         color: '#6B8AA8' },
  { emoji: '💨', label: '바람 많이',   color: '#8AA29E' },
];
const MOODS = [
  { emoji: '😊', label: '아주 좋아요', color: '#E8A838', score: 5 },
  { emoji: '🙂', label: '좋아요',     color: '#B8A87A', score: 4 },
  { emoji: '😐', label: '그저그래요', color: '#9AA5B0', score: 3 },
  { emoji: '😔', label: '우울해요',   color: '#6B8AA8', score: 2 },
  { emoji: '😞', label: '좋지 않아요',color: '#C07B6C', score: 1 },
];
const MONTH_COLORS = [
  '#E0D6F0','#F0D6EF','#FCF5B3','#ECF5B8','#D6F2C2','#C9FFF0',
  '#D1F1FF','#D1E3FF','#FFE8D1','#FFD9B8','#F5C9B0','#E8F0F7',
];
const DEFAULT_CATEGORIES = [
  { id:'work',     name:'업무', color:'#B8D4E8' },
  { id:'personal', name:'개인', color:'#F5D9E0' },
  { id:'study',    name:'공부', color:'#E8DFB8' },
  { id:'health',   name:'건강', color:'#C8E8C4' },
];
const CATEGORY_COLOR_PALETTE = [
  '#F5D9E0','#F5C9B0','#F5E8B0','#E8DFB8','#C8E8C4',
  '#B8E8D8','#B8D4E8','#C8C0E8','#E8C8E0','#D4D4D4',
];
const DAYS_KR    = ['일요일','월요일','화요일','수요일','목요일','금요일','토요일'];
const DAY_SHORT  = ['일','월','화','수','목','금','토'];
const MONTH_EN   = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_SHORT= ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const STORAGE_KEY    = 'journal-entries-v2';
const CATEGORIES_KEY = 'journal-categories-v1';

const pad = n => String(n).padStart(2,'0');
const formatKey = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const addDays = (d,n) => { const x=new Date(d); x.setDate(x.getDate()+n); return x; };
const makeYtUrl = q => q?.trim() ? `https://www.youtube.com/results?search_query=${encodeURIComponent(q.trim())}` : null;

const resizeImage = (file, maxSize=900) => new Promise((res,rej) => {
  const r=new FileReader();
  r.onload=e=>{
    const img=new Image();
    img.onload=()=>{
      let {width:w,height:h}=img;
      if(w>h&&w>maxSize){h*=maxSize/w;w=maxSize;}else if(h>maxSize){w*=maxSize/h;h=maxSize;}
      const c=document.createElement('canvas');c.width=w;c.height=h;
      c.getContext('2d').drawImage(img,0,0,w,h);
      res(c.toDataURL('image/jpeg',0.82));
    };
    img.onerror=rej; img.src=e.target.result;
  };
  r.onerror=rej; r.readAsDataURL(file);
});

const load  = key => { try{ const s=localStorage.getItem(key); return s?JSON.parse(s):null; }catch(e){return null;} };
const loadEntries    = () => load(STORAGE_KEY)    || {};
const loadCategories = () => load(CATEGORIES_KEY) || DEFAULT_CATEGORIES;

/* ══════════════════════════════ APP ══════════════════════════════ */
export default function App() {
  const today = new Date();
  const [entries,    setEntries]    = useState(loadEntries);
  const [categories, setCategories] = useState(loadCategories);
  const [level,      setLevel]      = useState('month');
  const [viewYear,   setViewYear]   = useState(today.getFullYear());
  const [calMonth,   setCalMonth]   = useState(new Date(today.getFullYear(),today.getMonth(),1));
  const [selDate,    setSelDate]    = useState(null);
  const [ts,         setTs]         = useState('idle');
  const [zoomOrigin, setZoomOrigin] = useState('50% 50%');
  const [showCatMgr, setShowCatMgr] = useState(false);
  const saveTimer = useRef(null);

  const bgColor = (level==='year-cover'||level==='year-grid') ? '#F5EFE0' : MONTH_COLORS[calMonth.getMonth()];

  const commitSave = next => { try{localStorage.setItem(STORAGE_KEY,JSON.stringify(next));}catch(e){alert('저장 공간이 부족해요.');} };
  const saveNow = next => { setEntries(next); commitSave(next); };
  const saveDb  = next => { setEntries(next); if(saveTimer.current)clearTimeout(saveTimer.current); saveTimer.current=setTimeout(()=>commitSave(next),400); };
  const saveCats = next => { setCategories(next); localStorage.setItem(CATEGORIES_KEY,JSON.stringify(next)); };

  const getOrigin = e => { if(!e)return; const r=e.currentTarget.getBoundingClientRect(); setZoomOrigin(`${((r.left+r.width/2)/window.innerWidth*100).toFixed(1)}% ${((r.top+r.height/2)/window.innerHeight*100).toFixed(1)}%`); };
  const zoomOut = (e,cb) => { getOrigin(e); setTs('shrinking'); setTimeout(()=>{cb();setTs('expanding');setTimeout(()=>setTs('idle'),400);},350); };
  const zoomIn  = (e,cb) => { getOrigin(e); setTs('zooming-in');setTimeout(()=>{cb();setTs('expanding');setTimeout(()=>setTs('idle'),400);},350); };

  const openYearCover = e   => zoomOut(e, ()=>setLevel('year-cover'));
  const openYearGrid  = e   => zoomIn(e,  ()=>setLevel('year-grid'));
  const openMonth  = (m,e)  => zoomIn(e,  ()=>{ setCalMonth(new Date(viewYear,m,1)); setLevel('month'); });
  const openDate   = (d,e)  => zoomIn(e,  ()=>{ setSelDate(d); setLevel('day'); });
  const navigateDay = dir   => {
    if(!selDate) return;
    const nd=addDays(selDate,dir);
    if(nd>new Date(today.getFullYear(),today.getMonth(),today.getDate())) return;
    setSelDate(nd);
  };
  const closeDetail = () => { setTs('shrinking'); setTimeout(()=>{ setSelDate(null); setLevel('month'); setTs('expanding'); setTimeout(()=>setTs('idle'),400); },350); };
  const backToCover = () => { setTs('shrinking'); setTimeout(()=>{ setLevel('year-cover'); setTs('expanding'); setTimeout(()=>setTs('idle'),400); },350); };

  const patchEntry = (date,patch,debounced=false) => {
    const key=formatKey(date);
    const cur=entries[key]||{tasks:[],diary:'',positive:'',negative:'',anything:'',mood:null,weather:null,photos:[],song:''};
    const next={...entries,[key]:{...cur,...patch}};
    (debounced?saveDb:saveNow)(next);
  };

  const cls = ts==='shrinking'?'shrinking':ts==='zooming-in'?'zooming-in':ts==='expanding'?'expanding':'';

  return (
    <div style={{minHeight:'100vh',background:bgColor,color:'#2C1F15',fontFamily:"'Gowun Batang','Fraunces',serif",position:'relative',overflow:'hidden',transition:'background 0.6s ease'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,400;1,9..144,600&family=Gowun+Batang:wght@400;700&family=Gaegu:wght@300;400;700&display=swap');
        *{box-sizing:border-box;} body{margin:0;} button{font-family:inherit;}
        .df{font-family:'Fraunces','Gowun Batang',serif;font-variation-settings:"opsz" 144;}
        .grain::before{content:'';position:fixed;inset:0;pointer-events:none;opacity:0.35;z-index:100;mix-blend-mode:multiply;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/><feColorMatrix values='0 0 0 0 0.2 0 0 0 0 0.12 0 0 0 0 0.08 0 0 0 0.06 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");}
        @keyframes zoomOut{0%{transform:scale(1);opacity:1;}100%{transform:scale(0.3);opacity:0;filter:blur(6px);}}
        .shrinking{animation:zoomOut .35s cubic-bezier(.7,0,.84,0) forwards;}
        @keyframes zoomInFast{0%{transform:scale(1);opacity:1;}100%{transform:scale(3);opacity:0;filter:blur(8px);}}
        .zooming-in{animation:zoomInFast .35s cubic-bezier(.7,0,.84,0) forwards;}
        @keyframes expand{0%{transform:scale(.5);opacity:0;filter:blur(8px);}100%{transform:scale(1);opacity:1;filter:blur(0);}}
        .expanding{animation:expand .4s cubic-bezier(.16,1,.3,1) forwards;transform-origin:center;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}
        .fade-up{opacity:0;animation:fadeUp .55s ease-out forwards;}
        .cal-cell{transition:all .2s cubic-bezier(.34,1.56,.64,1);position:relative;}
        .cal-cell:hover:not(:disabled){transform:scale(1.04);}
        .cal-cell:disabled{cursor:default;}
        .chip{transition:all .2s cubic-bezier(.34,1.56,.64,1);}
        .chip:hover{transform:translateY(-2px);}
        .task-row:hover .task-actions{opacity:1;}
        .task-actions{opacity:0;transition:opacity .15s;display:flex;gap:.3rem;align-items:center;}
        .paper-lines{background-image:repeating-linear-gradient(transparent,transparent 1.75rem,rgba(44,31,21,0.13) 1.75rem,rgba(44,31,21,0.13) calc(1.75rem + 1px));line-height:1.75rem;}
        input:focus,textarea:focus,select:focus{outline:none;}
        textarea::placeholder{color:rgba(139,111,86,.55);font-style:italic;}
        input::placeholder{color:rgba(139,111,86,.6);}
        .photo-wrap:hover .photo-delete{opacity:1;}
        .photo-delete{opacity:0;transition:opacity .15s;}
        .nav-arrow{background:rgba(255,255,255,.5);border:1px solid rgba(44,31,21,.2);border-radius:50%;width:38px;height:38px;cursor:pointer;font-size:1.1rem;color:#2C1F15;transition:all .2s;display:flex;align-items:center;justify-content:center;}
        .nav-arrow:hover:not(:disabled){background:rgba(255,255,255,.85);transform:scale(1.08);}
        .nav-arrow:disabled{opacity:.3;cursor:default;}
        .paper-stack{position:relative;transition:all .3s;cursor:pointer;}
        .paper-stack:hover{transform:translateY(-4px);}
        .paper-stack::before,.paper-stack::after{content:'';position:absolute;inset:0;background:#FFFBF0;border:1px solid rgba(44,31,21,.12);border-radius:4px;box-shadow:0 2px 8px rgba(44,31,21,.08);}
        .paper-stack::before{transform:rotate(-2.5deg) translate(-6px,4px);}
        .paper-stack::after{transform:rotate(1.8deg) translate(5px,2px);}
        .paper-stack>.paper-top{position:relative;z-index:2;background:#FFFDF5;border:1px solid rgba(44,31,21,.15);border-radius:4px;box-shadow:0 4px 12px rgba(44,31,21,.1);}
        .mini-cal-card{transition:all .25s cubic-bezier(.34,1.56,.64,1);cursor:pointer;}
        .mini-cal-card:hover{transform:translateY(-3px) scale(1.02);box-shadow:0 8px 24px rgba(44,31,21,.12);}
        .modal-backdrop{position:fixed;inset:0;background:rgba(44,31,21,.4);z-index:200;display:flex;align-items:center;justify-content:center;padding:1rem;}
        .week-card{transition:all .2s;}
        .week-card:hover{transform:translateY(-2px);}
        /* 음악 카드 */
        .song-card{background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%);border-radius:8px;display:flex;align-items:center;gap:.6rem;padding:.55rem .7rem;border:1px solid rgba(255,255,255,.1);width:100%;min-width:0;}
        .song-card-art{width:34px;height:34px;border-radius:5px;background:linear-gradient(135deg,#667eea,#764ba2);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:1rem;}
        .song-card-info{flex:1;min-width:0;overflow:hidden;}
        .song-card-title{font-size:.78rem;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:600;display:block;width:100%;}
        .song-card-sub{font-size:.65rem;color:rgba(255,255,255,.5);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block;width:100%;}
        .song-card-btn{background:rgba(255,255,255,.12);border:none;border-radius:50%;width:26px;height:26px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#fff;font-size:.7rem;flex-shrink:0;transition:background .2s;text-decoration:none;}
        .song-card-btn:hover{background:rgba(255,255,255,.28);}
        @keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
        .song-card input{background:transparent;border:none;color:#fff;font-size:.78rem;font-family:inherit;width:100%;min-width:0;font-weight:600;}
        .song-card input::placeholder{color:rgba(255,255,255,.35);}
        /* 모바일 */
        @media(max-width:600px){
          .today-grid{flex-direction:column!important;}
          .today-left{flex-direction:row!important;align-items:flex-start!important;gap:.8rem!important;}
          .today-left-col{width:auto!important;min-width:0!important;}
          .today-photo{width:100px!important;height:100px!important;}
          .today-right{width:100%!important;}
          .week-grid{grid-template-columns:repeat(7,1fr)!important;}
        }
      `}</style>
      <div className="grain"/>

      <div className={cls} style={{transformOrigin:zoomOrigin,minHeight:'100vh'}}>
        {level==='year-cover' && <YearCover year={viewYear} setYear={setViewYear} entries={entries} onOpenGrid={openYearGrid}/>}
        {level==='year-grid'  && <YearGrid  year={viewYear} entries={entries} today={today} onSelectMonth={openMonth} onBack={backToCover}/>}
        {level==='month' && (
          <div style={{padding:'2.5rem 1.5rem'}}>
            <MainView today={today} entries={entries} categories={categories}
              calMonth={calMonth} setCalMonth={setCalMonth}
              openDate={openDate} openYearCover={openYearCover}
              openCatMgr={()=>setShowCatMgr(true)} patchEntry={patchEntry}/>
          </div>
        )}
        {level==='day' && selDate && (
          <div style={{padding:'2.5rem 1.5rem',minHeight:'100vh'}}>
            <DetailView date={selDate} entries={entries} categories={categories} today={today}
              onBack={closeDetail} onNavigate={navigateDay}
              patchEntry={(p,db)=>patchEntry(selDate,p,db)}
              openCatMgr={()=>setShowCatMgr(true)}/>
          </div>
        )}
      </div>

      {showCatMgr && <CategoryManager categories={categories} onSave={saveCats} onClose={()=>setShowCatMgr(false)}/>}
    </div>
  );
}

/* ─── YEAR COVER ─── */
function YearCover({year,setYear,entries,onOpenGrid}){
  const count=Object.keys(entries).filter(k=>k.startsWith(`${year}-`)).length;
  return(
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'2rem'}}>
      <div className="fade-up" style={{display:'flex',alignItems:'center',gap:'2rem',marginBottom:'3rem'}}>
        <button onClick={()=>setYear(year-1)} className="nav-arrow">‹</button>
        <h1 className="df" style={{fontSize:'clamp(5rem,18vw,11rem)',fontWeight:400,margin:0,fontStyle:'italic',letterSpacing:'-0.03em',lineHeight:.9}}>{year}</h1>
        <button onClick={()=>setYear(year+1)} className="nav-arrow">›</button>
      </div>
      <div className="fade-up df" style={{fontSize:'.9rem',color:'#8B6F56',letterSpacing:'.3em',textTransform:'uppercase',fontStyle:'italic',marginBottom:'3rem',animationDelay:'.1s'}}>{count}개의 기록</div>
      <div className="fade-up" style={{animationDelay:'.2s'}}>
        <div className="paper-stack" onClick={onOpenGrid} style={{width:'min(280px,75vw)',aspectRatio:'.72'}}>
          <div className="paper-top" style={{width:'100%',height:'100%',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'2rem',gap:'1rem'}}>
            <div className="df" style={{fontSize:'.75rem',letterSpacing:'.3em',textTransform:'uppercase',color:'#8B6F56',fontStyle:'italic'}}>a year in pages</div>
            <div className="df" style={{fontSize:'3.5rem',fontStyle:'italic',fontWeight:400,lineHeight:1}}>{year}</div>
            <div style={{width:'40px',height:'1px',background:'rgba(44,31,21,.3)'}}/>
            <div style={{fontSize:'.8rem',color:'#8B6F56',fontStyle:'italic'}}>12개의 달을 펼쳐보세요</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── YEAR GRID ─── */
function YearGrid({year,entries,today,onSelectMonth,onBack}){
  return(
    <div style={{padding:'2.5rem 1.5rem',minHeight:'100vh'}}>
      <div style={{maxWidth:'900px',margin:'0 auto'}}>
        <div className="fade-up" style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'2.5rem'}}>
          <button onClick={onBack} style={{background:'rgba(255,255,255,.4)',border:'1px solid rgba(44,31,21,.25)',padding:'.4rem 1rem',fontSize:'.8rem',color:'#2C1F15',cursor:'pointer',borderRadius:'2px'}}>← {year} 표지로</button>
          <h1 className="df" style={{fontSize:'clamp(2rem,6vw,3rem)',fontStyle:'italic',margin:0,fontWeight:400}}>{year}</h1>
          <div style={{width:'80px'}}/>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'1rem'}}>
          {Array.from({length:12},(_,m)=>(
            <MiniMonth key={m} year={year} month={m} entries={entries} today={today} onClick={e=>onSelectMonth(m,e)}/>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─ MiniMonth: overflow fix ─ */
function MiniMonth({year,month,entries,today,onClick}){
  const fd=new Date(year,month,1).getDay(), di=new Date(year,month+1,0).getDate();
  const cells=[]; for(let i=0;i<fd;i++)cells.push(null); for(let d=1;d<=di;d++)cells.push(d);
  const bg=MONTH_COLORS[month], isCM=year===today.getFullYear()&&month===today.getMonth();
  const gE=d=>entries[formatKey(new Date(year,month,d))];
  const rc=Array.from({length:di},(_,i)=>i+1).filter(d=>{const e=gE(d);return e&&(e.mood||e.weather||e.diary||e.positive||e.negative||e.tasks?.length);}).length;
  return(
    <button className="mini-cal-card" onClick={onClick}
      style={{background:bg,border:isCM?'2px solid #2C1F15':'1px solid rgba(44,31,21,.15)',borderRadius:'8px',padding:'.7rem .6rem',textAlign:'center',fontFamily:'inherit',color:'#2C1F15',display:'flex',flexDirection:'column',gap:'.3rem',width:'100%',overflow:'hidden'}}>
      <div className="df" style={{fontSize:'.9rem',fontStyle:'italic',fontWeight:isCM?600:400,flexShrink:0}}>{MONTH_SHORT[month]}</div>
      {/* 요일 헤더 */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',width:'100%',gap:0}}>
        {DAY_SHORT.map(d=>(
          <div key={d} style={{fontSize:'clamp(6px,1.5vw,9px)',color:'rgba(44,31,21,.45)',fontWeight:600,textAlign:'center',padding:'1px 0',overflow:'hidden'}}>{d}</div>
        ))}
      </div>
      {/* 날짜 셀 */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',width:'100%',gap:0,flex:1}}>
        {cells.map((d,i)=>{
          if(!d) return <div key={i}/>;
          const e=gE(d), has=e&&(e.mood||e.weather), mc=e?.mood?.color||e?.weather?.color, iT=isCM&&d===today.getDate();
          return(
            <div key={i} style={{
              fontSize:'clamp(6px,1.4vw,9px)',
              aspectRatio:'1',display:'flex',alignItems:'center',justifyContent:'center',
              color:iT?'#fff':'#2C1F15',
              backgroundColor:iT?'#2C1F15':(has?mc+'55':'transparent'),
              borderRadius:'2px',fontWeight:iT?700:400,overflow:'hidden',
            }}>{d}</div>
          );
        })}
      </div>
      <div style={{fontSize:'clamp(8px,1.5vw,11px)',color:'#8B6F56',fontStyle:'italic',flexShrink:0}}>{rc>0?`${rc}일`:'—'}</div>
    </button>
  );
}

/* ─── MAIN VIEW ─── */
function MainView({today,entries,categories,calMonth,setCalMonth,openDate,openYearCover,openCatMgr,patchEntry}){
  const calYear=calMonth.getFullYear(), calMNum=calMonth.getMonth();
  const fd=new Date(calYear,calMNum,1).getDay(), di=new Date(calYear,calMNum+1,0).getDate();
  const cells=[]; for(let i=0;i<fd;i++)cells.push(null); for(let d=1;d<=di;d++)cells.push(d);
  const isToday = d=>d===today.getDate()&&calMNum===today.getMonth()&&calYear===today.getFullYear();
  const isFuture= d=>new Date(calYear,calMNum,d)>new Date(today.getFullYear(),today.getMonth(),today.getDate());
  const getE    = d=>entries[formatKey(new Date(calYear,calMNum,d))];

  let anchor=(calYear===today.getFullYear()&&calMNum===today.getMonth())?new Date(today):new Date(calYear,calMNum,1);
  const ws=new Date(anchor); ws.setDate(anchor.getDate()-anchor.getDay());
  const curWeek=Array.from({length:7},(_,i)=>addDays(ws,i));
  const todayEntry=entries[formatKey(today)];

  return(
    <div style={{maxWidth:'780px',margin:'0 auto'}}>
      <div className="fade-up" style={{textAlign:'center',marginBottom:'2.5rem'}}>
        <div className="df" style={{fontSize:'.8rem',letterSpacing:'.3em',textTransform:'uppercase',color:'#8B6F56',fontStyle:'italic',marginBottom:'.4rem'}}>daily journal</div>
        <div className="df" style={{fontSize:'.85rem',color:'#8B6F56',letterSpacing:'.15em',fontStyle:'italic'}}>{today.getFullYear()}. {pad(today.getMonth()+1)}. {pad(today.getDate())} · {DAYS_KR[today.getDay()]}</div>
      </div>

      {/* 월 헤더 */}
      <div className="fade-up" style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1.8rem',animationDelay:'.08s'}}>
        <button onClick={()=>setCalMonth(new Date(calYear,calMNum-1,1))} className="nav-arrow">‹</button>
        <div style={{textAlign:'center',flex:1}}>
          <h1 className="df" style={{fontSize:'clamp(2.2rem,6vw,3rem)',fontWeight:400,margin:0,fontStyle:'italic',lineHeight:1}}>{MONTH_EN[calMNum]}</h1>
          <button onClick={openYearCover} className="df"
            style={{background:'none',border:'none',cursor:'pointer',fontSize:'.9rem',color:'#8B6F56',marginTop:'.3rem',letterSpacing:'.25em',padding:'.2rem .6rem',borderRadius:'3px',transition:'background .2s'}}
            onMouseEnter={e=>e.currentTarget.style.background='rgba(44,31,21,.08)'}
            onMouseLeave={e=>e.currentTarget.style.background='none'}>{calYear} ↗</button>
        </div>
        <button onClick={()=>setCalMonth(new Date(calYear,calMNum+1,1))} className="nav-arrow">›</button>
      </div>

      {/* 요일 */}
      <div className="fade-up" style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'4px',marginBottom:'.5rem',animationDelay:'.12s'}}>
        {DAY_SHORT.map((d,i)=><div key={d} style={{textAlign:'center',fontSize:'.72rem',padding:'.5rem 0',color:i===0?'#C07B6C':i===6?'#6B8AA8':'#8B6F56',fontWeight:600}}>{d}</div>)}
      </div>

      {/* 달력 셀 */}
      <div className="fade-up" style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'4px',marginBottom:'3rem',animationDelay:'.16s'}}>
        {cells.map((d,i)=>{
          if(!d) return <div key={i}/>;
          const entry=getE(d), future=isFuture(d), isTd=isToday(d);
          const hasMW=entry&&(entry.mood||entry.weather);
          const hasData=entry&&(entry.mood||entry.weather||entry.diary||entry.positive||entry.negative||(entry.tasks?.length>0)||(entry.photos?.length>0));
          const mc=entry?.mood?.color||entry?.weather?.color||'#8B6F56';
          const pending=(entry?.tasks||[]).filter(t=>!t.done);
          const totalTasks=entry?.tasks?.length||0;
          return(
            <button key={i} className="cal-cell" onClick={e=>!future&&openDate(new Date(calYear,calMNum,d),e)} disabled={future}
              style={{minHeight:'100px',background:'transparent',border:'none',padding:'3px',cursor:future?'default':'pointer',display:'flex',flexDirection:'column',alignItems:'stretch',position:'relative'}}>
              {isTd&&<div style={{position:'absolute',inset:'2px',border:'2px solid #2C1F15',borderRadius:'9px',pointerEvents:'none'}}/>}
              {hasData&&!isTd&&<div style={{position:'absolute',inset:'2px',border:`1.5px solid ${mc}`,borderRadius:'9px',background:`${mc}14`,pointerEvents:'none'}}/>}
              <div style={{position:'relative',zIndex:1,display:'flex',flexDirection:'column',height:'100%',alignItems:'center',paddingTop:'4px',gap:0}}>
                <span className="df" style={{fontSize:'.9rem',fontWeight:isTd?600:400,fontStyle:isTd?'italic':'normal',color:future?'rgba(44,31,21,.25)':'#2C1F15',lineHeight:1.1}}>{d}</span>
                {hasMW&&(
                  <span style={{fontSize:'.75rem',lineHeight:1,display:'flex',alignItems:'center',gap:0,marginTop:'1px'}}>
                    {entry.mood&&<span>{entry.mood.emoji}</span>}
                    {entry.mood&&entry.weather&&<span style={{fontSize:'.55rem',color:'rgba(139,111,86,.6)'}}>/</span>}
                    {entry.weather&&<span>{entry.weather.emoji}</span>}
                  </span>
                )}
                {totalTasks>0&&(
                  <div style={{width:'100%',marginTop:'2px'}}>
                    {[...(entry.tasks||[])].sort((a,b)=>(b.done?1:0)-(a.done?1:0)).slice(0,3).map(t=>{const cat=categories.find(c=>c.id===t.categoryId);return(
                      <div key={t.id} style={{fontSize:'.56rem',color:t.done?'#8B6F56':'#2C1F15',padding:'1px 3px',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',lineHeight:1.25,background:cat?cat.color+(t.done?'55':'BB'):'rgba(44,31,21,.06)',borderRadius:'2px',marginBottom:'1px',textAlign:'left'}}>
                        {t.done?'✓':'·'} {t.text}
                      </div>
                    );})}
                    {totalTasks>3&&<div style={{fontSize:'.5rem',color:'#8B6F56',fontStyle:'italic',textAlign:'left',padding:'0 3px'}}>+{totalTasks-3}</div>}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* 오늘의 일기 */}
      <TodayDiaryPanel today={today} todayEntry={todayEntry} categories={categories}
        patchEntry={(p,db)=>patchEntry(today,p,db)} openDate={openDate}/>

      {/* 이번 주 */}
      <section className="fade-up" style={{animationDelay:'.28s',marginBottom:'3rem'}}>
        <div style={{display:'flex',alignItems:'center',gap:'1rem',marginBottom:'1.5rem'}}>
          <h2 className="df" style={{fontSize:'1rem',fontStyle:'italic',margin:0,fontWeight:400}}>이번 주</h2>
          <div style={{flex:1,height:'1px',background:'rgba(44,31,21,.18)'}}/>
          <span className="df" style={{fontSize:'.75rem',color:'#8B6F56',fontStyle:'italic'}}>{curWeek[0].getMonth()+1}/{curWeek[0].getDate()} – {curWeek[6].getMonth()+1}/{curWeek[6].getDate()}</span>
        </div>
        <CurrentWeek week={curWeek} entries={entries} today={today} categories={categories} openDate={openDate} patchEntry={patchEntry}/>
      </section>

      {/* Mood Tracker */}
      <section className="fade-up" style={{animationDelay:'.36s',marginBottom:'3rem'}}>
        <MoodTracker calYear={calYear} calMNum={calMNum} daysIn={di} getEntry={getE}/>
      </section>

      <div style={{textAlign:'center',marginBottom:'2rem'}}>
        <button onClick={openCatMgr} style={{background:'rgba(255,255,255,.4)',border:'1px solid rgba(44,31,21,.2)',padding:'.5rem 1.2rem',fontSize:'.8rem',color:'#2C1F15',cursor:'pointer',borderRadius:'20px'}}>⚙ 할 일 카테고리 관리</button>
      </div>

      <div className="df" style={{textAlign:'center',marginTop:'3rem',paddingTop:'2rem',borderTop:'1px solid rgba(44,31,21,.15)',fontSize:'.75rem',color:'#8B6F56',fontStyle:'italic',letterSpacing:'.2em'}}>⟡ today is a page in your story ⟡</div>
    </div>
  );
}

/* ─── SongCard — 단일 카드: 곡명 + URL 두 줄, ▶ 버튼 하나 ─── */
function SongCard({song, songUrl, onChangeSong, onChangeUrl}){
  const [fetching, setFetching] = useState(false);
  const finalUrl = songUrl?.trim() ? songUrl.trim() : makeYtUrl(song);

  // YouTube URL 입력 시 제목 자동 가져오기
  const handleUrlChange = async (url) => {
    onChangeUrl(url);
    // 다양한 YouTube URL 형식 지원 (www / m / music / youtu.be / 추가 파라미터 포함)
    const ytId = url.match(/(?:(?:www\.|m\.|music\.)?youtube\.com\/(?:watch\?.*?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1];
    if (!ytId) return;
    setFetching(true);
    try {
      // YouTube 공식 oEmbed 엔드포인트 (가장 안정적)
      const oEmbedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${ytId}&format=json`;
      let data = null;
      try {
        const res = await fetch(oEmbedUrl);
        if (res.ok) data = await res.json();
      } catch(_) {}
      // 실패 시 noembed.com으로 대체
      if (!data?.title) {
        const res2 = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${ytId}`);
        if (res2.ok) data = await res2.json();
      }
      if (data?.title && onChangeSong) {
        const cleaned = data.title
          .replace(/\s*[\[(]?\s*(?:official\s*(?:video|audio|mv|lyric[s]?|visualizer)?|lyrics?|mv|music\s*video|hd|4k|live|ver\.?|version)\s*[\])]?\s*/gi, '')
          .trim();
        onChangeSong(cleaned || data.title);
      }
    } catch(e) { /* 실패 시 조용히 넘어감 */ }
    setFetching(false);
  };

  return(
    <div className="song-card">
      <div className="song-card-info">
        {onChangeSong ? (
          <input value={song||''} onChange={e=>onChangeSong(e.target.value)}
            placeholder={fetching ? '제목 불러오는 중...' : '아티스트 - 제목'}
            style={{opacity: fetching ? 0.6 : 1}}/>
        ) : (
          <span className="song-card-title">{song||'오늘의 노래'}</span>
        )}
        {onChangeUrl ? (
          <input value={songUrl||''} onChange={e=>handleUrlChange(e.target.value)}
            placeholder="YouTube URL 붙여넣으면 제목 자동 입력"
            style={{fontSize:'.63rem',marginTop:'2px',color: songUrl ? 'rgba(255,255,255,.75)' : 'rgba(255,255,255,.4)'}}/>
        ) : (
          songUrl && <span className="song-card-sub">{songUrl}</span>
        )}
      </div>
      {fetching ? (
        <div className="song-card-btn" style={{fontSize:'.65rem',animation:'spin .8s linear infinite'}}>⟳</div>
      ) : finalUrl ? (
        <a href={finalUrl} target="_blank" rel="noreferrer"
          className="song-card-btn" onClick={e=>e.stopPropagation()}
          title={songUrl ? 'YouTube에서 재생' : 'YouTube에서 검색'}>▶</a>
      ) : null}
    </div>
  );
}

/* ─── 오늘의 일기 패널 ─── */
function TodayDiaryPanel({today,todayEntry,categories,patchEntry,openDate}){
  const fileInputRef=useRef(null);
  const [uploading,setUploading]=useState(false);
  const photos=todayEntry?.photos||[];

  const handlePhoto=async e=>{
    const files=Array.from(e.target.files||[]);if(!files.length)return;setUploading(true);
    try{const r=await Promise.all(files.map(f=>resizeImage(f)));patchEntry({photos:[...photos,...r.map(data=>({id:Date.now()+Math.random(),data}))]});}
    catch{alert('사진 불러오기 실패');}setUploading(false);e.target.value='';
  };

  return(
    <section className="fade-up" style={{animationDelay:'.22s',marginBottom:'3rem'}}>
      <div style={{display:'flex',alignItems:'center',gap:'1rem',marginBottom:'1rem'}}>
        <h2 className="df" style={{fontSize:'1rem',fontStyle:'italic',margin:0,fontWeight:400}}>오늘의 일기</h2>
        <div style={{flex:1,height:'1px',background:'rgba(44,31,21,.18)'}}/>
        <button onClick={e=>openDate(new Date(today.getFullYear(),today.getMonth(),today.getDate()),e)}
          style={{background:'none',border:'none',cursor:'pointer',fontSize:'.75rem',color:'#8B6F56',fontStyle:'italic'}}>자세히 보기 →</button>
      </div>

      <div style={{background:'rgba(255,255,255,.5)',border:'1.5px solid #2C1F15',borderRadius:'10px',padding:'1rem'}}>
        {/* ── 3열 레이아웃: 왼쪽(날짜+날씨기분 / 사진 / 노래) | 오른쪽(일기) ── */}
        <div className="today-grid" style={{display:'flex',gap:'1rem',alignItems:'flex-start'}}>

          {/* 왼쪽 컬럼 — 3파트 */}
          <div className="today-left" style={{display:'flex',flexDirection:'column',gap:'.6rem',flex:'0 0 28%',minWidth:0}}>

            {/* 파트 1: 날짜 + 날씨/기분 — 가로 한 줄 */}
            <div className="today-left-col" style={{display:'flex',flexDirection:'row',alignItems:'center',gap:'.6rem',flexWrap:'wrap'}}>
              {/* 날짜 + 요일 */}
              <div style={{display:'flex',alignItems:'baseline',gap:'.3rem'}}>
                <div className="df" style={{fontSize:'1.8rem',fontStyle:'italic',fontWeight:600,lineHeight:1}}>{today.getDate()}</div>
                <div style={{fontSize:'.7rem',color:'#8B6F56',letterSpacing:'.1em'}}>{DAY_SHORT[today.getDay()]}</div>
              </div>
              {/* 날씨 / 기분 — 날짜 바로 옆 */}
              <div style={{display:'flex',alignItems:'center',gap:'2px',flexWrap:'nowrap'}}>
                {todayEntry?.weather&&<span style={{fontSize:'1.2rem',lineHeight:1}}>{todayEntry.weather.emoji}</span>}
                {todayEntry?.weather&&todayEntry?.mood&&<span style={{fontSize:'.65rem',color:'#8B6F56',margin:'0 1px'}}>/</span>}
                {todayEntry?.mood&&<span style={{fontSize:'1.2rem',lineHeight:1}}>{todayEntry.mood.emoji}</span>}
              </div>
            </div>

            {/* 파트 2: 사진 — 가로 직사각형 */}
            <div className="today-left-col">
              {photos.length>0?(
                <div className="today-photo" style={{width:'100%',height:'117px',borderRadius:'8px',overflow:'hidden',border:'1px solid rgba(44,31,21,.15)',position:'relative',cursor:'pointer'}} onClick={()=>fileInputRef.current?.click()}>
                  <img src={photos[photos.length-1].data} style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'center',display:'block'}} alt=""/>
                  {photos.length>1&&<div style={{position:'absolute',bottom:'5px',right:'5px',background:'rgba(44,31,21,.7)',color:'#FFFDF5',fontSize:'.6rem',padding:'2px 6px',borderRadius:'4px'}}>+{photos.length-1}</div>}
                </div>
              ):(
                <button onClick={()=>fileInputRef.current?.click()} disabled={uploading} className="today-photo"
                  style={{width:'100%',height:'117px',border:'1.5px dashed rgba(44,31,21,.3)',borderRadius:'8px',background:'rgba(255,255,255,.3)',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'.3rem',color:'#8B6F56'}}>
                  <span style={{fontSize:'1.4rem'}}>📷</span>
                  <span style={{fontSize:'.65rem'}}>{uploading?'불러오는 중':'사진 추가'}</span>
                </button>
              )}
              <input type="file" ref={fileInputRef} accept="image/*" multiple onChange={handlePhoto} style={{display:'none'}}/>
            </div>

            {/* 파트 3: 노래 카드 */}
            <div className="today-left-col" style={{width:'100%'}}>
              <SongCard song={todayEntry?.song||''} songUrl={todayEntry?.songYtUrl||''}
                onChangeSong={v=>patchEntry({song:v},true)}
                onChangeUrl={v=>patchEntry({songYtUrl:v},true)}/>
            </div>
          </div>

          {/* 오른쪽: 일기 */}
          <div className="today-right" style={{flex:'0 0 calc(72% - 1rem)',minWidth:0,display:'flex',flexDirection:'column',gap:'.5rem'}}>
            {[['positive','✦ Positive','오늘 좋았던 일...'],['negative','✦ Negative','힘들었던 일...'],['anything','✦ Anything','그 외 무엇이든...']].map(([field,label,ph])=>(
              <div key={field}>
                <div style={{fontSize:'.63rem',color:'#8B6F56',letterSpacing:'.18em',textTransform:'uppercase',marginBottom:'.2rem',fontStyle:'italic'}}>{label}</div>
                <textarea value={todayEntry?.[field]||''} onChange={e=>patchEntry({[field]:e.target.value},true)} placeholder={ph}
                  style={{width:'100%',minHeight:'2.5rem',maxHeight:'3.5rem',background:'transparent',border:'none',borderBottom:'1px dashed rgba(44,31,21,.2)',fontFamily:"'Gaegu','Gowun Batang',cursive",fontSize:'.88rem',color:'#2C1F15',resize:'none',padding:'.1rem 0',lineHeight:1.5}}/>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── 이번 주 ─── */
function CurrentWeek({week,entries,today,categories,openDate,patchEntry}){
  const todayStart=new Date(today.getFullYear(),today.getMonth(),today.getDate());

  const songs = week
    .map(d=>({d, song:entries[formatKey(d)]?.song||''}))
    .filter(x=>x.song);

  const removeSong = (date) => {
    patchEntry(date, {song:'', songYtUrl:''});
  };

  return(
    <div style={{background:'rgba(255,255,255,.3)',borderRadius:'10px',padding:'1.2rem',border:'1px solid rgba(44,31,21,.12)'}}>

      {/* ── 노래 헤더 ── */}
      {songs.length>0&&(
        <div style={{marginBottom:'.8rem',display:'flex',flexWrap:'wrap',gap:'.4rem',alignItems:'center'}}>
          <span style={{fontSize:'.7rem',color:'#8B6F56',flexShrink:0}}>🎵</span>
          {songs.map((s,i)=>{
            const url=makeYtUrl(s.song);
            return(
              <div key={i} style={{display:'flex',alignItems:'center',gap:0}}>
                {url?(
                  <a href={url} target="_blank" rel="noreferrer"
                    style={{fontSize:'.72rem',color:'#2C1F15',background:'rgba(255,255,255,.5)',border:'1px solid rgba(44,31,21,.15)',borderRight:'none',borderRadius:'20px 0 0 20px',padding:'3px 9px',textDecoration:'none',whiteSpace:'nowrap',transition:'background .15s'}}
                    onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.85)'}
                    onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,.5)'}>
                    {s.song}
                  </a>
                ):(
                  <span style={{fontSize:'.72rem',color:'#8B6F56',fontStyle:'italic',background:'rgba(255,255,255,.5)',border:'1px solid rgba(44,31,21,.15)',borderRight:'none',borderRadius:'20px 0 0 20px',padding:'3px 9px',whiteSpace:'nowrap'}}>{s.song}</span>
                )}
                <button onClick={()=>removeSong(s.d)}
                  style={{background:'rgba(44,31,21,.15)',border:'1px solid rgba(44,31,21,.15)',borderLeft:'none',borderRadius:'0 20px 20px 0',padding:'3px 9px',cursor:'pointer',color:'#8B6F56',fontSize:'.72rem',lineHeight:1,transition:'background .15s',whiteSpace:'nowrap'}}
                  onMouseEnter={e=>e.currentTarget.style.background='rgba(192,123,108,.35)'}
                  onMouseLeave={e=>e.currentTarget.style.background='rgba(44,31,21,.15)'}>×</button>
              </div>
            );
          })}
        </div>
      )}

      {/* 7일 카드 */}
      <div className="week-grid" style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'.4rem'}}>
        {week.map((date,i)=>{
          const entry=entries[formatKey(date)], future=date>todayStart, isTd=formatKey(date)===formatKey(today);
          const hasMW=entry&&(entry.mood||entry.weather), dow=date.getDay();
          const total=entry?.tasks?.length||0, done=(entry?.tasks||[]).filter(t=>t.done).length;
          return(
            <button key={i} onClick={e=>!future&&openDate(date,e)} disabled={future} className="week-card"
              style={{background:isTd?'rgba(44,31,21,.08)':'rgba(255,255,255,.5)',border:isTd?'1.5px solid #2C1F15':'1px solid rgba(44,31,21,.12)',borderRadius:'8px',padding:'.5rem .3rem',cursor:future?'default':'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:'.25rem',minHeight:'100px',fontFamily:'inherit',color:'#2C1F15',opacity:future?.4:1}}>
              <div style={{fontSize:'.6rem',color:dow===0?'#C07B6C':dow===6?'#6B8AA8':'#8B6F56',fontWeight:600}}>{DAY_SHORT[dow]}</div>
              <div className="df" style={{fontSize:'1.1rem',fontStyle:isTd?'italic':'normal',fontWeight:isTd?600:400,lineHeight:1}}>{date.getDate()}</div>
              <div style={{display:'flex',alignItems:'center',gap:'1px',fontSize:'.85rem',lineHeight:1,minHeight:'1.1rem'}}>
                {entry?.mood&&<span>{entry.mood.emoji}</span>}
                {entry?.mood&&entry?.weather&&<span style={{fontSize:'.5rem',color:'rgba(139,111,86,.5)'}}>/</span>}
                {entry?.weather&&<span>{entry.weather.emoji}</span>}
                {!hasMW&&!future&&<span style={{fontSize:'.65rem',color:'rgba(139,111,86,.3)'}}>·</span>}
              </div>
              {total>0&&<div style={{fontSize:'.6rem',color:'#8B6F56',marginTop:'auto'}}>{done}/{total}</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── MOOD TRACKER ─── */
function MoodTracker({calYear,calMNum,daysIn,getEntry}){
  const pts=[];
  for(let d=1;d<=daysIn;d++){const e=getEntry(d);if(e?.mood?.score)pts.push({day:d,score:e.mood.score,mood:e.mood});}
  const hasData=pts.length>0;
  const pl={top:20,right:16,bottom:32,left:16};
  const W=600,H=190,pw=W-pl.left-pl.right,ph=H-pl.top-pl.bottom;
  const xD=day=>pl.left+((day-1)/Math.max(daysIn-1,1))*pw;
  const yS=score=>pl.top+((5-score)/4)*ph;
  let path='';
  if(pts.length>0){path=`M ${xD(pts[0].day)} ${yS(pts[0].score)}`;for(let i=1;i<pts.length;i++)path+=` L ${xD(pts[i].day)} ${yS(pts[i].score)}`;}
  return(
    <div>
      <div style={{display:'flex',alignItems:'center',gap:'1rem',marginBottom:'1rem'}}>
        <h2 className="df" style={{fontSize:'1rem',fontStyle:'italic',margin:0,fontWeight:400}}>{MONTH_EN[calMNum]} Mood Tracker</h2>
        <div style={{flex:1,height:'1px',background:'rgba(44,31,21,.18)'}}/>
      </div>
      {!hasData?(
        <div style={{textAlign:'center',padding:'2rem',color:'#8B6F56',fontSize:'.9rem',fontStyle:'italic',background:'rgba(255,255,255,.25)',borderRadius:'10px'}}>이번 달엔 아직 기분 기록이 없어요.</div>
      ):(
        <div style={{background:'rgba(255,255,255,.3)',borderRadius:'10px',padding:'1rem',border:'1px solid rgba(44,31,21,.1)',overflowX:'auto'}}>
          <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',minWidth:'280px',height:'auto',display:'block'}}>
            {MOODS.slice().reverse().map(m=>(
              <line key={m.score} x1={pl.left} y1={yS(m.score)} x2={W-pl.right} y2={yS(m.score)} stroke="rgba(44,31,21,.08)" strokeWidth="1" strokeDasharray="2,4"/>
            ))}
            {Array.from({length:daysIn},(_,i)=>i+1).map(day=>(
              <text key={day} x={xD(day)} y={H-6} textAnchor="middle" fontSize={daysIn>28?7:8} fill="#8B6F56">{day}</text>
            ))}
            {path&&<path d={path} fill="none" stroke="#2C1F15" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity=".3"/>}
            {pts.map((p,i)=>(
              <text key={i} x={xD(p.day)} y={yS(p.score)+6} textAnchor="middle" fontSize="14">{p.mood.emoji}</text>
            ))}
          </svg>
          <div style={{display:'flex',justifyContent:'space-around',marginTop:'.5rem',flexWrap:'wrap',gap:'.3rem'}}>
            {MOODS.map(m=>(
              <div key={m.label} style={{display:'flex',alignItems:'center',gap:'.25rem'}}>
                <span style={{fontSize:'.9rem'}}>{m.emoji}</span>
                <span style={{fontSize:'.62rem',color:'#8B6F56'}}>{m.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── 상세 뷰 ─── */
function DetailView({date,entries,categories,today,onBack,onNavigate,patchEntry,openCatMgr}){
  const key=formatKey(date);
  const entry=entries[key]||{tasks:[],diary:'',positive:'',negative:'',anything:'',mood:null,weather:null,photos:[],song:''};
  const [newTask,setNewTask]=useState('');
  const [newTaskCat,setNewTaskCat]=useState(null);
  const fileInputRef=useRef(null);
  const [uploading,setUploading]=useState(false);

  const addTask=()=>{const t=newTask.trim();if(!t)return;patchEntry({tasks:[...(entry.tasks||[]),{id:Date.now(),text:t,done:false,categoryId:newTaskCat}]});setNewTask('');};
  const toggleTask=id=>patchEntry({tasks:entry.tasks.map(t=>t.id===id?{...t,done:!t.done}:t)});
  const deleteTask=id=>patchEntry({tasks:entry.tasks.filter(t=>t.id!==id)});
  const changeCat=(id,catId)=>patchEntry({tasks:entry.tasks.map(t=>t.id===id?{...t,categoryId:catId||null}:t)});

  const handlePhoto=async e=>{
    const files=Array.from(e.target.files||[]);if(!files.length)return;setUploading(true);
    try{const r=await Promise.all(files.map(f=>resizeImage(f)));patchEntry({photos:[...(entry.photos||[]),...r.map(data=>({id:Date.now()+Math.random(),data}))]});}
    catch{alert('사진 불러오기 실패');}setUploading(false);e.target.value='';
  };
  const deletePhoto=id=>patchEntry({photos:entry.photos.filter(p=>p.id!==id)});

  const done=(entry.tasks||[]).filter(t=>t.done).length, total=(entry.tasks||[]).length;
  const todayStart=new Date(today.getFullYear(),today.getMonth(),today.getDate());
  const canNext=addDays(date,1)<=todayStart;

  return(
    <div style={{maxWidth:'720px',margin:'0 auto'}}>
      <button onClick={onBack} style={{background:'rgba(255,255,255,.4)',border:'1px solid rgba(44,31,21,.25)',padding:'.4rem 1rem',fontSize:'.8rem',color:'#2C1F15',cursor:'pointer',borderRadius:'2px',marginBottom:'2rem'}}>← 달력으로</button>

      <div style={{marginBottom:'2.5rem',display:'flex',alignItems:'center',justifyContent:'center',gap:'1.2rem'}}>
        <button onClick={()=>onNavigate(-1)} className="nav-arrow">‹</button>
        <div style={{textAlign:'center'}}>
          <div className="df" style={{fontSize:'.85rem',letterSpacing:'.2em',color:'#8B6F56',fontStyle:'italic',marginBottom:'.5rem'}}>{DAYS_KR[date.getDay()]}</div>
          <h1 className="df" style={{fontSize:'clamp(2.4rem,7vw,3.6rem)',fontWeight:400,margin:0,lineHeight:1.05,fontStyle:'italic',letterSpacing:'-.02em'}}>{date.getMonth()+1}月 {date.getDate()}日</h1>
          <div className="df" style={{fontSize:'.95rem',color:'#8B6F56',marginTop:'.4rem',letterSpacing:'.2em'}}>{date.getFullYear()}</div>
        </div>
        <button onClick={()=>onNavigate(1)} disabled={!canNext} className="nav-arrow">›</button>
      </div>

      {/* 날씨 */}
      <section style={{marginBottom:'2.5rem'}}>
        <SectionTitle>오늘의 날씨</SectionTitle>
        <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:'.5rem'}}>
          {WEATHERS.map(w=>{const sel=entry.weather?.label===w.label;return(
            <button key={w.label} onClick={()=>patchEntry({weather:sel?null:w})} className="chip"
              style={{background:sel?`${w.color}33`:'rgba(255,255,255,.3)',border:sel?`1.5px solid ${w.color}`:'1px solid rgba(44,31,21,.18)',padding:'.9rem .3rem',cursor:'pointer',borderRadius:'8px',display:'flex',flexDirection:'column',alignItems:'center',gap:'.35rem'}}>
              <span style={{fontSize:'1.7rem',lineHeight:1}}>{w.emoji}</span>
              <span style={{fontSize:'.68rem',color:'#2C1F15'}}>{w.label}</span>
            </button>);
          })}
        </div>
      </section>

      {/* 기분 */}
      <section style={{marginBottom:'2.5rem'}}>
        <SectionTitle>오늘의 기분</SectionTitle>
        <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:'.5rem'}}>
          {MOODS.map(m=>{const sel=entry.mood?.label===m.label;return(
            <button key={m.label} onClick={()=>patchEntry({mood:sel?null:m})} className="chip"
              style={{background:sel?`${m.color}33`:'rgba(255,255,255,.3)',border:sel?`1.5px solid ${m.color}`:'1px solid rgba(44,31,21,.18)',padding:'.9rem .3rem',cursor:'pointer',borderRadius:'8px',display:'flex',flexDirection:'column',alignItems:'center',gap:'.35rem'}}>
              <span style={{fontSize:'1.7rem',lineHeight:1}}>{m.emoji}</span>
              <span style={{fontSize:'.66rem',color:'#2C1F15',whiteSpace:'nowrap'}}>{m.label}</span>
            </button>);
          })}
        </div>
      </section>

      {/* 할 일 */}
      <section style={{marginBottom:'2.5rem'}}>
        <SectionTitle count={total>0?`${done} / ${total}`:null}>오늘의 할 일</SectionTitle>
        <div style={{display:'flex',gap:'.4rem',flexWrap:'wrap',marginBottom:'.8rem',alignItems:'center'}}>
          <span style={{fontSize:'.7rem',color:'#8B6F56'}}>카테고리:</span>
          <button onClick={()=>setNewTaskCat(null)} style={{padding:'.25rem .7rem',fontSize:'.72rem',borderRadius:'20px',border:newTaskCat===null?'1.5px solid #2C1F15':'1px solid rgba(44,31,21,.2)',background:newTaskCat===null?'rgba(255,255,255,.6)':'transparent',cursor:'pointer',color:'#2C1F15'}}>없음</button>
          {categories.map(c=>(
            <button key={c.id} onClick={()=>setNewTaskCat(c.id)} style={{padding:'.25rem .7rem',fontSize:'.72rem',borderRadius:'20px',border:newTaskCat===c.id?'1.5px solid #2C1F15':'1px solid rgba(44,31,21,.2)',background:newTaskCat===c.id?c.color:c.color+'55',cursor:'pointer',color:'#2C1F15'}}>{c.name}</button>
          ))}
          <button onClick={openCatMgr} style={{padding:'.25rem .6rem',fontSize:'.72rem',borderRadius:'20px',border:'1px dashed rgba(44,31,21,.3)',background:'transparent',cursor:'pointer',color:'#8B6F56'}}>+ 관리</button>
        </div>
        <div style={{marginBottom:'1rem'}}>
          {(entry.tasks||[]).length===0&&<div style={{color:'#8B6F56',fontSize:'.85rem',fontStyle:'italic',padding:'.5rem .3rem'}}>아래에 추가해 보세요.</div>}
          {(entry.tasks||[]).map(t=>{
            const cat=categories.find(c=>c.id===t.categoryId);
            return(
              <div key={t.id} className="task-row" style={{display:'flex',alignItems:'center',gap:'.7rem',padding:'.5rem .7rem',marginBottom:'.3rem',background:cat?cat.color+'99':'rgba(255,255,255,.3)',borderRadius:'6px',borderLeft:cat?`3px solid ${cat.color}`:'3px solid rgba(44,31,21,.15)'}}>
                <button onClick={()=>toggleTask(t.id)} style={{width:'20px',height:'20px',border:'1.5px solid #2C1F15',background:t.done?'#2C1F15':'transparent',cursor:'pointer',flexShrink:0,padding:0,display:'flex',alignItems:'center',justifyContent:'center',borderRadius:'3px'}}>{t.done&&<span style={{color:'#F5EFE0',fontSize:'.72rem'}}>✓</span>}</button>
                <span style={{flex:1,textDecoration:t.done?'line-through':'none',color:t.done?'#8B6F56':'#2C1F15',fontSize:'.95rem'}}>{t.text}</span>
                <div className="task-actions">
                  <select value={t.categoryId||''} onChange={e=>changeCat(t.id,e.target.value||null)} style={{fontSize:'.7rem',background:'rgba(255,255,255,.6)',border:'1px solid rgba(44,31,21,.2)',borderRadius:'4px',padding:'2px 6px',color:'#2C1F15',cursor:'pointer'}}>
                    <option value="">없음</option>
                    {categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <button onClick={()=>deleteTask(t.id)} style={{background:'none',border:'none',cursor:'pointer',color:'#C07B6C',fontSize:'1.1rem',padding:'0 .2rem'}}>×</button>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'.6rem',borderBottom:'1px solid rgba(44,31,21,.3)',paddingBottom:'.3rem'}}>
          <span style={{color:'#8B6F56',fontSize:'1.1rem'}}>+</span>
          <input value={newTask} onChange={e=>setNewTask(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addTask()} placeholder="새 할 일 (Enter로 추가)"
            style={{flex:1,background:'transparent',border:'none',fontSize:'.95rem',padding:'.5rem 0',color:'#2C1F15',fontFamily:'inherit'}}/>
        </div>
      </section>

      {/* 일기 */}
      <section style={{marginBottom:'3rem'}}>
        <SectionTitle>오늘의 일기</SectionTitle>
        {(entry.photos||[]).length>0&&(
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(100px,1fr))',gap:'.5rem',marginBottom:'.8rem'}}>
            {entry.photos.map(p=>(
              <div key={p.id} className="photo-wrap" style={{position:'relative',aspectRatio:'1',borderRadius:'6px',overflow:'hidden'}}>
                <img src={p.data} alt="" style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>
                <button className="photo-delete" onClick={()=>deletePhoto(p.id)} style={{position:'absolute',top:'4px',right:'4px',background:'rgba(44,31,21,.8)',color:'#F5EFE0',border:'none',width:'22px',height:'22px',borderRadius:'50%',cursor:'pointer',fontSize:'.85rem',lineHeight:1}}>×</button>
              </div>
            ))}
          </div>
        )}
        <button onClick={()=>fileInputRef.current?.click()} disabled={uploading}
          style={{background:'rgba(255,255,255,.3)',border:'1px dashed rgba(44,31,21,.3)',padding:'.5rem 1rem',fontSize:'.82rem',color:'#8B6F56',cursor:'pointer',borderRadius:'4px',marginBottom:'.8rem'}}>
          {uploading?'불러오는 중...':'＋ 사진 추가'}
        </button>
        <input type="file" ref={fileInputRef} accept="image/*" multiple onChange={handlePhoto} style={{display:'none'}}/>

        <div style={{marginBottom:'1rem'}}><SongCard song={entry.song||''} songUrl={entry.songYtUrl||''} onChangeSong={v=>patchEntry({song:v},true)} onChangeUrl={v=>patchEntry({songYtUrl:v},true)}/></div>

        {[['positive','✦ Positive','오늘 좋았던 일, 감사한 것들...'],['negative','✦ Negative','힘들었던 일, 개선하고 싶은 것들...'],['anything','✦ Anything','그 외 무엇이든 자유롭게...']].map(([field,label,ph])=>(
          <div key={field} style={{marginBottom:'.9rem'}}>
            <div style={{fontSize:'.72rem',color:'#8B6F56',letterSpacing:'.2em',textTransform:'uppercase',marginBottom:'.3rem',fontStyle:'italic'}}>{label}</div>
            <textarea value={entry[field]||''} onChange={e=>patchEntry({[field]:e.target.value},true)} placeholder={ph}
              style={{width:'100%',minHeight:'4rem',background:'rgba(255,255,255,.2)',border:'none',borderBottom:'1px dashed rgba(44,31,21,.2)',fontFamily:"'Gaegu','Gowun Batang',cursive",fontSize:'1rem',color:'#2C1F15',resize:'vertical',padding:'.2rem 0',lineHeight:1.6}}/>
          </div>
        ))}
        <div>
          <div style={{fontSize:'.72rem',color:'#8B6F56',letterSpacing:'.2em',textTransform:'uppercase',marginBottom:'.3rem',fontStyle:'italic'}}>✦ 오늘의 기록</div>
          <textarea value={entry.diary||''} onChange={e=>patchEntry({diary:e.target.value},true)} placeholder="그 외 자유롭게..."
            className="paper-lines"
            style={{width:'100%',minHeight:'8rem',background:'transparent',border:'none',fontFamily:"'Gaegu','Gowun Batang',cursive",fontSize:'1rem',color:'#2C1F15',resize:'vertical',padding:0,lineHeight:'1.75rem'}}/>
        </div>
      </section>

      <button onClick={onBack} style={{display:'block',margin:'3rem auto 2rem',background:'rgba(255,255,255,.4)',border:'1px solid rgba(44,31,21,.25)',padding:'.5rem 2rem',fontSize:'.8rem',color:'#2C1F15',cursor:'pointer',borderRadius:'2px'}}>
        달력으로 돌아가기
      </button>
    </div>
  );
}

/* ─── 카테고리 관리 ─── */
function CategoryManager({categories,onSave,onClose}){
  const [list,setList]=useState(categories);
  const [newName,setNewName]=useState('');
  const [newColor,setNewColor]=useState(CATEGORY_COLOR_PALETTE[0]);
  const addCat=()=>{const n=newName.trim();if(!n)return;setList([...list,{id:`cat_${Date.now()}`,name:n,color:newColor}]);setNewName('');};
  const delCat=id=>{if(!confirm('삭제하시겠어요?'))return;setList(list.filter(c=>c.id!==id));};
  const updCat=(id,p)=>setList(list.map(c=>c.id===id?{...c,...p}:c));
  return(
    <div className="modal-backdrop" onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:'#FFFDF5',borderRadius:'10px',padding:'1.8rem',maxWidth:'480px',width:'100%',maxHeight:'80vh',overflowY:'auto',boxShadow:'0 12px 40px rgba(44,31,21,.25)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1.5rem'}}>
          <h2 className="df" style={{fontSize:'1.3rem',fontStyle:'italic',margin:0,fontWeight:400}}>할 일 카테고리</h2>
          <button onClick={onClose} style={{background:'none',border:'none',fontSize:'1.3rem',cursor:'pointer',color:'#8B6F56'}}>×</button>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:'.5rem',marginBottom:'1.5rem'}}>
          {list.length===0&&<div style={{color:'#8B6F56',fontStyle:'italic',fontSize:'.85rem'}}>카테고리가 없어요.</div>}
          {list.map(c=>(
            <div key={c.id} style={{display:'flex',alignItems:'center',gap:'.6rem',padding:'.6rem',borderRadius:'6px',background:c.color+'66',border:`1px solid ${c.color}`}}>
              <div style={{display:'flex',gap:'2px',flexWrap:'wrap',maxWidth:'120px'}}>
                {CATEGORY_COLOR_PALETTE.map(col=>(
                  <button key={col} onClick={()=>updCat(c.id,{color:col})} style={{width:'18px',height:'18px',borderRadius:'50%',background:col,cursor:'pointer',border:c.color===col?'2px solid #2C1F15':'1px solid rgba(44,31,21,.2)',padding:0}}/>
                ))}
              </div>
              <input value={c.name} onChange={e=>updCat(c.id,{name:e.target.value})} style={{flex:1,background:'rgba(255,255,255,.5)',border:'1px solid rgba(44,31,21,.15)',borderRadius:'4px',padding:'.3rem .5rem',fontSize:'.9rem',fontFamily:'inherit',color:'#2C1F15'}}/>
              <button onClick={()=>delCat(c.id)} style={{background:'none',border:'none',cursor:'pointer',color:'#C07B6C',fontSize:'1.1rem'}}>×</button>
            </div>
          ))}
        </div>
        <div style={{borderTop:'1px dashed rgba(44,31,21,.2)',paddingTop:'1rem',marginBottom:'1.2rem'}}>
          <div style={{fontSize:'.75rem',color:'#8B6F56',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:'.6rem'}}>새 카테고리 추가</div>
          <div style={{display:'flex',gap:'2px',flexWrap:'wrap',marginBottom:'.6rem'}}>
            {CATEGORY_COLOR_PALETTE.map(col=>(
              <button key={col} onClick={()=>setNewColor(col)} style={{width:'24px',height:'24px',borderRadius:'50%',background:col,cursor:'pointer',border:newColor===col?'2.5px solid #2C1F15':'1px solid rgba(44,31,21,.2)',padding:0}}/>
            ))}
          </div>
          <div style={{display:'flex',gap:'.5rem'}}>
            <input value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addCat()} placeholder="카테고리 이름"
              style={{flex:1,background:newColor+'55',border:`1px solid ${newColor}`,borderRadius:'4px',padding:'.5rem .7rem',fontSize:'.9rem',fontFamily:'inherit',color:'#2C1F15'}}/>
            <button onClick={addCat} style={{background:'#2C1F15',color:'#FFFDF5',border:'none',padding:'.5rem 1rem',fontSize:'.85rem',borderRadius:'4px',cursor:'pointer'}}>추가</button>
          </div>
        </div>
        <div style={{display:'flex',gap:'.5rem',justifyContent:'flex-end'}}>
          <button onClick={onClose} style={{background:'transparent',border:'1px solid rgba(44,31,21,.2)',padding:'.5rem 1.2rem',fontSize:'.85rem',borderRadius:'4px',cursor:'pointer',color:'#2C1F15'}}>취소</button>
          <button onClick={()=>{onSave(list);onClose();}} style={{background:'#2C1F15',color:'#FFFDF5',border:'none',padding:'.5rem 1.5rem',fontSize:'.85rem',borderRadius:'4px',cursor:'pointer'}}>저장</button>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({children,count}){
  return(
    <div style={{display:'flex',alignItems:'center',gap:'1rem',marginBottom:'1.2rem'}}>
      <h2 className="df" style={{fontSize:'1.15rem',fontStyle:'italic',margin:0,color:'#2C1F15',fontWeight:400}}>{children}</h2>
      {count&&<span className="df" style={{fontSize:'.8rem',color:'#8B6F56',fontStyle:'italic'}}>{count}</span>}
      <div style={{flex:1,height:'1px',background:'rgba(44,31,21,.18)'}}/>
    </div>
  );
}
