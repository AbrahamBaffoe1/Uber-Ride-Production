// babel.config.js  ✅ fixed - removed reanimated plugin
module.exports = function (api) {
  api.cache(true);

  return {
    presets: ['babel-preset-expo'],             // already provides the property transforms with loose:true
    plugins: [
      '@babel/plugin-transform-async-to-generator',
      ['@babel/plugin-transform-runtime', { regenerator: true }],
    ],
  };
};
