import { useEffect, useRef, type RefObject } from 'react';

/** Trap focus within a container element. Restores focus on unmount. */
export function useFocusTrap<T extends HTMLElement>(
  active: boolean = true,
): RefObject<T | null> {
  const containerRef = useRef<T | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active || !containerRef.current) return;

    // Save current focus
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Focus first focusable element
    const focusable = getFocusableElements(containerRef.current);
    if (focusable.length > 0) {
      (focusable[0] as HTMLElement).focus();
    }

    return () => {
      // Restore previous focus
      previousFocusRef.current?.focus();
    };
  }, [active]);

  useEffect(() => {
    if (!active || !containerRef.current) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !containerRef.current) return;

      const focusable = getFocusableElements(containerRef.current);
      if (focusable.length === 0) return;

      const first = focusable[0] as HTMLElement;
      const last = focusable[focusable.length - 1] as HTMLElement;

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [active]);

  return containerRef;
}

function getFocusableElements(container: HTMLElement): NodeListOf<Element> {
  return container.querySelectorAll(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
}
