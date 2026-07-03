import { NextRequest, NextResponse } from "next/server";

const DOCUMENTS_API_URL = process.env.DOCUMENTS_API_URL!;
const INTERNAL_SERVICE_SECRET = process.env.INTERNAL_SERVICE_SECRET!;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
  const body = await request.json();

  const res = await fetch(`${DOCUMENTS_API_URL}/pdf-templates/${key}/preview`, {
    method: "POST",
    headers: {
      "X-Internal-Secret": INTERNAL_SERVICE_SECRET,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Erreur de génération" }));
    return NextResponse.json(err, { status: res.status });
  }

  const pdfBytes = await res.arrayBuffer();
  return new NextResponse(pdfBytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${key}-preview.pdf"`,
    },
  });
}
