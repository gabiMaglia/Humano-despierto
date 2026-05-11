/* ============================================
   CATÁLOGO HI-FI — Humano demasiado Humano
   ============================================ */

const CATALOG_COURSES = [
  { num:'I', tag:'Astrología', level:'Inicial', title:<>Carta natal <em>esencial</em></>, desc:'El mapa del alma encarnada en doce casas.', teacher:'Luna Arce', price:'$ 240', weeks:'8 sem', format:'live + grabado', moon:'nueva' },
  { num:'II', tag:'Tarot', level:'Maestría', title:<>Tarot <em>iniciático</em></>, desc:'Los 22 arcanos como espejo del proceso.', teacher:'Sol Mayor', price:'$ 280', weeks:'10 sem', format:'live', moon:'creciente', featured:true },
  { num:'III', tag:'Reiki', level:'Inicial', title:<>Reiki <em>nivel I</em></>, desc:'Iniciación en la imposición de manos.', teacher:'Aurora Violeta', price:'$ 180', weeks:'6 sem', format:'presencial', moon:'llena' },
  { num:'IV', tag:'Astrología', level:'Intermedio', title:<>Tránsitos y <em>retornos</em></>, desc:'Leer el cielo del ahora sobre la carta.', teacher:'Luna Arce', price:'$ 320', weeks:'12 sem', format:'live + grabado', moon:'menguante' },
  { num:'V', tag:'Herbal', level:'Intermedio', title:<>Herbario <em>lunar</em></>, desc:'Plantas aliadas según la fase de la luna.', teacher:'Aurora Violeta', price:'$ 220', weeks:'8 sem', format:'grabado', moon:'creciente' },
  { num:'VI', tag:'Tarot', level:'Intermedio', title:<>Arcanos <em>menores</em></>, desc:'Los cuatro elementos como caminos de práctica.', teacher:'Sol Mayor', price:'$ 200', weeks:'6 sem', format:'grabado', moon:'nueva' },
  { num:'VII', tag:'Reiki', level:'Maestría', title:<>Reiki <em>nivel III</em></>, desc:'Maestría y transmisión de la línea Usui.', teacher:'Aurora Violeta', price:'$ 480', weeks:'16 sem', format:'presencial', moon:'llena' },
  { num:'VIII', tag:'Astrología', level:'Inicial', title:<>Las <em>doce</em> casas</>, desc:'Una a una, el escenario donde el cielo actúa.', teacher:'Luna Arce', price:'$ 160', weeks:'5 sem', format:'grabado', moon:'creciente' },
  { num:'IX', tag:'Herbal', level:'Inicial', title:<>Tinturas <em>iniciales</em></>, desc:'Preparación de tinturas madre con intención.', teacher:'Aurora Violeta', price:'$ 140', weeks:'4 sem', format:'grabado', moon:'menguante' },
];

const FilterGroup = ({ title, children }) => (
  <div className="filter-group">
    <h4 className="filter-title">{title}</h4>
    {children}
  </div>
);

const FilterCheck = ({ label, count, checked, gold }) => (
  <label className={`filter-check ${checked ? 'checked' : ''}`}>
    <span className={`box ${checked ? 'on' : ''} ${gold ? 'gold' : ''}`}>{checked && '✦'}</span>
    <span className="lbl">{label}</span>
    <span className="cnt">{count}</span>
  </label>
);

const Catalog = () => (
  <div className="cat">
    <div className="chrome">
      <div className="chrome-dots"><span></span><span></span><span></span></div>
      <div className="chrome-bar">◐ humanohumano.holistic / cursos</div>
    </div>
    <Nav active="cursos"/>

    {/* Hero strip */}
    <header className="cat-hero">
      <div className="cat-hero-inner">
        <div className="hero-badge">
          <span className="pulse"></span>
          48 cursos · 4 disciplinas
        </div>
        <h1>El compendio <em>vivo</em></h1>
        <p>Cada cohorte abre con la luna nueva. Los cursos a tu propio ritmo siempre están disponibles.</p>
      </div>
      <svg className="cat-hero-glyph" viewBox="0 0 200 80" aria-hidden>
        <g stroke="var(--lila)" fill="none" strokeWidth="0.4" opacity="0.5">
          <circle cx="100" cy="40" r="30"/>
          <circle cx="100" cy="40" r="22" strokeDasharray="1 2"/>
          <line x1="70" y1="40" x2="130" y2="40"/>
          <line x1="100" y1="10" x2="100" y2="70"/>
          <polygon points="100,15 125,55 75,55"/>
          <polygon points="100,65 125,25 75,25"/>
        </g>
      </svg>
    </header>

    {/* Body: filters + grid */}
    <div className="cat-body">
      <aside className="cat-filters">
        <div className="filter-search">
          <span>✦</span>
          <input type="text" placeholder="Buscar en el compendio…"/>
        </div>

        <FilterGroup title="Disciplina">
          <FilterCheck label="Astrología" count="14" checked gold/>
          <FilterCheck label="Tarot" count="12" checked/>
          <FilterCheck label="Reiki" count="9"/>
          <FilterCheck label="Herbalismo" count="13"/>
        </FilterGroup>

        <FilterGroup title="Nivel">
          <FilterCheck label="Inicial" count="18" checked/>
          <FilterCheck label="Intermedio" count="22" checked/>
          <FilterCheck label="Maestría" count="8"/>
        </FilterGroup>

        <FilterGroup title="Formato">
          <FilterCheck label="Live + grabado" count="20" checked/>
          <FilterCheck label="Solo grabado" count="22"/>
          <FilterCheck label="Presencial" count="6"/>
        </FilterGroup>

        <FilterGroup title="Duración">
          <div className="duration-slider">
            <div className="slider-track">
              <div className="slider-fill"></div>
              <span className="slider-handle l"></span>
              <span className="slider-handle r"></span>
            </div>
            <div className="slider-labels">
              <span>4 sem</span>
              <span>16 sem</span>
            </div>
          </div>
        </FilterGroup>

        <FilterGroup title="Próxima cohorte">
          <FilterCheck label="☾ Luna nueva · 6 may" count="12" checked/>
          <FilterCheck label="◐ Creciente · 14 may" count="8"/>
          <FilterCheck label="● Llena · 22 may" count="6"/>
        </FilterGroup>

        <button className="filter-clear">Limpiar filtros ✕</button>
      </aside>

      <main className="cat-main">
        <div className="cat-toolbar">
          <div className="cat-results">
            <span className="num">28</span>
            <span className="lbl">cursos · 3 filtros activos</span>
          </div>
          <div className="cat-chips">
            <span className="cat-chip on">Astrología <span>✕</span></span>
            <span className="cat-chip on">Tarot <span>✕</span></span>
            <span className="cat-chip on">Inicial + Intermedio <span>✕</span></span>
          </div>
          <div className="cat-sort">
            <span>Ordenar:</span>
            <select>
              <option>Próxima cohorte</option>
              <option>Más populares</option>
              <option>Recién añadidos</option>
            </select>
          </div>
        </div>

        <div className="cat-grid">
          {CATALOG_COURSES.map((c, i) => (
            <article className={`cat-card ${c.featured ? 'featured' : ''}`} key={i}>
              <div className="cat-img">
                <span className={`cat-moon ${c.moon}`}></span>
                <span className="num-watermark">{c.num}</span>
                {c.featured && <span className="cat-flag">✦ destacado</span>}
                <svg className="cat-img-lines" viewBox="0 0 100 80" preserveAspectRatio="none" aria-hidden>
                  <path d="M0 60 Q 25 40 50 55 T 100 50" stroke="rgba(245,215,110,0.3)" strokeWidth="0.4" fill="none"/>
                  <circle cx="20" cy="20" r="1" fill="rgba(255,255,255,0.5)"/>
                  <circle cx="70" cy="15" r="1.5" fill="rgba(245,215,110,0.7)"/>
                  <circle cx="80" cy="35" r="0.8" fill="rgba(255,255,255,0.4)"/>
                </svg>
              </div>
              <div className="cat-body-card">
                <div className="cat-meta">
                  <span className="tag">✦ {c.tag}</span>
                  <span>{c.level}</span>
                </div>
                <h3>{c.title}</h3>
                <p className="cat-desc">{c.desc}</p>
                <div className="cat-attrs">
                  <span>☾ {c.weeks}</span>
                  <span>· {c.format}</span>
                </div>
                <div className="cat-foot">
                  <div className="cat-teacher">
                    <span className="avatar"></span>
                    <span className="name">{c.teacher}</span>
                  </div>
                  <span className="cat-price">{c.price}</span>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="cat-pagination">
          <button className="pg arrow">←</button>
          <button className="pg active">1</button>
          <button className="pg">2</button>
          <button className="pg">3</button>
          <span className="pg-dots">···</span>
          <button className="pg">7</button>
          <button className="pg arrow">→</button>
        </div>
      </main>
    </div>

    <Foot/>
  </div>
);

window.Catalog = Catalog;

/* ============================================
   MOBILE CATÁLOGO
   ============================================ */

const MobileCatalog = () => (
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
          <span className="brand-name">H · H<small>CURSOS</small></span>
        </div>
        <div className="m-menu"><span></span><span></span></div>
      </div>

      <section className="m-cat-hero">
        <div className="hero-badge"><span className="pulse"></span>48 cursos vivos</div>
        <h1>El compendio <em>vivo</em></h1>
      </section>

      <div className="m-cat-search">
        <span>✦</span>
        <input placeholder="Buscar…"/>
        <button className="m-filter-btn">⊟ filtros · 3</button>
      </div>

      <div className="m-cat-pills">
        <span className="pill on">Todos</span>
        <span className="pill">♈ Astro</span>
        <span className="pill">✦ Tarot</span>
        <span className="pill">☉ Reiki</span>
        <span className="pill">☘ Herbal</span>
      </div>

      <div className="m-cat-list">
        {CATALOG_COURSES.slice(0,4).map((c, i) => (
          <article className="m-cat-card" key={i}>
            <div className="m-cat-img">
              <span className={`cat-moon ${c.moon}`}></span>
              <span className="num-watermark">{c.num}</span>
            </div>
            <div className="m-cat-body">
              <div className="m-cat-meta">
                <span className="tag">✦ {c.tag}</span>
                <span>{c.level}</span>
              </div>
              <h3>{c.title}</h3>
              <p>{c.desc}</p>
              <div className="m-cat-foot">
                <span className="weeks">☾ {c.weeks}</span>
                <span className="price">{c.price}</span>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="m-cat-load">Cargar 24 más ↓</div>
      <div className="m-foot">✦ MMXXVI · HUMANO · HUMANO</div>
    </div>
  </div>
);

window.MobileCatalog = MobileCatalog;
