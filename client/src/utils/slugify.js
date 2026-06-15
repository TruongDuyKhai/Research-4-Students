/**
 * Slugify a string, removing Vietnamese accents and formatting for URL paths
 * @param {string} str 
 * @returns {string} formatted slug
 */
export function slugify(str) {
  if (!str) return '';
  let slug = str.toLowerCase().trim();
  
  // Convert Vietnamese accented characters
  slug = slug.replace(/[áàảãạăắằẳẵặâấầẩẫậ]/g, 'a');
  slug = slug.replace(/[éèẻẽẹêếềểễệ]/g, 'e');
  slug = slug.replace(/[íìỉĩị]/g, 'i');
  slug = slug.replace(/[óòỏõọôốồổỗộơớờởỡợ]/g, 'o');
  slug = slug.replace(/[úùủũụưứừửữự]/g, 'u');
  slug = slug.replace(/[ýỳỷỹỵ]/g, 'y');
  slug = slug.replace(/đ/g, 'd');
  
  // Strip non-alphanumeric characters, convert spaces to hyphens
  slug = slug.replace(/[^a-z0-9\s-]/g, '');
  slug = slug.replace(/\s+/g, '-');
  slug = slug.replace(/-+/g, '-');
  
  // Remove leading and trailing hyphens
  return slug.replace(/^-+|-+$/g, '');
}
