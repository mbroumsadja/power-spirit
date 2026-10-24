/* power spirit — jeu d'icônes (SVG, 24 × 24, trait 2.25, extrémités arrondies).
   Remplace les emojis structurels (📮 🏠 📄 📎 📤). Les avatars-emoji des personnes restent des emojis : ce sont des identités, pas des icônes.
   Usage : <Icon name="send" />  — décoratif par défaut (aria-hidden) ; passer `label` pour une icône seule. */

const PATHS = {
  bolt: <path d="M13.5 3 5.5 13.5h6L10.5 21l8-10.5h-6z" />,
  send: <><path d="M20.5 3.5 10 14" /><path d="m20.5 3.5-6.5 17-3.5-6.5L4 10.5z" /></>,
  paperclip: <path d="M9.5 8v8a2.5 2.5 0 0 0 5 0V6.5a4.5 4.5 0 0 0-9 0V16a6.5 6.5 0 0 0 13 0V9" />,
  home: <><path d="M3.5 11 12 4l8.5 7" /><path d="M6 9.5V20h12V9.5" /><path d="M10 20v-5.5h4V20" /></>,
  file: <><path d="M6.5 3.5H14l4.5 4.5v12.5h-12z" /><path d="M14 3.5V8h4.5" /></>,
  download: <><path d="M12 4v11" /><path d="m7 10.5 5 5 5-5" /><path d="M5 20h14" /></>,
  upload: <><path d="M12 16V5" /><path d="m7 9.5 5-5 5 5" /><path d="M5 20h14" /></>,
  ban: <><circle cx="12" cy="12" r="8.5" /><path d="m6 6 12 12" /></>,
  x: <><path d="m6 6 12 12" /><path d="m18 6-12 12" /></>,
};

export default function Icon({ name, label, className = "icon", ...rest }) {
  const a11y = label ? { role: "img", "aria-label": label } : { "aria-hidden": true };
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25"
      strokeLinecap="round" strokeLinejoin="round" className={className} {...a11y} {...rest}>
      {PATHS[name]}
    </svg>
  );
}
