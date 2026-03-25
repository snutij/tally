import {
  type UnifiedReportDto,
  isUnifiedReportDto,
} from "../../application/dto/unified-report-dto.js";
import type { MonthlyReportDto } from "../../application/dto/report-dto.js";
import type { Renderer } from "./renderer.js";

export class JsonRenderer implements Renderer {
  render(data: unknown): string {
    return JSON.stringify(JsonRenderer.serialize(data), undefined, 2);
  }

  private static serialize(data: unknown): unknown {
    if (isUnifiedReportDto(data)) {
      return JsonRenderer.serializeUnified(data);
    }
    return data;
  }

  private static serializeReport(report: MonthlyReportDto): Record<string, unknown> {
    return {
      groups: report.groups,
      kpis: report.kpis,
      month: report.month,
      net: report.net,
      totalExpenseActual: report.totalExpenseActual,
      totalExpenseTarget: report.totalExpenseTarget,
      totalIncomeActual: report.totalIncomeActual,
      transactionCount: report.transactionCount,
      uncategorized: report.uncategorized,
    };
  }

  private static serializeUnified(dto: UnifiedReportDto): Record<string, unknown> {
    return {
      months: dto.months.map((mo) => JsonRenderer.serializeReport(mo)),
      range: dto.range,
      trend: dto.trend,
    };
  }
}
