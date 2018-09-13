# Install project for development

This project uses a monorepo setup that requires using [Yarn](https://yarnpkg.com) because it relies on [Yarn workspaces](https://yarnpkg.com/blog/2017/08/02/introducing-workspaces/).

## Requirements

Node @ \^6.14.0 || \^8.10.0 || >=9.10.0

## Clone and install dependencies

```bash
git clone git@gitlab.com:yabab/uvue.git
cd uvue
yarn install
```

Then you go to `packages/tests/project` and start test project with the command:

```bash
yarn ssr:serve
```

## Linting and formatting

Theses libs are mandatory to lint and format your code:

- Prettier
- ESLint for JavaScript
- TSLint for TypeScript

## Run linters

In root folder:

```bash
yarn lint
```

## Run all tests

In root folder:

```bash
yarn test
```

## Run units tests

In root folder:

```bash
./tests/cli test:unit project
```

## Run E2E tests

```bash
./tests/cli test:e2e project
```