import { ScrapeResult } from "@/lib/crawl/engine";
import { OsintReport } from "@/lib/osint/collectors";

const scrapes: ScrapeResult[] = [];
const osints: OsintReport[] = [];

export function rememberScrape(r: ScrapeResult) {
  scrapes.unshift(r);
  if (scrapes.length > 50) scrapes.pop();
}

export function listScrapes(limit = 20) {
  return scrapes.slice(0, limit);
}

export function rememberOsint(r: OsintReport) {
  osints.unshift(r);
  if (osints.length > 50) osints.pop();
}

export function listOsints(limit = 20) {
  return osints.slice(0, limit);
}
