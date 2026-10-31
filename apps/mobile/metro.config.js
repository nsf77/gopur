const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativewind } = require("nativewind/metro");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");
const activityShim = path.join(projectRoot, "metro-shims/ActivityContents.js");
const glassShim = path.join(projectRoot, "metro-shims/expo-glass-effect.js");
const blurShim = path.join(projectRoot, "metro-shims/expo-blur.js");
const flashListShim = path.join(projectRoot, "metro-shims/flash-list.js");

const config = getDefaultConfig(projectRoot);
config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];
config.resolver.disableHierarchicalLookup = true;

function isActivityContents(moduleName, originModulePath) {
  const origin = String(originModulePath || "").split("\\").join("/");
  if (moduleName.includes("expo-router/build/views/ActivityContents")) return true;
  return moduleName === "./ActivityContents" && origin.includes("/expo-router/build/views/");
}

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "expo-glass-effect" || moduleName.startsWith("expo-glass-effect/")) {
    return { type: "sourceFile", filePath: glassShim };
  }
  if (moduleName === "expo-blur" || moduleName.startsWith("expo-blur/")) {
    return { type: "sourceFile", filePath: blurShim };
  }
  if (moduleName === "@shopify/flash-list" || moduleName.startsWith("@shopify/flash-list/")) {
    return { type: "sourceFile", filePath: flashListShim };
  }
  if (isActivityContents(moduleName, context.originModulePath)) {
    return { type: "sourceFile", filePath: activityShim };
  }
  if (typeof defaultResolveRequest === "function") {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: false,
  },
});

module.exports = withNativewind(config, { input: "./global.css" });
