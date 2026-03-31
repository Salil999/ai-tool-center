import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { getImportSources } from '@/api-client/import';

interface InstalledProvidersContextValue {
  installedProviderIds: Set<string>;
  loading: boolean;
}

const InstalledProvidersContext = createContext<InstalledProvidersContextValue>({
  installedProviderIds: new Set(),
  loading: true,
});

export function InstalledProvidersProvider({ children }: { children: ReactNode }) {
  const [installedProviderIds, setInstalledProviderIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getImportSources()
      .then((sources) => {
        setInstalledProviderIds(new Set(sources.filter((s) => s.exists).map((s) => s.id)));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <InstalledProvidersContext.Provider value={{ installedProviderIds, loading }}>
      {children}
    </InstalledProvidersContext.Provider>
  );
}

export function useInstalledProviders() {
  return useContext(InstalledProvidersContext);
}
