import { Definitions } from 'src/base/definitions';
import { existsSync } from 'fs';
import { downloadTool, extractTar } from '@actions/tool-cache';
import { addPath } from '@actions/core';


export class BinaryDownloader {
  private async getRelease() {
    if (!existsSync(Definitions.archivePath)) {
      await downloadTool(Definitions.downloadUrl, Definitions.archivePath);
    }
  }

  private async extractArchive() {
    if (!existsSync(Definitions.binaryPath)) {
      await extractTar(Definitions.archivePath, Definitions.binariesRootDir);
    }
  }

  async download() {
    if (existsSync(Definitions.binaryPath)) {
      return;
    }

    await this.getRelease();
    await this.extractArchive();

    addPath(Definitions.binariesRootDir);
  }
}
