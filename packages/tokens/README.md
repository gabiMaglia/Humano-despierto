# @humano/tokens — histórico

**Este paquete conserva la paleta Cosmos (oscuro, lila y dorado) y NO es la fuente de verdad del
diseño actual.** El lenguaje vigente es «Brote» (ADR-015, spec
`docs/superpowers/specs/2026-10-22-rediseno-brote-design.md`) y sus tokens viven en
`webApp/src/styles/tokens.css`.

Nadie lo importa: `webApp` usa su propio `tokens.css` y `mobileApp/` está vacío y fuera de alcance.
Se deja para cuando vuelva el móvil; ese día se regenera desde `tokens.css` en vez de mantener dos
copias que se desfasan (por eso no se migró a Brote ahora: sería código sin consumidor ni forma de
probarlo). No importar desde `webApp`.
