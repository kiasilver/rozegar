/**
 * مدیریت Progress برای تولید بلاگ
 * Store progress in memory (در production می‌توان از Redis استفاده کرد)
 */

const progressStore = new Map<string, {
  progress: number;
  message: string;
  total: number;
  current: number;
  completed: boolean;
  isActive?: boolean;
}>();

export function setProgress(userId: number, progress: {
  progress: number;
  message: string;
  total: number;
  current: number;
  completed?: boolean;
  isActive?: boolean | "";
}) {
  const progressKey = `user_${userId}`;
  // اطمینان از اینکه progress همیشه یک عدد معتبر است (0-100)
  const validProgress = Math.max(0, Math.min(100, progress.progress || 0));
  // تبدیل isActive به boolean یا undefined
  let isActiveValue: boolean | undefined;
  if (progress.isActive !== undefined) {
    // اگر string خالی است، undefined در نظر بگیر
    if (progress.isActive === "" || progress.isActive === false) {
      isActiveValue = false;
    } else if (progress.isActive === true) {
      isActiveValue = true;
    } else {
      // برای هر مقدار دیگر، true در نظر بگیر
      isActiveValue = true;
    }
  } else {
    const computedActive = (!progress.completed && (validProgress > 0 || (progress.message && progress.message.length > 0)));
    isActiveValue = computedActive ? true : undefined;
  }
  
  const progressData: {
    progress: number;
    message: string;
    total: number;
    current: number;
    completed: boolean;
    isActive?: boolean;
  } = {
    progress: validProgress, // استفاده از progress معتبر
    message: progress.message,
    total: progress.total,
    current: progress.current,
    completed: progress.completed || false,
    isActive: isActiveValue,
  };
  // دریافت progress قبلی برای مقایسه
  const previousProgress = progressStore.get(progressKey);
  const lastProgress = previousProgress?.progress || 0;
  
  progressStore.set(progressKey, progressData);
  
  // Log غیرفعال شده برای کاهش spam
  // const progressChanged = Math.abs(validProgress - lastProgress) >= 10 || progressData.completed || !previousProgress;
  // if (progressChanged && (validProgress > 0 || progressData.isActive || progressData.completed)) {
  //   console.log(`💾 [Progress Store] User ${userId}: ${validProgress}% - ${progressData.message} (${progressData.current}/${progressData.total}) - isActive: ${progressData.isActive}, completed: ${progressData.completed}`);
  // }
}

export function clearProgress(userId: number) {
  const progressKey = `user_${userId}`;
  progressStore.delete(progressKey);
}

// استفاده از static counter برای کاهش لاگ‌ها
let getProgressCallCount = 0;

export function getProgress(userId: number) {
  const progressKey = `user_${userId}`;
  const progress = progressStore.get(progressKey) || {
    progress: 0,
    message: "",
    total: 0,
    current: 0,
    completed: false,
    isActive: false,
  };
  
  getProgressCallCount++;
  // Log غیرفعال شده برای کاهش spam
  // if (getProgressCallCount % 10 === 0 && (progress.isActive || progress.progress > 0)) {
  //   console.log(`📥 [Progress Get] User ${userId}: ${progress.progress}% - ${progress.message} (${progress.current}/${progress.total}) [Call #${getProgressCallCount}]`);
  // }
  
  return progress;
}

