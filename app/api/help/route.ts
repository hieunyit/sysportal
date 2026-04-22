import { NextResponse } from "next/server"
import { helpCategories, helpFaqs } from "@/lib/identity-ops-data"

export async function GET() {
  return NextResponse.json({
    categories: helpCategories,
    faqs: helpFaqs,
  })
}
