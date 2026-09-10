export const PAGE_SIZE = 36;
/** Invalid or out-of-range page numbers have no alternate canonical representation. */
export function catalogPage(
  value: string | undefined,
  count: number,
): number | null {
  if (value === undefined) return 1;
  if (!/^[1-9][0-9]*$/.test(value)) return null;
  const page = Number(value);
  return Number.isSafeInteger(page) &&
    page <= Math.max(1, Math.ceil(count / PAGE_SIZE))
    ? page
    : null;
}
export function pageWindow(page: number, pages: number) {
  return [...new Set([1, page - 1, page, page + 1, pages])]
    .filter((p) => p >= 1 && p <= pages)
    .sort((a, b) => a - b);
}
