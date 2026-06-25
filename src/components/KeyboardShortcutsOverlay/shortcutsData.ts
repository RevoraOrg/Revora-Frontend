export interface Shortcut {
  label: string;
  keys: string[];
}

export interface ShortcutGroup {
  title: string;
  shortcuts: Shortcut[];
}

export const KEYBOARD_SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'Navigation',
    shortcuts: [
      { label: 'Go to Home', keys: ['mod', 'shift', 'h'] },
      { label: 'Go to Dashboard', keys: ['mod', 'shift', 'd'] },
      { label: 'Go to Investor Portal', keys: ['mod', 'shift', 'i'] },
      { label: 'Go to Report Revenue', keys: ['mod', 'shift', 'r'] },
    ],
  },
  {
    title: 'General',
    shortcuts: [
      { label: 'Toggle keyboard shortcuts', keys: ['?'] },
      { label: 'Toggle notifications', keys: ['n'] },
    ],
  },
];
