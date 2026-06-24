const fs = require("fs");
const path = require("path");
const {
  createRunOncePlugin,
  withAppBuildGradle,
  withDangerousMod,
  withProjectBuildGradle,
} = require("expo/config-plugins");

const detoxVersion = require("detox/package.json").version;
const runnerClass = "com.wix.detox.DetoxJUnitRunner";
const dependencyLine = `    androidTestImplementation("com.wix:detox:${detoxVersion}")`;
const detoxMavenRepoPath = path
  .join(path.dirname(require.resolve("detox/package.json")), "Detox-android")
  .replace(/\\/g, "/");
const detoxMavenRepoLine = `    maven { url uri("${detoxMavenRepoPath}") }`;

function withDetoxProjectBuildGradle(config) {
  return withProjectBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    if (!contents.includes(detoxMavenRepoPath)) {
      contents = contents.replace(
        "allprojects {\n  repositories {\n    google()\n    mavenCentral()\n",
        "allprojects {\n  repositories {\n    google()\n    mavenCentral()\n" +
          `${detoxMavenRepoLine}\n`,
      );
    }

    config.modResults.contents = contents;
    return config;
  });
}

function withDetoxBuildGradle(config) {
  return withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    if (!contents.includes('missingDimensionStrategy "detox", "full"')) {
      contents = contents.replace(
        '        buildConfigField "String", "REACT_NATIVE_RELEASE_LEVEL", "\\"${findProperty(\'reactNativeReleaseLevel\') ?: \'stable\'}\\""\n',
        '        buildConfigField "String", "REACT_NATIVE_RELEASE_LEVEL", "\\"${findProperty(\'reactNativeReleaseLevel\') ?: \'stable\'}\\""\n' +
          '        missingDimensionStrategy "detox", "full"\n' +
          '        testBuildType System.getProperty("testBuildType", "debug")\n' +
          `        testInstrumentationRunner "${runnerClass}"\n`,
      );
    }

    if (!contents.includes(dependencyLine)) {
      contents = contents.replace(
        "dependencies {\n",
        `dependencies {\n${dependencyLine}\n`,
      );
    }

    config.modResults.contents = contents;
    return config;
  });
}

function withDetoxTestSource(config) {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const packageName = config.android?.package;
      if (!packageName) {
        throw new Error(
          "android.package must be defined to generate Detox Android test source.",
        );
      }

      const sourcePath = path.join(
        config.modRequest.platformProjectRoot,
        "app",
        "src",
        "androidTest",
        "java",
        ...packageName.split("."),
        "DetoxTest.java",
      );

      const sourceContents = `package ${packageName};

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.filters.LargeTest;
import androidx.test.rule.ActivityTestRule;

import com.wix.detox.Detox;
import com.wix.detox.config.DetoxConfig;

import org.junit.Rule;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
@LargeTest
public class DetoxTest {
  @Rule
  public ActivityTestRule<MainActivity> activityRule =
      new ActivityTestRule<>(MainActivity.class, false, false);

  @Test
  public void runDetoxTests() {
    DetoxConfig detoxConfig = new DetoxConfig();
    detoxConfig.idlePolicyConfig.masterTimeoutSec = 90;
    detoxConfig.idlePolicyConfig.idleResourceTimeoutSec = 60;
    detoxConfig.rnContextLoadTimeoutSec = (BuildConfig.DEBUG ? 180 : 60);

    Detox.runTests(activityRule, detoxConfig);
  }
}
`;

      fs.mkdirSync(path.dirname(sourcePath), { recursive: true });
      fs.writeFileSync(sourcePath, sourceContents);
      return config;
    },
  ]);
}

const withDetoxAndroid = (config) => {
  config = withDetoxProjectBuildGradle(config);
  config = withDetoxBuildGradle(config);
  config = withDetoxTestSource(config);
  return config;
};

module.exports = createRunOncePlugin(
  withDetoxAndroid,
  "with-detox-android",
  "1.0.0",
);
