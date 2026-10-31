module.exports = function (api) {
  api.cache.using(() => process.env.EXPO_OS ?? "");
  const isWeb = process.env.EXPO_OS === "web";
  return {
    presets: isWeb ? ["babel-preset-expo"] : ["babel-preset-expo", "nativewind/babel"],
  };
};
