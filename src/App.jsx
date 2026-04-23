import { useState, useEffect, useRef } from 'react';

const WEATHERS = [
  { emoji: '☀️', label: '맑음', color: '#E8A838' },
  { emoji: '🌤️', label: '맑았다 흐림', color: '#C9B878' },
  { emoji: '☁️', label: '흐림', color: '#9AA5B0' },
  { emoji: '🌧️', label: '비', color: '#6B8AA8' },
  { emoji: '💨', label: '바람 많이', color: '#8AA29E' },
];

const MOODS = [
  { emoji: '😊', label: '아주 좋아요', color: '#E8A838', score: 5 },
  { emoji: '🙂', label: '좋아요', color: '#B8A87A', score: 4 },
  { emoji: '😐', label: '그저그래요', color: '#9AA5B0', score: 3 },
  { emoji: '😔', label: '우울해요', color: '#6B8AA8', score: 2 },
  { emoji: '😞', label: '좋지 않아요', color: '#C07B6C', score: 1 },
];

// 월별 배경색
const MONTH_COLORS = [
  '#E0D6F0', // 1월
  '#F0D6EF', // 2월
  '#FCF5B3', // 3월
  '#ECF5B8', // 4월
  '#D6F2C2', // 5월
  '#C9FFF0', // 6월
  '#D1F1FF', // 7월
  '#D1E3FF', // 8월
  '#FFE8D1', // 9월
  '#FFD9B8', // 10월
  '#F5C9B0', // 11월
  '#E8F0F7', // 12월
];

// 카테고리 기본값
const DEFAULT_CATEGORIES = [
  { id: 'work', name: '업무', color: '#B8D4E8' },
  { id: 'personal', name: '개인', color: '#F5D9E0' },
  { id: 'study', name: '공부', color: '#E8DFB8' },
  { id: 'health', name: '건강', color: '#C8E8C4' },
];

// 카테고리 생성용 색 팔레트
const CATEGORY_COLOR_PALETTE = [
  '#F5D9E0', // 연분홍
  '#F5C9B0', // 살구
  '#F5E8B0', // 연노랑
  '#E8DFB8', // 머스터드
  '#C8E8C4', // 연둣빛
  '#B8E8D8', // 민트
  '#B8D4E8', // 하늘
  '#C8C0E8', // 라벤더
  '#E8C8E0', // 라일락
  '#D4D4D4', // 회색
];

const DAYS_KR = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
const DAY_SHORT = ['일', '월', '화', '수', '목', '금', '토'];
const MONTH_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const STORAGE_KEY = 'journal-entries-v2';
const CATEGORIES_KEY = 'journal-categories-v1';

const pad = (n) => String(n).padStart(2, '0');
const formatKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

const resizeImage = (file, maxSize = 900) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxSize) { height *= maxSize / width; width = maxSize; }
        else if (height > maxSize) { width *= maxSize / height; height = maxSize; }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

function loadEntries() {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? JSON.parse(s) : {};
  } catch (e) { return {}; }
}

function loadCategories() {
  try {
    const s = localStorage.getItem(CATEGORIES_KEY);
    return s ? JSON.parse(s) : DEFAULT_CATEGORIES;
  } catch (e) { return DEFAULT_CATEGORIES; }
}

export default function App() {
  const today = new Date();
  const [entries, setEntries] = useState(loadEntries);
  const [categories, setCategories] = useState(loadCategories);
  const [level, setLevel] = useState('month');
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(null);
  const [transitionState, setTransitionState] = useState('idle');
  const [zoomOrigin, setZoomOrigin] = useState('50% 50%');
  const [showCatManager, setShowCatManager] = useState(false);
  const saveTimer = useRef(null);

  const bgColor = level === 'year-cover' || level === 'year-grid'
    ? '#F5EFE0'
    : MONTH_COLORS[calMonth.getMonth()];

  const commitSave = (next) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); }
    catch (e) { alert('저장 공간이 부족해요.'); }
  };
  const saveNow = (next) => { setEntries(next); commitSave(next); };
  const saveDebounced = (next) => {
    setEntries(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => commitSave(next), 400);
  };

  const saveCategories = (next) => {
    setCategories(next);
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(next));
  };

  const doZoomOut = (event, callback) => {
    if (event) {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = ((rect.left + rect.width / 2) / window.innerWidth) * 100;
      const y = ((rect.top + rect.height / 2) / window.innerHeight) * 100;
      setZoomOrigin(`${x}% ${y}%`);
    } else { setZoomOrigin('50% 50%'); }
    setTransitionState('shrinking');
    setTimeout(() => {
      callback();
      setTransitionState('expanding');
      setTimeout(() => setTransitionState('idle'), 400);
    }, 350);
  };

  const doZoomIn = (event, callback) => {
    if (event) {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = ((rect.left + rect.width / 2) / window.innerWidth) * 100;
      const y = ((rect.top + rect.height / 2) / window.innerHeight) * 100;
      setZoomOrigin(`${x}% ${y}%`);
    }
    setTransitionState('zooming-in');
    setTimeout(() => {
      callback();
      setTransitionState('expanding');
      setTimeout(() => setTransitionState('idle'), 400);
    }, 350);
  };

  const openYearCover = (event) => doZoomOut(event, () => setLevel('year-cover'));
  const openYearGrid = (event) => doZoomIn(event, () => setLevel('year-grid'));
  const openMonth = (monthIndex, event) => {
    doZoomIn(event, () => {
      setCalMonth(new Date(viewYear, monthIndex, 1));
      setLevel('month');
    });
  };

  const openDate = (date, event) => {
    doZoomIn(event, () => {
      setSelectedDate(date);
      setLevel('day');
    });
  };

  // 상세 화면에서 이전/다음 날 이동 (이펙트 없이 자연스럽게)
  const navigateDay = (direction) => {
    if (!selectedDate) return;
    const newDate = addDays(selectedDate, direction);
    // 미래로 못 가게
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (newDate > todayStart) return;
    setSelectedDate(newDate);
  };

  const closeDetail = () => {
    setTransitionState('shrinking');
    setTimeout(() => {
      setSelectedDate(null);
      setLevel('month');
      setTransitionState('expanding');
      setTimeout(() => setTransitionState('idle'), 400);
    }, 350);
  };

  const backToYearCover = () => {
    setTransitionState('shrinking');
    setTimeout(() => {
      setLevel('year-cover');
      setTransitionState('expanding');
      setTimeout(() => setTransitionState('idle'), 400);
    }, 350);
  };

  return (
    <div style={{ minHeight: '100vh', background: bgColor, color: '#2C1F15', fontFamily: "'Gowun Batang', 'Fraunces', serif", position: 'relative', overflow: 'hidden', transition: 'background 0.6s ease' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,400;1,9..144,600&family=Gowun+Batang:wght@400;700&family=Gaegu:wght@300;400;700&display=swap');

        * { box-sizing: border-box; }
        body { margin: 0; }
        button { font-family: inherit; }

        .grain::before {
          content: ''; position: fixed; inset: 0; pointer-events: none;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/><feColorMatrix values='0 0 0 0 0.2 0 0 0 0 0.12 0 0 0 0 0.08 0 0 0 0.06 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
          opacity: 0.35; z-index: 100; mix-blend-mode: multiply;
        }

        .display-font { font-family: 'Fraunces', 'Gowun Batang', serif; font-variation-settings: "opsz" 144; }

        @keyframes zoomOut { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(0.3); opacity: 0; filter: blur(6px); } }
        .shrinking { animation: zoomOut 0.35s cubic-bezier(0.7, 0, 0.84, 0) forwards; }

        @keyframes zoomInFast { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(3); opacity: 0; filter: blur(8px); } }
        .zooming-in { animation: zoomInFast 0.35s cubic-bezier(0.7, 0, 0.84, 0) forwards; }

        @keyframes expand { 0% { transform: scale(0.5); opacity: 0; filter: blur(8px); } 100% { transform: scale(1); opacity: 1; filter: blur(0px); } }
        .expanding { animation: expand 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; transform-origin: center; }

        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .fade-up { opacity: 0; animation: fadeUp 0.55s ease-out forwards; }

        .cal-cell { transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1); position: relative; }
        .cal-cell:hover:not(:disabled) { transform: scale(1.05); }
        .cal-cell:disabled { cursor: default; }

        .chip { transition: all 0.2s cubic-bezier(.34,1.56,.64,1); }
        .chip:hover { transform: translateY(-2px); }

        .task-row:hover .task-actions { opacity: 1; }
        .task-actions { opacity: 0; transition: opacity 0.15s; display: flex; gap: 0.3rem; align-items: center; }

        .paper-lines {
          background-image: repeating-linear-gradient(transparent, transparent 1.75rem, rgba(44,31,21,0.13) 1.75rem, rgba(44,31,21,0.13) calc(1.75rem + 1px));
          line-height: 1.75rem;
        }

        .diary-area::placeholder { color: rgba(139,111,86,0.55); font-style: italic; }
        .task-input::placeholder { color: rgba(139,111,86,0.6); }
        .task-input:focus, .diary-area:focus { outline: none; }

        .photo-thumb { transition: transform 0.2s; cursor: pointer; }
        .photo-thumb:hover { transform: scale(1.03); }
        .photo-delete { opacity: 0; transition: opacity 0.15s; }
        .photo-wrap:hover .photo-delete { opacity: 1; }

        .week-card { transition: all 0.2s; }
        .week-card:hover { transform: translateY(-2px); }

        .paper-stack { position: relative; transition: all 0.3s; cursor: pointer; }
        .paper-stack:hover { transform: translateY(-4px); }
        .paper-stack::before, .paper-stack::after {
          content: ''; position: absolute; inset: 0;
          background: #FFFBF0; border: 1px solid rgba(44,31,21,0.12);
          border-radius: 4px; box-shadow: 0 2px 8px rgba(44,31,21,0.08);
        }
        .paper-stack::before { transform: rotate(-2.5deg) translate(-6px, 4px); }
        .paper-stack::after { transform: rotate(1.8deg) translate(5px, 2px); }
        .paper-stack > .paper-top {
          position: relative; z-index: 2; background: #FFFDF5;
          border: 1px solid rgba(44,31,21,0.15); border-radius: 4px;
          box-shadow: 0 4px 12px rgba(44,31,21,0.1);
        }

        .mini-cal-card { transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1); cursor: pointer; }
        .mini-cal-card:hover { transform: translateY(-3px) scale(1.02); box-shadow: 0 8px 24px rgba(44,31,21,0.12); }

        /* 카테고리 관리 모달 */
        .modal-backdrop {
          position: fixed; inset: 0; background: rgba(44,31,21,0.4);
          z-index: 200; display: flex; align-items: center; justify-content: center;
          padding: 1rem; animation: fadeIn 0.2s ease-out;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        .nav-arrow {
          background: rgba(255,255,255,0.5);
          border: 1px solid rgba(44,31,21,0.2);
          border-radius: 50%;
          width: 38px; height: 38px;
          cursor: pointer; font-size: 1.1rem; color: #2C1F15;
          transition: all 0.2s;
          display: flex; align-items: center; justify-content: center;
        }
        .nav-arrow:hover:not(:disabled) { background: rgba(255,255,255,0.85); transform: scale(1.08); }
        .nav-arrow:disabled { opacity: 0.3; cursor: default; }
      `}</style>

      <div className="grain"></div>

      <div
        className={
          transitionState === 'shrinking' ? 'shrinking' :
          transitionState === 'zooming-in' ? 'zooming-in' :
          transitionState === 'expanding' ? 'expanding' : ''
        }
        style={{ transformOrigin: zoomOrigin, minHeight: '100vh' }}
      >
        {level === 'year-cover' && (
          <YearCover year={viewYear} setYear={setViewYear} entries={entries} onOpenGrid={openYearGrid} />
        )}

        {level === 'year-grid' && (
          <YearGrid year={viewYear} entries={entries} today={today} onSelectMonth={openMonth} onBack={backToYearCover} />
        )}

        {level === 'month' && (
          <div style={{ padding: '2.5rem 1.5rem' }}>
            <MainView
              today={today}
              entries={entries}
              categories={categories}
              calMonth={calMonth}
              setCalMonth={setCalMonth}
              openDate={openDate}
              openYearCover={openYearCover}
              openCatManager={() => setShowCatManager(true)}
            />
          </div>
        )}

        {level === 'day' && selectedDate && (
          <div style={{ padding: '2.5rem 1.5rem', minHeight: '100vh' }}>
            <DetailView
              date={selectedDate}
              entries={entries}
              categories={categories}
              today={today}
              onBack={closeDetail}
              onNavigate={navigateDay}
              patchEntry={(patch, debounced) => {
                const key = formatKey(selectedDate);
                const cur = entries[key] || { tasks: [], diary: '', mood: null, weather: null, photos: [] };
                const next = { ...entries, [key]: { ...cur, ...patch } };
                (debounced ? saveDebounced : saveNow)(next);
              }}
              openCatManager={() => setShowCatManager(true)}
            />
          </div>
        )}
      </div>

      {showCatManager && (
        <CategoryManager
          categories={categories}
          onSave={saveCategories}
          onClose={() => setShowCatManager(false)}
        />
      )}
    </div>
  );
}

// ============ 연도 표지 ============
function YearCover({ year, setYear, entries, onOpenGrid }) {
  const count = Object.keys(entries).filter(k => k.startsWith(`${year}-`)).length;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div className="fade-up" style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '3rem' }}>
        <button onClick={() => setYear(year - 1)} className="nav-arrow">‹</button>
        <h1 className="display-font" style={{ fontSize: 'clamp(5rem, 18vw, 11rem)', fontWeight: 400, margin: 0, fontStyle: 'italic', letterSpacing: '-0.03em', lineHeight: 0.9 }}>{year}</h1>
        <button onClick={() => setYear(year + 1)} className="nav-arrow">›</button>
      </div>

      <div className="fade-up display-font" style={{ fontSize: '0.9rem', color: '#8B6F56', letterSpacing: '0.3em', textTransform: 'uppercase', fontStyle: 'italic', marginBottom: '3rem', animationDelay: '0.1s' }}>
        {count}개의 기록
      </div>

      <div className="fade-up" style={{ animationDelay: '0.2s' }}>
        <div className="paper-stack" onClick={onOpenGrid} style={{ width: 'min(280px, 75vw)', aspectRatio: '0.72' }}>
          <div className="paper-top" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', gap: '1rem' }}>
            <div className="display-font" style={{ fontSize: '0.75rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#8B6F56', fontStyle: 'italic' }}>
              a year in pages
            </div>
            <div className="display-font" style={{ fontSize: '3.5rem', fontStyle: 'italic', fontWeight: 400, lineHeight: 1 }}>{year}</div>
            <div style={{ width: '40px', height: '1px', background: 'rgba(44,31,21,0.3)' }} />
            <div style={{ fontSize: '0.8rem', color: '#8B6F56', letterSpacing: '0.15em', fontStyle: 'italic' }}>
              12개의 달을 펼쳐보세요
            </div>
          </div>
        </div>
      </div>

      <div className="fade-up display-font" style={{ fontSize: '0.75rem', color: '#8B6F56', letterSpacing: '0.2em', textTransform: 'uppercase', fontStyle: 'italic', marginTop: '2.5rem', animationDelay: '0.3s' }}>
        ↑ 터치해서 열기
      </div>
    </div>
  );
}

// ============ 12개월 그리드 ============
function YearGrid({ year, entries, today, onSelectMonth, onBack }) {
  return (
    <div style={{ padding: '2.5rem 1.5rem', minHeight: '100vh' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div className="fade-up" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2.5rem' }}>
          <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.4)', border: '1px solid rgba(44,31,21,0.25)', padding: '0.4rem 1rem', fontSize: '0.8rem', color: '#2C1F15', cursor: 'pointer', borderRadius: '2px', letterSpacing: '0.05em' }}>
            ← {year} 표지로
          </button>
          <h1 className="display-font" style={{ fontSize: 'clamp(2rem, 6vw, 3rem)', fontStyle: 'italic', margin: 0, fontWeight: 400 }}>{year}</h1>
          <div style={{ width: '80px' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          {Array.from({ length: 12 }, (_, m) => (
            <MiniMonth key={m} year={year} month={m} entries={entries} today={today} onClick={(e) => onSelectMonth(m, e)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function MiniMonth({ year, month, entries, today, onClick }) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysIn = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysIn; d++) cells.push(d);

  const bgColor = MONTH_COLORS[month];
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();
  const getEntry = (d) => entries[formatKey(new Date(year, month, d))];
  const recordCount = Array.from({ length: daysIn }, (_, i) => i + 1)
    .filter(d => {
      const e = getEntry(d);
      return e && (e.mood || e.weather || e.diary || (e.tasks && e.tasks.length > 0));
    }).length;

  return (
    <button className="mini-cal-card" onClick={onClick}
      style={{
        background: bgColor,
        border: isCurrentMonth ? '2px solid #2C1F15' : '1px solid rgba(44,31,21,0.15)',
        borderRadius: '8px', padding: '1rem 0.8rem', textAlign: 'center',
        fontFamily: 'inherit', color: '#2C1F15', aspectRatio: '0.9',
        display: 'flex', flexDirection: 'column', gap: '0.5rem',
      }}
    >
      <div className="display-font" style={{ fontSize: '1rem', fontStyle: 'italic', fontWeight: isCurrentMonth ? 600 : 400 }}>{MONTH_SHORT[month]}</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', flex: 1 }}>
        {DAY_SHORT.map((d) => (
          <div key={d} style={{ fontSize: '0.5rem', color: 'rgba(44,31,21,0.4)', fontWeight: 600 }}>{d}</div>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <div key={i}></div>;
          const entry = getEntry(d);
          const hasData = entry && (entry.mood || entry.weather);
          const markerColor = entry?.mood?.color || entry?.weather?.color;
          const isTodayCell = isCurrentMonth && d === today.getDate();
          return (
            <div key={i} style={{
              fontSize: '0.55rem', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: isTodayCell ? '#fff' : '#2C1F15',
              backgroundColor: isTodayCell ? '#2C1F15' : (hasData ? markerColor + '55' : 'transparent'),
              borderRadius: '2px', fontWeight: isTodayCell ? 700 : 400,
            }}>{d}</div>
          );
        })}
      </div>

      <div style={{ fontSize: '0.65rem', color: '#8B6F56', fontStyle: 'italic' }}>
        {recordCount > 0 ? `${recordCount}일 기록` : '비어있음'}
      </div>
    </button>
  );
}

// ============ 월 메인 뷰 ============
function MainView({ today, entries, categories, calMonth, setCalMonth, openDate, openYearCover, openCatManager }) {
  const calYear = calMonth.getFullYear();
  const calMNum = calMonth.getMonth();
  const firstDay = new Date(calYear, calMNum, 1).getDay();
  const daysIn = new Date(calYear, calMNum + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysIn; d++) cells.push(d);

  const isToday = (d) => d === today.getDate() && calMNum === today.getMonth() && calYear === today.getFullYear();
  const isFuture = (d) => {
    const cellDate = new Date(calYear, calMNum, d);
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return cellDate > todayStart;
  };
  const getEntry = (d) => entries[formatKey(new Date(calYear, calMNum, d))];

  // "현재 주"만 주간 섹션에 표시: 오늘이 속한 주. 오늘이 calMonth에 없다면, 그 달의 첫째 주.
  let weekAnchor;
  if (calYear === today.getFullYear() && calMNum === today.getMonth()) {
    weekAnchor = new Date(today);
  } else {
    weekAnchor = new Date(calYear, calMNum, 1);
  }
  const weekStart = new Date(weekAnchor);
  weekStart.setDate(weekAnchor.getDate() - weekAnchor.getDay());
  const currentWeek = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // 오늘의 할 일 (calMonth에 오늘이 있을 때만 유효)
  const todayEntry = entries[formatKey(today)];
  const todayTasks = (todayEntry?.tasks || []);

  return (
    <div style={{ maxWidth: '780px', margin: '0 auto' }}>

      <div className="fade-up" style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div className="display-font" style={{ fontSize: '0.8rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#8B6F56', fontStyle: 'italic', marginBottom: '0.4rem' }}>
          daily journal
        </div>
        <div className="display-font" style={{ fontSize: '0.85rem', color: '#8B6F56', letterSpacing: '0.15em', fontStyle: 'italic' }}>
          {today.getFullYear()}. {pad(today.getMonth() + 1)}. {pad(today.getDate())} · {DAYS_KR[today.getDay()]}
        </div>
      </div>

      <div className="fade-up" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.8rem', animationDelay: '0.08s' }}>
        <button onClick={() => setCalMonth(new Date(calYear, calMNum - 1, 1))} className="nav-arrow" aria-label="이전 달">‹</button>

        <div style={{ textAlign: 'center', flex: 1 }}>
          <h1 className="display-font" style={{ fontSize: 'clamp(2.2rem, 6vw, 3rem)', fontWeight: 400, margin: 0, fontStyle: 'italic', letterSpacing: '-0.01em', lineHeight: 1 }}>
            {MONTH_EN[calMNum]}
          </h1>
          <button onClick={openYearCover} className="display-font"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', color: '#8B6F56', marginTop: '0.3rem', letterSpacing: '0.25em', padding: '0.2rem 0.6rem', borderRadius: '3px', transition: 'background 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(44,31,21,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            {calYear} ↗
          </button>
        </div>

        <button onClick={() => setCalMonth(new Date(calYear, calMNum + 1, 1))} className="nav-arrow" aria-label="다음 달">›</button>
      </div>

      <div className="fade-up" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '0.5rem', animationDelay: '0.12s' }}>
        {DAY_SHORT.map((d, i) => (
          <div key={d} style={{ textAlign: 'center', fontSize: '0.72rem', padding: '0.5rem 0', color: i === 0 ? '#C07B6C' : i === 6 ? '#6B8AA8' : '#8B6F56', letterSpacing: '0.15em', fontWeight: 600 }}>{d}</div>
        ))}
      </div>

      <div className="fade-up" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '3rem', animationDelay: '0.16s' }}>
        {cells.map((d, i) => {
          if (d === null) return <div key={i}></div>;
          const entry = getEntry(d);
          const future = isFuture(d);
          const isTodayCell = isToday(d);
          const hasData = entry && (entry.mood || entry.weather || entry.diary || (entry.tasks && entry.tasks.length > 0) || (entry.photos && entry.photos.length > 0));
          const markerColor = entry?.mood?.color || entry?.weather?.color || '#8B6F56';
          const pendingTasks = (entry?.tasks || []).filter(t => !t.done);
          const totalTasks = entry?.tasks?.length || 0;

          return (
            <button key={i} className="cal-cell" onClick={(e) => !future && openDate(new Date(calYear, calMNum, d), e)} disabled={future}
              style={{
                minHeight: '90px', background: 'transparent', border: 'none', padding: '4px',
                cursor: future ? 'default' : 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'stretch', position: 'relative',
              }}>
              {isTodayCell && (<div style={{ position: 'absolute', inset: '3px', border: '2px solid #2C1F15', borderRadius: '10px', pointerEvents: 'none' }} />)}
              {hasData && !isTodayCell && (<div style={{ position: 'absolute', inset: '3px', border: `1.5px solid ${markerColor}`, borderRadius: '10px', background: `${markerColor}14`, pointerEvents: 'none' }} />)}

              <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center', gap: '2px', paddingTop: '4px' }}>
                <span className="display-font" style={{
                  fontSize: '0.95rem', fontWeight: isTodayCell ? 600 : 400, fontStyle: isTodayCell ? 'italic' : 'normal',
                  color: future ? 'rgba(44,31,21,0.25)' : '#2C1F15', lineHeight: 1,
                }}>{d}</span>

                {hasData && (<span style={{ fontSize: '0.85rem', lineHeight: 1 }}>{entry.mood?.emoji || entry.weather?.emoji || '·'}</span>)}

                {totalTasks > 0 && (
                  <div style={{ width: '100%', marginTop: 'auto', paddingTop: '2px' }}>
                    {pendingTasks.slice(0, 2).map((t) => {
                      const cat = categories.find(c => c.id === t.categoryId);
                      return (
                        <div key={t.id} style={{
                          fontSize: '0.6rem', color: '#2C1F15', padding: '1px 3px',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          lineHeight: 1.3, textAlign: 'left',
                          background: cat ? cat.color + 'AA' : 'transparent',
                          borderRadius: '2px', marginBottom: '1px',
                        }}>
                          · {t.text}
                        </div>
                      );
                    })}
                    {pendingTasks.length === 0 && totalTasks > 0 && (<div style={{ fontSize: '0.6rem', color: '#8B6F56', fontStyle: 'italic', textAlign: 'center', padding: '1px' }}>✓ 완료</div>)}
                    {pendingTasks.length > 2 && (<div style={{ fontSize: '0.55rem', color: '#8B6F56', fontStyle: 'italic', textAlign: 'center' }}>+{pendingTasks.length - 2}</div>)}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* ===== 오늘의 요약 (날짜 + 기분 + 할 일) ===== */}
      <TodayPanel today={today} todayEntry={todayEntry} todayTasks={todayTasks} categories={categories} openDate={openDate} />

      {/* ===== 현재 주 섹션 ===== */}
      <section className="fade-up" style={{ animationDelay: '0.28s', marginBottom: '3rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <h2 className="display-font" style={{ fontSize: '1rem', fontStyle: 'italic', margin: 0, fontWeight: 400 }}>이번 주</h2>
          <div style={{ flex: 1, height: '1px', background: 'rgba(44,31,21,0.18)' }}></div>
          <span className="display-font" style={{ fontSize: '0.75rem', color: '#8B6F56', fontStyle: 'italic' }}>
            {currentWeek[0].getMonth() + 1}/{currentWeek[0].getDate()} – {currentWeek[6].getMonth() + 1}/{currentWeek[6].getDate()}
          </span>
        </div>
        <CurrentWeek week={currentWeek} entries={entries} today={today} categories={categories} openDate={openDate} />
      </section>

      {/* ===== 월별 기분 그래프 ===== */}
      <section className="fade-up" style={{ animationDelay: '0.36s', marginBottom: '3rem' }}>
        <MoodChart calYear={calYear} calMNum={calMNum} daysIn={daysIn} getEntry={getEntry} />
      </section>

      {/* ===== 카테고리 관리 버튼 ===== */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <button onClick={openCatManager}
          style={{ background: 'rgba(255,255,255,0.4)', border: '1px solid rgba(44,31,21,0.2)', padding: '0.5rem 1.2rem', fontSize: '0.8rem', color: '#2C1F15', cursor: 'pointer', borderRadius: '20px', letterSpacing: '0.05em' }}>
          ⚙ 할 일 카테고리 관리
        </button>
      </div>

      <div className="display-font" style={{ textAlign: 'center', marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid rgba(44,31,21,0.15)', fontSize: '0.75rem', color: '#8B6F56', fontStyle: 'italic', letterSpacing: '0.2em' }}>
        ⟡ today is a page in your story ⟡
      </div>
    </div>
  );
}

// ============ 오늘의 요약 ============
function TodayPanel({ today, todayEntry, todayTasks, categories, openDate }) {
  const pending = todayTasks.filter(t => !t.done);
  const done = todayTasks.length - pending.length;

  return (
    <section className="fade-up" style={{ animationDelay: '0.22s', marginBottom: '2.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <h2 className="display-font" style={{ fontSize: '1rem', fontStyle: 'italic', margin: 0, fontWeight: 400 }}>오늘</h2>
        <div style={{ flex: 1, height: '1px', background: 'rgba(44,31,21,0.18)' }}></div>
      </div>

      <button onClick={(e) => openDate(new Date(today.getFullYear(), today.getMonth(), today.getDate()), e)}
        style={{
          width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', color: '#2C1F15',
          background: 'rgba(255,255,255,0.5)', border: '1.5px solid #2C1F15', borderRadius: '10px',
          padding: '1.2rem', display: 'flex', gap: '1.2rem', alignItems: 'flex-start',
        }}
      >
        {/* 날짜 */}
        <div style={{ minWidth: '70px', textAlign: 'center' }}>
          <div className="display-font" style={{ fontSize: '2rem', fontStyle: 'italic', fontWeight: 600, lineHeight: 1 }}>{today.getDate()}</div>
          <div style={{ fontSize: '0.7rem', color: '#8B6F56', marginTop: '0.2rem', letterSpacing: '0.1em' }}>{DAY_SHORT[today.getDay()]}</div>
          <div style={{ fontSize: '0.62rem', color: '#C07B6C', fontStyle: 'italic', marginTop: '2px' }}>today</div>
        </div>

        {/* 기분 / 날씨 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', minWidth: '80px', alignItems: 'center', paddingTop: '0.2rem' }}>
          {todayEntry?.weather ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
              <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>{todayEntry.weather.emoji}</span>
              <span style={{ fontSize: '0.62rem', color: '#8B6F56' }}>{todayEntry.weather.label}</span>
            </div>
          ) : null}
          {todayEntry?.mood ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
              <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>{todayEntry.mood.emoji}</span>
              <span style={{ fontSize: '0.62rem', color: '#8B6F56' }}>{todayEntry.mood.label}</span>
            </div>
          ) : null}
          {!todayEntry?.weather && !todayEntry?.mood && (
            <span style={{ fontSize: '0.75rem', color: 'rgba(139,111,86,0.6)', fontStyle: 'italic' }}>기록 전</span>
          )}
        </div>

        {/* 할 일 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.7rem', color: '#8B6F56', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            오늘 할 일 {todayTasks.length > 0 && <span style={{ fontStyle: 'italic' }}>· {done}/{todayTasks.length}</span>}
          </div>
          {todayTasks.length === 0 ? (
            <div style={{ fontSize: '0.85rem', color: 'rgba(139,111,86,0.7)', fontStyle: 'italic' }}>
              아직 할 일이 없어요. 클릭해서 추가해보세요.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {todayTasks.slice(0, 5).map(t => {
                const cat = categories.find(c => c.id === t.categoryId);
                return (
                  <div key={t.id} style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0.5rem',
                    background: cat ? cat.color + '99' : 'rgba(255,255,255,0.4)',
                    borderRadius: '4px',
                    borderLeft: cat ? `3px solid ${cat.color}` : '3px solid rgba(44,31,21,0.15)',
                    fontSize: '0.88rem',
                    textDecoration: t.done ? 'line-through' : 'none',
                    color: t.done ? '#8B6F56' : '#2C1F15',
                  }}>
                    <span style={{ fontSize: '0.75rem' }}>{t.done ? '✓' : '·'}</span>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.text}</span>
                    {cat && <span style={{ fontSize: '0.65rem', color: '#8B6F56', fontStyle: 'italic' }}>{cat.name}</span>}
                  </div>
                );
              })}
              {todayTasks.length > 5 && (
                <div style={{ fontSize: '0.72rem', color: '#8B6F56', fontStyle: 'italic', paddingLeft: '0.5rem' }}>+{todayTasks.length - 5}개 더</div>
              )}
            </div>
          )}
        </div>
      </button>
    </section>
  );
}

// ============ 이번 주 (해당 주만) ============
function CurrentWeek({ week, entries, today, categories, openDate }) {
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const weekEntries = week.map(d => ({ d, entry: entries[formatKey(d)] })).filter(x => x.entry);
  const allTasks = weekEntries.flatMap(x => x.entry.tasks || []);
  const pendingCount = allTasks.filter(t => !t.done).length;
  const weatherEmojis = weekEntries.map(x => x.entry.weather?.emoji).filter(Boolean);
  const moodEmojis = weekEntries.map(x => x.entry.mood?.emoji).filter(Boolean);

  return (
    <div style={{ background: 'rgba(255,255,255,0.3)', borderRadius: '10px', padding: '1.2rem', border: '1px solid rgba(44,31,21,0.12)' }}>
      {/* 주 요약 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem', flexWrap: 'wrap', fontSize: '0.72rem', color: '#8B6F56' }}>
        {weatherEmojis.length > 0 && <span style={{ fontSize: '0.95rem' }}>{weatherEmojis.join('')}</span>}
        {moodEmojis.length > 0 && <span style={{ fontSize: '0.95rem' }}>{moodEmojis.join('')}</span>}
        {pendingCount > 0 && <span style={{ fontStyle: 'italic' }}>· 남은 할 일 {pendingCount}</span>}
        {weatherEmojis.length === 0 && moodEmojis.length === 0 && pendingCount === 0 && (
          <span style={{ fontStyle: 'italic' }}>이번 주에 아직 기록이 없어요</span>
        )}
      </div>

      {/* 7일 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.4rem' }}>
        {week.map((date, i) => {
          const entry = entries[formatKey(date)];
          const future = date > todayStart;
          const isTodayCell = formatKey(date) === formatKey(today);
          const hasAny = entry && (entry.mood || entry.weather || (entry.tasks && entry.tasks.length > 0));
          const dayOfWeek = date.getDay();
          const totalTasks = entry?.tasks?.length || 0;
          const doneTasks = (entry?.tasks || []).filter(t => t.done).length;

          return (
            <button key={i} onClick={(e) => !future && openDate(date, e)} disabled={future} className="week-card"
              style={{
                background: isTodayCell ? 'rgba(44,31,21,0.08)' : 'rgba(255,255,255,0.5)',
                border: isTodayCell ? '1.5px solid #2C1F15' : '1px solid rgba(44,31,21,0.12)',
                borderRadius: '6px', padding: '0.5rem 0.3rem',
                cursor: future ? 'default' : 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem',
                minHeight: '110px', fontFamily: 'inherit', color: '#2C1F15', opacity: future ? 0.4 : 1,
              }}>
              <div style={{ fontSize: '0.6rem', color: dayOfWeek === 0 ? '#C07B6C' : dayOfWeek === 6 ? '#6B8AA8' : '#8B6F56', letterSpacing: '0.1em', fontWeight: 600 }}>{DAY_SHORT[dayOfWeek]}</div>
              <div className="display-font" style={{ fontSize: '1.1rem', fontStyle: isTodayCell ? 'italic' : 'normal', fontWeight: isTodayCell ? 600 : 400, lineHeight: 1 }}>{date.getDate()}</div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px', flex: 1, justifyContent: 'center' }}>
                {entry?.weather && <span style={{ fontSize: '1rem', lineHeight: 1 }}>{entry.weather.emoji}</span>}
                {entry?.mood && <span style={{ fontSize: '1rem', lineHeight: 1 }}>{entry.mood.emoji}</span>}
                {!hasAny && !future && <span style={{ fontSize: '0.7rem', color: 'rgba(139,111,86,0.4)' }}>·</span>}
              </div>

              {totalTasks > 0 && (<div style={{ fontSize: '0.6rem', color: '#8B6F56', letterSpacing: '0.05em' }}>{doneTasks}/{totalTasks}</div>)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============ 기분 그래프 ============
function MoodChart({ calYear, calMNum, daysIn, getEntry }) {
  const dataPoints = [];
  for (let d = 1; d <= daysIn; d++) {
    const entry = getEntry(d);
    if (entry?.mood?.score) dataPoints.push({ day: d, score: entry.mood.score, mood: entry.mood });
  }
  const hasData = dataPoints.length > 0;
  const scores = dataPoints.map(p => p.score);
  const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartWidth = 640;
  const chartHeight = 200;
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;

  const xForDay = (day) => padding.left + ((day - 1) / Math.max(daysIn - 1, 1)) * plotWidth;
  const yForScore = (score) => padding.top + ((5 - score) / 4) * plotHeight;

  let path = '';
  if (dataPoints.length > 0) {
    path = `M ${xForDay(dataPoints[0].day)} ${yForScore(dataPoints[0].score)}`;
    for (let i = 1; i < dataPoints.length; i++) {
      path += ` L ${xForDay(dataPoints[i].day)} ${yForScore(dataPoints[i].score)}`;
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <h2 className="display-font" style={{ fontSize: '1rem', fontStyle: 'italic', margin: 0, fontWeight: 400 }}>{MONTH_EN[calMNum]} 기분 그래프</h2>
        <div style={{ flex: 1, height: '1px', background: 'rgba(44,31,21,0.18)' }}></div>
        {hasData && (<span className="display-font" style={{ fontSize: '0.75rem', color: '#8B6F56', fontStyle: 'italic' }}>평균 {avg.toFixed(1)} / 5</span>)}
      </div>

      {!hasData ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#8B6F56', fontSize: '0.9rem', fontStyle: 'italic', background: 'rgba(255,255,255,0.25)', borderRadius: '10px' }}>
          이번 달엔 아직 기분 기록이 없어요.
        </div>
      ) : (
        <div style={{ background: 'rgba(255,255,255,0.3)', borderRadius: '10px', padding: '1rem', border: '1px solid rgba(44,31,21,0.1)' }}>
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
            {MOODS.slice().reverse().map((m) => {
              const y = yForScore(m.score);
              return (
                <g key={m.score}>
                  <line x1={padding.left} y1={y} x2={chartWidth - padding.right} y2={y} stroke="rgba(44,31,21,0.08)" strokeWidth="1" strokeDasharray="2,4" />
                  <text x={padding.left - 8} y={y + 5} textAnchor="end" fontSize="12">{m.emoji}</text>
                </g>
              );
            })}
            {[1, Math.ceil(daysIn / 4), Math.ceil(daysIn / 2), Math.ceil(3 * daysIn / 4), daysIn].map(day => (
              <text key={day} x={xForDay(day)} y={chartHeight - 8} textAnchor="middle" fontSize="10" fill="#8B6F56">{day}</text>
            ))}
            <path d={path} fill="none" stroke="#2C1F15" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" />
            {dataPoints.map((p, i) => (
              <circle key={i} cx={xForDay(p.day)} cy={yForScore(p.score)} r="6" fill={p.mood.color} stroke="#FFFDF5" strokeWidth="2" />
            ))}
          </svg>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.65rem', color: '#8B6F56', padding: '0 0.5rem' }}>
            {MOODS.map(m => (
              <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: m.color }}></span>
                <span style={{ fontSize: '0.6rem' }}>{m.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============ 상세 뷰 ============
function DetailView({ date, entries, categories, today, onBack, onNavigate, patchEntry, openCatManager }) {
  const key = formatKey(date);
  const entry = entries[key] || { tasks: [], diary: '', mood: null, weather: null, photos: [] };
  const [newTask, setNewTask] = useState('');
  const [newTaskCat, setNewTaskCat] = useState(null); // 카테고리 id
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const addTask = () => {
    const t = newTask.trim();
    if (!t) return;
    patchEntry({ tasks: [...(entry.tasks || []), { id: Date.now(), text: t, done: false, categoryId: newTaskCat }] });
    setNewTask('');
  };
  const toggleTask = (id) => patchEntry({ tasks: entry.tasks.map(t => t.id === id ? { ...t, done: !t.done } : t) });
  const deleteTask = (id) => patchEntry({ tasks: entry.tasks.filter(t => t.id !== id) });
  const changeCat = (id, catId) => patchEntry({ tasks: entry.tasks.map(t => t.id === id ? { ...t, categoryId: catId } : t) });

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      const resized = await Promise.all(files.map(f => resizeImage(f)));
      const newPhotos = resized.map(data => ({ id: Date.now() + Math.random(), data }));
      patchEntry({ photos: [...(entry.photos || []), ...newPhotos] });
    } catch (err) { alert('사진 불러오기 실패'); }
    setUploading(false);
    e.target.value = '';
  };
  const deletePhoto = (id) => patchEntry({ photos: entry.photos.filter(p => p.id !== id) });

  const doneCount = (entry.tasks || []).filter(t => t.done).length;
  const totalCount = (entry.tasks || []).length;

  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const canGoNext = addDays(date, 1) <= todayStart;

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto' }}>

      <button onClick={onBack}
        style={{ background: 'rgba(255,255,255,0.4)', border: '1px solid rgba(44,31,21,0.25)', padding: '0.4rem 1rem', fontSize: '0.8rem', color: '#2C1F15', cursor: 'pointer', borderRadius: '2px', letterSpacing: '0.05em', marginBottom: '2rem' }}>
        ← 달력으로
      </button>

      {/* 날짜 헤더 + 좌우 네비게이션 */}
      <div style={{ marginBottom: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.2rem' }}>
        <button onClick={() => onNavigate(-1)} className="nav-arrow" aria-label="이전 날">‹</button>

        <div style={{ textAlign: 'center', flex: '0 1 auto' }}>
          <div className="display-font" style={{ fontSize: '0.85rem', letterSpacing: '0.2em', color: '#8B6F56', fontStyle: 'italic', marginBottom: '0.5rem' }}>
            {DAYS_KR[date.getDay()]}
          </div>
          <h1 className="display-font" style={{ fontSize: 'clamp(2.4rem, 7vw, 3.6rem)', fontWeight: 400, margin: 0, lineHeight: 1.05, fontStyle: 'italic', letterSpacing: '-0.02em' }}>
            {date.getMonth() + 1}月 {date.getDate()}日
          </h1>
          <div className="display-font" style={{ fontSize: '0.95rem', color: '#8B6F56', marginTop: '0.4rem', letterSpacing: '0.2em' }}>
            {date.getFullYear()}
          </div>
        </div>

        <button onClick={() => onNavigate(1)} disabled={!canGoNext} className="nav-arrow" aria-label="다음 날">›</button>
      </div>

      <section style={{ marginBottom: '2.5rem' }}>
        <SectionTitle>오늘의 날씨</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem' }}>
          {WEATHERS.map(w => {
            const sel = entry.weather?.label === w.label;
            return (
              <button key={w.label} onClick={() => patchEntry({ weather: sel ? null : w })} className="chip"
                style={{
                  background: sel ? `${w.color}33` : 'rgba(255,255,255,0.3)',
                  border: sel ? `1.5px solid ${w.color}` : '1px solid rgba(44,31,21,0.18)',
                  padding: '0.9rem 0.3rem', cursor: 'pointer', borderRadius: '8px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem',
                }}>
                <span style={{ fontSize: '1.7rem', lineHeight: 1 }}>{w.emoji}</span>
                <span style={{ fontSize: '0.68rem', color: '#2C1F15' }}>{w.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <SectionTitle>오늘의 기분</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem' }}>
          {MOODS.map(m => {
            const sel = entry.mood?.label === m.label;
            return (
              <button key={m.label} onClick={() => patchEntry({ mood: sel ? null : m })} className="chip"
                style={{
                  background: sel ? `${m.color}33` : 'rgba(255,255,255,0.3)',
                  border: sel ? `1.5px solid ${m.color}` : '1px solid rgba(44,31,21,0.18)',
                  padding: '0.9rem 0.3rem', cursor: 'pointer', borderRadius: '8px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem',
                }}>
                <span style={{ fontSize: '1.7rem', lineHeight: 1 }}>{m.emoji}</span>
                <span style={{ fontSize: '0.66rem', color: '#2C1F15', whiteSpace: 'nowrap' }}>{m.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <SectionTitle count={totalCount > 0 ? `${doneCount} / ${totalCount}` : null}>오늘의 할 일</SectionTitle>

        {/* 카테고리 선택 칩 (입력 위) */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.8rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.7rem', color: '#8B6F56', letterSpacing: '0.1em' }}>카테고리:</span>
          <button onClick={() => setNewTaskCat(null)}
            style={{
              padding: '0.25rem 0.7rem', fontSize: '0.72rem', borderRadius: '20px',
              border: newTaskCat === null ? '1.5px solid #2C1F15' : '1px solid rgba(44,31,21,0.2)',
              background: newTaskCat === null ? 'rgba(255,255,255,0.6)' : 'transparent',
              cursor: 'pointer', color: '#2C1F15',
            }}>
            없음
          </button>
          {categories.map(c => (
            <button key={c.id} onClick={() => setNewTaskCat(c.id)}
              style={{
                padding: '0.25rem 0.7rem', fontSize: '0.72rem', borderRadius: '20px',
                border: newTaskCat === c.id ? `1.5px solid #2C1F15` : '1px solid rgba(44,31,21,0.2)',
                background: newTaskCat === c.id ? c.color : c.color + '55',
                cursor: 'pointer', color: '#2C1F15',
              }}>
              {c.name}
            </button>
          ))}
          <button onClick={openCatManager}
            style={{ padding: '0.25rem 0.6rem', fontSize: '0.72rem', borderRadius: '20px', border: '1px dashed rgba(44,31,21,0.3)', background: 'transparent', cursor: 'pointer', color: '#8B6F56' }}>
            + 관리
          </button>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          {(entry.tasks || []).length === 0 && (
            <div style={{ color: '#8B6F56', fontSize: '0.85rem', fontStyle: 'italic', padding: '0.5rem 0.3rem' }}>
              아래에 추가해 보세요.
            </div>
          )}
          {(entry.tasks || []).map(t => {
            const cat = categories.find(c => c.id === t.categoryId);
            return (
              <div key={t.id} className="task-row" style={{
                display: 'flex', alignItems: 'center', gap: '0.7rem',
                padding: '0.5rem 0.7rem', marginBottom: '0.3rem',
                background: cat ? cat.color + '99' : 'rgba(255,255,255,0.3)',
                borderRadius: '6px',
                borderLeft: cat ? `3px solid ${cat.color}` : '3px solid rgba(44,31,21,0.15)',
              }}>
                <button onClick={() => toggleTask(t.id)} aria-label="toggle"
                  style={{ width: '20px', height: '20px', border: '1.5px solid #2C1F15', background: t.done ? '#2C1F15' : 'transparent', cursor: 'pointer', flexShrink: 0, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '3px' }}>
                  {t.done && <span style={{ color: '#F5EFE0', fontSize: '0.72rem', lineHeight: 1 }}>✓</span>}
                </button>
                <span style={{ flex: 1, textDecoration: t.done ? 'line-through' : 'none', color: t.done ? '#8B6F56' : '#2C1F15', fontSize: '0.95rem' }}>{t.text}</span>

                <div className="task-actions">
                  {/* 카테고리 변경 드롭다운 */}
                  <select value={t.categoryId || ''} onChange={e => changeCat(t.id, e.target.value || null)}
                    style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(44,31,21,0.2)', borderRadius: '4px', padding: '2px 6px', color: '#2C1F15', cursor: 'pointer' }}>
                    <option value="">카테고리 없음</option>
                    {categories.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
                  </select>
                  <button onClick={() => deleteTask(t.id)} aria-label="delete"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C07B6C', fontSize: '1.1rem', padding: '0 0.2rem' }}>×</button>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', borderBottom: '1px solid rgba(44,31,21,0.3)', paddingBottom: '0.3rem' }}>
          <span style={{ color: '#8B6F56', fontSize: '1.1rem' }}>+</span>
          <input className="task-input" value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTask()} placeholder="새 할 일 (Enter로 추가)"
            style={{ flex: 1, background: 'transparent', border: 'none', fontSize: '0.95rem', padding: '0.5rem 0', color: '#2C1F15' }} />
        </div>
      </section>

      <section style={{ marginBottom: '3rem' }}>
        <SectionTitle>오늘의 일기</SectionTitle>

        {(entry.photos || []).length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
            {entry.photos.map(p => (
              <div key={p.id} className="photo-wrap" style={{ position: 'relative', aspectRatio: '1', borderRadius: '6px', overflow: 'hidden', background: 'rgba(44,31,21,0.05)' }}>
                <img src={p.data} alt="" className="photo-thumb" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                <button className="photo-delete" onClick={() => deletePhoto(p.id)}
                  style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(44,31,21,0.8)', color: '#F5EFE0', border: 'none', width: '22px', height: '22px', borderRadius: '50%', cursor: 'pointer', fontSize: '0.85rem', lineHeight: 1 }}>×</button>
              </div>
            ))}
          </div>
        )}

        <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
          style={{ background: 'rgba(255,255,255,0.3)', border: '1px dashed rgba(44,31,21,0.3)', padding: '0.6rem 1rem', fontSize: '0.82rem', color: '#8B6F56', cursor: uploading ? 'wait' : 'pointer', borderRadius: '4px', marginBottom: '1rem', letterSpacing: '0.05em' }}>
          {uploading ? '불러오는 중...' : '＋ 사진 추가'}
        </button>
        <input type="file" ref={fileInputRef} accept="image/*" multiple onChange={handlePhotoUpload} style={{ display: 'none' }} />

        <textarea className="diary-area paper-lines" value={entry.diary || ''} onChange={e => patchEntry({ diary: e.target.value }, true)}
          placeholder="오늘 있었던 일, 떠오르는 생각을 적어보세요..."
          style={{ width: '100%', minHeight: '14rem', background: 'transparent', border: 'none', fontFamily: "'Gaegu', 'Gowun Batang', cursive", fontSize: '1.15rem', color: '#2C1F15', resize: 'vertical', padding: 0 }} />
      </section>

      <button onClick={onBack}
        style={{ display: 'block', margin: '3rem auto 2rem', background: 'rgba(255,255,255,0.4)', border: '1px solid rgba(44,31,21,0.25)', padding: '0.5rem 2rem', fontSize: '0.8rem', color: '#2C1F15', cursor: 'pointer', borderRadius: '2px', letterSpacing: '0.1em' }}>
        달력으로 돌아가기
      </button>
    </div>
  );
}

// ============ 카테고리 관리 모달 ============
function CategoryManager({ categories, onSave, onClose }) {
  const [list, setList] = useState(categories);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(CATEGORY_COLOR_PALETTE[0]);

  const addCat = () => {
    const n = newName.trim();
    if (!n) return;
    const newCat = { id: `cat_${Date.now()}`, name: n, color: newColor };
    setList([...list, newCat]);
    setNewName('');
    setNewColor(CATEGORY_COLOR_PALETTE[(list.length + 1) % CATEGORY_COLOR_PALETTE.length]);
  };

  const deleteCat = (id) => {
    if (!confirm('이 카테고리를 삭제하시겠어요? (이 카테고리가 지정된 할 일들은 "카테고리 없음"으로 바뀌어요)')) return;
    setList(list.filter(c => c.id !== id));
  };

  const updateCat = (id, patch) => {
    setList(list.map(c => c.id === id ? { ...c, ...patch } : c));
  };

  const saveAll = () => {
    onSave(list);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{
          background: '#FFFDF5', borderRadius: '10px', padding: '1.8rem',
          maxWidth: '480px', width: '100%', maxHeight: '80vh', overflowY: 'auto',
          boxShadow: '0 12px 40px rgba(44,31,21,0.25)',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h2 className="display-font" style={{ fontSize: '1.3rem', fontStyle: 'italic', margin: 0, fontWeight: 400 }}>할 일 카테고리</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#8B6F56' }}>×</button>
        </div>

        <div style={{ fontSize: '0.78rem', color: '#8B6F56', marginBottom: '1rem', fontStyle: 'italic' }}>
          카테고리 이름과 배경색을 자유롭게 지정하세요.
        </div>

        {/* 기존 카테고리 목록 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {list.length === 0 && (
            <div style={{ color: '#8B6F56', fontStyle: 'italic', fontSize: '0.85rem', padding: '0.5rem' }}>카테고리가 없어요. 아래에 추가해보세요.</div>
          )}
          {list.map(c => (
            <div key={c.id} style={{
              display: 'flex', alignItems: 'center', gap: '0.6rem',
              padding: '0.6rem', borderRadius: '6px',
              background: c.color + '66', border: `1px solid ${c.color}`,
            }}>
              {/* 색 선택 */}
              <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap', maxWidth: '120px' }}>
                {CATEGORY_COLOR_PALETTE.map(col => (
                  <button key={col} onClick={() => updateCat(c.id, { color: col })}
                    style={{
                      width: '18px', height: '18px', borderRadius: '50%',
                      background: col, cursor: 'pointer',
                      border: c.color === col ? '2px solid #2C1F15' : '1px solid rgba(44,31,21,0.2)',
                      padding: 0,
                    }} />
                ))}
              </div>
              <input value={c.name} onChange={e => updateCat(c.id, { name: e.target.value })}
                style={{ flex: 1, background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(44,31,21,0.15)', borderRadius: '4px', padding: '0.3rem 0.5rem', fontSize: '0.9rem', fontFamily: 'inherit', color: '#2C1F15' }} />
              <button onClick={() => deleteCat(c.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C07B6C', fontSize: '1.1rem' }}>×</button>
            </div>
          ))}
        </div>

        {/* 새로 추가 */}
        <div style={{ borderTop: '1px dashed rgba(44,31,21,0.2)', paddingTop: '1rem', marginBottom: '1.2rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#8B6F56', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.6rem' }}>새 카테고리 추가</div>
          <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
            {CATEGORY_COLOR_PALETTE.map(col => (
              <button key={col} onClick={() => setNewColor(col)}
                style={{
                  width: '24px', height: '24px', borderRadius: '50%',
                  background: col, cursor: 'pointer',
                  border: newColor === col ? '2.5px solid #2C1F15' : '1px solid rgba(44,31,21,0.2)',
                  padding: 0,
                }} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCat()}
              placeholder="카테고리 이름"
              style={{
                flex: 1, background: newColor + '55', border: `1px solid ${newColor}`,
                borderRadius: '4px', padding: '0.5rem 0.7rem', fontSize: '0.9rem', fontFamily: 'inherit', color: '#2C1F15',
              }} />
            <button onClick={addCat}
              style={{ background: '#2C1F15', color: '#FFFDF5', border: 'none', padding: '0.5rem 1rem', fontSize: '0.85rem', borderRadius: '4px', cursor: 'pointer' }}>
              추가
            </button>
          </div>
        </div>

        {/* 저장 */}
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button onClick={onClose}
            style={{ background: 'transparent', border: '1px solid rgba(44,31,21,0.2)', padding: '0.5rem 1.2rem', fontSize: '0.85rem', borderRadius: '4px', cursor: 'pointer', color: '#2C1F15' }}>
            취소
          </button>
          <button onClick={saveAll}
            style={{ background: '#2C1F15', color: '#FFFDF5', border: 'none', padding: '0.5rem 1.5rem', fontSize: '0.85rem', borderRadius: '4px', cursor: 'pointer', letterSpacing: '0.05em' }}>
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children, count }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.2rem' }}>
      <h2 className="display-font" style={{ fontSize: '1.15rem', fontStyle: 'italic', margin: 0, color: '#2C1F15', fontWeight: 400 }}>{children}</h2>
      {count && (<span className="display-font" style={{ fontSize: '0.8rem', color: '#8B6F56', fontStyle: 'italic' }}>{count}</span>)}
      <div style={{ flex: 1, height: '1px', background: 'rgba(44,31,21,0.18)' }}></div>
    </div>
  );
}
