"use client";

import { useState } from "react";
import SectionDivider from "@/components/atoms/SectionDivider";
import { LESSON } from "@/lib/mocks/player";

const STATE_ICON: Record<string, string> = { done:"✓", current:"▶", locked:"⌗" };

export default function PlayerPage() {
  const [tab, setTab] = useState<"modulos" | "notas" | "recursos">("notas");
  const L = LESSON;

  return (
    <div className="flex flex-col min-h-screen bg-cosmos-0 text-ink">
      {/* Top bar */}
      <header className="flex items-center justify-between gap-4 border-b border-lila-300/18 bg-cosmos-surface px-5 py-3">
        <a href="/cursos/tarot-iniciatico" className="font-display text-eyebrow tracking-cosmic text-ink-soft hover:text-lila-300 transition-colors whitespace-nowrap">
          ← {L.course}
        </a>
        <div className="hidden sm:flex items-center gap-2 font-display text-eyebrow tracking-cosmic text-ink-faint">
          <span>{L.courseNum}</span>
          <span className="text-lila-300/30">·</span>
          <span>{L.module}</span>
          <span className="text-lila-300/30">·</span>
          <span className="text-lila-300">Lección {L.lessonNum}</span>
        </div>
        <div className="flex items-center gap-1.5 font-display text-eyebrow tracking-cosmic text-lila-300">
          <span className="h-1.5 w-1.5 rounded-full bg-gold-400 animate-pulse" style={{ boxShadow:"0 0 6px #f5d76e" }} />
          Cohorte XII
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* MAIN */}
        <main className="flex-1 flex flex-col min-w-0 overflow-auto">

          {/* Video stage */}
          <div className="relative aspect-video max-h-[55vh] bg-cosmos-1 overflow-hidden">
            {/* Card spread (Celtic cross visual) */}
            <div className="absolute inset-0 flex items-center justify-center">
              {[
                {x:50,y:50,r:0,primary:true},{x:50,y:50,r:90,primary:true},
                {x:50,y:20,r:0},{x:50,y:80,r:0},{x:20,y:50,r:0},{x:80,y:50,r:0},
                {x:88,y:20,r:0},{x:88,y:43,r:0},{x:88,y:66,r:0},{x:88,y:88,r:0},
              ].map((c, i) => (
                <div key={i} className={`absolute h-14 w-10 rounded-ritual border flex flex-col items-center justify-center gap-1 ${c.primary ? "border-lila-300/60 bg-lila-300/10 shadow-lila-glow" : "border-lila-300/20 bg-cosmos-surface/60"}`}
                  style={{ left:`${c.x}%`, top:`${c.y}%`, transform:`translate(-50%,-50%) rotate(${c.r}deg)` }}>
                  <span className="font-display text-[7px] tracking-wide text-lila-300/60">{["I","II","III","IV","V","VI","VII","VIII","IX","X"][i]}</span>
                  <span className="text-gold-400 text-xs">{["☉","☽","♀","♂","♃","♄","♅","♆","♇","✦"][i]}</span>
                </div>
              ))}
            </div>
            {/* Overlay */}
            <div className="absolute inset-0" style={{ background:"linear-gradient(to top, rgba(10,4,24,0.9) 0%, transparent 50%)" }} />
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <p className="mb-1 font-display text-eyebrow tracking-cosmic text-gold-400">En vivo hace 4 días · Grabado</p>
              <h1 className="font-display text-xl tracking-wide text-ink mb-1">{L.title}</h1>
              <div className="flex items-center gap-2 font-display text-eyebrow tracking-cosmic text-ink-faint">
                <span>{L.maestra}</span><span className="text-lila-300/30">·</span>
                <span>{L.module}</span><span className="text-lila-300/30">·</span>
                <span>{L.duration}</span>
              </div>
            </div>
            {/* Play button */}
            <button className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-16 w-16 rounded-full border-2 border-lila-300/60 bg-cosmos-0/80 flex items-center justify-center text-lila-300 hover:border-gold-400 hover:text-gold-400 transition-colors">
              <svg viewBox="0 0 24 24" className="h-6 w-6 ml-1" fill="currentColor"><path d="M6 4 L20 12 L6 20 Z"/></svg>
            </button>
          </div>

          {/* Controls */}
          <div className="border-b border-lila-300/18 bg-cosmos-surface px-5 py-3 flex items-center gap-4">
            <span className="font-display text-sm text-ink whitespace-nowrap">{L.current} <span className="text-ink-faint">/ {L.duration}</span></span>
            {/* Scrubber */}
            <div className="relative flex-1 h-1.5 rounded-full bg-lila-300/18">
              <div className="absolute left-0 top-0 h-full rounded-full bg-gold-400" style={{ width:`${L.progress * 100}%` }} />
              <div className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-gold-400 border-2 border-cosmos-0" style={{ left:`${L.progress * 100}%` }} />
              {/* Chapter marks */}
              {L.chapters.map((c) => (
                <div key={c.time} className="absolute top-1/2 -translate-y-1/2 h-2 w-0.5 bg-lila-300/40" style={{ left:`${c.t * 100}%` }} title={c.label} />
              ))}
            </div>
            <span className="font-display text-eyebrow tracking-cosmic text-ink-faint">1.0×</span>
          </div>

          {/* Chapters */}
          <div className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-sm tracking-wide text-ink">Capítulos</h3>
              <span className="font-display text-eyebrow tracking-cosmic text-ink-faint">V SECCIONES</span>
            </div>
            <div className="space-y-1">
              {L.chapters.map((c) => {
                const active = c.t <= L.progress && c.t + 0.15 > L.progress;
                return (
                  <div key={c.time} className={`flex items-center gap-3 rounded-ritual px-3 py-2 cursor-pointer transition-colors ${active ? "bg-lila-300/10 border border-lila-300/20" : "hover:bg-cosmos-surface"}`}>
                    <span className="font-display text-eyebrow tracking-cosmic text-ink-faint w-10 flex-none">{c.time}</span>
                    <span className={`font-body text-sm flex-1 ${active ? "text-lila-300" : "text-ink-soft"}`}>{c.label}</span>
                    <span className={`font-display text-xs ${active ? "text-gold-400" : "text-ink-faint"}`}>▸</span>
                  </div>
                );
              })}
            </div>
          </div>
        </main>

        {/* SIDE tabs */}
        <aside className="w-72 flex-none border-l border-lila-300/18 flex-col hidden md:flex">
          {/* Tab bar */}
          <div className="flex border-b border-lila-300/18">
            {(["modulos","notas","recursos"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-3 font-display text-eyebrow tracking-cosmic capitalize transition-colors ${tab === t ? "text-lila-300 border-b-2 border-lila-300" : "text-ink-faint hover:text-ink-soft"}`}>
                {t}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-auto p-4">
            {tab === "modulos" && (
              <div className="space-y-2">
                {L.modules.map((m) => (
                  <div key={m.num} className={`rounded-ritual border p-3 ${m.current ? "border-lila-300/40 bg-lila-300/[0.05]" : m.locked ? "border-lila-300/10 opacity-50" : "border-lila-300/18"}`}>
                    <div className="flex items-center gap-2.5 mb-1">
                      <span className="font-display text-sm text-lila-300 w-5">{m.num}</span>
                      <span className="flex-1 font-display text-[11px] tracking-wide text-ink">{m.title}</span>
                      <span className="font-display text-xs text-ink-faint">{m.done ? "✓" : m.current ? "◐" : "⌗"}</span>
                    </div>
                    {"lessonList" in m && m.lessonList && (
                      <div className="ml-7 mt-2 space-y-1">
                        {m.lessonList.map((l) => (
                          <div key={l.num} className={`flex items-center gap-2 py-1.5 rounded px-2 ${l.state === "current" ? "bg-gold-400/10 border border-gold-400/20" : ""}`}>
                            <span className={`font-display text-[9px] ${l.state === "done" ? "text-lila-300" : l.state === "current" ? "text-gold-400" : "text-ink-faint"}`}>
                              {STATE_ICON[l.state]}
                            </span>
                            <span className="font-display text-[9px] text-ink-faint w-4">{l.num}</span>
                            <span className={`flex-1 font-body text-[11px] truncate ${l.state === "current" ? "text-gold-400" : "text-ink-soft"}`}>{l.title}</span>
                            <span className="font-display text-[9px] text-ink-faint">{l.dur}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {tab === "notas" && (
              <div>
                <div className="mb-4 rounded-ritual border border-lila-300/20 bg-cosmos-surface p-3">
                  <textarea
                    placeholder="Anotá un momento, un símbolo, una sospecha..."
                    rows={3}
                    className="w-full bg-transparent font-body text-sm text-ink placeholder:text-ink-faint outline-none resize-none"
                  />
                  <div className="flex items-center justify-between border-t border-lila-300/10 pt-2 mt-2">
                    <span className="font-display text-eyebrow tracking-cosmic text-ink-faint">⌘ {L.current}</span>
                    <button className="font-display text-eyebrow tracking-cosmic text-lila-300 hover:text-gold-400 transition-colors">Guardar</button>
                  </div>
                </div>
                <div className="space-y-3">
                  {L.notes.map((n) => (
                    <div key={n.time} className="border-l-2 border-lila-300/30 pl-3">
                      <span className="block font-display text-eyebrow tracking-cosmic text-gold-400 mb-1">{n.time}</span>
                      <p className="font-body text-xs text-ink-soft leading-relaxed">{n.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === "recursos" && (
              <div className="space-y-3">
                {L.resources.map((r) => (
                  <div key={r.name} className="flex items-start gap-3 cosmos-card p-3">
                    <span className="flex-none font-display text-eyebrow tracking-cosmic text-gold-400 border border-gold-400/40 rounded px-1.5 py-0.5">{r.type}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-xs text-ink leading-snug">{r.name}</p>
                      <p className="font-display text-eyebrow tracking-cosmic text-ink-faint">{r.size}</p>
                    </div>
                    <span className="flex-none text-lila-300 hover:text-gold-400 transition-colors cursor-pointer">↓</span>
                  </div>
                ))}
                <div className="cosmos-card p-4 mt-4">
                  <p className="mb-1 font-display text-eyebrow tracking-cosmic text-lila-300">Próximo en vivo</p>
                  <h4 className="mb-1 font-display text-sm tracking-wide text-ink">El árbol de la vida</h4>
                  <p className="mb-3 font-display text-eyebrow tracking-cosmic text-gold-400">MAR 30 abr · 19:00</p>
                  <a href="#" className="btn-ritual btn-ritual-ghost rounded-pill text-[10px] py-1.5">Agregar al calendario</a>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
