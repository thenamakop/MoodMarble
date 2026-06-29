/**
 * Lazy-load a native module without letting Metro trace it as a static
 * dependency. This keeps modules such as `expo-notifications` out of the
 * startup bundle on platforms where they are not supported (e.g. web, or
 * Android Expo Go runtime).
 *
 * The `eval("require")` form is intentional: Metro's static analyzer cannot
 * follow it, and Jest (without ESM support) can still execute it because it is
 * a plain CommonJS `require` at runtime. Prefer this helper over dynamic
 * `import()` when the module must remain lazy and tests run without
 * `--experimental-vm-modules`.
 */
export function loadNativeModule<T>(moduleName: string): T {
  // eslint-disable-next-line no-eval
  return (eval("require") as (moduleName: string) => T)(moduleName);
}
