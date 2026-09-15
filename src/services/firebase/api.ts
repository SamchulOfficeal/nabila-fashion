export type FirebaseFunctionReference = {
  __firebasePath: string;
};

const references = new Map<string, FirebaseFunctionReference>();

export const api = new Proxy({}, {
  get: (_target, moduleName) => new Proxy({}, {
    get: (_moduleTarget, functionName) => {
      const path = `${String(moduleName)}.${String(functionName)}`;
      const existing = references.get(path);
      if (existing) return existing;
      const reference = { __firebasePath: path };
      references.set(path, reference);
      return reference;
    },
  }),
}) as Record<string, Record<string, FirebaseFunctionReference>>;
