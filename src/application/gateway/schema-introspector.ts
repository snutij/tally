export interface SchemaIntrospector {
  getSchemaContext(): Promise<string>;
}
