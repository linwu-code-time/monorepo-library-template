import { promises as fs } from 'fs';
import { join } from 'path';
import { defineConfig } from 'tsup';
import type { Plugin } from 'esbuild';
import url from 'url';

const replace = (): Plugin => {
  return {
    name: 'replace',
    async setup(build) {
      const pkg = JSON.parse(
        await fs.readFile(join(build.initialOptions.tsconfig!, '../package.json'), { encoding: 'utf-8' }),
      );
      build.onLoad({ filter: /version/ }, async (args) => {
        const source = await fs.readFile(args.path, 'utf8');
        const contents = source.replace('__VERSION__', pkg.version);
        return { contents };
      });
    },
  };
};

const excludeImportMetaUrl = (): Plugin => {
  return {
    name: 'exclude-import-meta-url',
    setup(build) {
      build.onLoad({ filter: /node-runner.ts$/ }, async (args) => {
        const contents = await fs.readFile(args.path, 'utf8');
        const transformedContents = contents.replace(
          /import\.meta\.url/g,
          JSON.stringify(url.pathToFileURL(args.path)),
        );
        // console.log(contents);
        return { contents: transformedContents, loader: 'ts' };
      });
    },
  };
};

// 这里最后打包有两种模块 mjs  cjs(js)
// 默认bin命令 我们走cjs模块
// 但是lighthouse只保留mjs cjs模块也没有一些函数 所以我们不得不使用es模块 cjs中可以通过dynamic import 引入 es module
// const { generateReport } = await Promise.resolve().then(function () { return /*#__PURE__*/_interopNamespace(require('lighthouse')); });
// 但是编译过后的代码直接require es module
// 现在的bin文件是走es module
export default defineConfig(() => ({
  entry: ['./src/index.ts'],
  clean: true,
  dts: true,
  format: ['esm', 'cjs'],
  target: 'es2018',
  treeshake: true,
  sourcemap: true,
  // TODO puppeteer为什么会被一起打包进去? 后面再研究看看
  external: ['puppeteer', 'puppeteer-core'],
  platform: 'node',
  esbuildPlugins: [replace(), excludeImportMetaUrl()],
}));
