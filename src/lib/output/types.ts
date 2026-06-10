/**
 * Shared types for the output generation pipeline.
 *
 * These types represent the structured data produced by the LangGraph
 * agent and consumed by the CSV builders and writers.
 */

// ─── Matched Job Data ───────────────────────────────────────────────────────

export interface IMatchedPart {
  /** Part article number from catalog */
  partId: string;

  /** Part name from catalog */
  partName: string;

  /** Part category from catalog */
  category: string;

  /** Sale price (₴) */
  price: number;

  /** Quantity matched */
  quantity: number;

  /** LLM confidence that this part is compatible with the device (0–1) */
  compatibilityConfidence: number;

  /**
   * Integral warning level set by the pipeline. For now calculated by level of LLM confidence and black list.
   * for future there are possible additional factors.
   * - 0–1 = 1 − compatibilityConfidence (set by MatchPartsNode)
   * - 1   = blacklisted part (overridden by ValidateCompatibilityNode)
   */
  warningLevel: number;

  /** Reason for flag / warning (empty if none) */
  comment?: string;
}

export interface IMatchedJob {
  /** Job number (e.g. "З-2026-0147") */
  jobNumber: string;

  /** Job date string */
  jobDate: string;

  /** Client name as it appears in the jobs CSV */
  clientName: string;

  /** Device type (e.g. "Ноутбук") */
  deviceType: string;

  /** Device model */
  deviceModel: string;

  /** Fault description */
  faultDescription: string;

  /** Job status */
  jobStatus: string;

  /** Original estimated cost */
  originalCost: number;

  /** Matched parts from catalog */
  matchedParts: IMatchedPart[];

  /** Overall job-level warnings */
  warnings: string[];

  /** Matched parts total */
  matchedTotal: number;
}

// ─── Output Data ────────────────────────────────────────────────────────────

/**
 * Complete data needed to generate all output CSVs.
 * Produced by the LangGraph agent and stored in TaskResult.resultJson.
 */
export interface IOutputData {
  /** ISO date string for the output file name */
  generationDate: string;

  /** All matched jobs */
  matchedJobs: IMatchedJob[];

  /** Optional global instructions from the user */
  instructions?: string;
}

// ─── Client Invoice Data ────────────────────────────────────────────────────

/**
 * Data for generating a single client's invoice CSV.
 */
export interface IClientInvoiceData {
  /** Client name from clients CSV */
  clientName: string;

  /** Client address */
  address: string;

  /** Client phone */
  phone: string;

  /** Client email */
  email: string;

  /** All matched jobs for this client */
  matchedJobs: IMatchedJob[];

  /** Invoice date */
  invoiceDate: string;

  /** Grand total for this client */
  grandTotal: number;

  /** All notes from matched jobs */
  allNotes: string[];
}

// ─── Sheet Rows ─────────────────────────────────────────────────────────────

export interface ISheetRow {
  /** Column headers (first row) */
  headers: string[];

  /** Data rows */
  rows: string[][];
}
