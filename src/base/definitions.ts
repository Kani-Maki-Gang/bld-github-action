export class Definitions {
  static downloadUrl = 'https://github.com/kostas-vl/bld/releases/download/v0.3.1/bld-x86_64-unknown-linux-musl.tar.gz';
  static projectDirectory = './';
  static binariesRootDir = `${this.projectDirectory}dist/binaries`;
  static archivePath = `${this.binariesRootDir}/bld.tar.gz`;
  static binaryName = 'bld';
  static binaryPath = `${this.binariesRootDir}/${this.binaryName}`;
}
