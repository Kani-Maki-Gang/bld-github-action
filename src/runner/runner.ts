// import { error } from "@actions/core";
import { debug } from "@actions/core";
import { spawn } from "child_process";
import { Definitions } from "src/base/definitions";

export class Runner {
  constructor(private pipeline: string) { }

  run(): Promise<void> {
    return new Promise((resolve, reject) => {
      debug(`starting run for pipeline: ${this.pipeline}`);
      const handle = spawn(`${Definitions.binaryPath}/bld`, ['run', '-p', this.pipeline]);
      handle.stdout.on('data', data => console.log(data.toString()));
      handle.stderr.on('data', data => console.log(data.toString()));
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

