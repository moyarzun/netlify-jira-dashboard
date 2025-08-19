import { useCallback } from 'react';

interface FetchOptions<T, K extends Record<string, T[]> | T[]> {
  cacheKeyPrefix: string;
  apiEndpoint: string;
  apiMethod?: 'GET' | 'POST';
  apiBody?: Record<string, unknown>;
  dataExtractor: (data: unknown) => T[];
  setStateFunction: (data: T[]) => void;
  setCacheFunction: (data: T[] | ((prev: K) => K)) => void;
  cacheState: K;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  cacheKeySuffix?: string;
  additionalSuccessCallback?: (data: T[]) => void;
  additionalErrorCallback?: () => void;
}

export function useJiraFetch<T, K extends T[] | Record<string, T[]>>(
  options: Omit<FetchOptions<T, K>, 'apiMethod' | 'apiBody' | 'cacheKeySuffix'>
) {
  const {
    cacheKeyPrefix,
    apiEndpoint,
    dataExtractor,
    setStateFunction,
    setCacheFunction,
    cacheState,
    setLoading,
    setError,
    additionalSuccessCallback,
    additionalErrorCallback,
  } = options;

  const fetchData = useCallback(async (
    dynamicKey?: string,
    apiMethod: 'GET' | 'POST' = 'GET',
  apiBody?: Record<string, unknown>
  ) => {
    const fullCacheKey = dynamicKey ? `${cacheKeyPrefix}-${dynamicKey}` : cacheKeyPrefix;
    setLoading(true);
    setError(null);

    try {
      // 1. Try from localStorage
      if (typeof window !== 'undefined') {
        const cachedDataFromLocalStorage = localStorage.getItem(fullCacheKey);
        if (cachedDataFromLocalStorage) {
          const parsedData: T[] = JSON.parse(cachedDataFromLocalStorage);
          setStateFunction(parsedData);
          setCacheFunction(prev => {
            if (Array.isArray(prev)) return parsedData as unknown as K;
            return { ...prev, [fullCacheKey]: parsedData } as K;
          });
          setLoading(false);
          additionalSuccessCallback?.(parsedData);
          return;
        }
      }

      // 2. Try from in-memory cache
      if (dynamicKey && typeof cacheState === 'object' && !Array.isArray(cacheState) && (cacheState as Record<string, T[]>)[fullCacheKey]) {
        const cachedDataFromMemory = (cacheState as Record<string, T[]>)[fullCacheKey];
        setStateFunction(cachedDataFromMemory);
        if (typeof window !== 'undefined') {
          localStorage.setItem(fullCacheKey, JSON.stringify(cachedDataFromMemory));
        }
        setLoading(false);
        additionalSuccessCallback?.(cachedDataFromMemory);
        return;
      } else if (!dynamicKey && Array.isArray(cacheState) && cacheState.length > 0) {
        // For non-dynamic keys, check if the array cache is populated
        setStateFunction(cacheState as T[]);
        if (typeof window !== 'undefined') {
          localStorage.setItem(fullCacheKey, JSON.stringify(cacheState));
        }
        setLoading(false);
        additionalSuccessCallback?.(cacheState as T[]);
        return;
      }

      // 3. Fetch from API
      const fetchOptions: RequestInit = { method: apiMethod };
      if (apiMethod === 'POST' && apiBody) {
        fetchOptions.headers = { 'Content-Type': 'application/json' };
        fetchOptions.body = JSON.stringify(apiBody);
      }

      const response = await fetch(apiEndpoint, fetchOptions);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'No JSON error message' }));
        const errMessage = errorData.error || `Failed to fetch ${cacheKeyPrefix}.`;
        throw new Error(errMessage);
      }
      const data = await response.json();
      const fetchedData = dataExtractor(data);

      setStateFunction(fetchedData);
      if (typeof window !== 'undefined') {
        localStorage.setItem(fullCacheKey, JSON.stringify(fetchedData));
      }
      setCacheFunction(prev => {
        if (Array.isArray(prev)) return fetchedData as unknown as K;
        return { ...prev, [fullCacheKey]: fetchedData } as K;
      });
      additionalSuccessCallback?.(fetchedData);

    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError(`Ocurrió un error desconocido al obtener ${cacheKeyPrefix}.`);
      setStateFunction([]); // Clear data on error
      additionalErrorCallback?.();
    } finally {
      setLoading(false);
    }
  }, [
    cacheKeyPrefix,
    apiEndpoint,
    dataExtractor,
    setStateFunction,
    setCacheFunction,
    cacheState,
    setLoading,
    setError,
    additionalSuccessCallback,
    additionalErrorCallback,
  ]);

  return fetchData;
}
