/* ============================================
   DETALLE DE CURSO — V2 Pergamino narrativo
   ============================================ */

const COURSE = {
  num: 'II',
  tag: 'Tarot',
  level: 'Maestría',
  title: 'Tarot iniciático',
  subtitle: 'los 22 arcanos como espejo del alma',
  intro: 'Diez semanas para aprender a sostener una consulta de tarot con ética, profundidad simbólica y presencia. No memorizar significados — leer el espejo que la carta tiende.',
  weeks: '10 semanas',
  format: 'Live + grabado',
  cohort: 'Luna nueva · 6 mayo',
  price: '$ 280',
  teacher: 'Sol Mayor',
  modules: [
    { num: 'I', title: 'El loco emprende camino', desc: 'Arquetipos, viaje del héroe, los tres arcanos del comienzo.', sessions: '4 sesiones · 2 sem' },
    { num: 'II', title: 'Los planetas y las cartas', desc: 'Correspondencias planetarias en el tarot de Marsella y Rider-Waite.', sessions: '3 sesiones · 1.5 sem' },
    { num: 'III', title: 'Las tiradas', desc: 'Tres cartas, cruz celta, el árbol de la vida. Estructura ritual de la consulta.', sessions: '5 sesiones · 2 sem' },
    { num: 'IV', title: 'Sostener al consultante', desc: 'Ética, encuadre, qué decir y qué callar. La presencia como herramienta.', sessions: '4 sesiones · 2 sem' },
    { num: 'V', title: 'Síntesis y práctica final', desc: 'Consultas reales sostenidas en grupo. Devolución de la maestra.', sessions: '5 sesiones · 2.5 sem' },
  ],
  includes: [
    'Acceso de por vida a las grabaciones',
    '10 sesiones live por Zoom con Sol Mayor',
    'Mazo de tarot de Marsella enviado a domicilio',
    'Cuaderno de bitácora encuadernado',
    'Círculo cerrado de práctica entre cohorte',
    'Certificado al cierre del recorrido',
  ],
};

const CourseDetail = () => (
  <div className="cd">
    <div className="chrome">
      <div className="chrome-dots"><span></span><span></span><span></span></div>
      <div className="chrome-bar">◐ humanohumano.holistic / cursos / tarot-iniciatico</div>
    </div>
    <Nav active="cursos"/>

    {/* Breadcrumb */}
    <div className="cd-crumb">
      <span>← Catálogo</span>
      <span className="sep">·</span>
      <span>Tarot</span>
      <span className="sep">·</span>
      <span className="current">Tarot iniciático</span>
    </div>

    {/* Pergamino opening */}
    <header className="cd-header">
      <div className="cd-header-glyphs">
        <svg viewBox="0 0 60 60" className="cd-glyph-l">
          <circle cx="30" cy="30" r="22" fill="none"/>
          <circle cx="30" cy="30" r="14" fill="none" strokeDasharray="1 2"/>
          <path d="M30 8 L30 52 M8 30 L52 30 M14 14 L46 46 M14 46 L46 14" fill="none"/>
        </svg>
        <div className="cd-eyebrow">— UN CURSO DE —</div>
        <svg viewBox="0 0 60 60" className="cd-glyph-r">
          <polygon points="30,8 50,42 10,42" fill="none"/>
          <polygon points="30,52 50,18 10,18" fill="none"/>
          <circle cx="30" cy="30" r="6" fill="none"/>
        </svg>
      </div>
      <div className="cd-tag">✦ {COURSE.tag} · {COURSE.level}</div>
      <h1 className="cd-title">{COURSE.title}</h1>
      <p className="cd-subtitle">{COURSE.subtitle}</p>
      <div className="cd-divider">
        <span className="line"></span>
        <span className="symbol">☾  ✦  ☉</span>
        <span className="line"></span>
      </div>
      <p className="cd-intro">{COURSE.intro}</p>

      <div className="cd-meta-row">
        <div className="cd-meta-item">
          <span className="meta-num">{COURSE.weeks.split(' ')[0]}</span>
          <span className="meta-lbl">SEMANAS</span>
        </div>
        <span className="cd-meta-sep">·</span>
        <div className="cd-meta-item">
          <span className="meta-num">21</span>
          <span className="meta-lbl">SESIONES</span>
        </div>
        <span className="cd-meta-sep">·</span>
        <div className="cd-meta-item">
          <span className="meta-num">XII</span>
          <span className="meta-lbl">EN COHORTE</span>
        </div>
      </div>
    </header>

    {/* Maestra strip */}
    <section className="cd-maestra">
      <div className="cd-maestra-photo">
        <span className="frame-corner tl"></span>
        <span className="frame-corner tr"></span>
        <span className="frame-corner bl"></span>
        <span className="frame-corner br"></span>
      </div>
      <div className="cd-maestra-text">
        <div className="cd-eyebrow small">QUIEN TRANSMITE</div>
        <h3>{COURSE.teacher}</h3>
        <div className="cd-teacher-meta">Tarotista · Astróloga · 18 años de práctica</div>
        <p>"El tarot no predice; refleja. En este recorrido aprenderás a ser un espejo claro para quien busca verse."</p>
      </div>
    </section>

    {/* El viaje */}
    <section className="cd-section">
      <div className="cd-divider">
        <span className="line"></span>
        <span className="symbol">EL VIAJE</span>
        <span className="line"></span>
      </div>

      <div className="cd-modules">
        <div className="cd-spine"></div>
        {COURSE.modules.map((m, i) => (
          <article className="cd-module" key={i}>
            <div className="cd-module-num">
              <span className="num-roman">{m.num}</span>
              <span className="num-dot"></span>
            </div>
            <div className="cd-module-body">
              <h4>{m.title}</h4>
              <p>{m.desc}</p>
              <span className="cd-module-meta">☾ {m.sessions}</span>
            </div>
          </article>
        ))}
      </div>
    </section>

    {/* Includes */}
    <section className="cd-section cd-section-alt">
      <div className="cd-divider">
        <span className="line"></span>
        <span className="symbol">QUÉ RECIBES</span>
        <span className="line"></span>
      </div>
      <div className="cd-includes">
        {COURSE.includes.map((it, i) => (
          <div className="cd-include" key={i}>
            <span className="bullet">✦</span>
            <span>{it}</span>
          </div>
        ))}
      </div>
    </section>

    {/* Pact / inscription */}
    <section className="cd-pact">
      <div className="cd-pact-glyph">
        <svg viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="35" fill="none"/>
          <polygon points="40,12 65,55 15,55" fill="none"/>
          <circle cx="40" cy="40" r="8" fill="currentColor" opacity="0.3"/>
        </svg>
      </div>
      <div className="cd-pact-eyebrow">— EL UMBRAL —</div>
      <h2>Próxima cohorte abre con la <em>luna nueva</em></h2>
      <p className="cd-pact-cohort">{COURSE.cohort} · cierra inscripciones al filo del eclipse</p>

      <div className="cd-pact-card">
        <div className="cd-pact-card-row">
          <span className="lbl">Ofrenda</span>
          <span className="val">{COURSE.price}</span>
        </div>
        <div className="cd-pact-card-row">
          <span className="lbl">o tres pagos de</span>
          <span className="val small">$ 100</span>
        </div>
        <div className="cd-pact-card-row notes">
          <span>{COURSE.format}</span>
          <span>·</span>
          <span>Becas disponibles</span>
        </div>
        <a className="btn btn-primary cd-cta">
          Sellar el pacto <span className="arrow">↦</span>
        </a>
        <button className="btn-link cd-talk">Hablar con una guía antes</button>
      </div>
    </section>

    <Foot/>
  </div>
);

window.CourseDetail = CourseDetail;

/* ============================================
   MOBILE
   ============================================ */

const MobileCourseDetail = () => (
  <div className="phone">
    <div className="phone-status">
      <span>21:08</span>
      <span className="right">✦ ◐ ▮</span>
    </div>
    <div className="phone-content">
      <div className="m-nav">
        <span className="m-back">← Catálogo</span>
        <div className="m-menu"><span></span><span></span></div>
      </div>

      <header className="m-cd-header">
        <svg viewBox="0 0 60 60" className="m-cd-glyph">
          <circle cx="30" cy="30" r="22" fill="none"/>
          <circle cx="30" cy="30" r="14" fill="none" strokeDasharray="1 2"/>
          <path d="M30 8 L30 52 M8 30 L52 30" fill="none"/>
        </svg>
        <div className="cd-eyebrow">— UN CURSO DE —</div>
        <div className="cd-tag">✦ {COURSE.tag}</div>
        <h1>{COURSE.title}</h1>
        <p className="m-cd-subtitle">{COURSE.subtitle}</p>
        <div className="cd-divider">
          <span className="line"></span>
          <span className="symbol">☾ ✦ ☉</span>
          <span className="line"></span>
        </div>
        <p className="m-cd-intro">{COURSE.intro}</p>
      </header>

      <div className="m-cd-meta">
        <div><span className="n">10</span><span className="l">sem</span></div>
        <div><span className="n">21</span><span className="l">sesiones</span></div>
        <div><span className="n">XII</span><span className="l">cohorte</span></div>
      </div>

      <div className="m-cd-modules">
        <div className="cd-divider">
          <span className="line"></span>
          <span className="symbol">EL VIAJE</span>
          <span className="line"></span>
        </div>
        {COURSE.modules.map((m, i) => (
          <div className="m-cd-module" key={i}>
            <span className="num">{m.num}</span>
            <div>
              <h4>{m.title}</h4>
              <p>{m.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="m-cd-pact">
        <div className="price">{COURSE.price}</div>
        <div className="cohort">{COURSE.cohort}</div>
        <a className="btn btn-primary">Sellar el pacto ↦</a>
      </div>

      <div className="m-foot">✦ MMXXVI · HUMANO · HUMANO</div>
    </div>
  </div>
);

window.MobileCourseDetail = MobileCourseDetail;
