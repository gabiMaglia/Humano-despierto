/** Sólo existe si la escuela configuró su número (`NEXT_PUBLIC_WHATSAPP_URL`, p. ej.
 *  `https://wa.me/549...`). Sin la variable no se dibuja: un botón de contacto que no lleva a nadie
 *  es peor que ninguno (C-02). */
export default function WhatsAppFloat() {
  const href = process.env.NEXT_PUBLIC_WHATSAPP_URL;
  if (!href || !/^https:\/\//.test(href)) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escribinos por WhatsApp (se abre en otra pestaña)"
      className="fixed bottom-[22px] left-[22px] z-30 grid h-[54px] w-[54px] place-items-center rounded-full bg-[#25D366] shadow-float"
    >
      <svg viewBox="0 0 24 24" className="h-7 w-7 fill-white" aria-hidden="true" focusable="false">
        <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.6.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.9 11.9 0 0 0 4.5 4c1.7.7 2.3.8 3.1.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.2c0-.1-.2-.2-.4-.3z" />
      </svg>
    </a>
  );
}
