/* ============================================
   COMUNIDAD / CÍRCULO — Humano · Humano
   ============================================ */

const COM = {
  stats: [
    { n: 'CDXVIII', label: 'Estudiantes en órbita' },
    { n: 'XXIV', label: 'Círculos activos' },
    { n: 'IX', label: 'Maestras de planta' },
  ],
  channels: [
    { glyph: '✦', name: 'Plaza mayor', sub: 'Bienvenidas y presentaciones', n: '128 hilos', on: true },
    { glyph: '☉', name: 'Astrología', sub: 'Tránsitos en curso', n: '64 hilos' },
    { glyph: '◐', name: 'Tarot', sub: 'Tiradas y dudas', n: '92 hilos' },
    { glyph: '☘', name: 'Herbalismo', sub: 'Recetas, identificación', n: '37 hilos' },
    { glyph: '☽', name: 'Reiki & energía', sub: 'Sesiones y técnica', n: '28 hilos' },
    { glyph: '⚯', name: 'Oficio', sub: 'Cómo cobrar, cómo cuidar', n: '54 hilos' },
    { glyph: '✧', name: 'Encuentros', sub: 'Quedadas IRL', n: '15 hilos' },
  ],
  threads: [
    {
      pin: true,
      cat: 'PLAZA MAYOR',
      title: '¿Cómo se presentaron en su primer círculo?',
      excerpt: 'Las que ya pasaron por el ritual de inicio: ¿con qué llegaron, qué dejaron, qué se llevaron de vuelta?',
      author: 'Sol Mayor',
      role: 'MAESTRA',
      time: 'hace II horas',
      replies: 47,
      moon: '●',
    },
    {
      cat: 'ASTROLOGÍA',
      title: 'Plutón ingresando en Acuario — ¿lo están sintiendo?',
      excerpt: 'En lo personal noto que se removió todo lo vinculado a comunidad y al rol que juego dentro de los grupos.',
      author: 'Mariana T.',
      role: 'ESTUDIANTE · COHORTE XII',
      time: 'hace V horas',
      replies: 23,
      moon: '◐',
    },
    {
      cat: 'TAROT',
      title: 'Cuando salen tres espadas seguidas en una tirada propia',
      excerpt: 'Necesito hablarlo. Tres tiradas, tres veces el VIII de Espadas en posición central. ¿Pausa?',
      author: 'Cami R.',
      role: 'ESTUDIANTE · COHORTE XV',
      time: 'hace VIII horas',
      replies: 19,
      moon: '○',
    },
    {
      cat: 'OFICIO',
      title: 'Honorarios para una primera lectura — ¿cuánto se cobra?',
      excerpt: 'Tema espinoso pero necesario. Quería abrirlo con cuidado: ¿cómo lo trabajan ustedes con sus consultantes?',
      author: 'Inés Volpe',
      role: 'MAESTRA',
      time: 'ayer',
      replies: 86,
      moon: '◑',
    },
    {
      cat: 'HERBALISMO',
      title: 'Tintura madre de pasiflora — preparación paso a paso',
      excerpt: 'Subo el procedimiento que les compartí en el último círculo, con foto y proporciones.',
      author: 'Mara Iturri',
      role: 'MAESTRA',
      time: 'hace II días',
      replies: 12,
      moon: '○',
    },
  ],
  events: [
    { day: 'XII', month: 'MAY', title: 'Círculo de luna llena', sub: 'Encuentro abierto · Online', on: true },
    { day: 'XX', month: 'MAY', title: 'Conversatorio sobre tarot terapéutico', sub: 'Con Sol Mayor · Online' },
    { day: 'III', month: 'JUN', title: 'Quedada IRL — Buenos Aires', sub: 'Café Voltaire · 19h' },
  ],
  members: [
    { glyph: '☉', name: 'Sol Mayor', role: 'MAESTRA · TAROT', online: true },
    { glyph: '♀', name: 'Luz Marini', role: 'MAESTRA · ASTRO', online: true },
    { glyph: '☽', name: 'Mariana T.', role: 'ESTUDIANTE · XII', online: true },
    { glyph: '✦', name: 'Cami R.', role: 'ESTUDIANTE · XV', online: false },
    { glyph: '◐', name: 'Lía M.', role: 'ESTUDIANTE · XV', online: true },
    { glyph: '☘', name: 'Mara Iturri', role: 'MAESTRA · HERBAL', online: false },
  ],
  pact: [
    'Hablamos desde la experiencia, no desde la verdad.',
    'No diagnosticamos. Sugerimos, acompañamos.',
    'Lo que se comparte aquí, queda aquí.',
    'Cuidamos el silencio de quien todavía no se anima.',
  ],
};

const Comunidad = () => (
  <div className="cm">
    <div className="chrome">
      <div className="chrome-dots"><span></span><span></span><span></span></div>
      <div className="chrome-bar">◐ humanohumano.holistic / círculo</div>
    </div>
    <Nav active="circulo"/>

    <header className="cm-head">
      <div className="cd-eyebrow">— CÍRCULO PRIVADO —</div>
      <h1>Las que ya están <em>adentro</em></h1>
      <p>Un foro habitado, no una red social. Sin métricas, sin algoritmo. Solo estudiantes, maestras y tiempo lento.</p>
      <div className="cm-stats">
        {COM.stats.map((s, i) => (
          <div className="cm-stat" key={i}>
            <span className="n">{s.n}</span>
            <span className="l">{s.label}</span>
          </div>
        ))}
      </div>
    </header>

    <div className="cm-grid">
      {/* SIDEBAR — channels */}
      <aside className="cm-side-l">
        <div className="cm-side-head">
          <span className="cd-eyebrow small">CANALES</span>
          <span className="plus">+</span>
        </div>
        <nav className="cm-channels">
          {COM.channels.map((c, i) => (
            <a className={`cm-channel ${c.on ? 'on' : ''}`} key={i}>
              <span className="g">{c.glyph}</span>
              <div className="b">
                <strong>{c.name}</strong>
                <span>{c.sub}</span>
              </div>
              <span className="n">{c.n}</span>
            </a>
          ))}
        </nav>
        <div className="cm-side-foot">
          <span className="cd-eyebrow small">CÓDIGO DEL CÍRCULO</span>
          <ul className="cm-pact">
            {COM.pact.map((p, i) => (
              <li key={i}><span>{['I','II','III','IV'][i]}</span>{p}</li>
            ))}
          </ul>
        </div>
      </aside>

      {/* MAIN — feed */}
      <main className="cm-main">
        <div className="cm-feed-head">
          <div>
            <h2>Plaza mayor</h2>
            <p>Lo que se está conversando ahora mismo</p>
          </div>
          <div className="cm-feed-actions">
            <div className="cm-tabs">
              <span className="on">Recientes</span>
              <span>Sin responder</span>
              <span>Mías</span>
            </div>
            <button className="cm-new">✦ Abrir hilo</button>
          </div>
        </div>

        <div className="cm-compose">
          <div className="av">☽</div>
          <input type="text" placeholder="Compartí una pregunta, una observación, una carta que salió..."/>
          <span className="cm-compose-tools">
            <span title="adjuntar">◐</span>
            <span title="cita">"</span>
            <span title="glifo">✦</span>
          </span>
        </div>

        <div className="cm-threads">
          {COM.threads.map((t, i) => (
            <article className={`cm-thread ${t.pin ? 'pin' : ''}`} key={i}>
              {t.pin && <span className="cm-pin">★ HILO ANCLADO</span>}
              <div className="cm-thread-meta">
                <span className="cat">{t.cat}</span>
                <span className="dot">·</span>
                <span>{t.time}</span>
                <span className="moon">{t.moon}</span>
              </div>
              <h3>{t.title}</h3>
              <p>{t.excerpt}</p>
              <footer className="cm-thread-foot">
                <div className="author">
                  <span className="av">{t.author[0]}</span>
                  <div>
                    <strong>{t.author}</strong>
                    <span>{t.role}</span>
                  </div>
                </div>
                <div className="cm-thread-stats">
                  <span>↩ {t.replies} respuestas</span>
                  <span className="dot">·</span>
                  <span>♡ guardar</span>
                </div>
              </footer>
            </article>
          ))}
        </div>

        <div className="cm-load">
          <span className="line"></span>
          <a>Cargar hilos más antiguos ↓</a>
          <span className="line"></span>
        </div>
      </main>

      {/* SIDEBAR — events / online */}
      <aside className="cm-side-r">
        <section className="db-card">
          <div className="db-card-head">
            <h3>Encuentros</h3>
            <span className="cd-eyebrow small">PRÓXIMOS</span>
          </div>
          <div className="cm-events">
            {COM.events.map((e, i) => (
              <div className={`cm-event ${e.on ? 'on' : ''}`} key={i}>
                <div className="d">
                  <span className="day">{e.day}</span>
                  <span className="mo">{e.month}</span>
                </div>
                <div className="b">
                  <strong>{e.title}</strong>
                  <span>{e.sub}</span>
                </div>
              </div>
            ))}
          </div>
          <a className="btn-link">Calendario completo ↦</a>
        </section>

        <section className="db-card">
          <div className="db-card-head">
            <h3>En el círculo ahora</h3>
            <span className="cd-eyebrow small dot-on">IV ACTIVAS</span>
          </div>
          <div className="cm-members">
            {COM.members.map((m, i) => (
              <div className="cm-member" key={i}>
                <div className="av">
                  {m.glyph}
                  {m.online && <span className="ping"></span>}
                </div>
                <div>
                  <strong>{m.name}</strong>
                  <span>{m.role}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="db-card db-reco">
          <div className="cd-eyebrow small">RITUAL SEMANAL</div>
          <h3>Círculo de luna llena</h3>
          <p>Todos los plenilunios. Encendemos vela, leemos, escuchamos. Sin grabación.</p>
          <div className="cm-ritual-meta">
            <span>☾</span>Próximo: XII de mayo · 21:00
          </div>
          <a className="btn-link">Anotarme ↦</a>
        </section>
      </aside>
    </div>

    <Foot/>
  </div>
);

window.Comunidad = Comunidad;

const MobileComunidad = () => (
  <div className="phone">
    <div className="phone-status"><span>22:14</span><span className="right">✦ ◐ ▮</span></div>
    <div className="phone-content">
      <div className="m-nav"><span className="m-back">☰ Círculo</span><div className="m-menu"><span></span><span></span></div></div>

      <div className="m-cm-head">
        <div className="cd-eyebrow">— CÍRCULO —</div>
        <h1>Plaza <em>mayor</em></h1>
        <div className="m-cm-stats">
          <span><b>CDXVIII</b> en órbita</span>
          <span className="dot">·</span>
          <span><b>IV</b> activas</span>
        </div>
      </div>

      <div className="m-cm-channels">
        {COM.channels.slice(0,5).map((c, i) => (
          <span className={`pill ${c.on ? 'on' : ''}`} key={i}>{c.glyph} {c.name}</span>
        ))}
      </div>

      <div className="m-cm-compose">
        <span>☽</span>
        <input type="text" placeholder="Abrir un hilo..."/>
        <button>✦</button>
      </div>

      <div className="m-cm-threads">
        {COM.threads.slice(0,3).map((t, i) => (
          <article className={`m-cm-thread ${t.pin ? 'pin' : ''}`} key={i}>
            {t.pin && <span className="pin">★ ANCLADO</span>}
            <div className="meta"><span className="cat">{t.cat}</span><span className="moon">{t.moon}</span></div>
            <h4>{t.title}</h4>
            <div className="foot">
              <span className="av">{t.author[0]}</span>
              <span className="who">{t.author}</span>
              <span className="r">↩ {t.replies}</span>
            </div>
          </article>
        ))}
      </div>

      <div className="m-cm-event">
        <div className="d"><b>XII</b><span>MAY</span></div>
        <div>
          <strong>Círculo de luna llena</strong>
          <span>Online · 21:00</span>
        </div>
        <span className="arrow">↦</span>
      </div>

      <div className="m-foot">✦ MMXXVI · HUMANO · HUMANO</div>
    </div>
  </div>
);

window.MobileComunidad = MobileComunidad;
