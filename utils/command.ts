import inquirer from 'inquirer';

function isValidPackageName(projectName) {
  return /^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(projectName);
}

function inquirerPrompt(argv) {
  const { name, ts, elementPlus, router, pinia, vitest, eslint, prettier } = argv;
  return new Promise((resolve, reject) => {
    inquirer
      .prompt([
        {
          type: 'input',
          name: 'name',
          message: 'ProjectName',
          default: name,
          validate: function (val) {
            if (!isValidPackageName(val)) {
              return 'Invalid package.json name';
            }
            return true;
          }
        },
        {
          type: 'list',
          name: 'router',
          message: 'Add Router?',
          default: router,
          choices: ['Yes', 'No'],
          filter: function (value) {
            return {
              Yes: true,
              No: false
            }[value];
          }
        },
        {
          type: 'list',
          name: 'pinia',
          message: 'Add Pinia?',
          default: pinia,
          choices: ['Yes', 'No'],
          filter: function (value) {
            return {
              Yes: true,
              No: false
            }[value];
          }
        },
        {
          type: 'list',
          name: 'vitest',
          message: 'Add Vitest?',
          default: vitest,
          choices: ['Yes', 'No'],
          filter: function (value) {
            return {
              Yes: true,
              No: false
            }[value];
          }
        },

        {
          type: 'list',
          name: 'eslint',
          message: 'Add Eslint?',
          default: eslint,
          choices: ['Yes', 'No'],
          filter: function (value) {
            return {
              Yes: true,
              No: false
            }[value];
          }
        },

        {
          type: 'list',
          message: 'Add Element-Plus?',
          choices: ['Yes', 'No'],
          name: 'elementPlus',
          default: elementPlus,
          filter: function (value) {
            return {
              Yes: true,
              No: false
            }[value];
          }
        },
        {
          type: 'list',
          name: 'ts',
          message: 'Add TypeScript?',
          default: ts,
          choices: ['Yes', 'No'],
          filter: function (value) {
            return {
              Yes: true,
              No: false
            }[value];
          }
        },
        {
          type: 'list',
          message: 'Add Prettier?',
          choices: ['Yes', 'No'],
          name: 'prettier',
          default: prettier,
          filter: function (value) {
            return {
              Yes: true,
              No: false
            }[value];
          }
        }
      ])
      .then((answers) => {
        resolve(answers);
      })
      .catch((error) => {
        reject(error);
      });
  });
}

export { inquirerPrompt };
