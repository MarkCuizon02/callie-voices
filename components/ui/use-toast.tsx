"use client";

import { useState, useEffect } from "react";
import * as ToastPrimitives from "@radix-ui/react-toast";
import { cva } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// Define toast variants with Tailwind classes
const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-4 pr-6 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
  {
    variants: {
      variant: {
        default: "border bg-background text-foreground",
        destructive: "border-destructive bg-destructive text-destructive-foreground",
        success: "border-green-500 bg-green-500/10 text-green-500",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

// Interface for toast props
export interface ToastProps {
  title?: string;
  description?: string;
  variant?: "default" | "destructive" | "success";
  duration?: number;
}

// Global toast dispatcher
type ToastAction = { type: "ADD_TOAST"; payload: ToastProps };
let toastQueue: ToastProps[] = [];
let listeners: Array<(queue: ToastProps[]) => void> = [];

const dispatchToast = (action: ToastAction) => {
  if (action.type === "ADD_TOAST") {
    toastQueue = [...toastQueue, action.payload];
    listeners.forEach((listener) => listener(toastQueue));
  }
};

// Export toast function for direct use
export const toast = ({ title, description, variant = "default", duration = 5000 }: ToastProps) => {
  dispatchToast({ type: "ADD_TOAST", payload: { title, description, variant, duration } });
};

// ToastProvider component to manage and render toasts
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  useEffect(() => {
    listeners.push(setToasts);
    setToasts(toastQueue);

    return () => {
      listeners = listeners.filter((listener) => listener !== setToasts);
    };
  }, []);

  // Function to dismiss a toast
  const dismiss = (index: number) => {
    setToasts((prev) => prev.filter((_, i) => i !== index));
    toastQueue = toastQueue.filter((_, i) => i !== index);
  };

  return (
    <ToastPrimitives.Provider>
      {toasts.map(({ title, description, variant, duration }, index) => (
        <ToastPrimitives.Root
          key={index}
          className={cn(toastVariants({ variant }))}
          duration={duration}
          onOpenChange={(open) => !open && dismiss(index)}
        >
          <div className="grid gap-1">
            {title && (
              <ToastPrimitives.Title className="text-sm font-semibold">
                {title}
              </ToastPrimitives.Title>
            )}
            {description && (
              <ToastPrimitives.Description className="text-sm opacity-90">
                {description}
              </ToastPrimitives.Description>
            )}
          </div>
          <ToastPrimitives.Close
            className="absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100 group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600"
            aria-label="Close toast"
          >
            <X className="h-4 w-4" />
          </ToastPrimitives.Close>
        </ToastPrimitives.Root>
      ))}
      <ToastPrimitives.Viewport
        className="fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]"
      />
      {children}
    </ToastPrimitives.Provider>
  );
}