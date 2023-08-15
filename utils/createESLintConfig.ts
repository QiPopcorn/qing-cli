import { deepMerge } from './deepMerge';

const editorconfigs = {
  airbnb: `root = true
    [*.{js,jsx,mjs,cjs,ts,tsx,mts,cts,vue}]
    charset = utf-8
    end_of_line = lf
    indent_size = 2
    indent_style = space
    insert_final_newline = true
    max_line_length = 100
    trim_trailing_whitespace = true
    `,
  standard: `root = true
    [*.{js,jsx,mjs,cjs,ts,tsx,mts,cts,vue}]
    charset = utf-8
    indent_size = 2
    indent_style = space
    insert_final_newline = true
    trim_trailing_whitespace = true
    `,
};

const prettierrcs = {
  default: {
    $schema: 'https://json.schemastore.org/prettierrc',
    semi: true,
    tabWidth: 2,
    singleQuote: true,
    printWidth: 100,
    trailingComma: 'all',
  },
  airbnb: {
    $schema: 'https://json.schemastore.org/prettierrc',
    arrowParens: 'always',
    bracketSameLine: false,
    bracketSpacing: true,
    endOfLine: 'lf',
    jsxSingleQuote: false,
    printWidth: 100,
    proseWrap: 'preserve',
    quoteProps: 'as-needed',
    semi: true,
    singleQuote: true,
    tabWidth: 2,
    trailingComma: 'all',
    useTabs: false,
  },
  standard: {
    $schema: 'https://json.schemastore.org/prettierrc',
    arrowParens: 'always',
    bracketSameLine: false,
    bracketSpacing: true,
    jsxSingleQuote: true,
    proseWrap: 'preserve',
    quoteProps: 'as-needed',
    semi: false,
    singleQuote: true,
    tabWidth: 2,
    trailingComma: 'none',
    useTabs: false,
  },
};

const versionMap = {
  '@rushstack/eslint-patch': '^1.3.2',
  '@vue/eslint-config-airbnb': '^7.0.0',
  '@vue/eslint-config-airbnb-with-typescript': '^7.0.0',
  '@vue/eslint-config-prettier': '^8.0.0',
  '@vue/eslint-config-standard': '^8.0.1',
  '@vue/eslint-config-standard-with-typescript': '^8.0.0',
  '@vue/eslint-config-typescript': '^11.0.3',
  eslint: '^8.46.0',
  'eslint-plugin-vue': '^9.16.1',
  prettier: '^3.0.0',
  standard: '^17.1.0',
  typescript: '~5.1.6',
};

const CREATE_ALIAS_SETTING_PLACEHOLDER = 'CREATE_ALIAS_SETTING_PLACEHOLDER';
export { CREATE_ALIAS_SETTING_PLACEHOLDER };

function stringifyJS(value, styleGuide) {
  // eslint-disable-next-line no-shadow
  const result = JSON.stringify(
    value,
    (key, val) => {
      if (key === 'CREATE_ALIAS_SETTING_PLACEHOLDER') {
        return `(${val})`;
      }
      return val;
    },
    2,
  );

  return result.replace(
    'CREATE_ALIAS_SETTING_PLACEHOLDER: ',
    `...require('@vue/eslint-config-${styleGuide}/createAliasSetting')`,
  );
}

// This is also used in `create-vue`
export function createESLintConfig({
  vueVersion = '3.x', // '2.x' | '3.x' (TODO: 2.7 / vue-demi)

  styleGuide = 'default', // default | airbnb | typescript
  hasTypeScript = false, // js | ts
  needsPrettier = false, // true | false

  additionalConfig = {}, // e.g. Cypress, createAliasSetting for Airbnb, etc.
  additionalDependencies = {}, // e.g. eslint-plugin-cypress
}) {
  // This is the pkg object to extend
  const pkg = { devDependencies: {} };
  const addDependency = (name) => {
    pkg.devDependencies[name] = versionMap[name];
  };

  addDependency('eslint');
  addDependency('eslint-plugin-vue');

  const language = hasTypeScript ? 'typescript' : 'javascript';

  const eslintConfig = {
    parserOptions: {
      ecmaVersion: 'latest',
    },
    root: true,
    extends: [vueVersion.startsWith('2') ? 'plugin:vue/essential' : 'plugin:vue/vue3-essential'],
  };
  const addDependencyAndExtend = (name) => {
    addDependency(name);
    eslintConfig.extends.push(name);
  };

  switch (`${styleGuide}-${language}`) {
    case 'default-javascript':
      eslintConfig.extends.push('eslint:recommended');
      break;
    case 'default-typescript':
      eslintConfig.extends.push('eslint:recommended');
      addDependencyAndExtend('@vue/eslint-config-typescript');
      break;
    default:
      throw new Error(
        `unexpected combination of styleGuide and language: ${styleGuide}-${language}`,
      );
  }

  deepMerge(pkg.devDependencies, additionalDependencies);
  deepMerge(eslintConfig, additionalConfig);

  if (needsPrettier) {
    addDependency('prettier');
    addDependency('@vue/eslint-config-prettier');
    eslintConfig.extends.push('@vue/eslint-config-prettier/skip-formatting');
  }

  const files = {
    '.eslintrc.cjs': '',
  };

  if (styleGuide === 'default') {
    // Both Airbnb & Standard have already set `env: node`
    files['.eslintrc.cjs'] += '/* eslint-env node */\n';
  }

  if (pkg.devDependencies['@rushstack/eslint-patch']) {
    files['.eslintrc.cjs'] += "require('@rushstack/eslint-patch/modern-module-resolution')\n\n";
  }

  files['.eslintrc.cjs'] += `module.exports = ${stringifyJS(eslintConfig, styleGuide)}\n`;

  // .editorconfig & .prettierrc.json
  if (editorconfigs[styleGuide]) {
    files['.editorconfig'] = editorconfigs[styleGuide];
  }
  if (needsPrettier) {
    // Prettier recommends an explicit configuration file to let the editor know that it's used.
    files['.prettierrc.json'] = JSON.stringify(prettierrcs[styleGuide], undefined, 2);
  }

  return {
    pkg,
    files,
  };
}
