import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    path.join(__dirname, 'src/web/app/**/*.{js,ts,jsx,tsx,mdx}').replace(/\\/g, '/'),
    path.join(__dirname, 'src/web/components/**/*.{js,ts,jsx,tsx,mdx}').replace(/\\/g, '/'),
    path.join(__dirname, 'src/web/hooks/**/*.{js,ts,jsx,tsx,mdx}').replace(/\\/g, '/'),
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}

