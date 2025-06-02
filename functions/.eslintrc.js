module.exports = {
    env: {
        es6: true,
        node: true,
    },
    parserOptions: {
        "ecmaVersion": 2023,
    },
    extends: [
        "eslint:recommended",
        "google",
    ],
    rules: {
        "no-restricted-globals": ["error", "name", "length"],
        "prefer-arrow-callback": "error",
        "quotes": ["error", "double", { "allowTemplateLiterals": true }],
        "max-len": ["error", {
            "code": 120,
            "ignoreComments": true,
            "ignoreStrings": true,
            "ignoreTemplateLiterals": true,
            "ignoreRegExpLiterals": true,
        }],
        // **Adicione/modifique esta linha para 4 espaços:**
        "indent": ["error", 4, { "SwitchCase": 1 }],
        // **E vamos garantir que outras regras de espaçamento e vírgulas estejam certas:**
        "object-curly-spacing": ["error", "always"], // Força espaço dentro de chaves { foo: bar }
        "comma-dangle": ["error", "always-multiline"], // Força vírgula no final de objetos/arrays de múltiplas linhas
        "eol-last": ["error", "always"], // Força uma linha em branco no final do arquivo
        "padded-blocks": ["error", "never"], // Não permite linhas em branco no início/fim de blocos
    },
    overrides: [
        {
            files: ["**/*.spec.*"],
            env: {
                mocha: true,
            },
            rules: {},
        },
    ],
    globals: {},
};
