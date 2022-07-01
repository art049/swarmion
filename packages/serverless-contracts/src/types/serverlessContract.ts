import {
  ApiGatewayContract,
  CloudFormationContract,
  EventContract,
} from 'contracts';

export type ServerlessContract =
  | ApiGatewayContract
  | CloudFormationContract
  | EventContract;
