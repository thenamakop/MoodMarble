/**
 * Lazy-loads a native module at runtime so Metro does not trace it as a
 * static dependency. This keeps expo-notifications out of the startup
 * bundle on platforms where it is not supported (web, Expo Go Android).
 *
 * Uses dynamic import() with a string literal instead of eval("require").
 * eval("require") was previously used but throws a ReferenceError on the
 * new React Native architecture (Fabric/JSI) where CommonJS require is
 * not a global.
 *
 * The module name is resolved through a switch so Metro always sees a
 * literal string as the import argument. The generic return type is
 * preserved at each call site.
 */
export async function loadNativeModuleAsync<T>(moduleName: string): Promise<T> {
  if (moduleName === "expo-notifications") {
    const mod = await import("expo-notifications");
    return (mod.default ?? mod) as T;
  }

  throw new Error(`Unsupported lazy-loaded module: ${moduleName}`);
}
