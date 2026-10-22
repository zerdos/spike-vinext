import worker from "@/src/index";

export async function POST(request: Request) {
  return worker.fetch(request);
}

export async function OPTIONS(request: Request) {
  return worker.fetch(request);
}
