/* ============================================
   MOBILE LANDING
   ============================================ */

const MobileLanding = () => (
  <div className="phone">
    <div className="phone-status">
      <span>21:08</span>
      <span className="right">✦ ◐ ▮</span>
    </div>
    <div className="phone-content">
      <div className="m-nav">
        <div className="brand">
          <svg className="brand-glyph" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 2 L12 22 M2 12 L22 12"/>
            <circle cx="12" cy="12" r="3" fill="currentColor"/>
          </svg>
          <span className="brand-name">H · H<small>ESCUELA</small></span>
        </div>
        <div className="m-menu"><span></span><span></span></div>
      </div>

      <section className="m-hero">
        <div className="hero-badge">
          <span className="pulse"></span>
          Luna nueva · 6 may
        </div>
        <h1>Una escuela para <em>oficios sutiles</em> del alma</h1>
        <p>Astrología, tarot, herbalismo y reiki por maestras con linaje.</p>
        <div className="m-wheel">
          <div className="wheel-glow"></div>
          <ZodiacWheel size={220}/>
          <div className="wheel-center-photo" style={{width:'30%'}}>
            <svg viewBox="0 0 60 60">
              <circle cx="30" cy="30" r="20"/>
              <path d="M30 10 L30 50 M10 30 L50 30"/>
            </svg>
          </div>
        </div>
      </section>

      <div className="m-cta-row">
        <a className="btn btn-primary">Cruzar el umbral ↦</a>
        <a className="btn btn-ghost">Ver catálogo</a>
      </div>

      <div className="m-disciplines">
        {[
          {Ic: DisciplineIcon.Astrology, l: 'Astrología', d: 'Carta natal'},
          {Ic: DisciplineIcon.Tarot, l: 'Tarot', d: 'Arcanos'},
          {Ic: DisciplineIcon.Reiki, l: 'Reiki', d: 'Sanación'},
          {Ic: DisciplineIcon.Herbal, l: 'Herbal', d: 'Plantas'},
        ].map((it, i) => (
          <div className="m-discipline" key={i}>
            <it.Ic/>
            <div className="label">{it.l}</div>
            <div className="desc">{it.d}</div>
          </div>
        ))}
      </div>

      <section className="m-section">
        <div className="section-eyebrow">Cursos abiertos</div>
        <h2 className="section-title">El compendio <em>vivo</em></h2>
        {[
          {n:'I', tag:'Astrología', t:<>Carta natal <em>esencial</em></>, d:'El mapa del alma en doce casas.', p:'$ 240', w:'8 sem'},
          {n:'II', tag:'Tarot', t:<>Tarot <em>iniciático</em></>, d:'Los 22 arcanos como espejo.', p:'$ 280', w:'10 sem'},
        ].map((c, i) => (
          <article className="m-course" key={i}>
            <div className="m-course-img"></div>
            <div className="m-course-body">
              <div className="m-course-meta">
                <span className="tag">✦ {c.tag}</span>
                <span>{c.w}</span>
              </div>
              <h3>{c.t}</h3>
              <p className="desc">{c.d}</p>
              <div className="m-course-foot">
                <span>↦ Ver curso</span>
                <span className="price">{c.p}</span>
              </div>
            </div>
          </article>
        ))}
      </section>

      <div className="m-foot">✦ MMXXVI · HUMANO · HUMANO</div>
    </div>
  </div>
);

window.MobileLanding = MobileLanding;
