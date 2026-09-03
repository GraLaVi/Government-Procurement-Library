import { NextRequest, NextResponse } from "next/server";
import { AUTH_CONFIG } from "@/lib/auth/config";
import { getAccessToken, refreshAccessToken } from "@/lib/auth/getAccessToken";
import { buildForwardHeadersFromContext } from '@/lib/api/forwardHeaders';

// GET /api/library/solicitations/[id]/amendments
// Proxies to: GET /api/v1/library/solicitations/{id}/amendments
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const solicitationId = parseInt(id, 10);
    if (Number.isNaN(solicitationId)) {
      return NextResponse.json({ error: "Invalid solicitation ID" }, { status: 400 });
    }

    const accessToken = await getAccessToken();
    if (!accessToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const url = `${AUTH_CONFIG.API_BASE_URL}/library/solicitations/${solicitationId}/amendments`;

    let response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}`, ...(await buildForwardHeadersFromContext()) },
    });

    if (response.status === 401) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        response = await fetch(url, {
          headers: { Authorization: `Bearer ${newToken}`, ...(await buildForwardHeadersFromContext()) },
        });
      } else {
        return NextResponse.json({ error: "Session expired. Please log in again." }, { status: 401 });
      }
    }

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail || "Failed to fetch amendments" },
        { status: response.status },
      );
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error("Get solicitation amendments error:", error);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
