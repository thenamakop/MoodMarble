# Debug Session: detox-max-path

## Issue
Detox Android build fails with `ninja: error: manifest 'build.ninja' still dirty after 100 tries` due to object file paths exceeding Windows 250 character limit during CMake compilation of `react-native-worklets` and `expo-modules-core`.

## Hypotheses
1. `pnpm`'s strict symlinked `node_modules` structure causes Node/CMake resolution to resolve the absolute `C:\Users\mauli\...` real path instead of the shortened `M:\...` path during the build.
2. The React Native autolinking mechanism resolves package paths to their real paths (bypassing the `subst` virtual drive).
3. The build directory nesting (`.cxx/Debug/...`) combined with the package names natively exceeds 250 characters even on the `M:` drive.

## Status
[OPEN]