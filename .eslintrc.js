module.exports = {
    "env": {
        "commonjs": true,
        "es2021": true,
        "node": true
    },
    "extends": "eslint:recommended",
    "parserOptions": {
        "ecmaVersion": 12
    },
    "rules": {
      'comma-dangle': ['error', 'never'],
      'linebreak-style': ['error', 'unix'],
      'max-len': ['error', { code: 100, tabWidth: 2, ignoreUrls: true }],
      'no-unused-vars': 'off',
      semi: ['error', 'always']
    }
};
