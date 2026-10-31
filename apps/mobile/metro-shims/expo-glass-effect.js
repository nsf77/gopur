"use strict";

const React = require("react");
const { View } = require("react-native");

function GlassView(props) {
  const { children, ...rest } = props;
  return React.createElement(View, rest, children);
}

function GlassContainer(props) {
  return GlassView(props);
}

function isLiquidGlassAvailable() {
  return false;
}

function isGlassEffectAPIAvailable() {
  return false;
}

module.exports = {
  GlassView,
  GlassContainer,
  isLiquidGlassAvailable,
  isGlassEffectAPIAvailable,
  default: GlassView,
};
