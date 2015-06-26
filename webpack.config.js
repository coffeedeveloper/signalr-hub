var path = require('path');

module.exports = {
  entry: './lib/hub.js',
  output: {
    path: './build',
    filename: 'hub.js'
  },
  module: {
    loaders: [
      { test: /\.(js|jsx)$/, loader: 'babel-loader'}
    ]
  },
  resolve: {
    root: path.resolve('./'),
    extensions: ['', '.js', '.jsx']
  },
  devtool: 'source-map',
  watch: true
};
