const webpack = require('webpack');
const MinifyPlugin = require('babel-minify-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const GenerateJsonPlugin = require('generate-json-webpack-plugin');
const merge = require('webpack-merge');

// process.traceDeprecation = true;

// markdown convert to html
const marked = require('marked');
const renderer = new marked.Renderer();

module.exports = function (env) {
  console.log(env);
  const [ mode, browser, benchmark, firefoxBeta ] = env.split(':');
  let version = require('./manifest/common.json').version;
  if (firefoxBeta) version += 'beta';

  const config = {
    entry: {
      'background_page': './src/background_page/index.js',
      'content_script': './src/content_script/index.js'
    },
    output: {
      path: __dirname + '/dist',
      filename: '[name].js',
      sourceMapFilename: '[name].js.map' // always generate source maps
    },
    devtool: 'source-map',
    module: {
      loaders: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          loader: 'babel-loader',
          query: {
            // require.resolve needed to work with linked modules
            // (e.g. saka-action in development) or build will fail
            // presets: [require.resolve('babel-preset-stage-3')]
          }
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader']
        },
        {
          test: /\.md$/,
          use: [
            {
              loader: 'html-loader'
            },
            {
              loader: 'markdown-loader',
              options: {
                renderer
              }
            }
          ]
        }
      ]
    },
    resolve: {
      modules: [
        './src',
        './node_modules'
      ]
    },
    plugins: [
      new webpack.optimize.ModuleConcatenationPlugin(),
      new CopyWebpackPlugin([
        {
          from: 'static'
        }
      ]),
      new GenerateJsonPlugin('manifest.json', merge(
        require('./manifest/common.json'),
        require(`./manifest/${browser}.json`),
        { version }
      ), null, 2)
    ]
  };

  const browserDefines = {
    'BROWSER': JSON.stringify(browser),
    'CHROME': JSON.stringify(browser === 'chrome'),
    'FIREFOX': JSON.stringify(browser === 'firefox'),
  };

  if (mode === 'prod') {
    config.plugins = config.plugins.concat([
      new MinifyPlugin(),
      new webpack.DefinePlugin(Object.assign({
        'process.env.NODE_ENV': JSON.stringify('production'),
        'DEBUG': JSON.stringify(false),
        'VERSION': JSON.stringify(version),
        'BENCHMARK': JSON.stringify(true)
      }, browserDefines))
    ]);
  } else {
    config.plugins = config.plugins.concat([
      new webpack.DefinePlugin(Object.assign({
        'process.env.NODE_ENV': JSON.stringify('development'),
        'DEBUG': JSON.stringify(true),
        'VERSION': JSON.stringify(version + ' dev'),
        'BENCHMARK': JSON.stringify(benchmark === 'benchmark')
      }, browserDefines))
    ]);
  }
  return config;
};
