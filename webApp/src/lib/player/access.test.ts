import { describe, expect, it } from "vitest";
import { resolvePlayerAccess, type PlayerAccessInput } from "./access";

const nadie: PlayerAccessInput = { isAuthenticated: false, isPreview: false, isEnrolled: false, isOwner: false, isAdmin: false };

describe("resolvePlayerAccess", () => {
  it("anónimo en una no preview: no ve nada", () => {
    expect(resolvePlayerAccess(nadie).canView).toBe(false);
  });

  it("anónimo en una preview: ve el video, sin progreso ni Q&A", () => {
    expect(resolvePlayerAccess({ ...nadie, isPreview: true })).toEqual({
      canView: true,
      fullCurriculum: false,
      canTrackProgress: false,
      canReadQa: false,
      canAsk: false,
      canModerate: false,
    });
  });

  it("sesión sin inscripción en una preview: progreso y pregunta (mismo predicado que 0004)", () => {
    expect(resolvePlayerAccess({ ...nadie, isAuthenticated: true, isPreview: true })).toMatchObject({
      canView: true,
      fullCurriculum: false,
      canTrackProgress: true,
      canAsk: true,
      canModerate: false,
    });
  });

  it("inscripta: todo menos moderar", () => {
    expect(resolvePlayerAccess({ ...nadie, isAuthenticated: true, isEnrolled: true })).toEqual({
      canView: true,
      fullCurriculum: true,
      canTrackProgress: true,
      canReadQa: true,
      canAsk: true,
      canModerate: false,
    });
  });

  it("docente dueña: ve, pregunta y modera, pero no guarda progreso", () => {
    expect(resolvePlayerAccess({ ...nadie, isAuthenticated: true, isOwner: true })).toEqual({
      canView: true,
      fullCurriculum: true,
      canTrackProgress: false,
      canReadQa: true,
      canAsk: true,
      canModerate: true,
    });
  });

  it("admin: ve y modera, no participa ni guarda progreso", () => {
    expect(resolvePlayerAccess({ ...nadie, isAuthenticated: true, isAdmin: true })).toEqual({
      canView: true,
      fullCurriculum: true,
      canTrackProgress: false,
      canReadQa: true,
      canAsk: false,
      canModerate: true,
    });
  });
});
