import path from 'node:path';
import CopyPlugin from 'copy-webpack-plugin';

const root = import.meta.dirname;

// Some of these packages hide their dist files behind an "exports" map, so
// import/require of the exact file is not an option.
const vendored = (relative) => path.join(root, 'node_modules', relative);

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
			],
		},
		plugins: [
			new CopyPlugin({
				patterns: [
					{ from: 'public', to: '.' },
					// The popup used to pull these two from a CDN. MV3 forbids remote
					// code, and a popup that needs the network to look right is no fun,
					// so they ship with the extension instead.
					{
						from: vendored('@simonwep/pickr/dist/pickr.min.js'),
						to: 'libs/pickr.min.js',
					},
					{
						from: vendored('@simonwep/pickr/dist/themes/nano.min.css'),
						to: 'libs/pickr.nano.min.css',
					},
					{ from: vendored('water.css/out/dark.css'), to: 'libs/water.dark.css' },
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
