/* ============================================
   DASHBOARD — el estudiante
   ============================================ */

const STUDENT = {
  name: 'Lía',
  glyph: '☽',
  sign: 'Luna en Piscis',
  nextSession: { day: 'MIÉ', date: '6 MAY', time: '19:00', course: 'Tarot iniciático', module: 'III · Las tiradas' },
  enrolled: [
    { num: 'I', tag: 'Tarot · Iniciación', title: 'El loco emprende camino', maestra: 'Sol Mayor', progress: 78, lastSeen: 'hace 2 días', moon: '◐', module: 'IV · El sostén ético', sessionsDone: 14, sessionsTotal: 18 },
    { num: 'II', tag: 'Astrología · Maestría', title: 'Cartografía del alma', maestra: 'Luz Marini', progress: 32, lastSeen: 'hace 1 semana', moon: '○', module: 'II · Casas y planetas', sessionsDone: 6, sessionsTotal: 18 },
    { num: 'III', tag: 'Herbalismo · 1 día', title: 'Simples para el invierno', maestra: 'Mara Iturri', progress: 100, lastSeen: 'completado', moon: '●', module: 'Cerrado · MMXXV', sessionsDone: 4, sessionsTotal: 4 },
  ],
  lunarPhase: { name: 'Cuarto creciente', icon: '◐', date: '4 mayo', desc: 'Tiempo de afirmar lo iniciado. Día propicio para sostener intenciones.' },
  bitacora: [
    { date: '28 ABR', glyph: '✦', title: 'Sobre las cartas que no hablan', preview: 'Hoy salió la luna del revés y me quedé mirando el espejo...' },
    { date: '24 ABR', glyph: '☾', title: 'Primer círculo de práctica', preview: 'Sostener una consulta es como sostener una respiración compartida.' },
    { date: '19 ABR', glyph: '☉', title: 'Eclipse en Tauro · notas', preview: 'Lo que toca este eclipse no se va a poder esquivar.' },
  ],
  proximas: [
    { day: '06', mes: 'MAY', title: 'Las tiradas · sesión live', course: 'Tarot iniciático', tipo: 'Live · 90min' },
    { day: '11', mes: 'MAY', title: 'Plenilunio en Escorpio', course: 'Encuentro abierto', tipo: 'Ritual · 60min' },
    { day: '13', mes: 'MAY', title: 'Casas y planetas · sesión live', course: 'Cartografía del alma', tipo: 'Live · 90min' },
    { day: '20', mes: 'MAY', title: 'Círculo de práctica abierto', course: 'Comunidad', tipo: 'Encuentro · 90min' },
  ],
  circulo: [
    { name: 'Joaquín R.', glyph: '♃', text: 'Compartí la tirada que hice ayer. Necesito otros ojos.' },
    { name: 'Camila V.', glyph: '♀', text: '¿Alguien usa el Marsella restaurado? Estoy entre dos ediciones.' },
    { name: 'Tomás A.', glyph: '♂', text: 'Subí mis notas del módulo II por si sirven al círculo.' },
  ],
};

/* SVG progress ring */
const Ring = ({ value, size = 72 }) => {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="ring">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--line-strong)" strokeWidth="2" opacity="0.4"/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--gold)" strokeWidth="2"
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}/>
      <text x={size/2} y={size/2 + 1} textAnchor="middle" dominantBaseline="middle"
        fill="var(--ink)" fontFamily="var(--font-display)" fontSize="14" letterSpacing="0.5">{value}<tspan fontSize="9" dy="-3">%</tspan></text>
    </svg>
  );
};

const Dashboard = () => (
  <div className="db">
    <div className="chrome">
      <div className="chrome-dots"><span></span><span></span><span></span></div>
      <div className="chrome-bar">◐ humanohumano.holistic / mi-camino</div>
    </div>
    <Nav active="cursos"/>

    {/* HEADER salutación */}
    <header className="db-head">
      <div className="db-head-left">
        <div className="cd-eyebrow">— EL UMBRAL DE TU CAMINO —</div>
        <h1>Bienvenida de vuelta, <em>{STUDENT.name}</em></h1>
        <div className="db-head-meta">
          <span>{STUDENT.glyph} {STUDENT.sign}</span>
          <span className="sep">·</span>
          <span>Día solar {Math.floor(Math.random()*30)+1} de tu camino</span>
        </div>
      </div>
      <div className="db-moon">
        <div className="db-moon-icon">{STUDENT.lunarPhase.icon}</div>
        <div className="db-moon-text">
          <div className="lbl">HOY · {STUDENT.lunarPhase.date}</div>
          <div className="name">{STUDENT.lunarPhase.name}</div>
          <div className="desc">{STUDENT.lunarPhase.desc}</div>
        </div>
      </div>
    </header>

    {/* NEXT SESSION strip */}
    <section className="db-next">
      <div className="db-next-left">
        <div className="lbl">PRÓXIMA SESIÓN EN VIVO</div>
        <h3>{STUDENT.nextSession.course}</h3>
        <div className="mod">{STUDENT.nextSession.module}</div>
      </div>
      <div className="db-next-date">
        <span className="day">{STUDENT.nextSession.day}</span>
        <span className="num">{STUDENT.nextSession.date}</span>
        <span className="time">{STUDENT.nextSession.time}</span>
      </div>
      <div className="db-next-cta">
        <a className="btn btn-primary">Entrar a la sala ↦</a>
        <span className="rem">Faltan <em>2 días</em></span>
      </div>
    </section>

    {/* GRID 2-col main */}
    <div className="db-grid">
      <main className="db-main">
        {/* Cursos en curso */}
        <section className="db-section">
          <div className="db-section-head">
            <h2>Tu camino actual</h2>
            <a className="btn-link">Ver todos</a>
          </div>
          <div className="db-courses">
            {STUDENT.enrolled.map((c, i) => (
              <article className={`db-course ${c.progress === 100 ? 'done' : ''}`} key={i}>
                <div className="db-course-num">
                  <span className="roman">{c.num}</span>
                  <span className="moon">{c.moon}</span>
                </div>
                <div className="db-course-body">
                  <div className="tag">{c.tag} · {c.maestra}</div>
                  <h4>{c.title}</h4>
                  <div className="mod">{c.module}</div>
                  <div className="meta">
                    <span>{c.sessionsDone}/{c.sessionsTotal} sesiones</span>
                    <span className="sep">·</span>
                    <span>{c.lastSeen}</span>
                  </div>
                </div>
                <div className="db-course-ring">
                  <Ring value={c.progress}/>
                  {c.progress < 100 && <a className="btn-link continue">Continuar ↦</a>}
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Bitácora */}
        <section className="db-section">
          <div className="db-section-head">
            <h2>Tu bitácora</h2>
            <a className="btn-link">Escribir entrada +</a>
          </div>
          <div className="db-bitacora">
            {STUDENT.bitacora.map((e, i) => (
              <article className="db-entry" key={i}>
                <div className="db-entry-glyph">{e.glyph}</div>
                <div className="db-entry-body">
                  <div className="db-entry-date">{e.date}</div>
                  <h4>{e.title}</h4>
                  <p>{e.preview}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <aside className="db-aside">
        {/* Calendario próximas */}
        <section className="db-card">
          <div className="db-card-head">
            <h3>Próximos encuentros</h3>
            <span className="cd-eyebrow small">CALENDARIO</span>
          </div>
          <div className="db-cal">
            {STUDENT.proximas.map((e, i) => (
              <div className="db-cal-item" key={i}>
                <div className="db-cal-date">
                  <span className="d">{e.day}</span>
                  <span className="m">{e.mes}</span>
                </div>
                <div className="db-cal-body">
                  <h5>{e.title}</h5>
                  <div className="meta">{e.course}<span className="sep">·</span>{e.tipo}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Círculo */}
        <section className="db-card db-circulo">
          <div className="db-card-head">
            <h3>El círculo</h3>
            <span className="cd-eyebrow small">3 NUEVOS</span>
          </div>
          <div className="db-circle-list">
            {STUDENT.circulo.map((c, i) => (
              <div className="db-circle-item" key={i}>
                <div className="db-circle-glyph">{c.glyph}</div>
                <div>
                  <strong>{c.name}</strong>
                  <p>{c.text}</p>
                </div>
              </div>
            ))}
          </div>
          <a className="btn btn-ghost db-circle-cta">Entrar al círculo</a>
        </section>

        {/* Recomendado */}
        <section className="db-card db-reco">
          <div className="cd-eyebrow small">QUIZÁS TE LLAME</div>
          <h3>Plenilunio en Escorpio</h3>
          <p>Encuentro abierto · 23 de mayo · con Sol Mayor.<br/>Para quienes ya cruzaron el primer umbral.</p>
          <a className="btn-link">Inscribirme ↦</a>
        </section>
      </aside>
    </div>

    <Foot/>
  </div>
);

window.Dashboard = Dashboard;

/* ============================================
   MOBILE
   ============================================ */
const MobileDashboard = () => (
  <div className="phone">
    <div className="phone-status">
      <span>21:08</span>
      <span className="right">✦ ◐ ▮</span>
    </div>
    <div className="phone-content">
      <div className="m-nav">
        <span className="m-back">☰ Mi camino</span>
        <div className="m-menu"><span></span><span></span></div>
      </div>

      <header className="m-db-head">
        <div className="cd-eyebrow">— EL UMBRAL —</div>
        <h1>Bienvenida, <em>{STUDENT.name}</em></h1>
        <div className="meta">{STUDENT.glyph} {STUDENT.sign}</div>
        <div className="m-db-moon">
          <span className="ic">{STUDENT.lunarPhase.icon}</span>
          <div>
            <strong>{STUDENT.lunarPhase.name}</strong>
            <span>HOY · {STUDENT.lunarPhase.date}</span>
          </div>
        </div>
      </header>

      <div className="m-db-next">
        <div className="lbl">PRÓXIMA SESIÓN</div>
        <h3>{STUDENT.nextSession.course}</h3>
        <div className="when">{STUDENT.nextSession.day} {STUDENT.nextSession.date} · {STUDENT.nextSession.time}</div>
        <a className="btn btn-primary">Entrar a la sala ↦</a>
      </div>

      <section className="m-db-section">
        <div className="cd-divider">
          <span className="line"></span>
          <span className="symbol">TU CAMINO</span>
          <span className="line"></span>
        </div>
        {STUDENT.enrolled.map((c, i) => (
          <div className="m-db-course" key={i}>
            <Ring value={c.progress} size={48}/>
            <div className="body">
              <div className="tag">{c.tag}</div>
              <h4>{c.title}</h4>
              <div className="mod">{c.module}</div>
            </div>
          </div>
        ))}
      </section>

      <section className="m-db-section">
        <div className="cd-divider">
          <span className="line"></span>
          <span className="symbol">PRÓXIMOS</span>
          <span className="line"></span>
        </div>
        {STUDENT.proximas.slice(0, 3).map((e, i) => (
          <div className="m-db-cal" key={i}>
            <div className="date"><span className="d">{e.day}</span><span className="m">{e.mes}</span></div>
            <div className="body">
              <h5>{e.title}</h5>
              <div>{e.tipo}</div>
            </div>
          </div>
        ))}
      </section>

      <div className="m-foot">✦ MMXXVI · HUMANO · HUMANO</div>
    </div>
  </div>
);

window.MobileDashboard = MobileDashboard;
