import { JSONSchema } from 'json-schema-to-ts';

export class EventContract {
  public contractType = 'event' as const;
  public id: string;
  public payloadSchema: JSONSchema;

  constructor(props: { id: string; payloadSchema: JSONSchema }) {
    this.id = props.id;
    this.payloadSchema = props.payloadSchema;
  }
}
