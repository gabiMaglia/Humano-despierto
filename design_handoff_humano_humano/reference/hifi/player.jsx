/* ============================================
   REPRODUCTOR DE LECCIÓN
   ============================================ */

const LESSON = {
  course: 'Tarot iniciático',
  courseNum: 'II',
  module: 'III · Las tiradas',
  lessonNum: 'VII',
  title: 'La cruz celta como mapa del alma',
  maestra: 'Sol Mayor',
  duration: '52:18',
  current: '24:36',
  progress: 0.47,
  date: '24 abr MMXXVI',
  modules: [
    { num: 'I', title: 'El loco emprende camino', lessons: 4, current: false, done: true },
    { num: 'II', title: 'Los planetas y las cartas', lessons: 3, current: false, done: true },
    {
      num: 'III', title: 'Las tiradas', lessons: 5, current: true, done: false,
      lessonList: [
        { num: 'I', title: 'Tirada de tres cartas', dur: '38:12', state: 'done' },
        { num: 'II', title: 'El presente, lo oculto, el consejo', dur: '42:08', state: 'done' },
        { num: 'III', title: 'Apertura del hexagrama', dur: '46:54', state: 'done' },
        { num: 'IV', title: 'La cruz celta como mapa del alma', dur: '52:18', state: 'current' },
        { num: 'V', title: 'El árbol de la vida', dur: '64:00', state: 'locked' },
      ],
    },
    { num: 'IV', title: 'Sostener al consultante', lessons: 4, current: false, done: false, locked: true },
    { num: 'V', title: 'Síntesis y práctica final', lessons: 5, current: false, done: false, locked: true },
  ],
  notes: [
    { time: '04:12', text: 'La cruz celta no se lee — se camina. Diez estaciones, no diez respuestas.' },
    { time: '17:48', text: 'Pos. 5 (lo que está sobre): conciencia. Pos. 6 (lo que viene): no es predicción, es brotación.' },
    { time: '23:02', text: 'Sol dijo: "no preguntes qué significa la carta, preguntá qué pregunta te hace la carta a vos".' },
  ],
  resources: [
    { type: 'PDF', name: 'Mapa de la cruz celta · 10 posiciones', size: '1.2 MB' },
    { type: 'AUDIO', name: 'Meditación previa a la consulta', size: '14:08' },
    { type: 'TEXTO', name: 'Bibliografía · Jodorowsky cap. IV', size: '8 págs' },
  ],
  chapters: [
    { time: '00:00', label: 'Apertura · ritual de entrada', t: 0 },
    { time: '04:30', label: 'Las diez posiciones, una por una', t: 0.085 },
    { time: '18:20', label: 'Cómo leer las relaciones entre cartas', t: 0.35 },
    { time: '32:00', label: 'Dos consultas reales en grupo', t: 0.61 },
    { time: '46:10', label: 'Cierre · qué llevarse a la práctica', t: 0.88 },
  ],
};

const Player = () => {
  const [activeTab, setActiveTab] = React.useState('notas');

  return (
    <div className="pl">
      <div className="chrome">
        <div className="chrome-dots"><span></span><span></span><span></span></div>
        <div className="chrome-bar">◐ humanohumano.holistic / cursos / tarot-iniciatico / lección VII</div>
      </div>

      {/* Top bar */}
      <header className="pl-top">
        <a className="pl-back">← {LESSON.course}</a>
        <div className="pl-trail">
          <span>{LESSON.courseNum}</span>
          <span className="dot">·</span>
          <span>{LESSON.module}</span>
          <span className="dot">·</span>
          <span className="now">Lección {LESSON.lessonNum}</span>
        </div>
        <div className="pl-pace">
          <span className="pulse"></span>
          Cohorte XII
        </div>
      </header>

      <div className="pl-grid">
        {/* MAIN */}
        <main className="pl-main">
          {/* Video stage */}
          <div className="pl-stage">
            <div className="pl-stage-bg">
              <div className="pl-stars"></div>
              <div className="pl-card-spread">
                {/* 10 cards in a celtic cross */}
                {[
                  {x:50, y:50, r:0, glow:true},
                  {x:50, y:50, r:90, glow:true},
                  {x:50, y:18, r:0},
                  {x:50, y:82, r:0},
                  {x:18, y:50, r:0},
                  {x:82, y:50, r:0},
                  {x:90, y:18, r:0},
                  {x:90, y:42, r:0},
                  {x:90, y:66, r:0},
                  {x:90, y:90, r:0},
                ].map((c, i) => (
                  <div className={`pl-card ${c.glow ? 'glow' : ''}`} key={i} style={{
                    left: `${c.x}%`, top: `${c.y}%`,
                    transform: `translate(-50%, -50%) rotate(${c.r}deg)`
                  }}>
                    <div className="pl-card-inner">
                      <div className="pl-card-num">{['I','II','III','IV','V','VI','VII','VIII','IX','X'][i]}</div>
                      <div className="pl-card-glyph">{['☉','☽','♀','♂','♃','♄','♅','♆','♇','✦'][i]}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="pl-stage-vignette"></div>
            </div>

            <div className="pl-stage-overlay">
              <div className="pl-eyebrow">EN VIVO HACE 4 DÍAS · GRABADO</div>
              <h1>{LESSON.title}</h1>
              <div className="pl-meta">
                <span>{LESSON.maestra}</span>
                <span className="dot">·</span>
                <span>{LESSON.module}</span>
                <span className="dot">·</span>
                <span>{LESSON.duration}</span>
              </div>
            </div>

            <button className="pl-play">
              <svg viewBox="0 0 24 24"><path d="M6 4 L20 12 L6 20 Z" fill="currentColor"/></svg>
            </button>
          </div>

          {/* Controls strip */}
          <div className="pl-controls">
            <div className="pl-time">
              <span className="now">{LESSON.current}</span>
              <span className="sep">/</span>
              <span className="total">{LESSON.duration}</span>
            </div>

            <div className="pl-scrubber">
              <div className="pl-scrub-track">
                <div className="pl-scrub-fill" style={{width: `${LESSON.progress * 100}%`}}></div>
                <div className="pl-scrub-handle" style={{left: `${LESSON.progress * 100}%`}}></div>
                {LESSON.chapters.map((c, i) => (
                  <div className="pl-chapter-mark" key={i} style={{left: `${c.t * 100}%`}}>
                    <span className="tip">{c.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pl-actions">
              <button className="pl-icon" title="Marcar momento">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M6 4 L18 4 L18 22 L12 17 L6 22 Z"/>
                </svg>
              </button>
              <button className="pl-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="4" y="6" width="16" height="12" rx="1"/>
                  <path d="M2 10 L4 10 M20 10 L22 10 M2 14 L4 14 M20 14 L22 14"/>
                </svg>
              </button>
              <span className="pl-speed">1.0×</span>
            </div>
          </div>

          {/* Chapters */}
          <div className="pl-chapters">
            <div className="pl-section-head">
              <h3>Capítulos</h3>
              <span className="lbl">V SECCIONES</span>
            </div>
            {LESSON.chapters.map((c, i) => (
              <div className={`pl-chapter ${c.t <= LESSON.progress && c.t + 0.15 > LESSON.progress ? 'active' : ''}`} key={i}>
                <span className="time">{c.time}</span>
                <span className="label">{c.label}</span>
                <span className="play-mini">▸</span>
              </div>
            ))}
          </div>
        </main>

        {/* SIDE — tabs */}
        <aside className="pl-side">
          <div className="pl-tabs">
            <button className={activeTab === 'modulos' ? 'on' : ''} onClick={() => setActiveTab('modulos')}>Módulos</button>
            <button className={activeTab === 'notas' ? 'on' : ''} onClick={() => setActiveTab('notas')}>Notas</button>
            <button className={activeTab === 'recursos' ? 'on' : ''} onClick={() => setActiveTab('recursos')}>Recursos</button>
          </div>

          {activeTab === 'modulos' && (
            <div className="pl-modules">
              {LESSON.modules.map((m, i) => (
                <div className={`pl-module ${m.current ? 'current' : ''} ${m.locked ? 'locked' : ''}`} key={i}>
                  <div className="pl-module-head">
                    <span className="num">{m.num}</span>
                    <div className="title">{m.title}</div>
                    <span className="state">
                      {m.done && '✓'}
                      {m.current && '◐'}
                      {m.locked && '⌗'}
                    </span>
                  </div>
                  {m.current && m.lessonList && (
                    <div className="pl-lessons">
                      {m.lessonList.map((l, j) => (
                        <div className={`pl-lesson ${l.state}`} key={j}>
                          <span className="ic">
                            {l.state === 'done' && '✓'}
                            {l.state === 'current' && '▶'}
                            {l.state === 'locked' && '⌗'}
                          </span>
                          <span className="num">{l.num}</span>
                          <span className="t">{l.title}</span>
                          <span className="dur">{l.dur}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'notas' && (
            <div className="pl-notes">
              <div className="pl-notes-write">
                <textarea placeholder="Anotá un momento, un símbolo, una sospecha..." rows="3"></textarea>
                <div className="pl-notes-actions">
                  <span className="time-stamp">⌘ marcará en {LESSON.current}</span>
                  <button className="btn-link">Guardar</button>
                </div>
              </div>
              <div className="pl-notes-list">
                {LESSON.notes.map((n, i) => (
                  <div className="pl-note" key={i}>
                    <span className="time">{n.time}</span>
                    <p>{n.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'recursos' && (
            <div className="pl-resources">
              {LESSON.resources.map((r, i) => (
                <div className="pl-resource" key={i}>
                  <span className="type">{r.type}</span>
                  <div>
                    <div className="name">{r.name}</div>
                    <div className="size">{r.size}</div>
                  </div>
                  <span className="dl">↓</span>
                </div>
              ))}

              <div className="pl-encuentro">
                <div className="cd-eyebrow small">PRÓXIMO EN VIVO</div>
                <h4>El árbol de la vida</h4>
                <div className="when">MAR 30 abr · 19:00</div>
                <a className="btn btn-ghost">Agregar al calendario</a>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

window.Player = Player;

/* MOBILE */
const MobilePlayer = () => (
  <div className="phone">
    <div className="phone-status">
      <span>21:08</span>
      <span className="right">✦ ◐ ▮</span>
    </div>
    <div className="phone-content">
      <div className="m-pl-stage">
        <div className="m-pl-stage-bg"></div>
        <button className="m-pl-back">← Atrás</button>
        <button className="pl-play sm">
          <svg viewBox="0 0 24 24"><path d="M6 4 L20 12 L6 20 Z" fill="currentColor"/></svg>
        </button>
      </div>
      <div className="m-pl-controls">
        <div className="bar"><div className="fill" style={{width: '47%'}}></div></div>
        <div className="time"><span>{LESSON.current}</span><span>{LESSON.duration}</span></div>
      </div>
      <div className="m-pl-info">
        <div className="cd-eyebrow">— LECCIÓN VII —</div>
        <h1>{LESSON.title}</h1>
        <div className="meta">{LESSON.maestra} · {LESSON.module}</div>
      </div>
      <div className="m-pl-tabs">
        <button className="on">Notas</button>
        <button>Capítulos</button>
        <button>Recursos</button>
      </div>
      <div className="m-pl-notes">
        {LESSON.notes.slice(0,2).map((n,i) => (
          <div className="pl-note" key={i}>
            <span className="time">{n.time}</span>
            <p>{n.text}</p>
          </div>
        ))}
      </div>
      <div className="m-foot">✦ MMXXVI · HUMANO · HUMANO</div>
    </div>
  </div>
);

window.MobilePlayer = MobilePlayer;
