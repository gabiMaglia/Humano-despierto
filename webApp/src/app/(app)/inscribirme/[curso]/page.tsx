"use client";

import { useState } from "react";
import SectionDivider from "@/components/atoms/SectionDivider";
import { cn } from "@/lib/utils/cn";

const CHECKOUT = {
  course: { num:"II", tag:"Tarot · Maestría", title:"Tarot iniciático", subtitle:"los 22 arcanos como espejo del alma", maestra:"Sol Mayor", weeks:"10 semanas", sessions:"XXI sesiones", cohort:"Luna nueva · 6 mayo MMXXVI", spots:"XII de XV plazas tomadas" },
  pricing: {
    full:  { label:"Pago único",    price:"$ 280", sub:"Una sola ofrenda · ahorrás $ 20", best:true  },
    three: { label:"Tres lunas",    price:"$ 100", sub:"× 3 meses · primera al inscribir", best:false },
    beca:  { label:"Beca parcial",  price:"$ 140", sub:"Solicitada al cierre · plazas limitadas", best:false },
  },
  includes: [
    "Acceso de por vida a las grabaciones",
    "21 sesiones live por Zoom con Sol",
    "Mazo de tarot Marsella enviado",
    "Cuaderno de bitácora encuadernado",
    "Círculo cerrado de práctica",
  ],
} as const;

const STEPS = ["Cohorte","Plan","Datos","Pacto"] as const;
const STEP_NUMS = ["I","II","III","IV"] as const;

type PlanKey = keyof typeof CHECKOUT.pricing;

function FieldWrapper({ label, hint, full, children }: { label: string; hint?: string; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={cn("flex flex-col gap-1.5", full ? "col-span-2" : "")}>
      <label className="font-display text-eyebrow tracking-cosmic text-ink-soft">
        {label}
        {hint && <span className="ml-2 text-ink-faint italic font-body">— {hint} —</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = "rounded-ritual border border-lila-300/20 bg-cosmos-surface px-3.5 py-2.5 font-body text-sm text-ink placeholder:text-ink-faint outline-none focus:border-lila-300/50 transition-colors";

export default function CheckoutPage() {
  const [plan, setPlan] = useState<PlanKey>("full");
  const selectedPlan = CHECKOUT.pricing[plan];

  return (
    <div className="min-h-screen bg-cosmos-0 text-ink">
      {/* Top bar */}
      <header className="border-b border-lila-300/18 bg-cosmos-surface px-6 py-4 flex flex-wrap items-center gap-4 md:gap-8">
        <a href="/cursos/tarot-iniciatico" className="font-display text-eyebrow tracking-cosmic text-ink-soft hover:text-lila-300 transition-colors whitespace-nowrap">
          ← Volver al curso
        </a>

        {/* Step indicator */}
        <div className="flex flex-1 items-center justify-center gap-2 md:gap-3">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={cn("flex h-7 w-7 items-center justify-center rounded-full border font-display text-[10px] transition-colors",
                i === 1 ? "border-lila-300 bg-lila-300/15 text-lila-300" :
                i < 1   ? "border-gold-400 bg-gold-400/15 text-gold-400"  :
                          "border-lila-300/20 text-ink-faint")}>
                {i < 1 ? "✓" : STEP_NUMS[i]}
              </div>
              <span className={cn("hidden sm:block font-display text-eyebrow tracking-cosmic",
                i === 1 ? "text-lila-300" : i < 1 ? "text-ink-soft" : "text-ink-faint")}>
                {s}
              </span>
              {i < 3 && <div className="h-px w-6 bg-lila-300/18" />}
            </div>
          ))}
        </div>

        <div className="font-display text-eyebrow tracking-cosmic text-ink-faint whitespace-nowrap">
          <span className="text-gold-400">✦</span> Pago seguro
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10 md:px-12 grid gap-8 lg:grid-cols-[1fr_360px]">

        {/* MAIN — form */}
        <main className="min-w-0 space-y-10">
          <div>
            <p className="mb-2 font-display text-eyebrow tracking-[0.25em] text-ink-faint">— Paso II de IV —</p>
            <h1 className="font-display text-display-md text-ink mb-3">
              Elegí cómo querés <em className="font-quote italic text-lila-300">sellar el pacto</em>
            </h1>
            <p className="font-quote italic text-lg text-ink-soft leading-relaxed">
              Tres caminos, el mismo recorrido. Quien necesite un puente más liviano puede pedir beca al final del paso III.
            </p>
          </div>

          {/* Plan cards */}
          <div className="space-y-3">
            {(Object.entries(CHECKOUT.pricing) as [PlanKey, typeof CHECKOUT.pricing[PlanKey]][]).map(([key, p]) => (
              <label key={key}
                className={cn("relative flex cursor-pointer items-start gap-4 rounded-ritual border p-5 transition-colors",
                  plan === key ? "border-lila-300/60 bg-lila-300/[0.06]" : "border-lila-300/20 hover:border-lila-300/40"
                )}>
                <input type="radio" name="plan" className="sr-only" checked={plan === key} onChange={() => setPlan(key)} />
                {p.best && (
                  <span className="absolute -top-3 left-4 font-display text-eyebrow tracking-cosmic text-cosmos-0 bg-gold-400 px-2.5 py-0.5 rounded-pill">
                    ★ Más elegido
                  </span>
                )}
                <span className={cn("mt-0.5 h-4 w-4 flex-none rounded-full border-2 flex items-center justify-center transition-colors",
                  plan === key ? "border-lila-300" : "border-lila-300/40")}>
                  {plan === key && <span className="h-2 w-2 rounded-full bg-lila-300" />}
                </span>
                <div className="flex-1">
                  <div className="flex items-baseline gap-3">
                    <span className="font-display text-sm tracking-wide text-ink">{p.label}</span>
                    <span className="font-display text-2xl text-gold-400">{p.price}</span>
                  </div>
                  <p className="font-body text-xs text-ink-soft mt-0.5">{p.sub}</p>
                </div>
              </label>
            ))}
          </div>

          {/* Form fields */}
          <section>
            <SectionDivider label="Quién cruza el umbral" className="mb-6" />
            <div className="grid grid-cols-2 gap-4">
              <FieldWrapper label="Tu nombre completo" full>
                <input type="text" defaultValue="Lía Marechal Iturri" className={inputCls} />
              </FieldWrapper>
              <FieldWrapper label="Correo del alma">
                <input type="email" defaultValue="lia@correo.holistic" className={inputCls} />
              </FieldWrapper>
              <FieldWrapper label="Teléfono · WhatsApp">
                <input type="tel" defaultValue="+54 11 5544 ··" className={inputCls} />
              </FieldWrapper>
              <FieldWrapper label="Fecha de nacimiento">
                <input type="text" defaultValue="11 / 07 / 1992" className={inputCls} />
              </FieldWrapper>
              <FieldWrapper label="Lugar de nacimiento">
                <input type="text" placeholder="Ciudad · país" className={inputCls} />
              </FieldWrapper>
              <FieldWrapper label="¿Qué te trae al tarot?" hint="en una o dos frases" full>
                <textarea rows={3} placeholder="Hace tiempo que un mazo me espera..." className={cn(inputCls, "resize-none")} />
              </FieldWrapper>
            </div>
          </section>

          {/* Payment method */}
          <section>
            <SectionDivider label="Forma de ofrenda" className="mb-6" />
            <div className="space-y-3 mb-6">
              {[
                { icon:"▭", title:"Tarjeta de crédito o débito", sub:"Visa · Mastercard · Amex", active:true  },
                { icon:"◍", title:"MercadoPago",                  sub:"Pago en pesos · cuotas",  active:false },
                { icon:"⬚", title:"Transferencia bancaria",       sub:"Solo pago único",          active:false },
              ].map((m) => (
                <label key={m.title} className={cn("flex items-center gap-4 cursor-pointer rounded-ritual border p-4 transition-colors",
                  m.active ? "border-lila-300/40 bg-lila-300/[0.04]" : "border-lila-300/18 hover:border-lila-300/30")}>
                  <span className={cn("flex-none text-xl", m.active ? "text-lila-300" : "text-ink-faint")}>{m.icon}</span>
                  <div>
                    <p className={cn("font-display text-sm tracking-wide", m.active ? "text-ink" : "text-ink-soft")}>{m.title}</p>
                    <p className="font-body text-xs text-ink-faint">{m.sub}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="relative col-span-2">
                <input type="text" placeholder="•••• •••• •••• ••••" className={cn(inputCls, "w-full pr-10")} />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gold-400">✦</span>
              </div>
              <input type="text" placeholder="MM / AA"  className={inputCls} />
              <input type="text" placeholder="CVV"      className={inputCls} />
            </div>
          </section>

          {/* Consent */}
          <div className="space-y-3">
            {[
              "Acepto el código del oficio y los términos del recorrido.",
              "Quiero recibir la luna nueva en mi correo (boletín mensual)",
            ].map((label, i) => (
              <label key={label} className="flex items-start gap-3 cursor-pointer">
                <span className={cn("mt-0.5 h-4 w-4 flex-none rounded-sm border border-lila-300/40 flex items-center justify-center text-[8px]",
                  i === 0 ? "bg-lila-300/20 text-lila-300" : "text-transparent")}>
                  {i === 0 && "✦"}
                </span>
                <span className="font-body text-sm text-ink-soft">{label}</span>
              </label>
            ))}
          </div>

          {/* Submit */}
          <div className="flex flex-col items-start gap-3">
            <button className="btn-ritual btn-ritual-primary rounded-pill text-base">
              Sellar el pacto · {selectedPlan.price} ↦
            </button>
            <span className="font-display text-eyebrow tracking-cosmic text-ink-faint">
              ✦ Procesamiento encriptado · 14 días para el reintegro
            </span>
          </div>
        </main>

        {/* ASIDE — order summary */}
        <aside>
          <div className="cosmos-card overflow-hidden sticky top-6">
            <div className="border-b border-lila-300/18 px-5 py-4">
              <span className="font-display text-eyebrow tracking-cosmic text-ink-faint uppercase">Tu inscripción</span>
            </div>

            {/* Course summary */}
            <div className="border-b border-lila-300/18 px-5 py-5">
              <div className="mb-1 font-display text-4xl text-lila-300/40">{CHECKOUT.course.num}</div>
              <p className="mb-0.5 font-display text-eyebrow tracking-[0.15em] text-gold-400 uppercase">{CHECKOUT.course.tag}</p>
              <h3 className="mb-1 font-display text-lg tracking-wide text-ink">{CHECKOUT.course.title}</h3>
              <p className="mb-3 font-quote italic text-sm text-ink-soft">{CHECKOUT.course.subtitle}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 font-display text-eyebrow tracking-cosmic text-ink-faint">
                <span>✦ {CHECKOUT.course.maestra}</span>
                <span>☾ {CHECKOUT.course.weeks}</span>
                <span>○ {CHECKOUT.course.sessions}</span>
              </div>
            </div>

            {/* Cohort */}
            <div className="border-b border-lila-300/18 px-5 py-4">
              <p className="mb-1 font-display text-eyebrow tracking-cosmic text-ink-faint uppercase">Próxima cohorte</p>
              <p className="mb-2 font-display text-sm tracking-wide text-lila-300">{CHECKOUT.course.cohort}</p>
              <div className="mb-1 h-1.5 rounded-full bg-lila-300/18 overflow-hidden">
                <div className="h-full rounded-full bg-gold-400/60 w-4/5" />
              </div>
              <p className="font-display text-eyebrow tracking-cosmic text-ink-faint">{CHECKOUT.course.spots}</p>
            </div>

            {/* Includes */}
            <div className="border-b border-lila-300/18 px-5 py-4">
              <p className="mb-3 font-display text-eyebrow tracking-cosmic text-ink-faint uppercase">Incluye</p>
              <div className="space-y-2">
                {CHECKOUT.includes.map((item) => (
                  <div key={item} className="flex items-start gap-2">
                    <span className="flex-none text-gold-400 text-xs mt-0.5">✦</span>
                    <span className="font-body text-xs text-ink-soft">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="border-b border-lila-300/18 px-5 py-4 space-y-2">
              <div className="flex justify-between font-body text-sm text-ink-soft">
                <span>{selectedPlan.label}</span>
                <span>{selectedPlan.price}</span>
              </div>
              {plan === "full" && (
                <div className="flex justify-between font-body text-xs text-ink-faint">
                  <span>Descuento pago único</span>
                  <span>− $ 20</span>
                </div>
              )}
              <div className="flex justify-between font-display text-sm tracking-wide text-ink pt-1 border-t border-lila-300/18">
                <span>Total a sellar</span>
                <span className="text-gold-400 text-base">{selectedPlan.price}</span>
              </div>
            </div>

            {/* Promo code */}
            <div className="flex gap-2 px-5 py-4">
              <input type="text" placeholder="Código de invitación"
                className="flex-1 rounded-ritual border border-lila-300/20 bg-cosmos-0 px-3 py-2 font-body text-xs text-ink placeholder:text-ink-faint outline-none focus:border-lila-300/40" />
              <button className="rounded-ritual border border-lila-300/30 px-3 py-2 font-display text-eyebrow tracking-cosmic text-lila-300 hover:bg-lila-300/10 transition-colors">
                Aplicar
              </button>
            </div>
          </div>

          {/* Help widget */}
          <div className="mt-4 cosmos-card p-5 flex gap-4">
            <span className="text-2xl text-gold-400 flex-none">☉</span>
            <div>
              <p className="mb-1 font-display text-sm tracking-wide text-ink">¿Dudás antes de cruzar?</p>
              <p className="mb-2 font-body text-xs text-ink-soft">Hablá con una guía. 15 minutos, sin compromiso.</p>
              <a href="#" className="font-display text-eyebrow tracking-cosmic text-lila-300 hover:text-gold-400 transition-colors">Pedir conversación ↦</a>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
