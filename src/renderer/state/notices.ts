import { useCallback, useState } from "react";
import type { UiNoticeError } from "../../shared/types";

export interface UiNoticeItem extends UiNoticeError {
  id: number;
}

export function useNotices() {
  const [items, setItems] = useState<UiNoticeItem[]>([]);

  const push = useCallback((notice: UiNoticeError) => {
    const item: UiNoticeItem = { id: Date.now() + Math.floor(Math.random() * 1000), ...notice };
    setItems((prev) => [item, ...prev].slice(0, 5));
  }, []);

  const remove = useCallback((id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  return { items, push, remove };
}
