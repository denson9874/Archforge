export type WorkerMessageData = {
  results: any[];
  installedPackages: any[];
  activeTab: string;
  filterAbandoned: string;
  sortKey: string;
};

self.onmessage = (e: MessageEvent<WorkerMessageData>) => {
  const { results, installedPackages, activeTab, filterAbandoned, sortKey } = e.data;

  // Filters results locally according to active tabs
  const filteredResults = results.filter(pkg => {
    const isLocal = installedPackages.some(ip => ip.name.toLowerCase() === pkg.Name?.toLowerCase() || ip.name.toLowerCase() === pkg.name?.toLowerCase());
    const localPkg = installedPackages.find(ip => ip.name.toLowerCase() === pkg.Name?.toLowerCase() || ip.name.toLowerCase() === pkg.name?.toLowerCase());

    const isInstalledAur = localPkg?.repo === "aur";
    const isAurPkg = pkg.isAur || isInstalledAur || !pkg.Repo;

    if (activeTab === "aur") {
      return isAurPkg;
    }
    if (activeTab === "official") {
      return !isAurPkg;
    }
    if (activeTab === "upgrades") {
      return isLocal && localPkg?.hasUpdate;
    }
    return true;
  });

  // Sort matched rows and filter by Abandoned state
  const processedResults = filteredResults
    .filter(pkg => {
      const lastMod = pkg.LastModified || pkg.lastModified;
      const isAbandoned = lastMod ? (Date.now() / 1000 - lastMod) > 180 * 24 * 3600 : false;
      
      if (filterAbandoned === "active") {
        return !isAbandoned;
      }
      if (filterAbandoned === "abandoned") {
        return isAbandoned;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortKey === "popularity") {
        return (b.Popularity || 0) - (a.Popularity || 0);
      }
      if (sortKey === "votes") {
        return (b.NumVotes || 0) - (a.NumVotes || 0);
      }
      if (sortKey === "latest_update") {
        const timeA = a.LastModified || a.lastModified || 0;
        const timeB = b.LastModified || b.lastModified || 0;
        return timeB - timeA;
      }
      if (sortKey === "name") {
        const nameA = (a.Name || a.name || "").toLowerCase();
        const nameB = (b.Name || b.name || "").toLowerCase();
        return nameA.localeCompare(nameB);
      }
      return 0;
    });

  self.postMessage(processedResults);
};
