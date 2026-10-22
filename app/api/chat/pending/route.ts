import worker from "@/src/index";

export async function GET(request: Request) {
  return worker.fetch(request);
}

export async function OPTIONS(request: Request) {
  return worker.fetch(request);
}
