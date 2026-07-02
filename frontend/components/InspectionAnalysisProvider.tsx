"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";

import { SessionExpiredError } from "../src/lib/authApi";
import {
  AnalysisJobNotFoundError,
  pollAnalysisStatus,
  type Laudo,
} from "../src/lib/inspectionAnalysisApi";
import { clearJobId, getAllTrackedJobs, saveJobId } from "../src/lib/inspectionJobStorage";

const BASE_DELAY_MS = 3000;
const MAX_DELAY_MS = 30000;
const BACKOFF_FACTOR = 1.5;
const MAX_TOTAL_MS = 5 * 60 * 1000;
const MAX_CONSECUTIVE_ERRORS = 3;
const TOAST_DURATION_MS = 6000;
const MAX_NOTIFICATIONS = 50;

type NotificationVariant = "success" | "error";

export type AppNotification = {
  id: string;
  variant: NotificationVariant;
  title: string;
  message: string;
  inspecaoId?: string;
  createdAt: number;
  read: boolean;
};

export type TrackedJobStatus = "pending" | "completed" | "failed";

export type TrackedJob = {
  inspecaoId: string;
  jobId: string;
  status: TrackedJobStatus;
  laudo: Laudo | null;
  error?: string;
};

type PollerRuntime = {
  timeoutId: ReturnType<typeof setTimeout> | null;
  attempts: number;
  errorCount: number;
  startedAt: number;
  jobId: string;
};

type InspectionAnalysisContextValue = {
  trackJob: (inspecaoId: string | number, jobId: string) => void;
  getJob: (inspecaoId: string | number) => TrackedJob | undefined;
  notifications: AppNotification[];
  unreadCount: number;
  markAllRead: () => void;
  dismissNotification: (id: string) => void;
};

const noop = () => {};

const InspectionAnalysisContext = createContext<InspectionAnalysisContextValue>({
  trackJob: noop,
  getJob: () => undefined,
  notifications: [],
  unreadCount: 0,
  markAllRead: noop,
  dismissNotification: noop,
});

export function useInspectionAnalysis() {
  return useContext(InspectionAnalysisContext);
}

function makeId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `n-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function nextDelay(step: number) {
  return Math.min(BASE_DELAY_MS * BACKOFF_FACTOR ** Math.max(0, step - 1), MAX_DELAY_MS);
}

type EngineDeps = {
  setJobs: Dispatch<SetStateAction<Record<string, TrackedJob>>>;
  setNotifications: Dispatch<SetStateAction<AppNotification[]>>;
  setToasts: Dispatch<SetStateAction<AppNotification[]>>;
};

function createAnalysisEngine({ setJobs, setNotifications, setToasts }: EngineDeps) {
  const pollers = new Map<string, PollerRuntime>();
  let mounted = false;

  const stopPoller = (key: string) => {
    const runtime = pollers.get(key);
    if (runtime?.timeoutId) {
      clearTimeout(runtime.timeoutId);
    }
    pollers.delete(key);
  };

  const pausePoller = (key: string) => {
    const runtime = pollers.get(key);
    if (runtime?.timeoutId) {
      clearTimeout(runtime.timeoutId);
      runtime.timeoutId = null;
    }
  };

  const setStatus = (key: string, status: TrackedJobStatus) => {
    setJobs((current) => (current[key] ? { ...current, [key]: { ...current[key], status } } : current));
  };

  const pushNotification = (
    variant: NotificationVariant,
    title: string,
    message: string,
    inspecaoId: string
  ) => {
    const notification: AppNotification = {
      id: makeId(),
      variant,
      title,
      message,
      inspecaoId,
      createdAt: Date.now(),
      read: false,
    };
    setNotifications((current) => [notification, ...current].slice(0, MAX_NOTIFICATIONS));
    setToasts((current) => [...current, notification]);
  };

  const finishCompleted = (key: string, laudo: Laudo) => {
    clearJobId(key);
    stopPoller(key);
    setJobs((current) => ({
      ...current,
      [key]: { inspecaoId: key, jobId: current[key]?.jobId ?? "", status: "completed", laudo },
    }));
    pushNotification("success", "Análise concluída", `O laudo da inspeção ${key} está pronto para revisão.`, key);
  };

  const finishFailed = (key: string, message: string) => {
    clearJobId(key);
    stopPoller(key);
    setJobs((current) => ({
      ...current,
      [key]: { inspecaoId: key, jobId: current[key]?.jobId ?? "", status: "failed", laudo: null, error: message },
    }));
    pushNotification("error", "Falha na análise", message, key);
  };

  const scheduleNext = (key: string, delay: number) => {
    const runtime = pollers.get(key);
    if (!runtime) {
      return;
    }
    if (runtime.timeoutId) {
      clearTimeout(runtime.timeoutId);
    }
    runtime.timeoutId = setTimeout(() => {
      void runPoll(key);
    }, delay);
  };

  const runPoll = async (key: string) => {
    const runtime = pollers.get(key);
    if (!runtime) {
      return;
    }

    if (Date.now() - runtime.startedAt > MAX_TOTAL_MS) {
      finishFailed(key, "Tempo de processamento excedido. Tente novamente.");
      return;
    }

    try {
      const response = await pollAnalysisStatus(runtime.jobId);
      if (!mounted) {
        return;
      }
      const current = pollers.get(key);
      if (!current) {
        return;
      }
      current.errorCount = 0;

      if (response.status === "completed") {
        if (response.result) {
          finishCompleted(key, response.result);
        } else {
          finishFailed(key, "Análise concluída sem laudo retornado.");
        }
        return;
      }

      if (response.status === "failed") {
        finishFailed(key, "A análise de IA falhou. Tente novamente.");
        return;
      }

      setStatus(key, "pending");
      current.attempts += 1;
      scheduleNext(key, nextDelay(current.attempts));
    } catch (error) {
      if (!mounted) {
        return;
      }
      const current = pollers.get(key);
      if (!current) {
        return;
      }

      if (error instanceof SessionExpiredError) {
        pausePoller(key);
        return;
      }

      if (error instanceof AnalysisJobNotFoundError) {
        finishFailed(key, error.message);
        return;
      }

      current.errorCount += 1;
      if (current.errorCount >= MAX_CONSECUTIVE_ERRORS) {
        finishFailed(key, error instanceof Error ? error.message : "Erro ao consultar status da análise.");
        return;
      }
      scheduleNext(key, nextDelay(current.attempts + current.errorCount));
    }
  };

  const track = (inspecaoId: string | number, jobId: string) => {
    const key = String(inspecaoId);
    if (!jobId || !jobId.trim()) {
      return;
    }

    saveJobId(key, jobId);

    const existing = pollers.get(key);
    if (existing) {
      if (existing.jobId === jobId && existing.timeoutId) {
        return;
      }
      stopPoller(key);
    }

    pollers.set(key, {
      timeoutId: null,
      attempts: 0,
      errorCount: 0,
      startedAt: Date.now(),
      jobId,
    });
    setJobs((current) => ({
      ...current,
      [key]: { inspecaoId: key, jobId, status: "pending", laudo: null },
    }));
    scheduleNext(key, 0);
  };

  const resumeFromStorage = () => {
    getAllTrackedJobs().forEach(({ inspecaoId, jobId }) => track(inspecaoId, jobId));
  };

  const setMounted = (value: boolean) => {
    mounted = value;
  };

  const stopAll = () => {
    pollers.forEach((runtime) => {
      if (runtime.timeoutId) {
        clearTimeout(runtime.timeoutId);
      }
    });
    pollers.clear();
  };

  return { track, resumeFromStorage, setMounted, stopAll };
}

function ToastCard({ notification, onClose }: { notification: AppNotification; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [onClose]);

  const isError = notification.variant === "error";

  return (
    <div
      role="status"
      className={`pointer-events-auto relative flex min-w-[320px] max-w-sm items-start gap-3 rounded-lg border px-6 py-4 shadow-lg animate-in fade-in slide-in-from-bottom-5 duration-300 ${
        isError ? "border-red-200 bg-red-50" : "border-green-200 bg-[#eefaf2]"
      }`}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar notificação"
        className={`absolute -left-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border bg-white shadow-sm transition-colors ${
          isError ? "border-red-200 text-red-600 hover:bg-red-50" : "border-green-200 text-green-600 hover:bg-green-50"
        }`}
      >
        <X size={14} strokeWidth={2.5} />
      </button>
      <div
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white ${
          isError ? "bg-red-600" : "bg-green-700"
        }`}
      >
        {isError ? <AlertCircle size={16} strokeWidth={3} /> : <CheckCircle2 size={16} strokeWidth={3} />}
      </div>
      <div>
        <p className={`text-sm font-bold ${isError ? "text-red-800" : "text-green-800"}`}>{notification.title}</p>
        <p className={`mt-0.5 text-sm font-medium ${isError ? "text-red-700" : "text-green-700"}`}>
          {notification.message}
        </p>
      </div>
    </div>
  );
}

export default function InspectionAnalysisProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<Record<string, TrackedJob>>({});
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [toasts, setToasts] = useState<AppNotification[]>([]);

  const [engine] = useState(() => createAnalysisEngine({ setJobs, setNotifications, setToasts }));

  const removeToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  useEffect(() => {
    engine.setMounted(true);
    engine.resumeFromStorage();
    return () => {
      engine.setMounted(false);
      engine.stopAll();
    };
  }, [engine]);

  const value = useMemo<InspectionAnalysisContextValue>(
    () => ({
      trackJob: engine.track,
      getJob: (inspecaoId) => jobs[String(inspecaoId)],
      notifications,
      unreadCount: notifications.reduce((total, item) => (item.read ? total : total + 1), 0),
      markAllRead: () => setNotifications((current) => current.map((item) => ({ ...item, read: true }))),
      dismissNotification: (id) => setNotifications((current) => current.filter((item) => item.id !== id)),
    }),
    [engine, jobs, notifications]
  );

  return (
    <InspectionAnalysisContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-6 right-6 z-[60] flex flex-col gap-3">
        {toasts.map((toast) => (
          <ToastCard key={toast.id} notification={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </InspectionAnalysisContext.Provider>
  );
}
