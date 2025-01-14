const path = require('path');
const { mkdirp, copyFile } = require('fs-extra');

const {
  glob,
  download,
  shouldServe,
  createLambda,
  getWritableDirectory,
  getLambdaOptionsFromFunction,
} = require('@now/build-utils');

exports.analyze = ({ files, entrypoint }) => files[entrypoint].digest;

exports.build = async ({ workPath, files, entrypoint, meta, config }) => {
  console.log('downloading files...');
  const outDir = await getWritableDirectory();

  await download(files, workPath, meta);

  const handlerPath = path.join(__dirname, 'handler');
  await copyFile(handlerPath, path.join(outDir, 'handler'));

  const entrypointOutDir = path.join(outDir, path.dirname(entrypoint));
  await mkdirp(entrypointOutDir);

  // For now only the entrypoint file is copied into the lambda
  await copyFile(
    path.join(workPath, entrypoint),
    path.join(outDir, entrypoint)
  );

  const lambdaOptions = await getLambdaOptionsFromFunction({
    sourceFile: entrypoint,
    config,
  });

  const lambda = await createLambda({
    files: await glob('**', outDir),
    handler: 'handler',
    runtime: 'go1.x',
    environment: {
      SCRIPT_FILENAME: entrypoint,
    },
    ...lambdaOptions,
  });

  return {
    [entrypoint]: lambda,
  };
};

exports.shouldServe = shouldServe;
