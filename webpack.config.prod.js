const merge = require("webpack-merge");
const UglifyJsPlugin = require("uglifyjs-webpack-plugin");
const commonConfig = require("./webpack.config.common.js");

module.exports = merge(commonConfig, {
  devtool: "source-map",
  mode: "production",
  optimization: {
    splitChunks: {
      cacheGroups: {
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          chunks: "all",
        },
      },
    },
    minimizer: [
      new UglifyJsPlugin({
        uglifyOptions: {
          mangle: false,
        },
        parallel: true,
        sourceMap: true,
      }),
    ],
  },
});
