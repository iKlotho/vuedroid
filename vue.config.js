// vue.config.js
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
module.exports = {
    configureWebpack: {
        module: {
            rules: [
                {
                    test: /\.worker\.js$/,
                    use: { loader: 'worker-loader' }
                },
                {
                    test: /style\.css$/i,
                    use: [MiniCssExtractPlugin.loader, 'css-loader'],
                  },
                {
                    test: /\.svg$/,
                    loader: 'svg-inline-loader'
                },
                {
                    test: /\.(asset)$/i,
                    use: [
                        {
                            loader: 'file-loader',
                            options: {
                                name: '[name]',
                            },
                        },
                    ],
                },
            ]

        },
        plugins: [
            new MiniCssExtractPlugin()
        ]
    },
    chainWebpack: config => {
        config.module
        .rule('svg')
        .test(() => false)
        .use('file-loader')
    },
}