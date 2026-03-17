export interface FormatDetectionResult<TValue> {
  readonly value: TValue;
  readonly confident: boolean;
}

export interface CsvFormatDetector {
  readFileContent(filePath: string): string;
  detectDelimiter(lines: string[]): FormatDetectionResult<string>;
  detectDateFormat(samples: string[]): FormatDetectionResult<string>;
  detectDecimalSeparator(samples: string[]): FormatDetectionResult<"," | ".">;
}
