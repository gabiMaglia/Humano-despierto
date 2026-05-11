/* ============================================
   CHECKOUT — sellar el pacto
   ============================================ */

const CHECKOUT = {
  course: { num: 'II', tag: 'Tarot · Maestría', title: 'Tarot iniciático', subtitle: 'los 22 arcanos como espejo del alma', maestra: 'Sol Mayor', weeks: '10 semanas', sessions: 'XXI sesiones', cohort: 'Luna nueva · 6 mayo MMXXVI', spots: 'XII de XV plazas tomadas' },
  pricing: {
    full: { label: 'Pago único', price: '$ 280', sub: 'Una sola ofrenda · ahorrás $ 20', best: true },
    three: { label: 'Tres lunas', price: '$ 100', sub: '× 3 meses · primera al inscribir', best: false },
    beca: { label: 'Beca parcial', price: '$ 140', sub: 'Solicitada al cierre · plazas limitadas', best: false },
  },
  includes: [
    'Acceso de por vida a las grabaciones',
    '21 sesiones live por Zoom con Sol',
    'Mazo de tarot Marsella enviado',
    'Cuaderno de bitácora encuadernado',
    'Círculo cerrado de práctica',
  ],
};

const Checkout = () => {
  const [step, setStep] = React.useState(2);
  const [pay, setPay] = React.useState('full');

  return (
    <div className="ck">
      <div className="chrome">
        <div className="chrome-dots"><span></span><span></span><span></span></div>
        <div className="chrome-bar">◐ humanohumano.holistic / inscripción / paso II</div>
      </div>

      {/* Top */}
      <header className="ck-top">
        <a className="pl-back">← Volver al curso</a>
        <div className="ck-stepper">
          {['Cohorte','Plan','Datos','Pacto'].map((s, i) => (
            <React.Fragment key={i}>
              <div className={`ck-step ${i+1 === step ? 'active' : ''} ${i+1 < step ? 'done' : ''}`}>
                <span className="num">{['I','II','III','IV'][i]}</span>
                <span className="label">{s}</span>
              </div>
              {i < 3 && <span className="ck-step-sep"></span>}
            </React.Fragment>
          ))}
        </div>
        <div className="ck-secure">
          <span>✦</span> Pago seguro
        </div>
      </header>

      <div className="ck-grid">
        {/* MAIN — formulario */}
        <main className="ck-main">
          <div className="cd-eyebrow">— PASO II DE IV —</div>
          <h1>Elegí cómo querés <em>sellar el pacto</em></h1>
          <p className="ck-lead">Tres caminos, el mismo recorrido. Quien necesite un puente más liviano puede pedir beca al final del paso III.</p>

          {/* Plan options */}
          <div className="ck-plans">
            {Object.entries(CHECKOUT.pricing).map(([key, p]) => (
              <label className={`ck-plan ${pay === key ? 'on' : ''} ${p.best ? 'best' : ''}`} key={key}>
                <input type="radio" name="pay" checked={pay === key} onChange={() => setPay(key)}/>
                {p.best && <span className="ck-plan-best">★ MÁS ELEGIDO</span>}
                <div className="ck-plan-radio">
                  <span className="dot"></span>
                </div>
                <div className="ck-plan-body">
                  <div className="ck-plan-label">{p.label}</div>
                  <div className="ck-plan-price">{p.price}</div>
                  <div className="ck-plan-sub">{p.sub}</div>
                </div>
              </label>
            ))}
          </div>

          {/* Datos del peregrino */}
          <section className="ck-section">
            <div className="cd-divider">
              <span className="line"></span>
              <span className="symbol">QUIÉN CRUZA EL UMBRAL</span>
              <span className="line"></span>
            </div>

            <div className="ck-form">
              <div className="ck-field full">
                <label>Tu nombre completo</label>
                <input type="text" defaultValue="Lía Marechal Iturri"/>
              </div>
              <div className="ck-field">
                <label>Correo del alma</label>
                <input type="email" defaultValue="lia@correo.holistic"/>
              </div>
              <div className="ck-field">
                <label>Teléfono · WhatsApp</label>
                <input type="tel" defaultValue="+54 11 5544 ··"/>
              </div>
              <div className="ck-field">
                <label>Fecha de nacimiento</label>
                <input type="text" defaultValue="11 / 07 / 1992"/>
              </div>
              <div className="ck-field">
                <label>Lugar de nacimiento</label>
                <input type="text" placeholder="Ciudad · país"/>
              </div>
              <div className="ck-field full">
                <label>¿Qué te trae al tarot?
                  <span className="hint">— en una o dos frases —</span>
                </label>
                <textarea rows="3" placeholder="Hace tiempo que un mazo me espera..."></textarea>
              </div>
            </div>
          </section>

          {/* Forma de pago */}
          <section className="ck-section">
            <div className="cd-divider">
              <span className="line"></span>
              <span className="symbol">FORMA DE OFRENDA</span>
              <span className="line"></span>
            </div>
            <div className="ck-paymethods">
              <label className="ck-pm on">
                <input type="radio" name="pm" defaultChecked/>
                <div className="ck-pm-icon">▭</div>
                <div>
                  <div className="t">Tarjeta de crédito o débito</div>
                  <div className="s">Visa · Mastercard · Amex</div>
                </div>
              </label>
              <label className="ck-pm">
                <input type="radio" name="pm"/>
                <div className="ck-pm-icon">◍</div>
                <div>
                  <div className="t">MercadoPago</div>
                  <div className="s">Pago en pesos · cuotas</div>
                </div>
              </label>
              <label className="ck-pm">
                <input type="radio" name="pm"/>
                <div className="ck-pm-icon">⬚</div>
                <div>
                  <div className="t">Transferencia bancaria</div>
                  <div className="s">Solo pago único · sin comisión</div>
                </div>
              </label>
            </div>

            <div className="ck-card-fields">
              <div className="ck-field full">
                <label>Número de tarjeta</label>
                <input type="text" placeholder="•••• •••• •••• ••••"/>
                <span className="ck-card-glyph">✦</span>
              </div>
              <div className="ck-field">
                <label>Vencimiento</label>
                <input type="text" placeholder="MM / AA"/>
              </div>
              <div className="ck-field">
                <label>CVV</label>
                <input type="text" placeholder="•••"/>
              </div>
            </div>
          </section>

          <div className="ck-pact-row">
            <label className="ck-check">
              <input type="checkbox" defaultChecked/>
              <span className="box"></span>
              <span>Acepto el <a>código del oficio</a> y los <a>términos del recorrido</a>.</span>
            </label>
            <label className="ck-check">
              <input type="checkbox"/>
              <span className="box"></span>
              <span>Quiero recibir la luna nueva en mi correo (boletín mensual)</span>
            </label>
          </div>

          <div className="ck-cta">
            <a className="btn btn-primary big">
              Sellar el pacto · {CHECKOUT.pricing[pay].price} <span className="arrow">↦</span>
            </a>
            <span className="ck-trust">
              ✦ Procesamiento encriptado · 14 días para el reintegro
            </span>
          </div>
        </main>

        {/* ASIDE — resumen */}
        <aside className="ck-aside">
          <div className="ck-summary">
            <div className="ck-sum-head">
              <span className="cd-eyebrow small">TU INSCRIPCIÓN</span>
            </div>

            <div className="ck-sum-course">
              <div className="num">{CHECKOUT.course.num}</div>
              <div className="ck-sum-tag">{CHECKOUT.course.tag}</div>
              <h3>{CHECKOUT.course.title}</h3>
              <div className="ck-sum-sub">{CHECKOUT.course.subtitle}</div>
              <div className="ck-sum-meta">
                <span>✦ {CHECKOUT.course.maestra}</span>
                <span>☾ {CHECKOUT.course.weeks}</span>
                <span>○ {CHECKOUT.course.sessions}</span>
              </div>
            </div>

            <div className="ck-sum-cohort">
              <div className="lbl">PRÓXIMA COHORTE</div>
              <div className="when">{CHECKOUT.course.cohort}</div>
              <div className="spots">
                <div className="spots-bar"><div className="spots-fill" style={{width: '80%'}}></div></div>
                <span>{CHECKOUT.course.spots}</span>
              </div>
            </div>

            <div className="ck-sum-includes">
              <div className="lbl">INCLUYE</div>
              {CHECKOUT.includes.map((it, i) => (
                <div className="ck-sum-inc" key={i}><span>✦</span>{it}</div>
              ))}
            </div>

            <div className="ck-sum-totals">
              <div className="row">
                <span>{CHECKOUT.pricing[pay].label}</span>
                <span>{CHECKOUT.pricing[pay].price}</span>
              </div>
              {pay === 'full' && (
                <div className="row mut"><span>Descuento por pago único</span><span>− $ 20</span></div>
              )}
              <div className="row total">
                <span>Total a sellar</span>
                <span className="amt">{CHECKOUT.pricing[pay].price}</span>
              </div>
            </div>

            <div className="ck-sum-promo">
              <input type="text" placeholder="Código de invitación"/>
              <button>Aplicar</button>
            </div>
          </div>

          <div className="ck-help">
            <div className="ck-help-glyph">☉</div>
            <div>
              <strong>¿Dudás antes de cruzar?</strong>
              <p>Hablá con una guía. 15 minutos, sin compromiso.</p>
              <a className="btn-link">Pedir conversación ↦</a>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

window.Checkout = Checkout;

/* MOBILE */
const MobileCheckout = () => (
  <div className="phone">
    <div className="phone-status">
      <span>21:08</span>
      <span className="right">✦ ◐ ▮</span>
    </div>
    <div className="phone-content">
      <div className="m-nav">
        <span className="m-back">← Volver</span>
        <div className="m-menu"><span></span><span></span></div>
      </div>

      <div className="m-ck-stepper">
        {['I','II','III','IV'].map((n, i) => (
          <span className={`step ${i === 1 ? 'on' : ''} ${i < 1 ? 'done' : ''}`} key={i}>{n}</span>
        ))}
      </div>

      <header className="m-ck-head">
        <div className="cd-eyebrow">— PASO II DE IV —</div>
        <h1>Sellá el <em>pacto</em></h1>
      </header>

      <section className="m-ck-course">
        <div className="num">II</div>
        <div className="body">
          <div className="tag">Tarot · Maestría</div>
          <h3>Tarot iniciático</h3>
          <div className="meta">Sol Mayor · 10 sem · 6 may</div>
        </div>
      </section>

      <section className="m-ck-plans">
        <div className="cd-divider">
          <span className="line"></span>
          <span className="symbol">PLAN</span>
          <span className="line"></span>
        </div>
        <label className="m-ck-plan on">
          <span className="ic"></span>
          <div>
            <div className="t">Pago único</div>
            <div className="s">Ahorrás $ 20</div>
          </div>
          <div className="p">$ 280</div>
        </label>
        <label className="m-ck-plan">
          <span className="ic"></span>
          <div>
            <div className="t">Tres lunas</div>
            <div className="s">3 × meses</div>
          </div>
          <div className="p">$ 100</div>
        </label>
      </section>

      <section className="m-ck-form">
        <div className="cd-divider">
          <span className="line"></span>
          <span className="symbol">DATOS</span>
          <span className="line"></span>
        </div>
        <div className="ck-field full">
          <label>Nombre</label>
          <input type="text" defaultValue="Lía Marechal"/>
        </div>
        <div className="ck-field full">
          <label>Correo</label>
          <input type="email" defaultValue="lia@correo.holistic"/>
        </div>
        <div className="ck-field full">
          <label>Tarjeta</label>
          <input type="text" placeholder="•••• •••• •••• ••••"/>
        </div>
      </section>

      <div className="m-ck-cta">
        <div className="amt">Total · $ 280</div>
        <a className="btn btn-primary">Sellar el pacto ↦</a>
        <span className="trust">✦ 14 días de reintegro</span>
      </div>

      <div className="m-foot">✦ MMXXVI · HUMANO · HUMANO</div>
    </div>
  </div>
);

window.MobileCheckout = MobileCheckout;
