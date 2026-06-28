export type IndentMode = "2" | "4" | "tab" | "minify";

export type ErrorCode =
  | "TRAILING_COMMA"
  | "DOUBLE_COMMA"
  | "MISSING_COMMA"
  | "EXTRA_COMMA"
  | "UNQUOTED_KEY"
  | "SINGLE_QUOTED_STRING"
  | "UNQUOTED_VALUE"
  | "INCORRECT_BOOLEAN"
  | "INCORRECT_NULL"
  | "JS_COMMENT"
  | "JS_UNDEFINED"
  | "JS_NAN"
  | "JS_INFINITY"
  | "UNTERMINATED_STRING"
  | "INVALID_ESCAPE"
  | "INVALID_NUMBER"
  | "UNEXPECTED_TOKEN"
  | "UNEXPECTED_EOF"
  | "MISSING_VALUE"
  | "MISSING_PROPERTY_NAME"
  | "MISSING_BRACKET"
  | "EXTRA_BRACKET";

export interface JsonDiagnostic {
  code: ErrorCode;
  line: number;
  col: number;
  message: string;
  suggestion: string;
  severity: "error" | "warning";
  autoFixed: boolean;
}

export interface RepairEntry {
  code: ErrorCode;
  line: number;
  col: number;
  description: string;
}

export interface JsonStats {
  rootType: string;
  totalKeys: number;
  totalObjects: number;
  totalArrays: number;
  maxDepth: number;
  sizeBytes: number;
  rootKeys?: number;
  rootItems?: number;
}

export interface EngineResult {
  isValid: boolean;
  wasRepaired: boolean;
  cannotFix: boolean;
  value: unknown;
  formatted: string;
  diagnostics: JsonDiagnostic[];
  repairLog: RepairEntry[];
  stats: JsonStats | null;
}


