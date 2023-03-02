import { setFailed, getInput, error, getMultilineInput } from '@actions/core';
import { logMessagePrefix } from 'src/base/log';
import { BinaryDownloader } from 'src/downloader/downloader';
import { Runner } from 'src/runner/runner';

async function main() {
  try {
    const downloader = new BinaryDownloader();
    await downloader.download();

    const server: string | null = getInput('server');
    const pipeline: string = getInput('pipeline');
    const variables: string[] | null = getMultilineInput('variables');
    const environment: string[] | null = getMultilineInput('environment');

    const runner = new Runner(server, pipeline, variables, environment);
    await runner.run();
  } catch (err) {
    const message = `Failed to execute pipeline. ${err}`;
    error(`${logMessagePrefix} ${message}`);
    setFailed(message);
  }
}

await main();
