import React from "react";
import { AlertCircle } from "lucide-react";

interface FormErrorProps {
  message: string | null;
  id?: string;
  className?: string;
}

/**
 * FormError component for displaying accessible error messages in forms.
 * Follows WCAG 2.1 AA guidelines for contrast and screen reader accessibility.
 * Includes a subtle fade-in animation and reduced-motion support.
 */
export const FormError: React.FC<FormErrorProps> = ({
  message,
  id = "form-error",
  className = "",
}) => {
  if (!message) return null;

  return (
    <div
      className={`flex items-center gap-2 p-3 mb-4 rounded-lg bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] text-error text-sm flex items-start animate-fade-in ${className}`}
      role="alert"
      id={id}
      aria-live="assertive"
      aria-atomic="true"
    >
      <AlertCircle size={16} aria-hidden="true" />
      <span className="font-medium">{message}</span>
    </div>
  );
};
