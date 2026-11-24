"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Modal } from "./ui";

type Notice = {
  title: string;
  message: string;
  confirm?: boolean;
  resolve?: (accepted: boolean) => void;
};
type Popups = {
  notify: (message: string, title?: string) => void;
  confirm: (message: string, title?: string) => Promise<boolean>;
};
const PopupContext = createContext<Popups | null>(null);

export function PopupProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<Notice[]>([]);
  const pending = useRef(new Set<(accepted: boolean) => void>());
  const notify = useCallback((message: string, title = "Thông báo") => {
    setQueue((items) =>
      items.some((item) => item.title === title && item.message === message)
        ? items
        : [...items, { title, message }],
    );
  }, []);
  const confirm = useCallback(
    (message: string, title = "Xác nhận thao tác") =>
      new Promise<boolean>((resolve) => {
        pending.current.add(resolve);
        setQueue((items) => [
          ...items,
          { title, message, confirm: true, resolve },
        ]);
      }),
    [],
  );
  useEffect(() => {
    const outstanding = pending.current;
    return () => {
      outstanding.forEach((resolve) => resolve(false));
      outstanding.clear();
    };
  }, []);
  function close(accepted: boolean) {
    const notice = queue[0];
    notice?.resolve?.(accepted);
    if (notice?.resolve) pending.current.delete(notice.resolve);
    setQueue((items) => items.slice(1));
  }
  return (
    <PopupContext.Provider value={{ notify, confirm }}>
      {children}
      {queue[0] && (
        <Modal title={queue[0].title} onClose={() => close(false)}>
          <p className="popup-message">{queue[0].message}</p>
          <div className="popup-buttons">
            {queue[0].confirm && (
              <button className="button subtle" onClick={() => close(false)}>
                Hủy
              </button>
            )}
            <button
              className="button primary"
              autoFocus
              onClick={() => close(true)}
            >
              {queue[0].confirm ? "Xác nhận" : "Đã hiểu"}
            </button>
          </div>
        </Modal>
      )}
    </PopupContext.Provider>
  );
}

export function usePopup() {
  const context = useContext(PopupContext);
  if (!context) throw new Error("PopupProvider is required");
  return context;
}

export function ErrorPopup({ message }: { message: string }) {
  const { notify } = usePopup();
  useEffect(() => {
    if (message) notify(message, "Không thể hoàn tất");
  }, [message, notify]);
  return null;
}
