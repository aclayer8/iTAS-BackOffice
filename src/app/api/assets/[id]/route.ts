import { NextRequest } from "next/server";
import { withAuth, ok, badRequest, serverError } from "@/lib/api-helpers";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async (req) => {
    try {
      const { id } = await params;
      const body = await req.json();
      const { brand, model } = body as { brand?: string; model?: string };

      if (!brand && !model) {
        return badRequest("brand or model required");
      }

      const asset = await prisma.asset.update({
        where: { id },
        data: {
          ...(brand ? { brand: brand.trim() } : {}),
          ...(model ? { model: model.trim() } : {}),
        },
        select: { id: true, brand: true, model: true },
      });

      return ok(asset);
    } catch (err) {
      return serverError(err);
    }
  }, "asset:write");
}
