import { screenshotPages } from "../support/screenshots";

// Phase 5 screens, for the design review. Writes to screenshots/phase-5/.
screenshotPages("phase-5", [{ name: "backup", path: () => "/backup" }]);
