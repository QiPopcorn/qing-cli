import * as fs from 'node:fs';
import * as path from 'node:path';
import ejs from 'ejs';

import { pathToFileURL } from 'node:url';
import { red, green, bold } from 'kolorist';
import { preOrderDirectoryTraverse, postOrderDirectoryTraverse } from './directoryTraverse';
import { deepMerge } from './deepMerge';
import { sortDependencies } from './sortDependencies';
import { FILES_TO_FILTER } from './filterList';
import { getCommand } from './getCommand';
import { generateReadme } from './generateReadme';
import { renderEslint } from './renderEslint';
interface param {
  name?: string;
  ts?: boolean;
  router?: boolean;
  pinia?: boolean;
  vitest?: boolean;
  eslint?: boolean;
  prettier?: boolean;
  elementPlus?: boolean;
}

let result: {
  projectName?: string;
  needsTypeScript?: boolean;
  needsRouter?: boolean;
  needsPinia?: boolean;
  needsVitest?: boolean;
  needElementPlus?: boolean;
  needsEslint?: boolean;
  needsPrettier?: boolean;
} = {};

function emptyDir(dir) {
  if (!fs.existsSync(dir)) {
    return;
  }

  postOrderDirectoryTraverse(
    dir,
    (dir) => fs.rmdirSync(dir),
    (file) => fs.unlinkSync(file)
  );
}

/**
 * Renders a template folder/file to the file system,
 * by recursively copying all files under the `src` directory,
 * with the following exception:
 *   - `_filename` should be renamed to `.filename`
 *   - Fields in `package.json` should be recursively merged
 * @param {string} src source filename to copy
 * @param {string} dest destination filename of the copy operation
 */
function renderTemplate(src, dest, callbacks) {
  const stats = fs.statSync(src);

  if (stats.isDirectory()) {
    // skip node_module
    if (path.basename(src) === 'node_modules') {
      return;
    }

    // if it's a directory, render its subdirectories and files recursively
    fs.mkdirSync(dest, { recursive: true });
    for (const file of fs.readdirSync(src)) {
      renderTemplate(path.resolve(src, file), path.resolve(dest, file), callbacks);
    }
    return;
  }

  const filename = path.basename(src);

  if (filename === 'package.json' && fs.existsSync(dest)) {
    // merge instead of overwriting
    const existing = JSON.parse(fs.readFileSync(dest, 'utf8'));
    const newPackage = JSON.parse(fs.readFileSync(src, 'utf8'));
    const pkg = sortDependencies(deepMerge(existing, newPackage));
    fs.writeFileSync(dest, JSON.stringify(pkg, null, 2) + '\n');
    return;
  }

  if (filename === 'extensions.json' && fs.existsSync(dest)) {
    // merge instead of overwriting
    const existing = JSON.parse(fs.readFileSync(dest, 'utf8'));
    const newExtensions = JSON.parse(fs.readFileSync(src, 'utf8'));
    const extensions = deepMerge(existing, newExtensions);
    fs.writeFileSync(dest, JSON.stringify(extensions, null, 2) + '\n');
    return;
  }

  if (filename.startsWith('_')) {
    // rename `_file` to `.file`
    dest = path.resolve(path.dirname(dest), filename.replace(/^_/, '.'));
  }

  if (filename === '_gitignore' && fs.existsSync(dest)) {
    // append to existing .gitignore
    const existing = fs.readFileSync(dest, 'utf8');
    const newGitignore = fs.readFileSync(src, 'utf8');
    fs.writeFileSync(dest, existing + '\n' + newGitignore);
    return;
  }

  // data file for EJS templates
  if (filename.endsWith('.data.mjs')) {
    // use dest path as key for the data store
    dest = dest.replace(/\.data\.mjs$/, '');

    // Add a callback to the array for late usage when template files are being processed
    callbacks.push(async (dataStore) => {
      const getData = (await import(pathToFileURL(src).toString())).default;

      // Though current `getData` are all sync, we still retain the possibility of async
      dataStore[dest] = await getData({
        oldData: dataStore[dest] || {}
      });
    });

    return; // skip copying the data file
  }

  fs.copyFileSync(src, dest);
}

export async function initTemplate(argv: param) {
  // `initial` won't take effect if the prompt type is null
  // so we still have to assign the default values here
  const cwd = process.cwd();

  const {
    projectName = argv.name,
    needsTypeScript = argv.ts,
    needsRouter = argv.router,
    needsPinia = argv.pinia,
    needsVitest = argv.vitest,
    needsEslint = argv.eslint,
    needsPrettier = argv.prettier,
    needElementPlus = argv.elementPlus
  } = result;

  const root = path.join(cwd, argv.name);

  if (fs.existsSync(root)) {
    emptyDir(root);
  } else {
    fs.mkdirSync(root);
  }

  console.log(`\nScaffolding project in ${root}...`);

  const pkg = { name: projectName, version: '0.0.0' };
  fs.writeFileSync(path.resolve(root, 'package.json'), JSON.stringify(pkg, null, 2));

  const templateRoot = path.resolve(__dirname, 'template');
  const callbacks = [];

  const render = function (templateName: string) {
    const templateDir = path.resolve(templateRoot, templateName);
    renderTemplate(templateDir, root, callbacks);
  };

  // Render base template
  render('base');

  //Add configs
  if (needsRouter) {
    render('config/router');
  }
  if (needsPinia) {
    render('config/pinia');
  }
  if (needsVitest) {
    render('entry/vitest');
    render('config/vitest');
  }

  if (needsPrettier) {
    render('config/prettier');
  }

  //Render tsconfigs
  if (needsTypeScript) {
    render('config/typescript');
    render('tsconfig/base');
    if (needsVitest) {
      render('tsconfig/vitest');
    }
  }

  // Render ESLint config
  if (needsEslint) {
    renderEslint(root, { needsTypeScript, needsPrettier });
  }

  const codeTemplate = (needsTypeScript ? 'typescript-' : '') + (needsRouter ? 'router' : 'default');
  render(`code/${codeTemplate}`);

  // Render entry file (main.js/ts).
  if (needsPinia && needsRouter) {
    render('entry/router-and-pinia');
  } else if (needsPinia) {
    render('entry/pinia');
  } else if (needsRouter) {
    render('entry/router');
  } else {
    render('entry/default');
  }

  // An external data store for callbacks to share data
  const dataStore = {};
  // Process callbacks
  for (const cb of callbacks) {
    await cb(dataStore);
  }

  // EJS template rendering
  preOrderDirectoryTraverse(
    root,
    () => {},
    (filepath) => {
      if (filepath.endsWith('.ejs')) {
        const template = fs.readFileSync(filepath, 'utf-8');
        const dest = filepath.replace(/\.ejs$/, '');
        const content = ejs.render(template, dataStore[dest]);

        fs.writeFileSync(dest, content);
        fs.unlinkSync(filepath);
      }
    }
  );

  // Cleanup.

  // We try to share as many files between TypeScript and JavaScript as possible.
  // If that's not possible, we put `.ts` version alongside the `.js` one in the templates.
  // So after all the templates are rendered, we need to clean up the redundant files.
  // (Currently it's only `cypress/plugin/index.ts`, but we might add more in the future.)
  // (Or, we might completely get rid of the plugins folder as Cypress 10 supports `cypress.config.ts`)

  if (needsTypeScript) {
    // Convert the JavaScript template to the TypeScript
    // Check all the remaining `.js` files:
    //   - If the corresponding TypeScript version already exists, remove the `.js` version.
    //   - Otherwise, rename the `.js` file to `.ts`
    // Remove `jsconfig.json`, because we already have tsconfig.json
    // `jsconfig.json` is not reused, because we use solution-style `tsconfig`s, which are much more complicated.
    preOrderDirectoryTraverse(
      root,
      () => {},
      (filepath) => {
        if (filepath.endsWith('.js') && !FILES_TO_FILTER.includes(path.basename(filepath))) {
          const tsFilePath = filepath.replace(/\.js$/, '.ts');
          if (fs.existsSync(tsFilePath)) {
            fs.unlinkSync(filepath);
          } else {
            fs.renameSync(filepath, tsFilePath);
          }
        } else if (path.basename(filepath) === 'jsconfig.json') {
          fs.unlinkSync(filepath);
        }
      }
    );

    // Rename entry in `index.html`
    const indexHtmlPath = path.resolve(root, 'index.html');
    const indexHtmlContent = fs.readFileSync(indexHtmlPath, 'utf8');
    fs.writeFileSync(indexHtmlPath, indexHtmlContent.replace('src/main.js', 'src/main.ts'));
  } else {
    // Remove all the remaining `.ts` files
    preOrderDirectoryTraverse(
      root,
      () => {},
      (filepath) => {
        if (filepath.endsWith('.ts')) {
          fs.unlinkSync(filepath);
        }
      }
    );
  }

  // Instructions:
  // Supported package managers: pnpm > yarn > npm
  const userAgent = process.env.npm_config_user_agent ?? '';
  const packageManager = /pnpm/.test(userAgent) ? 'pnpm' : /yarn/.test(userAgent) ? 'yarn' : 'npm';

  // README generation
  fs.writeFileSync(
    path.resolve(root, 'README.md'),
    generateReadme({
      projectName,
      packageManager,
      needsTypeScript,
      needsVitest,
      needsEslint
    })
  );

  console.log(`\nDone. Now run:\n`);
  if (root !== cwd) {
    const cdProjectName = path.relative(cwd, root);
    console.log(`  ${bold(green(`cd ${cdProjectName.includes(' ') ? `"${cdProjectName}"` : cdProjectName}`))}`);
  }
  console.log(`  ${bold(green(getCommand(packageManager, 'install')))}`);
  if (needsPrettier) {
    console.log(`  ${bold(green(getCommand(packageManager, 'format')))}`);
  }
  console.log(`  ${bold(green(getCommand(packageManager, 'dev')))}`);
  console.log();
}
