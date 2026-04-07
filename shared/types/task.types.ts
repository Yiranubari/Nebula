export enum TaskStatus {
  TODO = "TODO",
  IN_PROGRESS = "IN_PROGRESS",
  REVIEW = "REVIEW",
  DONE = "DONE",
}

export enum Priority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  assigneeId: string | null;
  createdAt: string;
  estimatedHours: number;
  dueDate?: string;
  labels?: string[];
}

export interface ProjectSuggestion {
  title: string;
  description: string;
  priority: Priority;
  estimatedHours: number;
}
