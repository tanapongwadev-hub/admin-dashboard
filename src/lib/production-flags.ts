/**
 * Ways to record production after the first step. Only scanning box QRs
 * (FIFO) is on for now; the others are kept in the code and switched off here
 * until they are re-enabled. The API enforces the same (it needs
 * PRODUCTION_REQUIRE_BOX_SCAN=false to accept an unscanned record).
 */
export const PRODUCE_MODES = {
  FIFO: false,
  MANUAL: false,
  BOXES: true,
} as const;

export type ProduceMode = keyof typeof PRODUCE_MODES;

export const ENABLED_PRODUCE_MODES = (
  Object.keys(PRODUCE_MODES) as ProduceMode[]
).filter((m) => PRODUCE_MODES[m]);
