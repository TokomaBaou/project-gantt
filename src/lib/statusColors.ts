import type { TaskStatus } from "@/types/wbs";

export interface StatusColor {
  background: string;
  progress: string;
}

export const STATUS_COLORS: Record<TaskStatus, StatusColor> = {
  done: { background: "#007AFF", progress: "#0051D5" },
  inProgress: { background: "#34C759", progress: "#28A745" },
  waiting: { background: "#8E8E93", progress: "#6E6E73" },
  planned: { background: "#5856D6", progress: "#3F3DAB" },
  new: { background: "#FF9500", progress: "#CC7700" },
};

export const STATUS_PROGRESS_DEFAULT: Record<TaskStatus, number> = {
  done: 100,
  inProgress: 50,
  waiting: 0,
  planned: 0,
  new: 0,
};
