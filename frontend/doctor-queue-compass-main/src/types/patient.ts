
export type PriorityLevel = "Low" | "Medium" | "High";

export interface Patient {
  id: string;
  name: string;
  reason: string;
  checkInTime: string;
  priority: PriorityLevel;
}
