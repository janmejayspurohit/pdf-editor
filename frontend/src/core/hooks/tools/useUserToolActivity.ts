import { useState, useEffect } from 'react';
import { ToolId } from '@app/types/toolId';

const RECENT_TOOLS_KEY = 'pdf-editor.recentTools';

export function useToolHistory() {
  const [recentTools, setRecentTools] = useState<ToolId[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const recentStr = window.localStorage.getItem(RECENT_TOOLS_KEY);

    if (recentStr) {
      try {
        const recent = JSON.parse(recentStr) as ToolId[];
        setRecentTools(recent);
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  return {
    recentTools,
  };
}
