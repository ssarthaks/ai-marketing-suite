const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

export function randomId(length = 6): string {
  let id = "";
  for (let i = 0; i < length; i++) {
    id += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return id;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

/** Slug with a short random suffix to make collisions practically impossible. */
export function uniqueSlug(input: string): string {
  const base = slugify(input) || "untitled";
  return `${base}-${randomId()}`;
}
