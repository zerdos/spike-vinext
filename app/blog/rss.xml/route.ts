import { GET as getFeed } from "../feed.xml/route";

export const revalidate = 7200;

export async function GET() {
  return getFeed();
}
