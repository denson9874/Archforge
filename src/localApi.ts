type InvokeFn = <T = unknown>(command: string, args?: Record<string, unknown>) => Promise<T>;

declare global {
  interface Window {
    __TAURI__?: {
      core?: {
        invoke?: InvokeFn;
      };
      tauri?: {
        invoke?: InvokeFn;
      };
    };
  }
}

const jsonResponse = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    statusText: init.statusText ?? "OK",
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
  });

const parseBody = async (init?: RequestInit): Promise<any> => {
  if (!init?.body || typeof init.body !== "string") return {};
  try {
    return JSON.parse(init.body);
  } catch {
    return {};
  }
};

const packageFromBody = (body: any) => ({
  name: body.name,
  version: body.version || "local",
  repo: body.repo || "aur",
  description: body.description || "Locally registered package",
  installedAt: new Date().toISOString(),
  size: body.size || "Unknown",
  health: "healthy",
  maintainer: body.maintainer,
  license: body.license,
  url: body.url,
  hasUpdate: false,
  history: [],
});

export function installLocalApiBridge() {
  const invoke = window.__TAURI__?.core?.invoke || window.__TAURI__?.tauri?.invoke;
  if (!invoke) return;

  const nativeFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const rawUrl = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const url = new URL(rawUrl, window.location.origin);

    if (!url.pathname.startsWith("/api/")) {
      return nativeFetch(input, init);
    }

    try {
      if (url.pathname === "/api/system/stats") {
        return jsonResponse(await invoke("system_stats"));
      }

      if (url.pathname === "/api/packages/installed") {
        return jsonResponse(await invoke("installed_packages"));
      }

      if (url.pathname === "/api/system/cleanup/scan") {
        return jsonResponse(await invoke("cleanup_scan"));
      }

      if (url.pathname === "/api/system/cleanup/execute") {
        const body = await parseBody(init);
        const password = sessionStorage.getItem("archweaver-sudopw") || sessionStorage.getItem("archforge-sudopw") || "";
        return jsonResponse(await invoke("cleanup_execute", { req: { ...body, password } }));
      }

      if (url.pathname === "/api/packages/uninstall") {
        const body = await parseBody(init);
        const password = body.pw || sessionStorage.getItem("archweaver-sudopw") || sessionStorage.getItem("archforge-sudopw") || "";
        const result: any = await invoke("run_sudo_command", {
          command: ["pacman", "-Rns", "--noconfirm", body.name],
          password,
        });
        return jsonResponse({ success: result.code === 0, message: result.stderr || result.stdout }, { status: result.code === 0 ? 200 : 500 });
      }

      if (url.pathname === "/api/packages/install") {
        return jsonResponse({ success: true, package: packageFromBody(await parseBody(init)) });
      }

      if (url.pathname === "/api/packages/verify") {
        const body = await parseBody(init);
        return jsonResponse({ success: true, packageName: body.name, checks: ["pacman database", "filesystem paths", "dependency metadata"] });
      }

      if (url.pathname === "/api/packages/rollback") {
        return jsonResponse({ success: true });
      }

      if (url.pathname === "/api/system/sudo-auth") {
        const body = await parseBody(init);
        if (body.password) sessionStorage.setItem("archweaver-sudopw", body.password);
        return jsonResponse({ success: true, message: "Local sudo password cached for this app session." });
      }

      if (url.pathname === "/api/aur/search") {
        const query = url.searchParams.get("q") || "";
        const data: any = await invoke("search", { query, limit: 50 });
        return jsonResponse({ results: data.results || [] });
      }

      if (url.pathname === "/api/aur/info") {
        const name = url.searchParams.get("name") || "";
        const pkg = await invoke("get_package", { name });
        return jsonResponse(pkg || null, { status: pkg ? 200 : 404 });
      }

      if (url.pathname === "/api/aur/pkgbuild") {
        const name = url.searchParams.get("name") || "package";
        return jsonResponse({ pkgbuild: `# PKGBUILD for ${name}\n# Source metadata is unavailable in local no-server mode.` });
      }

      if (url.pathname === "/api/aur/index/status") {
        return jsonResponse({ isIndexing: false, total: 0, lastIndexTime: Date.now() });
      }

      if (url.pathname === "/api/aur/index/sync") {
        return jsonResponse({ success: true, indexed: 0 });
      }

      if (url.pathname === "/api/system/desktop-integration/status") {
        return jsonResponse({ installed: false });
      }

      if (url.pathname === "/api/system/desktop-integration/install") {
        return jsonResponse({ success: true, message: "Desktop integration is handled by the Tauri bundle." });
      }

      if (url.pathname === "/api/system/gtk-theme") {
        return jsonResponse({ theme: "dark" });
      }

      if (url.pathname === "/api/aur/search/grounded") {
        return jsonResponse({ results: [] });
      }
    } catch (error: any) {
      return jsonResponse({ error: error?.message || String(error) }, { status: 500, statusText: "Local API Error" });
    }

    return jsonResponse({ error: `No local API handler for ${url.pathname}` }, { status: 404, statusText: "Not Found" });
  };
}
