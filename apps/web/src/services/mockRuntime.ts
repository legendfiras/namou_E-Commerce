export type DemoFlags = {
  slow: boolean;
  failCatalog: boolean;
  failCheckout: boolean;
};

const STORAGE_KEY = 'namou.demo.flags.v1';

export const DEMO_EMAIL = 'demo@namou.test';
export const DEMO_PASSWORD = 'namou-demo';
export const DEMO_NAME = 'Firas Cell Demo';

export function readDemoFlags(): DemoFlags {
  if (typeof localStorage === 'undefined') {
    return { slow: false, failCatalog: false, failCheckout: false };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { slow: false, failCatalog: false, failCheckout: false };
    }
    const parsed = JSON.parse(raw) as Partial<DemoFlags>;
    return {
      slow: parsed.slow === true,
      failCatalog: parsed.failCatalog === true,
      failCheckout: parsed.failCheckout === true,
    };
  } catch {
    return { slow: false, failCatalog: false, failCheckout: false };
  }
}

export function writeDemoFlags(flags: DemoFlags): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(flags));
}

export async function mockWait(): Promise<void> {
  const flags = readDemoFlags();
  await new Promise((resolve) => {
    setTimeout(resolve, flags.slow ? 1400 : 80);
  });
}

export async function mockCatalogGate(): Promise<void> {
  await mockWait();
  if (readDemoFlags().failCatalog) {
    throw new Error('Demo catalog request failed.');
  }
}

export async function mockCheckoutGate(): Promise<void> {
  await mockWait();
  if (readDemoFlags().failCheckout) {
    throw new Error('Demo checkout request failed.');
  }
}
