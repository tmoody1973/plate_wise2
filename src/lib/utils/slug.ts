/**
 * Convert a recipe title to a URL-friendly slug
 */
export function createRecipeSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim() // Remove whitespace
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Generate a unique slug by appending the full ID
 */
export function createUniqueRecipeSlug(title: string, id: string): string {
  const baseSlug = createRecipeSlug(title);
  
  return baseSlug ? `${baseSlug}-${id}` : id;
}