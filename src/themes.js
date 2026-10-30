// Color themes. "Effect" keeps each effect's own palette (like ttfx);
// the rest are Omarchy theme palettes applied to every effect.
export const THEMES = [
  { id: 'effect', label: 'Effect' },
  { id: 'tokyo-night', label: 'Tokyo Night', final: ['7AA2F7', 'BB9AF7', '7DCFFF'], accents: ['F7768E', 'E0AF68', '9ECE6A', '7DCFFF', 'BB9AF7', 'C0CAF5'] },
  { id: 'catppuccin', label: 'Catppuccin', final: ['CBA6F7', 'F5C2E7', '89B4FA'], accents: ['F38BA8', 'FAB387', 'F9E2AF', 'A6E3A1', '89DCEB', 'B4BEFE'] },
  { id: 'gruvbox', label: 'Gruvbox', final: ['FB4934', 'FABD2F', 'B8BB26'], accents: ['FE8019', 'D3869B', '83A598', '8EC07C', 'EBDBB2', 'FABD2F'] },
  { id: 'nord', label: 'Nord', final: ['88C0D0', '81A1C1', 'B48EAD'], accents: ['8FBCBB', '5E81AC', 'A3BE8C', 'EBCB8B', 'D08770', 'ECEFF4'] },
  { id: 'rose-pine', label: 'Rosé Pine', final: ['EB6F92', 'F6C177', 'C4A7E7'], accents: ['EBBCBA', '31748F', '9CCFD8', 'C4A7E7', 'F6C177', 'E0DEF4'] },
  { id: 'everforest', label: 'Everforest', final: ['A7C080', '83C092', 'DBBC7F'], accents: ['E67E80', 'E69875', '7FBBB3', 'D699B6', 'A7C080', 'D3C6AA'] },
  { id: 'kanagawa', label: 'Kanagawa', final: ['7E9CD8', '957FB8', 'E6C384'], accents: ['C34043', 'FFA066', '98BB6C', '7FB4CA', 'D27E99', 'DCD7BA'] },
  { id: 'osaka-jade', label: 'Osaka Jade', final: ['2DD5B7', '549E6A', 'E5C736'], accents: ['FF5345', 'DB9F9C', '509475', 'ACD4CF', '75BBB3', 'F6F5DD'] },
  { id: 'ristretto', label: 'Ristretto', final: ['F38D70', 'F9CC6C', 'ADDA78'], accents: ['FD6883', 'A8A9EB', '85DACC', 'F9CC6C', 'E6D9DB', 'F38D70'] },
  { id: 'matte-black', label: 'Matte Black', final: ['8A8A8D', 'EAEAEA'], accents: ['F59E0B', 'FFFFFF', 'A3A3A3', 'D35F5F', 'E68E0D', 'BEBEBE'] },
  { id: 'synthwave', label: 'Synthwave', final: ['FF2A6D', 'D300C5', '05D9E8'], accents: ['FF2A6D', 'F9C80E', '05D9E8', 'D300C5', 'FF6C11', 'FFFFFF'] },
];
