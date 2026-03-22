import type {
  CsvFormatDetector,
  FormatDetectionResult,
} from "../../application/gateway/csv-format-detector.js";
import { decodeFileContent } from "./encoding.js";
import { detectDateFormat } from "./detect-date-format.js";
import { detectDecimalSeparator } from "./detect-decimal-separator.js";
import { detectDelimiter } from "./detect-delimiter.js";
import { readFileSync } from "node:fs";

export class CsvFormatDetectorImpl implements CsvFormatDetector {
  readFileContent(filePath: string): string {
    return decodeFileContent(readFileSync(filePath));
  }

  detectDelimiter(lines: string[]): FormatDetectionResult<string> {
    return detectDelimiter(lines);
  }

  detectDateFormat(samples: string[]): FormatDetectionResult<string> {
    return detectDateFormat(samples);
  }

  detectDecimalSeparator(samples: string[]): FormatDetectionResult<"," | "."> {
    return detectDecimalSeparator(samples);
  }
}
