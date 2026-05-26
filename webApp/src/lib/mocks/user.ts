export const MOCK_USER = {
  id:     "usr_mock_001",
  name:   "Lía Morales",
  email:  "lia@humanodespierto.com",
  glyph:  "☽",
  role:   "student" as const,
} as const;

export type MockUser = typeof MOCK_USER;
