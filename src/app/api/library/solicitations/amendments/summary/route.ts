import { NextRequest, NextResponse } from "next/server";
import { AUTH_CONFIG } from "@/lib/auth/config";
import { getAccessToken, refreshAccessToken } from "@/lib/auth/getAccessToken";

// POST /api/library/solicitations/amendments/summary
// Proxies to: POST /api/v1/library/solicitations/amendments/summary
// Body: number[] (list of solicitation IDs).
export async function POST(request: NextRequest) {
  try {
    let accessToken = await getAccessToken();
    if (!accessToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.text();
    const url = `${AUTH_CONFIG.API_BASE_URL}/library/solicitations/amendments/summary`;

    let response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body,
    });

    if (response.status === 401) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        response = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${newToken}`,
            "Content-Type": "application/json",
          },
          body,
        });
      } else {
        return NextResponse.json({ error: "Session expired. Please log in again." }, { status: 401 });
      }
    }

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail || "Failed to fetch amendment summaries" },
        { status: response.status },
      );
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error("Get amendment summaries error:", error);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
