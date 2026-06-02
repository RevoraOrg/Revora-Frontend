import React from 'react';
import { CheckCircle, XCircle, Circle } from 'lucide-react';
import { evaluatePasswordStrength } from '../utils/passwordStrength';

interface PasswordStrengthProps {
  password: string;
  inputId: string;
}

const RULES_CONFIG: { key: keyof ReturnType<typeof evaluatePasswordStrength>['rules']; label: string }[] = [
  { key: 'minLength', label: 'At least 12 characters' },
  { key: 'hasUpper', label: 'At least one uppercase letter' },
  { key: 'hasLower', label: 'At least one lowercase letter' },
  { key: 'hasNumber', label: 'At least one number' },
  { key: 'hasSpecial', label: 'At least one special character' },
];

export const PasswordStrength: React.FC<PasswordStrengthProps> = ({ password, inputId }) => {
  const result = evaluatePasswordStrength(password);
  const isEmpty = password.length === 0;

  const ruleListId = `${inputId}-rules`;
  const strengthLabelId = `${inputId}-strength-label`;

  return (
    <div className="mt-2">
      {/* Live region for screen readers */}
      <div
        id={strengthLabelId}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {!isEmpty && `Password strength: ${result.label}. ${result.score} of 5 rules met.`}
      </div>

      {/* Visual strength bar */}
      {!isEmpty && (
        <div
          className="strength-bar"
          role="progressbar"
          aria-valuenow={result.score}
          aria-valuemin={0}
          aria-valuemax={5}
          aria-label={`Password strength: ${result.label}`}
        >
          {Array.from({ length: 5 }, (_, i) => (
            <div
              key={i}
              className={`strength-segment ${i < result.score ? `active ${result.level}` : ''}`}
            />
          ))}
        </div>
      )}

      {/* Strength label text */}
      {!isEmpty && (
        <p className="mt-1 text-xs font-medium" style={{ color: getLevelColor(result.level) }}>
          {result.label}
        </p>
      )}

      {/* Rule checklist */}
      <div
        id={ruleListId}
        className="rule-list"
        role="list"
        aria-label="Password requirements"
      >
        {RULES_CONFIG.map((rule) => {
          const met = result.rules[rule.key];
          let stateClass = 'pending';
          let Icon = Circle;

          if (!isEmpty) {
            if (met) {
              stateClass = 'pass';
              Icon = CheckCircle;
            } else {
              stateClass = 'fail';
              Icon = XCircle;
            }
          }

          return (
            <div key={rule.key} className={`rule-item ${stateClass}`} role="listitem">
              <Icon size={14} aria-hidden="true" />
              <span>
                {isEmpty ? (
                  rule.label
                ) : (
                  <>
                    <span className="sr-only">{met ? 'Requirement met:' : 'Requirement not met:'}</span>
                    {rule.label}
                  </>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

function getLevelColor(level: string): string {
  switch (level) {
    case 'weak':
      return 'var(--error)';
    case 'medium':
      return '#f59e0b';
    case 'strong':
      return 'var(--success)';
    default:
      return 'var(--text-muted)';
  }
}
