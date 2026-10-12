export interface ReceivingPackagePreview {
  packageNo: number;
  quantity: number;
  isRemainder: boolean;
}

export interface ReceivingCalculationPreview {
  requiresConversion: boolean;
  convertedQuantity: number;
  packageCount: number;
  packages: ReceivingPackagePreview[];
}

function roundQuantity(value: number): number {
  return Math.round((value + Number.EPSILON) * 10_000) / 10_000;
}

export function calculateReceivingPreview({
  receivedQuantity,
  materialShape,
  packQuantity,
}: {
  receivedQuantity: number;
  materialShape: string | null | undefined;
  ratio: number | null | undefined;
  packQuantity: number | null | undefined;
}): ReceivingCalculationPreview {
  // Receive whole sheets/units first; ratio belongs to downstream cutting.
  const requiresConversion = false;
  const convertedQuantity = roundQuantity(receivedQuantity);

  if (receivedQuantity <= 0 || convertedQuantity <= 0) {
    return { requiresConversion, convertedQuantity, packageCount: 0, packages: [] };
  }

  // Raw sheets are shown whole in the preview; packing follows processing.
  if (["PIPE", "SHEET", "COIL"].includes(materialShape ?? "")) {
    return {
      requiresConversion,
      convertedQuantity,
      packageCount: 1,
      packages: [{ packageNo: 1, quantity: convertedQuantity, isRemainder: false }],
    };
  }

  if (!packQuantity || packQuantity <= 0) {
    return { requiresConversion, convertedQuantity, packageCount: 0, packages: [] };
  }

  const packageCount = Math.ceil(convertedQuantity / packQuantity);
  let remaining = convertedQuantity;
  const packages = Array.from({ length: packageCount }, (_, index) => {
    const quantity = roundQuantity(
      index === packageCount - 1 ? remaining : Math.min(packQuantity, remaining)
    );
    remaining = roundQuantity(remaining - quantity);
    return {
      packageNo: index + 1,
      quantity,
      isRemainder: index === packageCount - 1 && quantity < packQuantity,
    };
  });

  return { requiresConversion, convertedQuantity, packageCount, packages };
}
