import { setFailed } from '@actions/core';
// import * as github from '@actions/github';
// import { spawn } from 'child_process';
import { IncomingMessage } from 'http';
import { get } from 'https';
import { createWriteStream, createReadStream } from 'fs';
import { createGunzip } from 'zlib';
import { extract } from 'tar-stream';

const logMessagePrefix = '[bld-github-action::log]';
const logErrorMessagePrefix = '[bld-github-action::error]';

class BldBinaryDownloader {
  private downloadUrl: string = 'https://github.com/kostas-vl/bld/releases/download/v0.1/bld-x86_64-unknown-linux-musl.tar.gz';
  private archivePath: string = './dist/binaries/bld.tar.gz';
  private binaryPath: string = "./dist/binaries/bld";

  private async getBldRelease(): Promise<IncomingMessage> {
    return new Promise((resolve, reject) => {
      get(this.downloadUrl, result => {
        const logMessage = `GET request completed with status ${result.statusCode} ${result.statusMessage}`;
        switch (result.statusCode) {
          case 200:
          case 302:
            console.log(`${logMessagePrefix} ${logMessage}`);
            resolve(result);
            break;
          default:
            console.error(`${logErrorMessagePrefix} ${logMessage}`);
            reject(result);
            break;
        }
      })
    });
  }

  private writeBldArchive(message: IncomingMessage): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const archive = createWriteStream(this.archivePath);

      message.pipe(archive);

      archive
        .on('finish', () => {
          archive.close();
          resolve();
        })
        .on('error', err => {
          console.error(err);
          reject(err);
        });
    });
  }

  private extractBldArchive(): Promise<void> {
    return new Promise((resolve, reject) => {
      const binary = createWriteStream(this.binaryPath);
      const archive = createReadStream(this.archivePath)
        .pipe(createGunzip())
        .pipe(extract())
        .pipe(binary);

      archive
        .on('finished', () => {
          archive.close();
        })
        .on('error', err => {
          console.error(err);
          reject(err);
        });

      binary
        .on('finished', () => {
          binary.close();
          resolve();
        })
        .on('error', err => {
          console.error(err);
          reject(err);
        })
    });
  }

  async download() {
    console.log(`${logMessagePrefix} starting download for bld archive`);
    const result = await this.getBldRelease();
    console.log(`${logMessagePrefix} finished download`);

    console.log(`${logMessagePrefix} saving bld archive`);
    await this.writeBldArchive(result);

    console.log(`${logMessagePrefix} extracting bld archive`);
    await this.extractBldArchive();
  }
}

async function main() {
  try {
    const downloader = new BldBinaryDownloader();
    await downloader.download();
  } catch (err) {
    const message = 'Failed to download bld binary';
    console.error(`${logErrorMessagePrefix} ${message}`);
    setFailed(message);
    return;
  }

  try {
    // const pipeline = core.getInput('pipeline');
  } catch (error) {
    setFailed(`Failed to execute pipeline. ${error}`);
  }
}

await main();
