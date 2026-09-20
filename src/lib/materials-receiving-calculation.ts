const CONVERTED_SHAPES = new Set(["PIPE", "SHEET", "COIL"]);

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
  ratio,
  packQuantity,
}: {
  receivedQuantity: number;
  materialShape: string | null | undefined;
  ratio: number | null | undefined;
  packQuantity: number | null | undefined;
}): ReceivingCalculationPreview {
  const requiresConversion = CONVERTED_SHAPES.has(materialShape ?? "");
  const convertedQuantity = roundQuantity(
    receivedQuantity * (requiresConversion ? (ratio ?? 0) : 1)
  );

  if (receivedQuantity <= 0 || convertedQuantity <= 0 || !packQuantity || packQuantity <= 0) {
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
