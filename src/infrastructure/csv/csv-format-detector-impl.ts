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
  // eslint-disable-next-line class-methods-use-this -- implements CsvFormatDetector interface
  readFileContent(filePath: string): string {
    return decodeFileContent(readFileSync(filePath));
  }

  // eslint-disable-next-line class-methods-use-this -- implements CsvFormatDetector interface
  detectDelimiter(lines: string[]): FormatDetectionResult<string> {
    return detectDelimiter(lines);
  }

  // eslint-disable-next-line class-methods-use-this -- implements CsvFormatDetector interface
  detectDateFormat(samples: string[]): FormatDetectionResult<string> {
    return detectDateFormat(samples);
  }

  // eslint-disable-next-line class-methods-use-this -- implements CsvFormatDetector interface
  detectDecimalSeparator(samples: string[]): FormatDetectionResult<"," | "."> {
    return detectDecimalSeparator(samples);
  }
}
