import type { OpenNextConfig } from "@opennextjs/cloudflare"

const config: OpenNextConfig = {
  default: {
    override: {
      wrapper: "cloudflare-node",
      converter: "edge",
      // Uncomment incrementalCache if you use ISR/cache in the future:
      // incrementalCache: "dummy",
    },
  },
}

export default config
