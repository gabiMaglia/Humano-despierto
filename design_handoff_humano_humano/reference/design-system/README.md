# Humano demasiado Humano · Sistema de diseño

Sistema de diseño visual y código para integrar el lenguaje **Cosmos oscuro / Pergamino** en cualquier proyecto Tailwind.

## Archivos
- `tokens.css` — Variables CSS crudas (custom properties). Útil si no usás Tailwind o querés tematizar runtime.
- `tailwind.config.js` — Config completa con colores, fuentes, sombras, animaciones y componentes plugin.
- `index.html` — Catálogo visual navegable (tipografía, paleta, glifos, componentes).

## Instalación rápida en Tailwind

```bash
# 1. Copiá la config
cp design-system/tailwind.config.js .

# 2. Agregá las fuentes (en tu <head> o globals.css)
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&family=Quicksand:wght@300;400;500;600;700&family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400;1,500&family=Cardo:ital,wght@0,400;0,700;1,400&display=swap');

# 3. (opcional) tokens.css si querés CSS variables
@import './design-system/tokens.css';
```

## Tematizado

Cambiá entre cosmos / pergamino con un atributo:

```html
<html data-theme="dark">  <!-- cosmos -->
<html data-theme="light"> <!-- pergamino -->
```

## Vocabulario

- **Display** · Cinzel — títulos, números romanos, eyebrows
- **Body** · Quicksand — UI, párrafos cortos
- **Quote** · Cormorant Garamond italic — citas, bajadas, voz emocional
- **Numerología romana** · Toda numeración pública en romanos (II, III, MMXXVI)
- **Glifos** · ☉ ☽ ✦ ◐ ○ ● ☾ ♀ ♂ ♃ — meta-iconografía cósmica
- **Lunas** · ○ ◐ ◑ ● — estados (próximo / en curso / cerrando / completo)

## Tono

- Sin emojis, sin íconos rounded, sin azules tech.
- Alto contraste de tipografías: serif display + cursiva quote + sans body.
- Espacios generosos, simetría axial, marcas de agua romanas.
- Verbos: *cruzar el umbral, sellar el pacto, sostener, atravesar*.
