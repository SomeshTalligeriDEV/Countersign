import { NextRequest } from "next/server";
import { proxyToChupke } from "@/lib/bizProxy";

export async function POST(req: NextRequest) {
  return proxyToChupke(req, "/v1/orders");
}
