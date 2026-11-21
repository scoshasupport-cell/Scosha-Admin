const slugifyLib = require('slugify');

function slugify(text, options = {}) {
  return slugifyLib(String(text || ''), {
    lower: true,
    strict: true,
    trim: true,
    ...options,
  });
}

function uniqueSlug(text, suffix) {
  const base = slugify(text);
  if (!suffix) return base;
  return `${base}-${slugify(String(suffix))}`;
}

module.exports = {
  slugify,
  uniqueSlug,
};
