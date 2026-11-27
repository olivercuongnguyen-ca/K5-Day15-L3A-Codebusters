"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Button, RefreshIcon, XIcon } from "@/components/ui";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

interface PwaContextValue {
  canInstall: boolean;
  isIOS: boolean;
  isStandalone: boolean;
  updateAvailable: boolean;
  promptInstall: () => Promise<"accepted" | "dismissed" | "unavailable">;
  applyUpdate: () => void;
  dismissUpdate: () => void;
}

const PwaContext = createContext<PwaContextValue | null>(null);

export function PwaProvider({ children }: { children: ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [updateDismissed, setUpdateDismissed] = useState(false);

  const userTriggeredReloadRef = useRef(false);

  useEffect(() => {
    const nav = window.navigator as NavigatorWithStandalone;
    const ua = nav.userAgent || "";
    const iosDevice =
      /iPad|iPhone|iPod/.test(ua) ||
      (ua.includes("Macintosh") && "ontouchend" in document);

    const standaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean(nav.standalone);

    const frame = window.requestAnimationFrame(() => {
      setIsIOS(iosDevice);
      setIsStandalone(standaloneMode);
    });

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    }

    function handleAppInstalled() {
      setDeferredPrompt(null);
      setIsStandalone(true);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    let registrationRef: ServiceWorkerRegistration | undefined;

    function handleControllerChange() {
      // Only reload when the user explicitly clicked "Cập nhật ngay"
      if (userTriggeredReloadRef.current) {
        window.location.reload();
      }
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener(
        "controllerchange",
        handleControllerChange,
      );

      navigator.serviceWorker
        .register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        })
        .then((registration) => {
          registrationRef = registration;

          if (registration.waiting && navigator.serviceWorker.controller) {
            setWaitingWorker(registration.waiting);
            setUpdateDismissed(false);
          }

          registration.addEventListener("updatefound", () => {
            const installing = registration.installing;
            if (!installing) return;

            installing.addEventListener("statechange", () => {
              if (
                installing.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                setWaitingWorker(installing);
                setUpdateDismissed(false);
              }
            });
          });
        })
        .catch(() => {
          // Registration may be skipped in unsupported or insecure contexts
        });
    }

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener(
          "controllerchange",
          handleControllerChange,
        );
      }
      void registrationRef;
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return "unavailable" as const;
    await deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === "accepted") {
      setDeferredPrompt(null);
    }
    return result.outcome;
  }, [deferredPrompt]);

  const applyUpdate = useCallback(() => {
    if (!waitingWorker) return;
    userTriggeredReloadRef.current = true;
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
  }, [waitingWorker]);

  const dismissUpdate = useCallback(() => {
    setUpdateDismissed(true);
  }, []);

  const updateAvailable = Boolean(waitingWorker) && !updateDismissed;
  const canInstall = Boolean(deferredPrompt) && !isStandalone;

  const value = useMemo<PwaContextValue>(
    () => ({
      canInstall,
      isIOS,
      isStandalone,
      updateAvailable,
      promptInstall,
      applyUpdate,
      dismissUpdate,
    }),
    [
      canInstall,
      isIOS,
      isStandalone,
      updateAvailable,
      promptInstall,
      applyUpdate,
      dismissUpdate,
    ],
  );

  return (
    <PwaContext.Provider value={value}>
      {children}

      {updateAvailable ? (
        <div
          role="region"
          aria-label="Thông báo cập nhật ứng dụng"
          className="fixed bottom-[calc(96px+env(safe-area-inset-bottom))] md:bottom-6 right-4 left-4 md:left-auto md:max-w-sm z-40"
        >
          <div className="bg-surface border border-border rounded-[20px] p-4 shadow-overlay flex items-start gap-3 animate-unify-surface">
            <span className="w-9 h-9 rounded-full bg-sage-background text-on-sage inline-flex items-center justify-center shrink-0 mt-0.5">
              <RefreshIcon size={18} />
            </span>

            <div className="flex-1 flex flex-col gap-2.5 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[14px] leading-[20px] font-semibold text-text-primary">
                    Có bản cập nhật mới
                  </span>
                  <span className="text-[13px] leading-[19px] text-text-secondary">
                    Nhấn cập nhật khi bạn đã hoàn tất thao tác hiện tại.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={dismissUpdate}
                  aria-label="Đóng thông báo cập nhật"
                  className="w-8 h-8 -mr-1 -mt-1 rounded-full inline-flex items-center justify-center text-text-secondary hover:bg-surface-subtle cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <XIcon size={16} />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="primary" size="sm" onClick={applyUpdate}>
                  Cập nhật ngay
                </Button>
                <Button variant="ghost" size="sm" onClick={dismissUpdate}>
                  Để sau
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </PwaContext.Provider>
  );
}

export function usePwa() {
  const ctx = useContext(PwaContext);
  if (!ctx) {
    throw new Error("usePwa phải được sử dụng bên trong PwaProvider");
  }
  return ctx;
}
