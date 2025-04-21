/// <reference types="vite/client" />

declare module 'react-dom/client' {
  export function createRoot(container: Element | null): {
    render(element: React.ReactElement): void;
  };
}
