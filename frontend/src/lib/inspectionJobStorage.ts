const STORAGE_KEY_PREFIX = "smp:inspection-analysis-job:";

function canUseStorage() {
  return typeof window !== "undefined";
}

function buildStorageKey(inspecaoId: string | number) {
  return `${STORAGE_KEY_PREFIX}${inspecaoId}`;
}

export function saveJobId(inspecaoId: string | number, jobId: string) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(buildStorageKey(inspecaoId), jobId);
}

export function getJobId(inspecaoId: string | number): string | null {
  if (!canUseStorage()) {
    return null;
  }

  return window.localStorage.getItem(buildStorageKey(inspecaoId));
}

export function clearJobId(inspecaoId: string | number) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(buildStorageKey(inspecaoId));
}

export type TrackedJobRef = {
  inspecaoId: string;
  jobId: string;
};

export function getAllTrackedJobs(): TrackedJobRef[] {
  if (!canUseStorage()) {
    return [];
  }

  const jobs: TrackedJobRef[] = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key || !key.startsWith(STORAGE_KEY_PREFIX)) {
      continue;
    }

    const jobId = window.localStorage.getItem(key);
    const inspecaoId = key.slice(STORAGE_KEY_PREFIX.length);
    if (jobId && inspecaoId) {
      jobs.push({ inspecaoId, jobId });
    }
  }

  return jobs;
}
