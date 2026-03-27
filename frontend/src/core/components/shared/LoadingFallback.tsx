const STYLE_ID = "loading-fallback-style";

function injectStyle(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .loading-fallback {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      font-size: 18px;
      background-color: #ffffff;
      color: #868e96;
    }
    @media (prefers-color-scheme: dark) {
      .loading-fallback {
        background-color: #1a1b1e;
        color: #909296;
      }
    }
    [data-mantine-color-scheme="dark"] .loading-fallback {
      background-color: #1a1b1e;
      color: #909296;
    }
    [data-mantine-color-scheme="light"] .loading-fallback {
      background-color: #ffffff;
      color: #868e96;
    }
  `;
  document.head.appendChild(style);
}

export function LoadingFallback() {
  injectStyle();
  return <div className="loading-fallback">Loading...</div>;
}
