/* ============================================
   DESKTOP LANDING — Humano demasiado Humano
   ============================================ */

const Nav = () => (
  <nav className="nav">
    <div className="brand">
      <svg className="brand-glyph" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 2 L12 22 M2 12 L22 12 M5 5 L19 19 M19 5 L5 19"/>
        <circle cx="12" cy="12" r="3" fill="currentColor"/>
      </svg>
      <span className="brand-name">
        Humano · Humano
        <small>ESCUELA HOLÍSTICA</small>
      </span>
    </div>
    <div className="nav-links">
      <a className="active">Cursos</a>
      <a>Maestras</a>
      <a className="collapsible-md">Diario</a>
      <a className="collapsible">Círculo</a>
      <a className="collapsible">Calendario</a>
    </div>
    <div className="nav-cta">
      <button className="btn-link">Entrar</button>
      <a className="btn btn-ghost">Inscribirme</a>
    </div>
  </nav>
);

const Hero = () => (
  <section className="hero">
    <div className="hero-text">
      <div className="hero-badge">
        <span className="pulse"></span>
        Cohorte de Luna Nueva · Mayo
      </div>
      <h1>
        Una escuela para<br/>
        <em>oficios sutiles</em><br/>
        del alma humana
      </h1>
      <p className="hero-sub">
        Astrología, tarot, herbalismo y reiki enseñados por maestras con linaje. Formación profesional para terapeutas que buscan profundidad, no atajos.
      </p>
      <div className="hero-ctas">
        <a className="btn btn-primary">
          Cruzar el umbral <span className="arrow">↦</span>
        </a>
        <a className="btn btn-ghost">
          Ver el catálogo
        </a>
      </div>
      <div className="hero-stats">
        <div className="stat">
          <span className="num">1<em>2</em></span>
          <span className="label">Maestras</span>
        </div>
        <div className="stat">
          <span className="num">4<em>8</em></span>
          <span className="label">Cursos vivos</span>
        </div>
        <div className="stat">
          <span className="num">2<em>k</em></span>
          <span className="label">Iniciadas</span>
        </div>
      </div>
    </div>
    <div className="wheel-wrap">
      <div className="wheel-glow"></div>
      <ZodiacWheel/>
      <div className="wheel-center-photo">
        <svg viewBox="0 0 60 60">
          <circle cx="30" cy="30" r="22"/>
          <circle cx="30" cy="30" r="14"/>
          <path d="M30 8 L30 52 M8 30 L52 30"/>
          <circle cx="30" cy="30" r="4" fill="currentColor"/>
        </svg>
      </div>
      <Sigil icon="✦" className="s1"/>
      <Sigil icon="☾" className="s2"/>
      <Sigil icon="☉" className="s3"/>
    </div>
    <div className="scroll-cue">
      DESPLAZAR
    </div>
  </section>
);

const Disciplines = () => {
  const items = [
    { Icon: DisciplineIcon.Astrology, label: 'Astrología', desc: 'Carta natal, tránsitos, retornos' },
    { Icon: DisciplineIcon.Tarot, label: 'Tarot', desc: 'Arcanos, tiradas, símbolo' },
    { Icon: DisciplineIcon.Reiki, label: 'Reiki', desc: 'Sanación energética, niveles I-III' },
    { Icon: DisciplineIcon.Herbal, label: 'Herbalismo', desc: 'Plantas aliadas, tinturas, ritual' },
  ];
  return (
    <div className="disciplines">
      {items.map((it, i) => (
        <div className="discipline" key={i}>
          <it.Icon className={i === 1 ? 'gold' : ''}/>
          <div className="discipline-text">
            <div className="label">{it.label}</div>
            <div className="desc">{it.desc}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

const FeaturedCourses = () => {
  const courses = [
    { num: 'I', tag: 'Astrología', title: <>Carta natal <em>esencial</em></>, desc: 'El mapa del alma encarnada en doce casas. Ocho semanas para leer cualquier carta con confianza.', teacher: 'Luna Arce', price: '$ 240', weeks: '8 sem · 24 lecciones' },
    { num: 'II', tag: 'Tarot', title: <>Tarot <em>iniciático</em></>, desc: 'Los 22 arcanos como espejo. Aprenderás a sostener consultas con ética y profundidad simbólica.', teacher: 'Sol Mayor', price: '$ 280', weeks: '10 sem · live + grabado', featured: true },
    { num: 'III', tag: 'Reiki', title: <>Reiki <em>nivel I</em></>, desc: 'Iniciación en la imposición de manos. Cuerpo sutil, chakras, ética del canal.', teacher: 'Aurora Violeta', price: '$ 180', weeks: '6 sem · presencial' },
  ];
  return (
    <section className="section">
      <div className="section-eyebrow">Cursos en cohorte abierta</div>
      <h2 className="section-title">El compendio <em>vivo</em></h2>
      <p className="section-sub">Cada cohorte abre con la luna nueva. El aprendizaje sigue el ritmo del cielo.</p>
      <div className="courses-grid">
        {courses.map((c, i) => (
          <article className={`course-card ${c.featured ? 'featured' : ''}`} key={i}>
            <div className="course-img">
              <span className="num-watermark">{c.num}</span>
            </div>
            <div className="course-body">
              <div className="course-meta">
                <span className="tag">✦ {c.tag}</span>
                <span>{c.weeks}</span>
              </div>
              <h3>{c.title}</h3>
              <p className="course-desc">{c.desc}</p>
              <div className="course-foot">
                <div className="course-teacher">
                  <span className="avatar"></span>
                  {c.teacher}
                </div>
                <span className="course-price">{c.price}</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

const Maestra = () => (
  <section className="section maestra">
    <div className="maestra-photo">
      <span className="frame-corner tl"></span>
      <span className="frame-corner tr"></span>
      <span className="frame-corner bl"></span>
      <span className="frame-corner br"></span>
      <svg viewBox="0 0 60 60">
        <circle cx="30" cy="30" r="20"/>
        <path d="M30 10 L30 50 M10 30 L50 30 M16 16 L44 44 M44 16 L16 44"/>
      </svg>
    </div>
    <div className="maestra-body">
      <div className="section-eyebrow" style={{justifyContent: 'flex-start'}}>
        <span style={{flex: 'none'}}>Quien transmite</span>
      </div>
      <p className="quote">"No enseño técnicas, enseño a escuchar lo que ya sabe el cuerpo."</p>
      <div className="maestra-name">Luna Arce</div>
      <div className="maestra-title">Astróloga · Tarotista · 22 años de práctica</div>
      <div className="maestra-meta">
        <div><strong>♓</strong>Piscis · Asc. Escorpio</div>
        <div><strong>3</strong>Cursos vivos</div>
        <div><strong>418</strong>Estudiantes</div>
      </div>
      <a className="btn btn-ghost">Conocer su obra <span className="arrow">↦</span></a>
    </div>
  </section>
);

const Lunar = () => {
  const days = [
    { phase: 'new', date: '6 MAY', label: 'sembrar' },
    { phase: 'crescent', date: '10', label: 'iniciar' },
    { phase: 'half', date: '14', label: 'crecer', event: 'LIVE NATAL' },
    { phase: 'gibbous', date: '18', label: 'culminar' },
    { phase: 'full', date: '22 MAY', label: 'liberar', event: 'RITUAL ABIERTO', today: true },
    { phase: 'gibbous', date: '26', label: 'integrar' },
    { phase: 'half', date: '30', label: 'soltar' },
    { phase: 'crescent', date: '3 JUN', label: 'descansar' },
  ];
  return (
    <section className="section lunar">
      <div className="section-eyebrow">Calendario lunar</div>
      <h2 className="section-title">El cielo <em>marca el ritmo</em></h2>
      <p className="section-sub">Los lives, rituales y cohortes se sincronizan con las fases de la luna.</p>
      <div className="lunar-row">
        {days.map((d, i) => (
          <div className={`lunar-day ${d.today ? 'today' : ''}`} key={i}>
            <div className={`moon-shape ${d.phase}`}></div>
            <div className="date">{d.date}</div>
            <div className="label">{d.label}</div>
            {d.event && <div className="event">{d.event}</div>}
          </div>
        ))}
      </div>
    </section>
  );
};

const Testimonies = () => {
  const t = [
    { q: 'Encontré aquí la profundidad que faltaba en mis formaciones previas. Volví a sentirme estudiante.', who: 'Iris Maldonado', role: 'Astróloga · México' },
    { q: 'La forma en que enseñan tarot acá no es trucos, es alfabeto del alma. Cambió mi práctica.', who: 'León Petersen', role: 'Terapeuta · Argentina' },
    { q: 'Lo que más agradezco es el círculo. Estudio sola pero nunca me siento sola.', who: 'Mar Coronado', role: 'Curandera · Chile' },
  ];
  return (
    <section className="section">
      <div className="section-eyebrow">Voces del círculo</div>
      <h2 className="section-title">Quienes han <em>cruzado</em></h2>
      <p className="section-sub">Lo que dicen las iniciadas que sostienen consultas hoy.</p>
      <div className="testimonies">
        {t.map((it, i) => (
          <blockquote className="testimony" key={i}>
            <p>{it.q}</p>
            <footer>
              <span className="testimony-avatar"></span>
              <cite>{it.who}<small>{it.role}</small></cite>
            </footer>
          </blockquote>
        ))}
      </div>
    </section>
  );
};

const CTA = () => (
  <section className="cta">
    <svg className="cta-glyph" viewBox="0 0 60 60">
      <polygon points="30,5 55,52 5,52" fill="none"/>
      <polygon points="30,55 55,8 5,8" fill="none"/>
      <circle cx="30" cy="30" r="8"/>
    </svg>
    <h2>El umbral está <em>abierto</em></h2>
    <p>Próxima cohorte abre con la luna nueva del 6 de mayo. Inscripciones cierran al filo del eclipse.</p>
    <div style={{display:'flex',gap:14,justifyContent:'center',flexWrap:'wrap'}}>
      <a className="btn btn-primary">Comenzar el viaje <span className="arrow">↦</span></a>
      <a className="btn btn-ghost">Hablar con una guía</a>
    </div>
  </section>
);

const Foot = () => (
  <footer className="foot">
    <div className="foot-brand">
      <div className="brand">
        <svg className="brand-glyph" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 2 L12 22 M2 12 L22 12"/>
          <circle cx="12" cy="12" r="3" fill="currentColor"/>
        </svg>
        <span className="brand-name">Humano · Humano<small>ESCUELA HOLÍSTICA</small></span>
      </div>
      <p>Una escuela para oficios sutiles. Formación profesional con linaje y rigor, en español, para todo el continente.</p>
    </div>
    <div className="foot-col">
      <h4>Estudiar</h4>
      <a>Cursos</a><a>Cohortes</a><a>Maestras</a><a>Calendario</a>
    </div>
    <div className="foot-col">
      <h4>Templo</h4>
      <a>Diario</a><a>Círculo</a><a>Biblioteca</a><a>Becas</a>
    </div>
    <div className="foot-col">
      <h4>Hablar</h4>
      <a>Contacto</a><a>Newsletter</a><a>Instagram</a><a>Substack</a>
    </div>
    <div className="foot-bottom">
      <span>✦ MMXXVI · Humano demasiado Humano</span>
      <span>Términos · Privacidad · Manifiesto</span>
    </div>
  </footer>
);

const DesktopLanding = () => (
  <div className="desktop">
    <div className="chrome">
      <div className="chrome-dots"><span></span><span></span><span></span></div>
      <div className="chrome-bar">◐ humanohumano.holistic / inicio</div>
    </div>
    <Nav/>
    <Hero/>
    <Disciplines/>
    <FeaturedCourses/>
    <Maestra/>
    <Lunar/>
    <Testimonies/>
    <CTA/>
    <Foot/>
  </div>
);

window.DesktopLanding = DesktopLanding;
