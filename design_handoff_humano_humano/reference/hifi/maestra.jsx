/* ============================================
   MAESTRA — perfil de instructora
   ============================================ */

const MAESTRA = {
  name: 'Sol Mayor',
  glyph: '☉',
  role: 'Tarotista · Astróloga',
  location: 'Buenos Aires · Argentina',
  years: 'XVIII',
  students: '1.240',
  courses: 'IV',
  rating: '4.9',
  coursesCount: 'IV',
  bio: [
    'Sol llegó al tarot a los diecinueve años, cuando una abuela vasca le puso un mazo en las manos y le dijo: "no leas las cartas, dejá que ellas te lean a vos".',
    'Estudió astrología tropical con Eugenio Carutti en Buenos Aires y se formó en el tarot de Marsella con la escuela de Alejandro Jodorowsky en Francia. Dieciocho años después, sigue creyendo que el oficio es escuchar.',
  ],
  quote: 'No leemos el futuro. Leemos el alma del momento presente.',
  formations: [
    { year: 'MMVIII', title: 'Tarot de Marsella · Jodorowsky', place: 'París' },
    { year: 'MMXII', title: 'Astrología tropical · Casa XI', place: 'Buenos Aires' },
    { year: 'MMXVI', title: 'Cábala y simbolismo', place: 'Jerusalén' },
    { year: 'MMXX', title: 'Trauma-informed counseling', place: 'Online' },
  ],
  courses: [
    { num: 'I', tag: 'Tarot · Iniciación', title: 'El loco emprende camino', students: 'XLII', moon: '◐', status: 'En curso' },
    { num: 'II', tag: 'Tarot · Maestría', title: 'Tarot iniciático', students: 'XII', moon: '○', status: 'Próximo · 6 may' },
    { num: 'III', tag: 'Astrología · Maestría', title: 'Cartografía del alma', students: 'XXIV', moon: '●', status: 'Cerrado' },
    { num: 'IV', tag: 'Encuentro · 1 día', title: 'Plenilunio en Escorpio', students: 'C', moon: '●', status: 'Próximo · 23 may' },
  ],
  testimonios: [
    { text: 'Hizo de un mazo de cartas un espejo del que no quiero alejarme.', who: 'Lía M.', course: 'Tarot iniciático MMXXV' },
    { text: 'Sostiene como pocas. Te empuja al borde con una ternura que da miedo y abraza.', who: 'Joaquín R.', course: 'Cartografía del alma MMXXIV' },
    { text: 'Sol no enseña. Te recuerda algo que ya sabías.', who: 'Camila V.', course: 'El loco emprende camino MMXXVI' },
  ],
};

/* Birth chart SVG */
const BirthChart = () => {
  const size = 280;
  const cx = size/2, cy = size/2;
  const r1 = 130, r2 = 110, r3 = 90, r4 = 50;
  const houses = Array.from({length: 12}, (_, i) => i);
  const signs = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
  const planets = [
    { sym: '☉', angle: 215, r: 70, label: 'Sol' },
    { sym: '☽', angle: 145, r: 70, label: 'Luna' },
    { sym: '☿', angle: 230, r: 70 },
    { sym: '♀', angle: 195, r: 70 },
    { sym: '♂', angle: 100, r: 70 },
    { sym: '♃', angle: 30, r: 70 },
    { sym: '♄', angle: 285, r: 70 },
  ];
  const polar = (angle, radius) => {
    const a = (angle - 90) * Math.PI / 180;
    return [cx + Math.cos(a) * radius, cy + Math.sin(a) * radius];
  };

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="birth-chart">
      <defs>
        <radialGradient id="chart-glow">
          <stop offset="0%" stopColor="rgba(245,215,110,0.15)"/>
          <stop offset="100%" stopColor="transparent"/>
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r1+10} fill="url(#chart-glow)"/>
      <circle cx={cx} cy={cy} r={r1} fill="none" stroke="currentColor" strokeOpacity="0.6"/>
      <circle cx={cx} cy={cy} r={r2} fill="none" stroke="currentColor" strokeOpacity="0.4"/>
      <circle cx={cx} cy={cy} r={r3} fill="none" stroke="currentColor" strokeOpacity="0.3" strokeDasharray="2 3"/>
      <circle cx={cx} cy={cy} r={r4} fill="none" stroke="currentColor" strokeOpacity="0.4"/>
      {/* House lines */}
      {houses.map(i => {
        const [x1, y1] = polar(i*30, r4);
        const [x2, y2] = polar(i*30, r1);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeOpacity="0.25"/>;
      })}
      {/* Sign glyphs */}
      {signs.map((s, i) => {
        const [x, y] = polar(i*30 + 15, (r1 + r2)/2);
        return <text key={i} x={x} y={y} className="chart-sign" textAnchor="middle" dominantBaseline="middle">{s}</text>;
      })}
      {/* House numbers */}
      {houses.map(i => {
        const [x, y] = polar(i*30 + 15, (r3 + r4)/2 - 5);
        return <text key={i} x={x} y={y} className="chart-house" textAnchor="middle" dominantBaseline="middle">{['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'][i]}</text>;
      })}
      {/* Aspects (lines between planets) */}
      <g opacity="0.4">
        {[[0,1],[0,3],[2,5],[1,4],[3,6]].map(([a,b], i) => {
          const [x1,y1] = polar(planets[a].angle, planets[a].r);
          const [x2,y2] = polar(planets[b].angle, planets[b].r);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth="0.5" strokeDasharray="1 2"/>;
        })}
      </g>
      {/* Planets */}
      {planets.map((p, i) => {
        const [x, y] = polar(p.angle, p.r);
        return (
          <g key={i}>
            <circle cx={x} cy={y} r="10" fill="var(--surface)" stroke="var(--gold)" strokeWidth="0.8"/>
            <text x={x} y={y+1} className="chart-planet" textAnchor="middle" dominantBaseline="middle">{p.sym}</text>
          </g>
        );
      })}
      {/* Center */}
      <circle cx={cx} cy={cy} r="3" fill="var(--gold)"/>
    </svg>
  );
};

const Maestra = () => (
  <div className="mx">
    <div className="chrome">
      <div className="chrome-dots"><span></span><span></span><span></span></div>
      <div className="chrome-bar">◐ humanohumano.holistic / maestras / sol-mayor</div>
    </div>
    <Nav active="maestras"/>

    <div className="cd-crumb">
      <span>← Maestras</span>
      <span className="sep">·</span>
      <span className="current">Sol Mayor</span>
    </div>

    {/* HERO with chart */}
    <header className="mx-hero">
      <div className="mx-hero-left">
        <div className="cd-eyebrow">— TRAS EL VELO —</div>
        <div className="mx-hero-glyph">{MAESTRA.glyph}</div>
        <h1 className="mx-name">{MAESTRA.name}</h1>
        <div className="mx-role">{MAESTRA.role}</div>
        <div className="mx-loc">✦ {MAESTRA.location}</div>

        <div className="mx-stats">
          <div><span className="n">{MAESTRA.years}</span><span className="l">AÑOS</span></div>
          <span className="sep">·</span>
          <div><span className="n">{MAESTRA.students}</span><span className="l">ESTUDIANTES</span></div>
          <span className="sep">·</span>
          <div><span className="n">{MAESTRA.coursesCount}</span><span className="l">CURSOS</span></div>
          <span className="sep">·</span>
          <div><span className="n">{MAESTRA.rating}</span><span className="l">VALORACIÓN</span></div>
        </div>

        <div className="mx-actions">
          <a className="btn btn-primary">Ver sus cursos ↦</a>
          <a className="btn btn-ghost">Pedir consulta privada</a>
        </div>
      </div>

      <div className="mx-hero-right">
        <div className="mx-portrait">
          <span className="frame-corner tl"></span>
          <span className="frame-corner tr"></span>
          <span className="frame-corner bl"></span>
          <span className="frame-corner br"></span>
        </div>
        <div className="mx-chart-wrap">
          <BirthChart/>
          <div className="mx-chart-cap">— CARTA NATAL · 11 jul MCMLXXXII —</div>
        </div>
      </div>
    </header>

    {/* Bio narrativa */}
    <section className="mx-bio">
      <div className="cd-divider">
        <span className="line"></span>
        <span className="symbol">SU CAMINO</span>
        <span className="line"></span>
      </div>
      <div className="mx-bio-grid">
        <div className="mx-bio-text">
          {MAESTRA.bio.map((p, i) => <p key={i} className={i === 0 ? 'lead' : ''}>{p}</p>)}
        </div>
        <aside className="mx-quote">
          <span className="q-mark">❝</span>
          <p>{MAESTRA.quote}</p>
          <span className="q-attr">— Sol Mayor</span>
        </aside>
      </div>
    </section>

    {/* Formación */}
    <section className="mx-form">
      <div className="cd-divider">
        <span className="line"></span>
        <span className="symbol">FORMACIÓN</span>
        <span className="line"></span>
      </div>
      <div className="mx-form-list">
        {MAESTRA.formations.map((f, i) => (
          <div className="mx-form-item" key={i}>
            <span className="year">{f.year}</span>
            <span className="title">{f.title}</span>
            <span className="place">{f.place}</span>
          </div>
        ))}
      </div>
    </section>

    {/* Cursos */}
    <section className="mx-courses">
      <div className="cd-divider">
        <span className="line"></span>
        <span className="symbol">SUS CURSOS</span>
        <span className="line"></span>
      </div>
      <div className="mx-courses-grid">
        {MAESTRA.courses.map((c, i) => (
          <article className="mx-course" key={i}>
            <div className="mx-course-top">
              <span className="num">{c.num}</span>
              <span className="moon">{c.moon}</span>
            </div>
            <div className="mx-course-tag">{c.tag}</div>
            <h4>{c.title}</h4>
            <div className="mx-course-meta">
              <span>{c.students} estudiantes</span>
              <span className="sep">·</span>
              <span className={c.status.includes('curso') || c.status.includes('Próximo') ? 'live' : 'closed'}>{c.status}</span>
            </div>
          </article>
        ))}
      </div>
    </section>

    {/* Testimonios */}
    <section className="mx-test">
      <div className="cd-divider">
        <span className="line"></span>
        <span className="symbol">VOCES DE QUIENES PASARON</span>
        <span className="line"></span>
      </div>
      <div className="mx-test-grid">
        {MAESTRA.testimonios.map((t, i) => (
          <blockquote className="mx-test-card" key={i}>
            <span className="q-mark">❝</span>
            <p>{t.text}</p>
            <footer>
              <strong>{t.who}</strong>
              <span>{t.course}</span>
            </footer>
          </blockquote>
        ))}
      </div>
    </section>

    {/* Pact */}
    <section className="mx-pact">
      <div className="cd-pact-glyph">
        <svg viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="35" fill="none"/>
          <circle cx="40" cy="40" r="20" fill="none" strokeDasharray="2 3"/>
          <text x="40" y="46" textAnchor="middle" fontSize="20" fill="currentColor">☉</text>
        </svg>
      </div>
      <div className="cd-pact-eyebrow">— PARA QUIENES BUSCAN —</div>
      <h2>Una <em>guía</em> que sostenga el camino</h2>
      <p className="cd-pact-cohort">Sol abre dos cohortes al año · próxima en luna nueva del 6 de mayo</p>
      <div className="mx-pact-actions">
        <a className="btn btn-primary">Tarot iniciático · 6 mayo ↦</a>
        <a className="btn btn-ghost">Ver todos sus cursos</a>
      </div>
    </section>

    <Foot/>
  </div>
);

window.Maestra = Maestra;

/* ============================================
   MOBILE
   ============================================ */
const MobileMaestra = () => (
  <div className="phone">
    <div className="phone-status">
      <span>21:08</span>
      <span className="right">✦ ◐ ▮</span>
    </div>
    <div className="phone-content">
      <div className="m-nav">
        <span className="m-back">← Maestras</span>
        <div className="m-menu"><span></span><span></span></div>
      </div>

      <header className="m-mx-hero">
        <div className="cd-eyebrow">— TRAS EL VELO —</div>
        <div className="m-mx-portrait"></div>
        <div className="mx-hero-glyph small">{MAESTRA.glyph}</div>
        <h1>{MAESTRA.name}</h1>
        <div className="m-mx-role">{MAESTRA.role}</div>
        <div className="m-mx-loc">✦ {MAESTRA.location}</div>

        <div className="m-mx-stats">
          <div><span className="n">{MAESTRA.years}</span><span className="l">años</span></div>
          <div><span className="n">{MAESTRA.students}</span><span className="l">est.</span></div>
          <div><span className="n">{MAESTRA.rating}</span><span className="l">★</span></div>
        </div>
      </header>

      <section className="m-mx-bio">
        <div className="cd-divider">
          <span className="line"></span>
          <span className="symbol">SU CAMINO</span>
          <span className="line"></span>
        </div>
        <p>{MAESTRA.bio[0]}</p>
        <blockquote>
          <span className="q-mark">❝</span>
          <p>{MAESTRA.quote}</p>
        </blockquote>
      </section>

      <section className="m-mx-courses">
        <div className="cd-divider">
          <span className="line"></span>
          <span className="symbol">SUS CURSOS</span>
          <span className="line"></span>
        </div>
        {MAESTRA.courses.map((c, i) => (
          <div className="m-mx-course" key={i}>
            <span className="num">{c.num}</span>
            <div className="body">
              <div className="tag">{c.tag}</div>
              <h4>{c.title}</h4>
              <div className="meta">{c.students} · {c.status}</div>
            </div>
            <span className="moon">{c.moon}</span>
          </div>
        ))}
      </section>

      <div className="m-mx-pact">
        <a className="btn btn-primary">Pedir consulta ↦</a>
      </div>

      <div className="m-foot">✦ MMXXVI · HUMANO · HUMANO</div>
    </div>
  </div>
);

window.MobileMaestra = MobileMaestra;
