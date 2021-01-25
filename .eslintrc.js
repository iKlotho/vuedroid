module.exports = {
  root: true,
  env: {
    node: true,
  },
  extends: [
    'plugin:vue/vue3-essential',
    '@vue/airbnb',
    '@vue/typescript/recommended',
  ],
  'plugins': [
    'progress',
    '@typescript-eslint',
    'prettier'
  ],
  parserOptions: {
    ecmaVersion: 2020,
    'sourceType': 'module',
  },
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-plusplus': 'off',
    'no-useless-constructor': 'off',
    'progress/activate': 1,
    'import/no-absolute-path': 'off',
    'no-bitwise': 'off',
    'consistent-return': 'off',
    'import/extensions': 'off',
    'import/no-unresolved': 'off',
    'import/no-cycle': 'off',
    'import/prefer-default-export': 'off',
    'import/no-named-as-default-member': 'off',
    'max-len': 'off',
    'class-methods-use-this': 'off',
    '@typescript-eslint/camelcase': 'off',
    'no-multi-assign': 'off',
    'no-unused-expressions': 'off',
    '@typescript-eslint/no-use-before-define': 'off',
    'no-shadow': 'off',
  },
};
