"use client";

import { useEffect, useState } from "react";
import { Download, Smartphone, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaManager() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosTip, setShowIosTip] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    }

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (isStandalone) {
      setInstalled(true);
      return;
    }

    const ua = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(ua);
    const isSafari = /safari/.test(ua) && !/crios|fxios|edgios/.test(ua);
    if (isIos && isSafari) {
      setShowIosTip(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const appInstalledHandler = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", appInstalledHandler);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", appInstalledHandler);
    };
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setInstalled(true);
    }
    setDeferredPrompt(null);
  }

  if (installed || dismissed) return null;

  if (deferredPrompt) {
    return (
      <div className="border-b border-blue-200 bg-blue-50">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2 text-xs text-blue-950">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 shrink-0 text-blue-700" />
            <span>
              <strong>Application mobile disponible :</strong> installez{" "}
              <strong>TRADISTER AO</strong> sur votre téléphone pour un accès rapide.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleInstall}
              className="inline-flex items-center gap-1 rounded-lg bg-blue-700 px-3 py-1 font-semibold text-white hover:bg-blue-800"
            >
              <Download className="h-3.5 w-3.5" />
              Installer
            </button>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              aria-label="Fermer"
              className="rounded p-1 text-blue-700 hover:bg-blue-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showIosTip) {
    return (
      <div className="border-b border-blue-200 bg-blue-50">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-2 text-xs text-blue-950">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 shrink-0 text-blue-700" />
            <span>
              Sur iPhone/iPad : appuyez sur <strong>Partager</strong> puis{" "}
              <strong>Sur l&apos;écran d&apos;accueil</strong> pour installer l&apos;app mobile.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Fermer"
            className="rounded p-1 text-blue-700 hover:bg-blue-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return null;
}
