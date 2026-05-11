/* ============================================
   BLOG / DIARIO — Humano · Humano
   ============================================ */

const BLOG = {
  featured: {
    cat: 'ASTROLOGÍA · ENSAYO',
    glyph: '☉',
    title: 'Sobre los eclipses que no se pueden esquivar',
    sub: 'Notas de campo después del eclipse en Tauro',
    excerpt: 'Hay tránsitos que pasan rozando y hay otros que parten la corteza. Los eclipses pertenecen al segundo grupo: no se interpretan, se atraviesan.',
    author: 'Luz Marini',
    date: '24 ABR MMXXVI',
    read: 'XII MIN',
    moon: '●',
  },
  posts: [
    { num: 'I', cat: 'TAROT', glyph: '✦', title: 'Las cartas que se niegan a hablar', author: 'Sol Mayor', date: '21 ABR', read: 'VII MIN', moon: '◐' },
    { num: 'II', cat: 'HERBALISMO', glyph: '☘', title: 'Tres simples para el pasaje del frío', author: 'Mara Iturri', date: '18 ABR', read: 'IX MIN', moon: '○' },
    { num: 'III', cat: 'REIKI · OFICIO', glyph: '☉', title: 'Sostener el silencio durante una sesión', author: 'Inés Volpe', date: '14 ABR', read: 'V MIN', moon: '●' },
    { num: 'IV', cat: 'ASTROLOGÍA', glyph: '♀', title: 'Venus retrógrado y la justicia íntima', author: 'Luz Marini', date: '09 ABR', read: 'X MIN', moon: '◑' },
    { num: 'V', cat: 'PRÁCTICA', glyph: '☽', title: 'Cuaderno de bitácora · primer círculo', author: 'Lía M.', date: '06 ABR', read: 'IV MIN', moon: '◐' },
    { num: 'VI', cat: 'ENSAYO', glyph: '⚯', title: 'Lo que el linaje no se anima a decirnos', author: 'Sol Mayor', date: '02 ABR', read: 'XV MIN', moon: '○' },
  ],
  cats: [
    { name: 'Todos', n: 84, on: true },
    { name: 'Tarot', n: 21 },
    { name: 'Astrología', n: 28 },
    { name: 'Herbalismo', n: 14 },
    { name: 'Reiki', n: 9 },
    { name: 'Oficio', n: 12 },
  ],
  authors: [
    { name: 'Sol Mayor', glyph: '☉', posts: 'XIV' },
    { name: 'Luz Marini', glyph: '♀', posts: 'XI' },
    { name: 'Mara Iturri', glyph: '☘', posts: 'VIII' },
    { name: 'Inés Volpe', glyph: '☽', posts: 'VI' },
  ],
  serie: { title: 'Cuaderno de Lía', sub: 'Una estudiante anota su primer círculo, semana a semana.', count: 'IX entregas', glyph: '☾' },
};

const Blog = () => (
  <div className="bl">
    <div className="chrome">
      <div className="chrome-dots"><span></span><span></span><span></span></div>
      <div className="chrome-bar">◐ humanohumano.holistic / diario</div>
    </div>
    <Nav active="diario"/>

    <header className="bl-head">
      <div className="cd-eyebrow">— DIARIO ABIERTO —</div>
      <h1>Anotaciones <em>al margen</em><br/>del oficio</h1>
      <p>Lo que las maestras escriben entre clase y clase. Ensayos, cartas a estudiantes, notas de campo después de cada cohorte.</p>
      <div className="bl-search">
        <span>✦</span>
        <input type="text" placeholder="Buscar entre anotaciones..."/>
        <kbd>⌘K</kbd>
      </div>
    </header>

    {/* Cats strip */}
    <div className="bl-cats">
      {BLOG.cats.map((c, i) => (
        <a className={`bl-cat ${c.on ? 'on' : ''}`} key={i}>
          {c.name}<span className="n">{c.n}</span>
        </a>
      ))}
    </div>

    <div className="bl-grid">
      <main className="bl-main">
        {/* Featured */}
        <article className="bl-feat">
          <div className="bl-feat-art">
            <div className="bl-feat-glyph">{BLOG.featured.glyph}</div>
            <div className="bl-feat-rays"></div>
            <div className="bl-feat-stars"></div>
          </div>
          <div className="bl-feat-body">
            <div className="bl-feat-cat">{BLOG.featured.cat}</div>
            <h2>{BLOG.featured.title}</h2>
            <p className="bl-feat-sub">{BLOG.featured.sub}</p>
            <p className="bl-feat-excerpt">{BLOG.featured.excerpt}</p>
            <div className="bl-feat-meta">
              <span>{BLOG.featured.author}</span>
              <span className="dot">·</span>
              <span>{BLOG.featured.date}</span>
              <span className="dot">·</span>
              <span>{BLOG.featured.read}</span>
              <span className="moon">{BLOG.featured.moon}</span>
            </div>
            <a className="btn-link big">Leer la entrada completa ↦</a>
          </div>
        </article>

        <div className="cd-divider">
          <span className="line"></span>
          <span className="symbol">ÚLTIMAS ANOTACIONES</span>
          <span className="line"></span>
        </div>

        <div className="bl-posts">
          {BLOG.posts.map((p, i) => (
            <article className="bl-post" key={i}>
              <div className="bl-post-num">{p.num}</div>
              <div className="bl-post-art">
                <span className="g">{p.glyph}</span>
                <span className="m">{p.moon}</span>
              </div>
              <div className="bl-post-body">
                <div className="cat">{p.cat}</div>
                <h4>{p.title}</h4>
                <div className="meta">
                  <span>{p.author}</span>
                  <span className="dot">·</span>
                  <span>{p.date}</span>
                  <span className="dot">·</span>
                  <span>{p.read}</span>
                </div>
              </div>
              <span className="bl-post-arrow">↦</span>
            </article>
          ))}
        </div>

        <div className="bl-pag">
          <a className="prev">← Más viejas</a>
          <span>I · II · III · IV · V</span>
          <a className="next">Más recientes →</a>
        </div>
      </main>

      <aside className="bl-aside">
        <section className="db-card">
          <div className="db-card-head">
            <h3>Boletín lunar</h3>
            <span className="cd-eyebrow small">MENSUAL</span>
          </div>
          <p className="bl-news-p">Una carta cada luna nueva. Lo que las maestras leen, escriben y observan en el cielo.</p>
          <div className="ck-sum-promo" style={{padding: '0', marginTop: '10px'}}>
            <input type="email" placeholder="tu correo"/>
            <button>Suscribir</button>
          </div>
        </section>

        <section className="db-card">
          <div className="db-card-head">
            <h3>Las plumas</h3>
            <span className="cd-eyebrow small">IV MAESTRAS</span>
          </div>
          <div className="bl-authors">
            {BLOG.authors.map((a, i) => (
              <div className="bl-author" key={i}>
                <span className="g">{a.glyph}</span>
                <div>
                  <strong>{a.name}</strong>
                  <span>{a.posts} entradas</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="db-card db-reco">
          <div className="cd-eyebrow small">SERIE EN CURSO</div>
          <h3>{BLOG.serie.title}</h3>
          <p>{BLOG.serie.sub}</p>
          <div className="bl-serie-meta"><span>{BLOG.serie.glyph}</span>{BLOG.serie.count}</div>
          <a className="btn-link">Seguir la serie ↦</a>
        </section>
      </aside>
    </div>

    <Foot/>
  </div>
);

window.Blog = Blog;

const MobileBlog = () => (
  <div className="phone">
    <div className="phone-status"><span>21:08</span><span className="right">✦ ◐ ▮</span></div>
    <div className="phone-content">
      <div className="m-nav"><span className="m-back">☰ Diario</span><div className="m-menu"><span></span><span></span></div></div>
      <header className="m-bl-head">
        <div className="cd-eyebrow">— DIARIO —</div>
        <h1>Al margen del <em>oficio</em></h1>
      </header>
      <div className="m-bl-cats">
        {BLOG.cats.slice(0,4).map((c,i) => (
          <span className={`pill ${c.on ? 'on' : ''}`} key={i}>{c.name}</span>
        ))}
      </div>
      <article className="m-bl-feat">
        <div className="art">{BLOG.featured.glyph}</div>
        <div className="cat">{BLOG.featured.cat}</div>
        <h2>{BLOG.featured.title}</h2>
        <div className="meta">{BLOG.featured.author} · {BLOG.featured.date} · {BLOG.featured.read}</div>
      </article>
      <div className="m-bl-list">
        {BLOG.posts.slice(0,4).map((p,i) => (
          <div className="m-bl-post" key={i}>
            <span className="num">{p.num}</span>
            <div className="body">
              <div className="cat">{p.cat}</div>
              <h4>{p.title}</h4>
              <div className="meta">{p.author} · {p.date}</div>
            </div>
            <span className="moon">{p.moon}</span>
          </div>
        ))}
      </div>
      <div className="m-foot">✦ MMXXVI · HUMANO · HUMANO</div>
    </div>
  </div>
);

window.MobileBlog = MobileBlog;
