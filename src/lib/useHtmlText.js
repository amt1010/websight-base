import { useState, useEffect } from "react";

export function useHtmlText(htmlUrl) {
  const [state, setState] = useState({ url: htmlUrl, html: null, failed: false });

  if (state.url !== htmlUrl) {
    setState({ url: htmlUrl, html: null, failed: false });
  }

  useEffect(() => {
    if (!htmlUrl) return;
    let cancelled = false;
    fetch(htmlUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`status ${res.status}`);
        return res.text();
      })
      .then((text) => {
        if (!cancelled) setState((s) => ({ ...s, html: text }));
      })
      .catch(() => {
        if (!cancelled) setState((s) => ({ ...s, failed: true }));
      });
    return () => {
      cancelled = true;
    };
  }, [htmlUrl]);

  return { html: state.html, failed: state.failed };
}
