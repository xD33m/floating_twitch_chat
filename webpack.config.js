import path from 'node:path';
import CopyPlugin from 'copy-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';

const root = import.meta.dirname;

export default (_env, argv) => {
	const isProduction = argv.mode === 'production';

	return {
		bail: isProduction,
		devtool: isProduction ? false : 'cheap-source-map',
		experiments: {
			// On Node >= 22.6 webpack turns this on by itself, which also turns on
			// resolve.tsconfig. The resolver then follows the stray tsconfig.json
			// that popmotion publishes -- its "extends" points outside the package
			// -- and every popmotion import fails. There is no TypeScript here.
			typescript: false,
		},
		entry: {
			content: './src/content.js',
			popup: './src/popup/index.js',
		},
		output: {
			path: path.resolve(root, 'build'),
			filename: 'static/js/[name].js',
			clean: true,
		},
		resolve: {
			extensions: ['.js', '.jsx'],
		},
		module: {
			rules: [
				{
					test: /\.jsx?$/,
					include: path.resolve(root, 'src'),
					loader: 'babel-loader',
					// The package is "type": "module" so that Node can run the tests
					// against src/ directly; that also makes webpack demand file
					// extensions on every relative import, which we do not want here.
					resolve: { fullySpecified: false },
				},
				{
					test: /\.css$/,
					use: [MiniCssExtractPlugin.loader, 'css-loader'],
				},
			],
		},
		plugins: [
			new MiniCssExtractPlugin({ filename: 'static/css/[name].css' }),
			// Everything in public/ is already in its final shape. icon.svg is the
			// source the PNGs are rendered from, so it does not need to ship.
			new CopyPlugin({
				patterns: [
					{ from: 'public', to: '.', globOptions: { ignore: ['**/icon.svg'] } },
				],
			}),
		],
		performance: false,
		optimization: {
			// Chrome Web Store review is easier to reason about with readable code,
			// and the bundle is small enough that minification buys us little.
			minimize: false,
		},
	};
};
