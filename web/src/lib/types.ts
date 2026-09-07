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
  scrapedAt?: string;
  firstSeenAt?: string;
  postedTimestamp?: number;
  postedDateStr?: string;
  applicationStatus?: ApplicationStatus;
  notes?: string;
  appliedDate?: string;
}

export interface FilterState {
  search: string;
  countries: string[]; // multi-select (e.g. ["canada", "usa"])
  roles: string[];     // multi-select (e.g. ["Software", "AI / ML"])
  statuses: string[];  // multi-select (e.g. ["APPLIED", "SAVED"])
  workType: "all" | "remote" | "hybrid" | "onsite";
  jobType: "all" | "internship" | "newgrad";
  sortBy: "newest" | "company" | "title";
}

export interface ScraperStatus {
  name: string;
  lastRun?: string;
  jobCount: number;
  status: "active" | "idle" | "error";
}
