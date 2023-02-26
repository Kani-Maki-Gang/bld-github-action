var _a;
import { setFailed, getInput } from '@actions/core';
// import * as github from '@actions/github';
import { spawn } from 'child_process';
import { get } from 'https';
import { createWriteStream, existsSync, mkdirSync, createReadStream, rmSync } from 'fs';
import gunzip from 'gunzip-maybe';
import { extract } from 'tar-fs';
const logMessagePrefix = '[bld-github-action::log]';
const logErrorMessagePrefix = '[bld-github-action::error]';
class Definitions {
}
_a = Definitions;
Definitions.downloadUrl = 'https://github.com/kostas-vl/bld/releases/download/v0.1/bld-x86_64-unknown-linux-musl.tar.gz';
Definitions.binariesRootDir = './dist/binaries';
Definitions.archivePath = `${_a.binariesRootDir}/bld.tar.gz`;
Definitions.archiveExtractPath = `${_a.binariesRootDir}/bld`;
Definitions.binaryName = 'bld';
Definitions.binaryPath = `${_a.archiveExtractPath}/${_a.binaryName}`;
class BinaryDownloader {
    async getRelease(url) {
        return new Promise(async (resolve, reject) => {
            get(url, async (result) => {
                var _b, _c;
                const logMessage = `GET request completed with status ${result.statusCode} ${result.statusMessage}`;
                switch (result.statusCode) {
                    case 200:
                        console.log(`${logMessagePrefix} ${logMessage}`);
                        resolve(result);
                        break;
                    case 302:
                        console.log(`${logMessagePrefix} ${logMessage}`);
                        const location = (_c = (_b = result.headers['location']) === null || _b === void 0 ? void 0 : _b.toString()) !== null && _c !== void 0 ? _c : '';
                        resolve(await this.getRelease(location));
                        break;
                    default:
                        console.error(`${logErrorMessagePrefix} ${logMessage}`);
                        reject(result);
                        break;
                }
            });
        });
    }
    createBinariesRootDir() {
        if (!existsSync(Definitions.binariesRootDir)) {
            mkdirSync(Definitions.binariesRootDir);
        }
    }
    writeArchive(message) {
        return new Promise((resolve, reject) => {
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
    extractArchive() {
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
    async downloadArchive() {
        console.log(`${logMessagePrefix} starting download for bld archive`);
        const result = await this.getRelease(Definitions.downloadUrl);
        console.log(`${logMessagePrefix} finished download`);
        console.log(`${logMessagePrefix} saving bld archive`);
        await this.writeArchive(result);
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
    }
}
class Runner {
    constructor(pipeline) {
        this.pipeline = pipeline;
    }
    run() {
        return new Promise((resolve, reject) => {
            const handle = spawn(Definitions.binaryPath, ['run', '-p', this.pipeline]);
            handle.stdout.on('data', data => console.log(data.toString()));
            handle.stderr.on('data', data => console.error(data.toString()));
            handle.on('exit', (code, _signal) => {
                if (code != 0) {
                    reject();
                }
                else {
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
    }
    catch (err) {
        const message = 'Failed to download bld binary';
        console.error(`${logErrorMessagePrefix} ${message}`);
        setFailed(message);
        return;
    }
    try {
        const pipeline = getInput('pipeline');
        const runner = new Runner(pipeline);
        await runner.run();
    }
    catch (error) {
        setFailed(`Failed to execute pipeline. ${error}`);
    }
}
await main();
