// Tailwind v4 is configured CSS-first via @theme in globals.css;
// PostCSS only needs to wire in the new @tailwindcss/postcss plugin.
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
