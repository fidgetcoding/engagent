import config from "@/engagent.config";
import { demoState } from "@/lib/demo";
import { fileStore } from "@/lib/store";
import App from "./App";

export const dynamic = "force-dynamic";
export default async function Page() {
  const demo = process.env.ENGAGENT_DEMO !== "0";
  return <App config={config} demo={demo} initial={demo ? demoState() : await fileStore().read()} />;
}
