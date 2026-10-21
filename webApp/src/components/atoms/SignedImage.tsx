interface Props {
  src: string;
  alt: string;
  className?: string;
  loading?: "lazy" | "eager";
}

/** `<img>` para URLs firmadas de `uploads`. No es `next/image`: el optimizador cachearia la imagen
 *  4 h (v16) y una URL firmada vence en 1 h y cambia de token en cada render. */
export default function SignedImage({ src, alt, className, loading = "lazy" }: Props) {
  // eslint-disable-next-line @next/next/no-img-element -- ver el comentario del componente.
  return <img src={src} alt={alt} loading={loading} decoding="async" className={className} />;
}
