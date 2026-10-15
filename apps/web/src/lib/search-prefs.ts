const SEARCH_TYPE_KEY = 'dishrank-search-type';

export type SearchType = 'dish' | 'restaurant';

export function getStoredSearchType(): SearchType {
  if (typeof window === 'undefined') return 'dish';
  try {
    const v = sessionStorage.getItem(SEARCH_TYPE_KEY);
    return v === 'restaurant' ? 'restaurant' : 'dish';
  } catch {
    return 'dish';
  }
}

export function setStoredSearchType(type: SearchType) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(SEARCH_TYPE_KEY, type);
  } catch {
    /* ignore */
  }
}
