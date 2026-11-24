import { writeFileSync } from "node:fs"
import { join } from "node:path"
import { HOST_SEAM_JSON_PATH, hostSeamJson } from "./lib/host-seam"

const out = join(import.meta.dir, "..", HOST_SEAM_JSON_PATH)
writeFileSync(out, hostSeamJson())
console.log(`gen:host-seam → ${HOST_SEAM_JSON_PATH}`)
