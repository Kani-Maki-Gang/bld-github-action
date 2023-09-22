import { debug } from "@actions/core";
import { spawn } from "child_process";
import { Definitions } from "src/base/definitions";

export class Variable {
  constructor(public name: string, public value: string) { }
}

export class Runner {
  constructor(
    private server: string | null,
    private pipeline: string,
    private variables: string[] | null,
    private environment: string[] | null,
  ) { }

  private getVariables(): string[] | null {
    return this.variables?.reduce((acc, n) => acc.concat(['-v', n]), new Array<string>()) ?? null;
  }

  private getEnvironment(): string[] | null {
    return this.environment?.reduce((acc, n)=> acc.concat(['-e', n]), new Array<string>()) ?? null;
  }

  private getArguments(): string[] {
    let args = ['run'];

    if (this.server) {
      args.push('-s', this.server);
    }

    args.push('-p', this.pipeline);

    const variables = this.getVariables();
    if (variables) {
      args = args.concat(variables);
    }

    const environment = this.getEnvironment();
    if (environment) {
      args = args.concat(environment);
    }

    return args;
  }

  spawn(binary: string, args: string[] | undefined): Promise<void> {
    return new Promise((resolve, reject) => {
      const handle = spawn(binary, args);
      handle.stdout.on('data', data => console.log(data.toString()));
      handle.stderr.on('data', data => console.log(data.toString()));
      handle.on('exit', (code, _signal) => {
        if (code != 0) {
          reject();
        } else {
          resolve();
        }
      });
    })
  }

  async run() {
    debug(`starting run for pipeline: ${this.pipeline}`);
    const args = this.getArguments();
    await this.spawn(Definitions.binaryName, ["config"]);
    await this.spawn(Definitions.binaryName, args);
  }
}

