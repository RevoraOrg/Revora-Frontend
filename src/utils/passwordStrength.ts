export interface PasswordStrengthResult {
  score: number;
  level: 'empty' | 'weak' | 'medium' | 'strong';
  label: string;
  rules: {
    minLength: boolean;
    hasUpper: boolean;
    hasLower: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
  };
}

export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  const rules = {
    minLength: password.length >= 12,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password),
  };

  const score = Object.values(rules).filter(Boolean).length;

  let level: PasswordStrengthResult['level'];
  let label: string;

  if (password.length === 0) {
    level = 'empty';
    label = '';
  } else if (score <= 2) {
    level = 'weak';
    label = 'Weak';
  } else if (score <= 4) {
    level = 'medium';
    label = 'Medium';
  } else {
    level = 'strong';
    label = 'Strong';
  }

  return { score, level, label, rules };
}
