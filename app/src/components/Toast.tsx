"use client";

import { CheckIcon, XIcon } from "./icons";

type ToastType = "success" | "error" | "info";

interface ToastProps {
  type: ToastType;
  message: string;
}

const styles: Record<ToastType, { card: string; text: string }> = {
  success: { card: "", text: "text-cyber-green" },
  error: { card: "cyber-card-red", text: "text-cyber-red" },
  info: { card: "cyber-card-purple", text: "text-cyber-purple" },
};

export function Toast({ type, message }: ToastProps) {
  const { card, text } = styles[type];

  return (
    <div className="fixed right-4 top-4 z-50 animate-pulse">
      <div className={`cyber-card ${card} max-w-sm`}>
        <div className="flex items-center gap-3">
          {type === "success" && <CheckIcon className={`h-5 w-5 ${text}`} />}
          {type === "error" && <XIcon className={`h-5 w-5 ${text}`} />}
          {type === "info" && <div className="cyber-spinner" />}
          <p className={`text-sm ${text}`}>{message}</p>
        </div>
      </div>
    </div>
  );
}
