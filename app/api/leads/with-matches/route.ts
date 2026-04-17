import { NextResponse } from "next/server";
import { getBestPGsForLead } from "@/lib/matchService";
import { fetchLivePGData } from "@/lib/sheetsSync";

export async function GET(req: Request) {
  try {
    // 1. Fetch leads from DB (unchanged)
    const leadsRes = await fetch(new URL("/api/leads", req.url), {
      cache: "no-store",
      headers: { cookie: req.headers.get("cookie") || "" },
    });

    // 2. Fetch only isActive flags from DB properties
    const pgsRes = await fetch(new URL("/api/properties", req.url), {
      cache: "no-store",
      headers: { cookie: req.headers.get("cookie") || "" },
    });

    const leadsData = await leadsRes.json();
    const pgsData = await pgsRes.json();

    const leads = Array.isArray(leadsData) ? leadsData : leadsData.leads || leadsData.data || [];
    const dbPGs = Array.isArray(pgsData) ? pgsData : pgsData.data || [];

    // 3. Build a pgId → isActive lookup map from DB
    const activeMap = new Map<number, boolean>();
    for (const dbPG of dbPGs) {
      if (dbPG.pgId !== undefined) {
        activeMap.set(dbPG.pgId, dbPG.isActive ?? true);
      }
    }

    // 4. Fetch full property details from Google Sheet
    const base = new URL(req.url).origin;
    const sheetPGs = await fetchLivePGData(base);

    // 5. Filter: only keep PGs where isActive is true in DB
    //    If a PG from sheet has no entry in DB at all, exclude it (safe default)
    const activePGs = sheetPGs.filter(pg => activeMap.get(pg.id) === true);

    // 6. Run matching as before
    const result = leads.map((lead: any) => {
      const matches = getBestPGsForLead(lead, activePGs);
      return {
        ...lead,
        bestPGs: matches.top3,
        morePGs: matches.next3,
      };
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Matching failed" }, { status: 500 });
  }
}