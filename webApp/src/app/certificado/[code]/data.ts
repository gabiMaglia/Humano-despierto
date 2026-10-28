import { cache } from "react";
import { getPublicCertificate } from "@/lib/server/certificates";

/** Una sola lectura por request: la comparten el layout (decide el 404) y la página. */
export const loadCertificate = cache(getPublicCertificate);
