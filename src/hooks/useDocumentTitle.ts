import { useEffect } from "react";

const APP_TITLE = "Revora";

export function formatDocumentTitle(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) {
    return APP_TITLE;
  }
  return `${trimmed} - ${APP_TITLE}`;
}

export function useDocumentTitle(title: string): void {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = formatDocumentTitle(title);

    return () => {
      document.title = previousTitle;
    };
  }, [title]);
}
