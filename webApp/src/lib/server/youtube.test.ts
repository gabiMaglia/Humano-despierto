import { describe, expect, it } from "vitest";
import { extractYoutubeVideoId } from "./youtube";

describe("extractYoutubeVideoId", () => {
  it("acepta watch?v=, youtu.be, /embed/ y /shorts/", () => {
    expect(extractYoutubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s")).toBe("dQw4w9WgXcQ");
    expect(extractYoutubeVideoId("https://youtu.be/dQw4w9WgXcQ?si=abc")).toBe("dQw4w9WgXcQ");
    expect(extractYoutubeVideoId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(extractYoutubeVideoId("https://m.youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("rechaza lo que no tiene forma de id de 11 caracteres", () => {
    expect(extractYoutubeVideoId("https://www.youtube.com/watch?v=corto")).toBeNull();
    expect(extractYoutubeVideoId("https://vimeo.com/123456")).toBeNull();
    expect(extractYoutubeVideoId("no es una url")).toBeNull();
    expect(extractYoutubeVideoId("")).toBeNull();
  });
});
