import { NextResponse } from "next/server"
import {
  activityItems,
  alertFeed,
  apiCatalog,
  approvalQueue,
  controlGaps,
  dashboardHero,
  dashboardSummaryCards,
  policyChecks,
  systems,
  todayOperations,
} from "@/lib/identity-ops-data"

export async function GET() {
  return NextResponse.json({
    hero: dashboardHero,
    summaryCards: dashboardSummaryCards,
    systems,
    policyChecks,
    alerts: alertFeed,
    activity: activityItems,
    approvalQueue,
    todayOperations,
    controlGaps,
    apiCoverage: apiCatalog.length,
  })
}
