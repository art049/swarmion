import { AWS } from '@serverless/typescript';
import { App, Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import merge from 'lodash/merge';
import * as Serverless from 'serverless';
import * as Plugin from 'serverless/classes/Plugin';
import resolveConfigPath from 'serverless/lib/cli/resolve-configuration-path';

type ServerlessConfigFile = Serverless & {
  cdkConstruct: typeof Construct;
};

type CloudFormationTemplate = Exclude<AWS['resources'], undefined>;

const resolveServerlessConfigPath = async (): Promise<string> => {
  return resolveConfigPath();
};

const getServerlessConfigFile = async (): Promise<ServerlessConfigFile> => {
  const configPath = await resolveServerlessConfigPath();

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const serverlessConfigFile = (await require(configPath)) as Serverless & {
    cdkConstruct: unknown;
  };

  const MyConstruct = serverlessConfigFile.cdkConstruct;
  if (MyConstruct === undefined) {
    throw new Error('Missing cdkConstruct property');
  }

  const isConstruct =
    typeof MyConstruct === 'function' &&
    MyConstruct.prototype instanceof Construct;

  if (!isConstruct) {
    throw new Error('cdkConstruct is not a construct');
  }

  return serverlessConfigFile as ServerlessConfigFile;
};

interface OptionsExtended extends Serverless.Options {
  verbose?: boolean;
}

export class ServerlessCdkPlugin implements Plugin {
  cliOptions: OptionsExtended;
  serverless: Serverless;
  hooks: Plugin.Hooks;
  commands: Plugin.Commands;
  log: Plugin.Logging['log'];
  stackName: string;
  app: App;
  stack: Stack;
  configurationVariablesSources?: Plugin.ConfigurationVariablesSources;
  construct?: Construct;
  constructInstantiationPromise?: Promise<void> = undefined;

  constructor(
    serverless: Serverless,
    cliOptions: OptionsExtended,
    { log }: Plugin.Logging,
  ) {
    serverless.configSchemaHandler.defineTopLevelProperty('cdkConstruct', {
      type: 'object', // A class is an object
    });

    this.cliOptions = cliOptions;
    this.log = log;

    this.serverless = serverless;

    this.commands = {};

    this.stackName = 'myStackName';

    this.app = new App();
    this.stack = new Stack(this.app, this.stackName);

    this.hooks = {
      initialize: async () => await this.resolveConstruct(),
      'after:package:compileEvents': () => this.appendCloudformationResources(),
    };

    this.configurationVariablesSources = {
      serverlessCdkBridgePlugin: {
        resolve: async ({ address }: { address: string }) => {
          await this.resolveConstruct();

          if (this.construct === undefined) {
            throw new Error('Construct has not been instanciated');
          }

          if (!(address in this.construct)) {
            throw new Error('Unexpected');
          }

          return {
            // @ts-expect-error we cannot know at build time if the adress key is indeed in the construct
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            value: this.stack.resolve(this.construct[address]),
          };
        },
      },
    };
  }

  async resolveConstruct(): Promise<void> {
    if (
      this.construct === undefined &&
      this.constructInstantiationPromise === undefined
    ) {
      this.constructInstantiationPromise = this.instantiateConstruct();
    }

    await this.constructInstantiationPromise;
  }

  async instantiateConstruct(): Promise<void> {
    const serverlessConfigFile = await getServerlessConfigFile();
    const MyConstruct = serverlessConfigFile.cdkConstruct;

    this.construct = new MyConstruct(
      this.stack,
      'serverlessCdkBridgeConstruct',
    );
  }

  appendCloudformationResources(): void {
    const { Resources, Outputs, Conditions, Mappings } = this.app
      .synth()
      .getStackByName(this.stackName).template as CloudFormationTemplate;

    merge(this.serverless.service, {
      resources: { Resources, Outputs, Conditions, Mappings },
    });
  }
}
