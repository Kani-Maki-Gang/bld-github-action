import { debug, error } from '@actions/core';
import { IncomingMessage } from 'http';
import { get } from 'https';
import { createWriteStream, createReadStream, existsSync, mkdirSync, rmSync } from 'fs';
import gunzip from 'gunzip-maybe';
import { extract } from 'tar-fs';
import { Definitions } from 'src/base/definitions';
import { logMessagePrefix } from 'src/base/log';


export class BinaryDownloader {
  private async getRelease(url: string): Promise<IncomingMessage> {
    return new Promise(async (resolve, reject) => {
      get(url, async result => {
        const logMessage = `GET request completed with status ${result.statusCode} ${result.statusMessage}`;
        switch (result.statusCode) {
          case 200:
            debug(`${logMessagePrefix} ${logMessage}`);
            resolve(result);
            break;
          case 302:
            debug(`${logMessagePrefix} ${logMessage}`);
            const location = result.headers['location']?.toString() ?? '';
            resolve(await this.getRelease(location));
            break;
          default:
            error(`${logMessagePrefix} ${logMessage}`);
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
          error(err);
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
          error(err);
          reject(err);
        });
    });
  }

  private async downloadArchive() {
    debug(`${logMessagePrefix} starting download for bld archive`);
    const result = await this.getRelease(Definitions.downloadUrl);
    debug(`${logMessagePrefix} finished download`);

    debug(`${logMessagePrefix} saving bld archive`);
    await this.writeArchive(result);
  }

  async download() {
    if (existsSync(Definitions.binaryPath)) {
      return;
    }

    if (!existsSync(Definitions.archivePath)) {
      await this.downloadArchive();
    }

    debug(`${logMessagePrefix} extracting bld archive`);
    await this.extractArchive();
  }
}
