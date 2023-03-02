import { setFailed, getInput, error } from '@actions/core';
import { logMessagePrefix } from 'src/base/log';
import { BinaryDownloader } from 'src/downloader/downloader';
import { Runner } from 'src/runner/runner';

async function main() {
  try {
    const downloader = new BinaryDownloader();
    await downloader.download();

    const pipeline = getInput('pipeline');
    const runner = new Runner(pipeline);
    await runner.run();
  } catch (err) {
    const message = `Failed to execute pipeline. ${err}`;
    error(`${logMessagePrefix} ${message}`);
    setFailed(message);
  }
}

await main();
