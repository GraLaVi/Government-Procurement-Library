import { NextResponse } from 'next/server';

// Base collection route for /api/library/parts.
//
// There is no listing endpoint — parts are addressed individually under
// /api/library/parts/[nsn] (where the segment is a part key: an NSN, or
// "ID-<part_id>" for NSN-less parts). This handler exists so that a request to
// the bare collection path (e.g. from an empty/blank key) returns a clean JSON
// 400 instead of falling through to Next.js's HTML 404 page, which would make a
// `response.json()` caller throw "Unexpected token '<'".
export async function GET() {
  return NextResponse.json(
    { error: 'A part key (NSN or ID-<part_id>) is required.' },
    { status: 400 }
  );
}
