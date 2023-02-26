import { setFailed, getInput } from '@actions/core';
// import * as github from '@actions/github';
import { spawn } from 'child_process';
import { IncomingMessage } from 'http';
import { get } from 'https';
import { createWriteStream, existsSync, mkdirSync, createReadStream, rmSync } from 'fs';
import gunzip from 'gunzip-maybe';
import { extract } from 'tar-fs';

const logMessagePrefix = '[bld-github-action::log]';
const logErrorMessagePrefix = '[bld-github-action::error]';

class Definitions {
  static downloadUrl = 'https://github.com/kostas-vl/bld/releases/download/v0.1/bld-x86_64-unknown-linux-musl.tar.gz';
  static binariesRootDir = './dist/binaries';
  static archivePath = `${this.binariesRootDir}/bld.tar.gz`;
  static archiveExtractPath = `${this.binariesRootDir}/bld`;
  static binaryName = 'bld';
  static binaryPath = `${this.archiveExtractPath}/${this.binaryName}`;
}

class BinaryDownloader {
  private async getRelease(url: string): Promise<IncomingMessage> {
    return new Promise(async (resolve, reject) => {
      get(url, async result => {
        const logMessage = `GET request completed with status ${result.statusCode} ${result.statusMessage}`;
        switch (result.statusCode) {
          case 200:
            console.log(`${logMessagePrefix} ${logMessage}`);
            resolve(result);
            break;
          case 302:
            console.log(`${logMessagePrefix} ${logMessage}`);
            const location = result.headers['location']?.toString() ?? '';
            resolve(await this.getRelease(location));
            break;
          default:
            console.error(`${logErrorMessagePrefix} ${logMessage}`);
            reject(result);
            break;
        }
      })
    });
  }

  private createBinariesRootDir() {
    if (!existsSync(Definitions.binariesRootDir)) {
      mkdirSync(Definitions.binariesRootDir);
    }
  }

  private writeArchive(message: IncomingMessage): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.createBinariesRootDir();

      const archive = createWriteStream(Definitions.archivePath);

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

  private extractArchive(): Promise<void> {
    if (existsSync(Definitions.binaryPath)) {
      rmSync(Definitions.binaryPath, { recursive: true });
    }
    return new Promise((resolve, reject) => {
      const binary = createReadStream(Definitions.archivePath)
        .pipe(gunzip())
        .pipe(extract(Definitions.binaryPath));

      binary
        .on('finish', () => {
          resolve();
        })
        .on('error', err => {
          console.error(err);
          reject(err);
        });
    });
  }

  private async downloadArchive() {
    console.log(`${logMessagePrefix} starting download for bld archive`);
    const result = await this.getRelease(Definitions.downloadUrl);
    console.log(`${logMessagePrefix} finished download`);

    console.log(`${logMessagePrefix} saving bld archive`);
    await this.writeArchive(result);
  }

  private async assignPermissions(): Promise<void> {
    return new Promise((resolve, reject) => {
      const handle = spawn('/usr/bin/chmod', ['+x', Definitions.binaryPath]);
      handle.on('exit', (code, _signal) => {
        if (code != 0) {
          reject();
        } else {
          resolve();
        }
      })
    })
  }

  async download() {
    if (existsSync(Definitions.binaryPath)) {
      return;
    }

    if (!existsSync(Definitions.archivePath)) {
      await this.downloadArchive();
    }

    console.log(`${logMessagePrefix} extracting bld archive`);
    await this.extractArchive();
    await this.assignPermissions();
  }
}

class Runner {
  constructor(private pipeline: string) { }

  run(): Promise<void> {
    return new Promise((resolve, reject) => {
      const handle = spawn(Definitions.binaryPath, ['run', '-p', this.pipeline]);
      handle.stdout.on('data', data => console.log(data.toString()));
      handle.stderr.on('data', data => console.error(data.toString()));
      handle.on('exit', (code, _signal) => {
        if (code != 0) {
          reject();
        } else {
          resolve();
        }
      });
    });
  }
}

async function main() {
  try {
    const downloader = new BinaryDownloader();
    await downloader.download();
  } catch (err) {
    const message = 'Failed to download bld binary';
    console.error(`${logErrorMessagePrefix} ${message}`);
    setFailed(message);
    return;
  }

  try {
    const pipeline = getInput('pipeline');
    const runner = new Runner(pipeline);
    await runner.run();
  } catch (error) {
    setFailed(`Failed to execute pipeline. ${error}`);
  }
}

await main();
