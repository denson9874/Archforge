export interface InstalledPackage {
  name: string;
  version: string;
  repo: "core" | "extra" | "multilib" | "aur";
  description: string;
  installedAt: string;
  size: string;
  health: "healthy" | "error" | "warning";
  healthDetails?: string;
  maintainer?: string;
  license?: string;
  url?: string;
  hasUpdate?: boolean;
  newVersion?: string;
  pinnedVersion?: string;
  history?: string[];
}

export interface SystemStats {
  isRealArch?: boolean;
  totals: {
    all: number;
    aur: number;
    core: number;
    extra: number;
    upgrades: number;
  };
  health: {
    healthy: number;
    warning: number;
    error: number;
  };
  diskSpace: {
    used: string;
    total: string;
    percent: number;
  };
  cpuUsage: string;
  memoryUsage: string;
  missingTools?: string[];
}

export interface AurSearchResult {
  ID?: number;
  Name: string;
  PackageBaseID?: number;
  PackageBase?: string;
  Version: string;
  Description: string;
  URL?: string;
  NumVotes: number;
  Popularity: number;
  OutOfDate?: number | null;
  Maintainer?: string;
  FirstSubmitted?: number;
  LastModified?: number;
  License?: string[];
  Depends?: string[];
  MakeDepends?: string[];
  OptDepends?: string[];
}
