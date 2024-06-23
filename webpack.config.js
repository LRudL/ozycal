const path = require('path');

module.exports = {
  entry: './app/static/src/index.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],  // Ensure .ts and .tsx are included
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'app/static/dist'),
  },
};