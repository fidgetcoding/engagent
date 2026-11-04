import { fileStore } from "../../lib/store";
const store = fileStore(process.argv[2]);
async function main() {
  for (let i = 0; i < 20; i++) await store.apply({ type: "direction.add", direction: { kind: "topic", value: `worker-${process.argv[3]}-${i}` } });
}
main().catch(e => { console.error(e); process.exitCode = 1; });
