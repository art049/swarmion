import { ApiGatewayContract } from '../apiGatewayContract';
import {
  BodyType,
  CompleteHandlerType,
  HandlerEventType,
  HandlerType,
  LambdaEventType,
  LambdaReturnType,
  OutputType,
} from '../types';

export const getLambdaHandler =
  <Contract extends ApiGatewayContract>(contract: Contract) =>
  (handler: HandlerType<typeof contract>): HandlerType<typeof contract> =>
    handler;

const proxyEventToHandlerEvent = <Contract extends ApiGatewayContract>({
  requestContext,
  body: proxyEventBody = null,
  headers,
  pathParameters,
  queryStringParameters,
}: LambdaEventType<Contract>): HandlerEventType<Contract> => {
  return {
    requestContext,
    body: (proxyEventBody !== null
      ? JSON.parse(proxyEventBody)
      : undefined) as BodyType<Contract>,
    headers,
    pathParameters,
    queryStringParameters,
  } as unknown as HandlerEventType<Contract>;
};

const handlerResponseToLambdaResult = <Contract extends ApiGatewayContract>(
  handlerResponse: OutputType<Contract>,
): LambdaReturnType<Contract> => ({
  statusCode: 200,
  body: JSON.stringify(handlerResponse),
});

export const getCompleteLambdaHandler =
  <Contract extends ApiGatewayContract>(contract: Contract) =>
  (
    handler: HandlerType<typeof contract>,
  ): CompleteHandlerType<typeof contract> =>
  async event => {
    const parsedEvent = proxyEventToHandlerEvent<Contract>(event);

    const handlerResponse = await handler(parsedEvent);

    return handlerResponseToLambdaResult(handlerResponse);
  };
