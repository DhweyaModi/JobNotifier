export type CountryCategory = "canada" | "usa" | "both" | "other";

export type ApplicationStatus = "NONE" | "SAVED" | "APPLIED" | "INTERVIEWING" | "OFFER" | "REJECTED";

export interface Job {
  id: string;
  source: string;
  title: string;
  company: string;
  location: string;
  country: CountryCategory;
  url: string;
  createdAt?: string;
  postedTimestamp?: number;
  postedDateStr?: string;
  applicationStatus?: ApplicationStatus;
  notes?: string;
  appliedDate?: string;
}

export interface FilterState {
  search: string;
  country: string;
  source: string;
  role: string;
  status: string;
  sortBy: "newest" | "company" | "title";
}

export interface ScraperStatus {
  name: string;
  lastRun?: string;
  jobCount: number;
  status: "active" | "idle" | "error";
}
