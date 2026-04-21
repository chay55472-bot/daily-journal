import { useState, useEffect, useRef } from 'react';

const MOODS = [
  { emoji: '🌞', label: '맑음', color: '#E8A838' },
  { emoji: '⛅', label: '포근', color: '#B8A87A' },
  { emoji: '☁️', label: '흐림', color: '#9AA5B0' },
  { emoji: '🌧️', label: '우울', color: '#6B8AA8' },
  { emoji: '⚡', label: '폭풍', color: '#C07B6C' },
  { emoji: '🌈', label: '설렘', color: '#B88FB8' },
];

const DAYS_KR = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
const DAY_SHORT = ['일', '월', '화', '수', '목', '금', '토'];
const STORAGE_KEY = 'journal-entries';

const pad = (n) => String(n).padStart(2, '0');
const formatKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

function loadEntries() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (e) {
    return {};
  }
}

export default function DailyJournal() {
  const [date, setDate] = useState(new Date());
  const [entries, setEntries] = useState(loadEntries);
  const [newTask, setNewTask] = useState('');
  const [showCal, setShowCal] = useState(false);
  const [calMonth, setCalMonth] = useState(new Date());
  const saveTimer = useRef(null);

  const key = formatKey(date);
  const entry = entries[key] || { tasks: [], diary: '', mood: null };

  const commitSave = (newEntries) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newEntries));
    } catch (e) {
      console.error('Save failed', e);
    }
  };

  const saveNow = (newEntries) => {
    setEntries(newEntries);
    commitSave(newEntries);
  };

  const saveDebounced = (newEntries) => {
    setEntries(newEntries);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => commitSave(newEntries), 400);
  };

  const patchEntry = (patch, debounced = false) => {
    const nextEntry = { tasks: [], diary: '', mood: null, ...entry, ...patch };
    const next = { ...entries, [key]: nextEntry };
    (debounced ? saveDebounced : saveNow)(next);
  };

  const addTask = () => {
    const t = newTask.trim();
    if (!t) return;
    patchEntry({ tasks: [...(entry.tasks || []), { id: Date.now(), text: t, done: false }] });
    setNewTask('');
  };

  const toggleTask = (id) =>
    patchEntry({ tasks: entry.tasks.map(t => t.id === id ? { ...t, done: !t.done } : t) });

  const deleteTask = (id) =>
    patchEntry({ tasks: entry.tasks.filter(t => t.id !== id) });

  // Calendar
  const calYear = calMonth.getFullYear();
  const calMNum = calMonth.getMonth();
  const firstDay = new Date(calYear, calMNum, 1).getDay();
  const daysIn = new Date(calYear, calMNum + 1, 0).getDate();
  const today = new Date();

  const calendar = [];
  for (let i = 0; i < firstDay; i++) calendar.push(null);
  for (let d = 1; d <= daysIn; d++) calendar.push(d);

  const getMoodForDay = (d) => {
    const k = formatKey(new Date(calYear, calMNum, d));
    return entries[k]?.mood;
  };

  const doneCount = (entry.tasks || []).filter(t => t.done).length;
  const totalCount = (entry.tasks || []).length;

  return (
    <div style={{ minHeight: '100vh', background: '#F5EFE0', color: '#2C1F15', fontFamily: "'Gowun Batang', 'Fraunces', serif", padding: '2.5rem 1.5rem', position: 'relative' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,400;1,9..144,600&family=Gowun+Batang:wght@400;700&family=Gaegu:wght@300;400;700&display=swap');

        * { box-sizing: border-box; }
        body { margin: 0; }

        .grain::before {
          content: '';
          position: fixed;
          inset: 0;
          pointer-events: none;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/><feColorMatrix values='0 0 0 0 0.2 0 0 0 0 0.12 0 0 0 0 0.08 0 0 0 0.06 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
          opacity: 0.35;
          z-index: 0;
          mix-blend-mode: multiply;
        }

        .display-font { font-family: 'Fraunces', 'Gowun Batang', serif; font-variation-settings: "opsz" 144; }

        .mood-btn { transition: transform 0.2s cubic-bezier(.34,1.56,.64,1), background 0.2s, border-color 0.2s; }
        .mood-btn:hover { transform: translateY(-3px); }

        .task-row:hover .task-delete { opacity: 1; }
        .task-delete { opacity: 0; transition: opacity 0.15s; }

        .cal-cell { transition: background 0.15s; }
        .cal-cell:hover { background: rgba(44,31,21,0.08); }

        .paper-lines {
          background-image: repeating-linear-gradient(
            transparent,
            transparent 1.75rem,
            rgba(44,31,21,0.13) 1.75rem,
            rgba(44,31,21,0.13) calc(1.75rem + 1px)
          );
          line-height: 1.75rem;
        }

        .diary-area::placeholder { color: rgba(139,111,86,0.55); font-style: italic; }
        .task-input::placeholder { color: rgba(139,111,86,0.6); }
        .task-input:focus, .diary-area:focus { outline: none; }

        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .fade-up { opacity: 0; animation: fadeUp 0.55s ease-out forwards; }

        button { font-family: inherit; }
      `}</style>

      <div className="grain"></div>

      <div style={{ maxWidth: '720px', margin: '0 auto', position: 'relative', zIndex: 1 }}>

        <div className="fade-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
          <div className="display-font" style={{ fontSize: '0.85rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: '#8B6F56', fontStyle: 'italic' }}>
            daily journal
          </div>
          <button
            onClick={() => { setDate(new Date()); setCalMonth(new Date()); }}
            style={{ background: 'transparent', border: '1px solid rgba(44,31,21,0.25)', padding: '0.4rem 1rem', fontSize: '0.8rem', color: '#2C1F15', cursor: 'pointer', borderRadius: '2px', letterSpacing: '0.05em' }}
          >
            오늘로
          </button>
        </div>

        <div className="fade-up" style={{ marginBottom: '2.5rem', textAlign: 'center', animationDelay: '0.08s' }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '2rem', marginBottom: '0.3rem' }}>
            <button onClick={() => setDate(addDays(date, -1))} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.3rem', color: '#8B6F56', padding: '0.3rem 0.6rem' }}>←</button>
            <div className="display-font" style={{ fontSize: '0.85rem', letterSpacing: '0.2em', color: '#8B6F56', fontStyle: 'italic' }}>
              {DAYS_KR[date.getDay()]}
            </div>
            <button onClick={() => setDate(addDays(date, 1))} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.3rem', color: '#8B6F56', padding: '0.3rem 0.6rem' }}>→</button>
          </div>
          <h1 className="display-font" style={{ fontSize: 'clamp(3rem, 9vw, 4.5rem)', fontWeight: 400, margin: 0, lineHeight: 1.05, fontStyle: 'italic', letterSpacing: '-0.02em' }}>
            {date.getMonth() + 1}月 {date.getDate()}日
          </h1>
          <div className="display-font" style={{ fontSize: '1rem', color: '#8B6F56', marginTop: '0.6rem', letterSpacing: '0.2em' }}>
            {date.getFullYear()}
          </div>
        </div>

        <div style={{ marginBottom: '2.5rem' }}>
          <button
            onClick={() => setShowCal(!showCal)}
            style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.6rem', color: '#8B6F56', fontSize: '0.75rem', letterSpacing: '0.2em', textTransform: 'uppercase', borderTop: '1px solid rgba(44,31,21,0.18)', borderBottom: '1px solid rgba(44,31,21,0.18)' }}
          >
            {showCal ? '— 달력 접기 —' : '— 달력 펼치기 —'}
          </button>

          {showCal && (
            <div style={{ padding: '1.5rem 0.2rem', animation: 'fadeUp 0.3s ease-out' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <button onClick={() => setCalMonth(new Date(calYear, calMNum - 1, 1))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2C1F15', fontSize: '1.2rem', padding: '0.3rem 0.8rem' }}>‹</button>
                <div className="display-font" style={{ fontStyle: 'italic', fontSize: '1.1rem' }}>
                  {calYear}. {String(calMNum + 1).padStart(2, '0')}
                </div>
                <button onClick={() => setCalMonth(new Date(calYear, calMNum + 1, 1))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2C1F15', fontSize: '1.2rem', padding: '0.3rem 0.8rem' }}>›</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
                {DAY_SHORT.map((d, i) => (
                  <div key={d} style={{ textAlign: 'center', fontSize: '0.7rem', padding: '0.4rem 0', color: i === 0 ? '#C07B6C' : i === 6 ? '#6B8AA8' : '#8B6F56', letterSpacing: '0.1em' }}>{d}</div>
                ))}
                {calendar.map((d, i) => {
                  if (d === null) return <div key={i}></div>;
                  const mood = getMoodForDay(d);
                  const isToday = d === today.getDate() && calMNum === today.getMonth() && calYear === today.getFullYear();
                  const isSel = d === date.getDate() && calMNum === date.getMonth() && calYear === date.getFullYear();
                  return (
                    <button
                      key={i}
                      className="cal-cell"
                      onClick={() => setDate(new Date(calYear, calMNum, d))}
                      style={{
                        aspectRatio: '1',
                        background: isSel ? '#2C1F15' : 'transparent',
                        border: 'none',
                        fontSize: '0.9rem',
                        position: 'relative',
                        padding: 0,
                        cursor: 'pointer',
                        color: isSel ? '#F5EFE0' : '#2C1F15',
                        fontStyle: isToday ? 'italic' : 'normal',
                        fontWeight: isToday ? 600 : 400,
                      }}
                    >
                      {d}
                      {mood && !isSel && (
                        <div style={{ position: 'absolute', bottom: '4px', left: '50%', transform: 'translateX(-50%)', width: '5px', height: '5px', borderRadius: '50%', background: mood.color }}></div>
                      )}
                      {isToday && !isSel && (
                        <div style={{ position: 'absolute', top: '3px', right: '4px', width: '4px', height: '4px', borderRadius: '50%', background: '#C07B6C' }}></div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <section className="fade-up" style={{ marginBottom: '3rem', animationDelay: '0.16s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.2rem' }}>
            <h2 className="display-font" style={{ fontSize: '1.15rem', fontStyle: 'italic', margin: 0, color: '#2C1F15', fontWeight: 400 }}>오늘의 기분</h2>
            <div style={{ flex: 1, height: '1px', background: 'rgba(44,31,21,0.18)' }}></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.5rem' }}>
            {MOODS.map((m) => {
              const sel = entry.mood?.label === m.label;
              return (
                <button
                  key={m.label}
                  onClick={() => patchEntry({ mood: sel ? null : m })}
                  className="mood-btn"
                  style={{
                    background: sel ? `${m.color}22` : 'transparent',
                    border: sel ? `1.5px solid ${m.color}` : '1px solid rgba(44,31,21,0.18)',
                    padding: '0.9rem 0.3rem',
                    cursor: 'pointer',
                    borderRadius: '2px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <span style={{ fontSize: '1.7rem', lineHeight: 1 }}>{m.emoji}</span>
                  <span style={{ fontSize: '0.72rem', color: '#2C1F15', letterSpacing: '0.05em' }}>{m.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="fade-up" style={{ marginBottom: '3rem', animationDelay: '0.24s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.2rem' }}>
            <h2 className="display-font" style={{ fontSize: '1.15rem', fontStyle: 'italic', margin: 0, color: '#2C1F15', fontWeight: 400 }}>할 일</h2>
            {totalCount > 0 && (
              <span className="display-font" style={{ fontSize: '0.8rem', color: '#8B6F56', fontStyle: 'italic' }}>
                {doneCount} / {totalCount}
              </span>
            )}
            <div style={{ flex: 1, height: '1px', background: 'rgba(44,31,21,0.18)' }}></div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '1rem' }}>
            {(entry.tasks || []).length === 0 && (
              <div style={{ color: '#8B6F56', fontSize: '0.85rem', fontStyle: 'italic', padding: '0.5rem 0.3rem' }}>
                아직 할 일이 없어요. 아래에 추가해 보세요.
              </div>
            )}
            {(entry.tasks || []).map(t => (
              <div key={t.id} className="task-row" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.6rem 0.2rem', borderBottom: '1px dashed rgba(44,31,21,0.15)' }}>
                <button
                  onClick={() => toggleTask(t.id)}
                  aria-label="toggle"
                  style={{ width: '20px', height: '20px', border: '1.5px solid #2C1F15', background: t.done ? '#2C1F15' : 'transparent', cursor: 'pointer', flexShrink: 0, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '3px' }}
                >
                  {t.done && <span style={{ color: '#F5EFE0', fontSize: '0.72rem', lineHeight: 1 }}>✓</span>}
                </button>
                <span style={{ flex: 1, textDecoration: t.done ? 'line-through' : 'none', color: t.done ? '#8B6F56' : '#2C1F15', fontSize: '0.95rem' }}>{t.text}</span>
                <button
                  className="task-delete"
                  onClick={() => deleteTask(t.id)}
                  aria-label="delete"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C07B6C', fontSize: '1.1rem', padding: '0 0.4rem' }}
                >×</button>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', borderBottom: '1px solid rgba(44,31,21,0.3)', paddingBottom: '0.3rem' }}>
            <span style={{ color: '#8B6F56', fontSize: '1.1rem' }}>+</span>
            <input
              className="task-input"
              value={newTask}
              onChange={e => setNewTask(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTask()}
              placeholder="새 할 일 (Enter로 추가)"
              style={{ flex: 1, background: 'transparent', border: 'none', fontSize: '0.95rem', padding: '0.5rem 0', color: '#2C1F15' }}
            />
          </div>
        </section>

        <section className="fade-up" style={{ marginBottom: '3rem', animationDelay: '0.32s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.2rem' }}>
            <h2 className="display-font" style={{ fontSize: '1.15rem', fontStyle: 'italic', margin: 0, color: '#2C1F15', fontWeight: 400 }}>오늘의 일기</h2>
            <div style={{ flex: 1, height: '1px', background: 'rgba(44,31,21,0.18)' }}></div>
          </div>

          <textarea
            className="diary-area paper-lines"
            value={entry.diary || ''}
            onChange={e => patchEntry({ diary: e.target.value }, true)}
            placeholder="오늘 있었던 일, 떠오르는 생각을 적어보세요..."
            style={{ width: '100%', minHeight: '14rem', background: 'transparent', border: 'none', fontFamily: "'Gaegu', 'Gowun Batang', cursive", fontSize: '1.15rem', color: '#2C1F15', resize: 'vertical', padding: 0 }}
          />
        </section>

        <div className="display-font" style={{ textAlign: 'center', marginTop: '4rem', paddingTop: '2rem', borderTop: '1px solid rgba(44,31,21,0.15)', fontSize: '0.75rem', color: '#8B6F56', fontStyle: 'italic', letterSpacing: '0.2em' }}>
          ⟡ today is a page in your story ⟡
        </div>

      </div>
    </div>
  );
}
