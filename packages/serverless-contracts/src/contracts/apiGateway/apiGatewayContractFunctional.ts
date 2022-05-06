/* eslint-disable max-lines */
import { AxiosInstance, AxiosResponse } from 'axios';
import { FromSchema, JSONSchema } from 'json-schema-to-ts';
import isUndefined from 'lodash/isUndefined';
import omitBy from 'lodash/omitBy';

import { ConstrainedJSONSchema } from 'types/constrainedJSONSchema';
import { HttpMethod } from 'types/http';
import { fillPathTemplate } from 'utils';

import { ApiGatewayLambdaConfigType } from './lambdaTrigger';
import {
  ApiGatewayIntegrationType,
  ApiGatewayLambdaCompleteTriggerType,
  ApiGatewayLambdaSimpleTriggerType,
  ApiGatewayTriggerKey,
  DefinedProperties,
  InputSchemaType,
  RequestParameters,
} from './types';

interface ApiGatewayContract<
  Path extends string = string,
  Method extends HttpMethod = HttpMethod,
  IntegrationType extends ApiGatewayIntegrationType = ApiGatewayIntegrationType,
  PathParametersSchema extends ConstrainedJSONSchema | undefined =
    | ConstrainedJSONSchema
    | undefined,
  QueryStringParametersSchema extends ConstrainedJSONSchema | undefined =
    | ConstrainedJSONSchema
    | undefined,
  HeadersSchema extends ConstrainedJSONSchema | undefined =
    | ConstrainedJSONSchema
    | undefined,
  BodySchema extends JSONSchema | undefined = JSONSchema | undefined,
  OutputSchema extends JSONSchema | undefined = JSONSchema | undefined,
> {
  contractType: 'apiGatewayContract';
  id: string;
  path: Path;
  method: Method;
  integrationType: IntegrationType;
  pathParametersSchema: PathParametersSchema;
  queryStringParametersSchema: QueryStringParametersSchema;
  headersSchema: HeadersSchema;
  bodySchema: BodySchema;
  outputSchema: OutputSchema;
}

const createApiGatewayContract = <
  Path extends string,
  Method extends HttpMethod,
  IntegrationType extends ApiGatewayIntegrationType,
  PathParametersSchema extends ConstrainedJSONSchema | undefined,
  QueryStringParametersSchema extends ConstrainedJSONSchema | undefined,
  HeadersSchema extends ConstrainedJSONSchema | undefined,
  BodySchema extends JSONSchema | undefined,
  OutputSchema extends JSONSchema | undefined,
>(contractProps: {
  id: string;
  path: Path;
  method: Method;
  integrationType: IntegrationType;
  pathParametersSchema: PathParametersSchema;
  queryStringParametersSchema: QueryStringParametersSchema;
  headersSchema: HeadersSchema;
  bodySchema: BodySchema;
  outputSchema: OutputSchema;
}): ApiGatewayContract<
  Path,
  Method,
  IntegrationType,
  PathParametersSchema,
  QueryStringParametersSchema,
  HeadersSchema,
  BodySchema,
  OutputSchema
> => ({
  contractType: 'apiGatewayContract',
  ...contractProps,
});

const getTrigger = <Contract extends ApiGatewayContract>(
  contract: Contract,
): ApiGatewayLambdaSimpleTriggerType<
  ApiGatewayTriggerKey<Contract['integrationType']>
> => {
  const key = contract.integrationType === 'httpApi' ? 'httpApi' : 'http';

  // @ts-ignore somehow the type inference does not work here
  return { [key]: { path: contract.path, method: contract.method } };
};

const trigger = getTrigger(myContract);

const getCompleteTrigger = <Contract extends ApiGatewayContract>(
  contract: Contract,
  additionalConfig: ApiGatewayLambdaConfigType<
    ApiGatewayTriggerKey<Contract['integrationType']>
  >,
): ApiGatewayLambdaCompleteTriggerType<
  ApiGatewayTriggerKey<Contract['integrationType']>
> => {
  const key = contract.integrationType === 'httpApi' ? 'httpApi' : 'http';

  // @ts-ignore somehow the type inference does not work here
  return {
    [key]: {
      ...additionalConfig,
      path: contract.path,
      method: contract.method,
    },
  };
};

const completeTrigger = getCompleteTrigger(myContract, {
  authorizer: undefined,
});

console.log(trigger);
console.log(completeTrigger);

const getInputSchema = <Contract extends ApiGatewayContract>(
  contract: Contract,
): InputSchemaType<
  Contract['pathParametersSchema'],
  Contract['queryStringParametersSchema'],
  Contract['headersSchema'],
  Contract['bodySchema'],
  true
> => {
  const properties = omitBy(
    {
      pathParameters: contract.pathParametersSchema,
      queryStringParameters: contract.queryStringParametersSchema,
      headers: contract.headersSchema,
      body: contract.bodySchema,
    } as const,
    isUndefined,
  );

  return {
    type: 'object',
    properties,
    // @ts-ignore here object.keys is not precise enough
    required: Object.keys(properties),
    additionalProperties: true,
  };
};

const inputSchema = getInputSchema(myContract);
console.log(inputSchema);

type OutputType<Contract extends ApiGatewayContract> =
  Contract['outputSchema'] extends JSONSchema
    ? FromSchema<Contract['outputSchema']>
    : undefined;

type HandlerType<Contract extends ApiGatewayContract> = (
  event: FromSchema<
    InputSchemaType<
      Contract['pathParametersSchema'],
      Contract['queryStringParametersSchema'],
      Contract['headersSchema'],
      Contract['bodySchema'],
      false
    >
  >,
) => Promise<OutputType<Contract>>;

const handler: HandlerType<typeof myContract> = async () => {
  await Promise.resolve();

  return { hello: '' };
};

type PathParametersType<Contract extends ApiGatewayContract> =
  Contract['pathParametersSchema'] extends ConstrainedJSONSchema
    ? FromSchema<Contract['pathParametersSchema']>
    : undefined;
type QueryStringParametersType<Contract extends ApiGatewayContract> =
  Contract['queryStringParametersSchema'] extends ConstrainedJSONSchema
    ? FromSchema<Contract['queryStringParametersSchema']>
    : undefined;
type HeadersType<Contract extends ApiGatewayContract> =
  Contract['headersSchema'] extends ConstrainedJSONSchema
    ? FromSchema<Contract['headersSchema']>
    : undefined;
type BodyType<Contract extends ApiGatewayContract> =
  Contract['bodySchema'] extends ConstrainedJSONSchema
    ? FromSchema<Contract['bodySchema']>
    : undefined;

const getRequestParameters = <Contract extends ApiGatewayContract>(
  contract: Contract,
  requestArguments: DefinedProperties<{
    pathParameters: PathParametersType<Contract>;
    queryStringParameters: QueryStringParametersType<Contract>;
    headers: HeadersType<Contract>;
    body: BodyType<Contract>;
  }>,
): RequestParameters<BodyType<Contract>> => {
  // TODO improve inner typing here
  const { pathParameters, queryStringParameters, headers, body } =
    requestArguments as {
      pathParameters: Record<string, string>;
      queryStringParameters: Record<string, string>;
      headers: Record<string, string>;
      body: BodyType<Contract>;
    };

  const path =
    typeof pathParameters !== 'undefined'
      ? fillPathTemplate(contract.path, pathParameters)
      : contract.path;

  return omitBy(
    {
      method: contract.method,
      path,
      body,
      queryStringParameters,
      headers,
    },
    isUndefined,
  ) as unknown as RequestParameters<BodyType<Contract>>;
};

const getAxiosRequest = async <Contract extends ApiGatewayContract>(
  contract: Contract,
  axiosClient: AxiosInstance,
  requestArguments: DefinedProperties<{
    pathParameters: PathParametersType<Contract>;
    queryStringParameters: QueryStringParametersType<Contract>;
    headers: HeadersType<Contract>;
    body: BodyType<Contract>;
  }>,
): Promise<AxiosResponse<OutputType<Contract>>> => {
  const { path, method, queryStringParameters, body, headers } =
    // @ts-ignore: Type instantiation is excessively deep and possibly infinite.
    getRequestParameters(contract, requestArguments);

  return await axiosClient.request({
    method,
    url: path,
    headers,
    data: body,
    params: queryStringParameters,
  });
};

const pathParametersSchema = {
  type: 'object',
  properties: { userId: { type: 'string' }, pageNumber: { type: 'string' } },
  required: ['userId', 'pageNumber'],
  additionalProperties: false,
} as const;

const queryStringParametersSchema = {
  type: 'object',
  properties: { testId: { type: 'string' } },
  required: ['testId'],
  additionalProperties: false,
} as const;

const headersSchema = {
  type: 'object',
  properties: { myHeader: { type: 'string' } },
  required: ['myHeader'],
} as const;

const bodySchema = {
  type: 'object',
  properties: { foo: { type: 'string' } },
  required: ['foo'],
} as const;

const outputSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
  },
  required: ['id', 'name'],
} as const;

const myContract = createApiGatewayContract({
  id: 'testContract',
  path: '/users/{userId}',
  method: 'GET',
  integrationType: 'httpApi',
  pathParametersSchema,
  queryStringParametersSchema,
  headersSchema,
  bodySchema,
  outputSchema,
} as const);

const { method, path, headers, queryStringParameters, body } =
  getRequestParameters(myContract, {
    pathParameters: { userId: '123', pageNumber: '12' },
    headers: { myHeader: '12' },
    queryStringParameters: { testId: '155' },
    body: { foo: 'bar' },
  });

// {
//   method: 'GET',
//   path: '/users/123',
//   headers: { myHeader: '12' },
//   queryStringParameters: { testId: '155' },
//   body: { foo: 'bar' },
// }
