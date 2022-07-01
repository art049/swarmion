import type {
  APIGatewayEventRequestContextJWTAuthorizer,
  APIGatewayEventRequestContextLambdaAuthorizer,
  APIGatewayEventRequestContextV2WithAuthorizer,
  APIGatewayEventRequestContextWithAuthorizer,
  APIGatewayProxyCognitoAuthorizer,
  APIGatewayProxyEventBase,
  APIGatewayProxyEventV2WithRequestContext,
  APIGatewayProxyResult,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { FromSchema } from 'json-schema-to-ts';

import { ApiGatewayContract } from '../apiGatewayContract';
import {
  ApiGatewayAuthorizerType,
  ApiGatewayIntegrationType,
  OutputType,
} from './common';
import { InputSchemaType } from './input';
import { DefinedProperties } from './utils';

type AuthorizerContext<AuthorizerType extends ApiGatewayAuthorizerType> =
  AuthorizerType extends 'cognito'
    ? APIGatewayProxyCognitoAuthorizer
    : AuthorizerType extends 'jwt'
    ? APIGatewayEventRequestContextJWTAuthorizer
    : AuthorizerType extends 'lambda'
    ? // We use unknwon for now because we would need another schema to define the authorizer context
      APIGatewayEventRequestContextLambdaAuthorizer<unknown>
    : undefined;

export type RequestContext<
  IntegrationType extends ApiGatewayIntegrationType,
  AuthorizerType extends ApiGatewayAuthorizerType,
> = IntegrationType extends 'restApi'
  ? APIGatewayEventRequestContextWithAuthorizer<
      AuthorizerContext<AuthorizerType>
    >
  : APIGatewayEventRequestContextV2WithAuthorizer<
      AuthorizerContext<AuthorizerType>
    >;

export type HandlerEventType<Contract extends ApiGatewayContract> =
  DefinedProperties<{
    requestContext: RequestContext<
      Contract['integrationType'],
      Contract['authorizerType']
    >;
  }> &
    FromSchema<
      InputSchemaType<
        Contract['pathParametersSchema'],
        Contract['queryStringParametersSchema'],
        Contract['headersSchema'],
        Contract['bodySchema'],
        false
      >
    >;

export type HandlerType<Contract extends ApiGatewayContract> = (
  event: HandlerEventType<Contract>,
) => Promise<OutputType<Contract>>;

export type LambdaEventType<Contract extends ApiGatewayContract> =
  Contract['integrationType'] extends 'restApi'
    ? APIGatewayProxyEventBase<AuthorizerContext<Contract['authorizerType']>>
    : APIGatewayProxyEventV2WithRequestContext<
        AuthorizerContext<Contract['authorizerType']>
      >;

export type LambdaReturnType<Contract extends ApiGatewayContract> =
  Contract['integrationType'] extends 'restApi'
    ? APIGatewayProxyResult
    : APIGatewayProxyResultV2<OutputType<Contract>>;

export type CompleteHandlerType<Contract extends ApiGatewayContract> = (
  event: LambdaEventType<Contract>,
) => Promise<LambdaReturnType<Contract>>;
