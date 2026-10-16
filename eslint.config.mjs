import nextConfig from 'eslint-config-next';

const tsParser = nextConfig[1].languageOptions.parser;

export default [
    {
        ignores: [
            ".next/**",
            "out/**",
            "build/**",
            "dist/**",
            "node_modules/**",
            "data/**",
            "backups/**",
            "scratch/**",
            "next-env.d.ts",
            "*.config.*",
            "bin/**",
            "src/core/**",
            "src/infrastructure/**",
            "src/modules/**",
            "src/telegram/**",
            "src/tools/**",
            "src/utils/**",
            "src/routes/**",
            "src/server.ts",
            "tests/**",
            "setup-web/**"
        ]
    },
    {
        files: [
            "src/app/**/*.{js,jsx,mjs,ts,tsx}",
            "src/components/**/*.{js,jsx,ts,tsx}",
            "src/hooks/**/*.{js,jsx,ts,tsx}"
        ],
        plugins: nextConfig[0].plugins,
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
                ecmaFeatures: {
                    jsx: true
                }
            }
        },
        settings: {
            react: {
                version: "19.2.7"
            }
        },
        rules: {
            ...nextConfig[0].rules,
            "react-hooks/rules-of-hooks": "error",
            "react-hooks/exhaustive-deps": "warn",
            "react-hooks/set-state-in-effect": "warn",
            "react-hooks/immutability": "warn",
            "react-hooks/purity": "warn",
            "@typescript-eslint/no-unused-vars": "off",
            "react/no-unescaped-entities": "off",
            "@next/next/no-img-element": "off"
        }
    }
];
