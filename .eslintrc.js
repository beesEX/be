module.exports = {
  "extends": "@paralect/eslint-config",
  "rules": {
    "import/no-extraneous-dependencies": ["error", {
      "devDependencies": [
        "**/tests/**",
        "**/*.spec.js",
        "**/*.builder.js",
        "**/*.factory.js",
      ],
    }],
    "no-trailing-spaces": 0,
    "object-curly-spacing": 0,
    "object-curly-newline": 0,
    "brace-style": 0,
    "padded-blocks": 0,
    "comma-dangle": 0,
    "function-paren-newline": 0,
    "no-param-reassign": 0,
    "spaced-comment": 0,
    "eol-last": 0,

    "max-len": 0
  },
  "settings": {
    "import/resolver": {
      "node": {
        "moduleDirectory": [
          "src",
          "node_modules"
        ],
      },
    }
  }
};
