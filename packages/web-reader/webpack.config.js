const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const TerserPlugin = require("terser-webpack-plugin");

const IS_PROD = process.env.NODE_ENV !== 'development'

module.exports = {
  entry: {
    'bundle': './src/index.tsx',
    'service-worker': './src/serviceWorker/service-worker.ts',
  },
  mode: IS_PROD ? 'production' : 'development',
  devtool: 'source-map',
  ...IS_PROD && {
    optimization: {
      minimize: true,
      minimizer: [new TerserPlugin()],
    },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [{
          loader: 'ts-loader',
          options: {
            // This will speed up compilation enormously but disable type check
            // make sure to run `yarn tsc` before publishing
            transpileOnly: false,
          }
        }],
      },
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    fallback: {
      // https://github.com/lddubeau/saxes
      stream: path.resolve(__dirname, `src/streamer/streamShim.js`)
    }
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
  },
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist')
    },
    historyApiFallback: true,
    port: 9000,
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        {
          from: './public',
        }
      ]
    }),
  ],
};