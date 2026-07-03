/**
 * Lazy-loads a native module at runtime so Metro does not trace it as a
 * static dependency. This keeps expo-notifications out of the startup
 * bundle on platforms where it is not supported (web, Expo Go Android).
 *
 * Uses a dynamic import() instead of eval("require"). Dynamic import works
 * in both the new React Native architecture (Fabric/JSI) and CommonJS
 * environments. eval("require") was previously used but throws a
 * ReferenceError on JSI runtimes where CommonJS require is not a global.
 */
export async function loadNativeModuleAsync<T>(moduleName: string): Promise<T> {
  // React Native's Metro bundler supports dynamic import() with string
  // literals. The await is intentional — this replaces the synchronous
  // eval("require") with an async load.
  const mod = await import(/* @vite-ignore */ moduleName);
  return (mod.default ?? mod) as T;
}
