import {
  DEFAULT_SPENDING_TARGETS,
  type SpendingTargets,
} from "../../domain/config/spending-targets.js";
import { type MonthlyReportDto, toMonthlyReportDto } from "../dto/report-dto.js";
import type { CategoryRegistry } from "../../domain/service/category-registry.js";
import { Month } from "../../domain/value-object/month.js";
import type { TransactionGateway } from "../gateway/transaction-gateway.js";
import { computeMonthlyReport } from "../../domain/service/compute-monthly-report.js";

export class GenerateReport {
  private readonly txnGateway: TransactionGateway;
  private readonly registry: CategoryRegistry;

  constructor(txnGateway: TransactionGateway, registry: CategoryRegistry) {
    this.txnGateway = txnGateway;
    this.registry = registry;
  }

  execute(monthStr: string, targets: SpendingTargets = DEFAULT_SPENDING_TARGETS): MonthlyReportDto {
    const month = Month.from(monthStr);
    const transactions = this.txnGateway.findByMonth(month);
    const report = computeMonthlyReport(
      month,
      targets,
      transactions,
      this.registry.categoryToGroupMap(),
    );
    return toMonthlyReportDto(report);
  }
}
