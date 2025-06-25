import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  X,
} from "react-feather";
import clsx from "clsx";

const ToastContext = createContext();
export const useToast = () => useContext(ToastContext);

const icons = {
  success: <CheckCircle className="w-6 h-6 text-green-500 drop-shadow-md" />,
  error: <XCircle className="w-6 h-6 text-red-500 drop-shadow-md" />,
  warning: <AlertTriangle className="w-6 h-6 text-yellow-500 drop-shadow-md" />,
  info: <Info className="w-6 h-6 text-blue-500 drop-shadow-md" />,
};

const bgColors = {
  success: "bg-green-50/90",
  error: "bg-red-50/90",
  warning: "bg-yellow-50/90",
  info: "bg-blue-50/90",
};

const borderColors = {
  success: "border-green-300",
  error: "border-red-300",
  warning: "border-yellow-300",
  info: "border-blue-300",
};

const textColors = {
  success: "text-green-800",
  error: "text-red-800",
  warning: "text-yellow-800",
  info: "text-blue-800",
};

const shadowColors = {
  success: "shadow-[0_4px_20px_rgba(34,197,94,0.3)]",
  error: "shadow-[0_4px_20px_rgba(239,68,68,0.3)]",
  warning: "shadow-[0_4px_20px_rgba(234,179,8,0.3)]",
  info: "shadow-[0_4px_20px_rgba(59,130,246,0.3)]",
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((text, type = "info", duration = 5000) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, text, type, visible: true, duration }]);
    return id;
  }, []);

  const removeToast = (id) => {
    setToasts((prev) =>
      prev.map((toast) =>
        toast.id === id ? { ...toast, visible: false } : toast
      )
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 100); // Faster removal
  };

  useEffect(() => {
    const timers = toasts.map((toast) =>
      setTimeout(() => removeToast(toast.id), toast.duration)
    );
    return () => timers.forEach(clearTimeout);
  }, [toasts]);

  const touchStartY = useRef(null);
  const touchCurrentY = useRef(null);

  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e) => {
    touchCurrentY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (id) => {
    if (
      touchStartY.current !== null &&
      touchCurrentY.current !== null &&
      touchCurrentY.current - touchStartY.current > 40
    ) {
      removeToast(id);
    }
    touchStartY.current = null;
    touchCurrentY.current = null;
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-4 max-w-sm w-full">
        {toasts.map(({ id, text, type, visible, duration }) => (
          <div
            key={id}
            role="alert"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={() => handleTouchEnd(id)}
            tabIndex={0}
            aria-describedby={`toast-desc-${id}`}
            className={clsx(
              "relative flex items-start gap-4 rounded-xl border px-6 py-4 transition-all duration-200 ease-out transform-gpu backdrop-blur-md",
              bgColors[type],
              borderColors[type],
              textColors[type],
              shadowColors[type],
              visible
                ? "opacity-100 translate-y-0 scale-100"
                : "opacity-0 translate-y-2 scale-95 pointer-events-none"
            )}
            style={{
              userSelect: "none",
              willChange: "transform, opacity",
            }}
          >
            <div className="flex-shrink-0 mt-1">{icons[type]}</div>
            <div className="flex-1 select-text" id={`toast-desc-${id}`}>
              <p className="font-semibold text-base capitalize">{type}</p>
              <p className="text-sm opacity-90 mt-1 leading-snug">{text}</p>
            </div>
            <button
              aria-label="Close notification"
              onClick={() => removeToast(id)}
              className="ml-2 flex-shrink-0 p-1.5 rounded-full bg-white/30 hover:bg-white/50 transition active:scale-90"
              style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.1)" }}
            >
              <X className="w-5 h-5 text-gray-700" />
            </button>
            <div
              className={clsx(
                "absolute bottom-0 left-0 h-1 rounded-b-xl",
                {
                  "bg-green-400": type === "success",
                  "bg-red-400": type === "error",
                  "bg-yellow-400": type === "warning",
                  "bg-blue-400": type === "info",
                }
              )}
              style={{
                width: "100%",
                animation: `toastProgress ${duration}ms linear forwards`,
              }}
            />
          </div>
        ))}
      </div>
      <style>{`
        @keyframes toastProgress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </ToastContext.Provider>
  );
};
